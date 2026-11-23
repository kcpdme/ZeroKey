package top.kcpd.zerokey

import androidx.appcompat.app.AlertDialog
import android.content.ClipData
import android.content.ClipDescription
import android.content.ClipboardManager
import android.content.Intent
import android.content.res.ColorStateList
import android.graphics.Rect
import android.graphics.Typeface
import android.graphics.drawable.StateListDrawable
import android.os.Build
import android.os.Bundle
import android.os.PersistableBundle
import android.text.InputType
import android.text.method.PasswordTransformationMethod
import android.view.Gravity
import android.view.View
import android.view.inputmethod.InputMethodManager
import android.widget.Button
import android.widget.CheckBox
import android.widget.EditText
import android.widget.FrameLayout
import android.widget.ImageButton
import android.widget.LinearLayout
import android.widget.RadioButton
import android.widget.RadioGroup
import android.widget.TextView
import androidx.core.view.doOnLayout
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestoreException
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineStart
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.TimeoutCancellationException
import kotlinx.coroutines.cancel
import kotlinx.coroutines.flow.emptyFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.withTimeout
import org.json.JSONObject
import java.util.UUID

open class MainActivity : AppActivity() {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)
    private var operation: Job? = null
    private var cloud: Cloud? = null
    private val authListener = FirebaseAuth.AuthStateListener { updateAccount(it.uid) }
    private var owner: String? = null
    private lateinit var engine: GeneratorEngine
    private lateinit var site: SuggestionField
    private lateinit var login: SuggestionField
    private lateinit var master: EditText
    private lateinit var showMaster: ImageButton
    private var masterVisible = false
    private lateinit var shift: EditText
    private lateinit var magic: EditText
    private lateinit var counter: EditText
    private lateinit var length: EditText
    private lateinit var salt: EditText
    private val characterSets = linkedMapOf<String, CheckBox>()
    private lateinit var modes: RadioGroup
    private lateinit var secureFields: LinearLayout
    private lateinit var saltField: LinearLayout
    private lateinit var memorableFields: LinearLayout
    private lateinit var advancedFields: LinearLayout
    private lateinit var advanced: Button
    private lateinit var generate: Button
    private lateinit var standalone: Button
    private lateinit var status: TextView
    private lateinit var selectionLabel: TextView
    private lateinit var result: LinearLayout
    private lateinit var output: TextView
    private lateinit var reveal: Button
    private lateinit var confirm: Button
    private var selection: Selection? = null
    private var password: String? = null
    private var revealed = false
    private var ready = false
    private var advancedOpen = false
    private var populating = false
    protected open val editingRecipe = false
    private lateinit var saveEdit: ImageButton
    private var editBase: VaultStore.Profile? = null
    private var editVersion = 1L
    private var preview: EditPreview? = null

    private data class Version(val id: String, val draft: String? = null, val history: Int = -1, val number: Long = 0) {
        val current get() = draft == null && history == -1
    }
    private data class Selection(val version: Version, val read: Cloud.Read, val options: Options)
    private data class EditPreview(val id: String, val account: VaultStore.Account, val options: Options)

    override fun onCreate(state: Bundle?) {
        super.onCreate(state)
        cloud = Cloud.get(this)
        engine = GeneratorEngine(this)
        build()
        updateAccount(cloud?.auth?.uid)
        if (!editingRecipe && state == null && intent.action == Intent.ACTION_MAIN && intent.hasCategory(Intent.CATEGORY_LAUNCHER)) {
            openVault()
        }
        scope.launch {
            try {
                engine.awaitReady()
                ready = true
                if (editingRecipe) loadEditor()
                else generate.isEnabled = operation?.isActive != true
            } catch (error: CancellationException) {
                throw error
            } catch (_: Exception) {
                message("Password engine unavailable. Update Android System WebView and reopen ZeroKey.", true)
            }
        }
    }

    private fun build() {
        val navigation = if (editingRecipe) null else dock(generator = true, openOther = ::openVault)
        val page = page(navigation = navigation, toolbar = if (editingRecipe) editToolbar() else null)
        if (!editingRecipe) add(page, generatorHeader(page))
        selectionLabel = text("", color = accent).apply {
            background = rounded(accentSurface, 13)
            setPadding(dp(12), dp(9), dp(12), dp(9))
        }
        add(page, selectionLabel, if (editingRecipe) 0 else 16)
        buildForm(page)
    }

    private fun generatorHeader(page: View): View {
        val actions = LinearLayout(this).apply {
            gravity = Gravity.CENTER_VERTICAL
            addView(button("Clear form") {
                currentFocus?.let {
                    getSystemService(InputMethodManager::class.java).hideSoftInputFromWindow(it.windowToken, 0)
                }
                clearForm()
                page.requestFocus()
            }.apply { id = R.id.generator_clear_form }, LinearLayout.LayoutParams(-2, dp(48)))
            addView(iconButton(R.drawable.ic_account, "Account and settings") {
                startActivity(Intent(this@MainActivity, SettingsActivity::class.java))
            }.apply { id = R.id.settings_button }, LinearLayout.LayoutParams(dp(48), dp(48)).apply {
                marginStart = dp(4)
            })
        }
        return brandBar(actions)
    }

    private fun editToolbar() = LinearLayout(this).apply {
        gravity = Gravity.CENTER_VERTICAL
        setPadding(dp(10), dp(8), dp(12), dp(4))
        addView(iconButton(R.drawable.ic_arrow_back, "Back to Vault", ::finish), LinearLayout.LayoutParams(dp(48), dp(48)))
        addView(heading("Edit recipe", 21f), LinearLayout.LayoutParams(0, -2, 1f).apply { marginStart = dp(8) })
        saveEdit = iconButton(R.drawable.ic_save, "Save recipe", ::confirmEdit).apply {
            id = R.id.save_recipe_edit
            isEnabled = false
        }
        addView(saveEdit, LinearLayout.LayoutParams(dp(48), dp(48)))
    }

    private fun buildForm(page: LinearLayout) {
        modes = RadioGroup(this).apply {
            orientation = RadioGroup.HORIZONTAL
            background = rounded(fieldSurface, 15, strokeColor)
            setPadding(dp(4), dp(4), dp(4), dp(4))
            for ((modeId, label) in listOf(R.id.secure_mode to "Secure", R.id.memorable_mode to "Memorable")) {
                val mode = RadioButton(this@MainActivity).apply {
                    id = modeId
                    text = label
                    buttonDrawable = null
                    gravity = Gravity.CENTER
                    setPadding(dp(8), dp(4), dp(8), dp(4))
                    typeface = Typeface.create("sans-serif-medium", Typeface.NORMAL)
                    setTextColor(ColorStateList(
                        arrayOf(intArrayOf(android.R.attr.state_checked), intArrayOf()),
                        intArrayOf(accent, muted),
                    ))
                    background = StateListDrawable().apply {
                        addState(intArrayOf(android.R.attr.state_checked), pressable(accentSurface, 11))
                        addState(intArrayOf(), pressable(fieldSurface, 11))
                    }
                }
                addView(mode, RadioGroup.LayoutParams(0, -2, 1f).apply { height = dp(46) })
            }
            check(R.id.secure_mode)
        }
        add(page, modes, 20)

        val inputs = card().apply { id = R.id.generator_inputs }
        site = suggest(inputs, R.id.site, "Site", InputType.TYPE_TEXT_VARIATION_URI, true)
        login = suggest(inputs, R.id.login, "Login", InputType.TYPE_TEXT_VARIATION_EMAIL_ADDRESS, false)
        secureFields = column()
        showMaster = ImageButton(this).apply {
            id = R.id.show_master_key
            background = pressable(android.graphics.Color.TRANSPARENT, 12)
            setColorFilter(muted)
            setPadding(dp(12), dp(12), dp(12), dp(12))
            scaleType = android.widget.ImageView.ScaleType.FIT_CENTER
            setOnClickListener { setMasterVisible(!masterVisible) }
        }
        master = field(secureFields, R.id.master_key, "Master key",
            type = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_PASSWORD, endAction = showMaster)
        setMasterVisible(false)
        saltField = column()
        salt = field(saltField, R.id.salt, "Salt (optional)")
        add(secureFields, saltField, 14)
        add(inputs, secureFields, 14)
        memorableFields = column()
        shift = field(memorableFields, R.id.shift, "Shift position", InputType.TYPE_CLASS_NUMBER)
        magic = field(memorableFields, R.id.magic_number, "Magic number", InputType.TYPE_CLASS_NUMBER or InputType.TYPE_NUMBER_FLAG_SIGNED)
        add(inputs, memorableFields, 14)
        add(page, inputs, 14)

        advanced = button("Advanced options") {
            advancedOpen = !advancedOpen
            updateMode()
        }.apply { id = R.id.advanced_options }
        add(page, advanced, 10)
        advancedFields = card()
        if (!editingRecipe) counter = field(advancedFields, R.id.rotation, "Rotation counter", InputType.TYPE_CLASS_NUMBER)
        length = field(advancedFields, R.id.length, "Password length (8–48)", InputType.TYPE_CLASS_NUMBER)
        for (pair in listOf(listOf("Lowercase", "Uppercase"), listOf("Numbers", "Symbols"))) {
            val row = LinearLayout(this)
            for (label in pair) {
                val choice = CheckBox(this).apply {
                    text = label
                    isChecked = true
                    setOnCheckedChangeListener { _, _ -> edited() }
                }
                characterSets["use" + label] = choice
                row.addView(choice, LinearLayout.LayoutParams(0, -2, 1f))
            }
            add(advancedFields, row)
        }
        add(page, advancedFields, 8)
        generate = primaryButton("Generate password") {
            if (editingRecipe) generateEditPreview() else startGeneration(true)
        }.apply {
            id = R.id.generate
            isEnabled = false
        }
        add(page, generate, 12)
        standalone = button("Generate without saving") { startGeneration(false) }.apply { visibility = View.GONE }
        add(page, standalone, 6)
        status = text("").apply { accessibilityLiveRegion = View.ACCESSIBILITY_LIVE_REGION_POLITE }
        add(page, status, 8)

        result = card().apply { background = rounded(accentSurface, 19, strokeColor) }
        add(result, heading("Generated password", 16f))
        output = text("", 20f, inkColor).apply { id = R.id.generated_password; typeface = Typeface.MONOSPACE }
        add(result, output, 6)
        val resultActions = LinearLayout(this)
        reveal = button("Show password") { revealed = !revealed; updateOutput() }.apply { id = R.id.show_password }
        resultActions.addView(reveal, LinearLayout.LayoutParams(0, -2, 1f))
        resultActions.addView(primaryButton("Copy", ::copy), LinearLayout.LayoutParams(0, -2, 1f).apply { marginStart = dp(8) })
        add(result, resultActions, 8)
        confirm = primaryButton("Make current", ::confirmDraft).apply { id = R.id.confirm_version }
        add(result, confirm, 6)
        add(page, result, 12)
        modes.setOnCheckedChangeListener { _, _ ->
            if (!secure) setMasterVisible(false)
            updateMode()
            edited()
        }
        clearForm()
        if (editingRecipe) editFields().forEach { it.isEnabled = false }
    }

    private fun field(parent: LinearLayout, id: Int, label: String,
                      type: Int = InputType.TYPE_CLASS_TEXT, endAction: View? = null): EditText =
        EditText(this).apply { setupField(parent, this, id, label, type, endAction); watchText { edited() } }

    private fun suggest(parent: LinearLayout, id: Int, label: String, variation: Int, sites: Boolean) =
        SuggestionField(this, scope).apply {
            setupField(parent, this, id, label, InputType.TYPE_CLASS_TEXT or variation)
            lookup = { query ->
                val uid = owner
                val cache = cloud?.cache
                if (uid == null || cache == null || selection != null || appLocked) emptyFlow()
                else if (sites) cache.sites(uid, searchPrefix(lookupSite(query)))
                else cache.logins(uid, searchPrefix(lookupText(query)))
            }
            watchText { edited() }
        }

    private fun setupField(parent: LinearLayout, field: EditText, id: Int, label: String, type: Int,
                           endAction: View? = null) {
        label(parent, label, id, if (parent.childCount == 0) 0 else 14)
        field.id = id
        field.prepare(when (id) {
            R.id.site -> "example.com"
            R.id.login -> "you@example.com"
            R.id.master_key -> "Enter your master key"
            R.id.salt -> "Enter salt"
            else -> label
        }, type)
        if (endAction == null) {
            add(parent, field, 6)
        } else {
            field.setPaddingRelative(field.paddingStart, field.paddingTop, dp(56), field.paddingBottom)
            val row = FrameLayout(this)
            row.addView(field, FrameLayout.LayoutParams(-1, -2))
            row.addView(endAction, FrameLayout.LayoutParams(dp(48), dp(48), Gravity.END or Gravity.CENTER_VERTICAL)
                .apply { marginEnd = dp(4) })
            add(parent, row, 6)
        }
    }

    private val secure get() = modes.checkedRadioButtonId == R.id.secure_mode

    private fun setMasterVisible(visible: Boolean) {
        masterVisible = visible
        val cursor = master.selectionEnd.coerceIn(0, master.length())
        master.transformationMethod = if (visible) null else PasswordTransformationMethod.getInstance()
        master.setSelection(cursor)
        showMaster.setImageResource(if (visible) R.drawable.ic_visibility_off else R.drawable.ic_visibility)
        showMaster.contentDescription = if (visible) "Hide master key" else "Show master key"
    }

    private fun updateMode() {
        secureFields.visibility = shown(secure)
        saltField.visibility = shown(selection == null)
        memorableFields.visibility = shown(!secure && selection == null)
        advanced.visibility = shown(secure && selection == null && !editingRecipe)
        advancedFields.visibility = shown(secure && selection == null && (editingRecipe || advancedOpen))
        advanced.text = if (advancedOpen) "Hide advanced options" else "Advanced options"
    }

    private fun manualRecipe(version: Long = if (secure) counter.whole("Rotation counter", 1, limit) else 1): JSONObject {
        val options: Options = if (secure) mapOf("counter" to version,
            "length" to length.whole("Password length", 8, 48), "userSalt" to salt.text.toString()) +
            characterSets.mapValues { it.value.isChecked }
        else mapOf("counter" to version, "shift" to shift.whole("Shift position", 1, limit),
            "magicNumber" to magic.whole("Magic number", -limit, limit))
        return JSONObject().put("site", site.text.toString()).put("login", login.text.toString())
            .put("algorithm", if (secure) "pbkdf2" else "memorizable")
            .put("masterPassword", master.text.toString()).put("options", JSONObject(options))
    }

    private fun loadEditor() {
        val uid = owner
        val id = intent.getStringExtra(VaultActivity.PROFILE)
        val service = cloud
        if (uid == null || uid != intent.getStringExtra(VaultActivity.OWNER) || id == null || service == null) {
            message("Sign in to edit this recipe.", true)
            return
        }
        work("Loading recipe…") {
            val base = service.current(id, uid, allowOffline = true).profile
            if (uid != owner || service.auth.uid != uid) return@work
            val options = service.vault.editingOptions(base)
            populating = true
            site.setText(base.site, false)
            login.setText(base.login, false)
            modes.check(if (base.secure) R.id.secure_mode else R.id.memorable_mode)
            for (index in 0 until modes.childCount) modes.getChildAt(index).isEnabled = false
            salt.setText(options["userSalt"].orEmptyText())
            length.setText(options.number("length", 16).toString())
            shift.setText(options.number("shift", 1).toString())
            magic.setText(options.number("magicNumber", 0).toString())
            characterSets.forEach { (key, choice) -> choice.isChecked = options[key] != false }
            populating = false
            editBase = base
            editVersion = options.number("counter", 1)
            editFields().forEach { it.isEnabled = true }
            selectionLabel.text = "New version · v$editVersion"
            selectionLabel.visibility = View.VISIBLE
            message(null)
        }
    }

    private fun generateEditPreview() {
        val base = editBase ?: return
        if (appLocked) return
        val request = try {
            manualRecipe(editVersion)
        } catch (error: IllegalArgumentException) {
            message(error.message, true)
            return
        }
        hideKeyboard()
        work("Generating preview…") {
            checkOwner(base.userId)
            val site = request.getString("site")
            val login = request.getString("login")
            val account = engine.account(site, login, base.algorithm).let { normalized ->
                normalized.copy(
                    login = if (login == base.login) base.login else normalized.login,
                    savedSite = if (site == base.site) base.site else normalized.savedSite,
                )
            }
            val options = request.getJSONObject("options").values()
            val edited = base.copy(site = account.savedSite, login = account.login)
            val value = engine.generate(edited.request(options, request.getString("masterPassword")))
            require(value.isNotEmpty()) { "Enter a valid site and login." }
            checkOwner(base.userId)
            preview = EditPreview(UUID.randomUUID().toString(), account, options)
            showPassword(value, "Change the password on the site, then tap Save.")
        }
    }

    private fun confirmEdit() {
        val generated = preview ?: return
        val base = editBase ?: return
        if (!saveEdit.isEnabled || appLocked) return
        showProtectedDialog(AlertDialog.Builder(this).setTitle("Save this version?")
            .setMessage("Save after the site has accepted this password. The previous version will stay in Version history.")
            .setPositiveButton("Save") { _, _ ->
                if (preview != generated) return@setPositiveButton
                work("Saving recipe…", keepOutput = true) {
                    checkOwner(base.userId)
                    requireNotNull(cloud).vault.saveEditedVersion(base, generated.id, generated.account, generated.options)
                    finish()
                }
            }.setNegativeButton("Cancel", null))
    }

    private fun startGeneration(save: Boolean) {
        val chosen = selection
        val uid = owner
        if (appLocked) return
        val secret = master.text.toString()
        val manual = if (chosen == null) try { manualRecipe() } catch (error: IllegalArgumentException) {
            message(error.message, true)
            return
        } else null
        hideKeyboard()
        work("Generating…", allowStandalone = chosen == null && save && uid != null) {
            val accountCloud = cloud
            if (chosen != null && uid != null && accountCloud != null) {
                val fresh = read(chosen.version, uid)
                selection = fresh
                updateSelection()
                val value = engine.generate(fresh.read.profile.request(fresh.options, secret))
                checkOwner(uid)
                showPassword(value, if (fresh.read.offline) "Generated from the last synced recipe." else null)
            } else if (manual != null && save && uid != null && accountCloud != null) {
                val algorithm = manual.getString("algorithm")
                val account = engine.account(manual.getString("site"), manual.getString("login"), algorithm)
                checkOwner(uid)
                val online = try {
                    accountCloud.vault.matches(uid, account)
                } catch (error: FirebaseFirestoreException) {
                    if (!error.connectionError || accountCloud.sync.value == Cloud.Sync.UNAVAILABLE) throw error
                    val cached = accountCloud.cache.forLogin(uid, account.login).map(RecipeRow::profile).filter(account::matches)
                    checkOwner(uid)
                    if (cached.isEmpty()) throw error
                    showExisting(cached, uid, offline = true)
                    return@work
                }
                checkOwner(uid)
                if (online.isNotEmpty()) {
                    showExisting(online, uid)
                    return@work
                }
                val value = engine.generate(manual)
                checkOwner(uid)
                val existing = accountCloud.vault.create(uid, account, algorithm, manual.getJSONObject("options").values())
                checkOwner(uid)
                if (existing.isEmpty()) showPassword(value, "Recipe saved to your vault.")
                else showExisting(existing, uid)
            } else if (manual != null) {
                showPassword(engine.generate(manual), null)
            }
        }
    }

    private fun hideKeyboard() {
        currentFocus?.let { getSystemService(InputMethodManager::class.java).hideSoftInputFromWindow(it.windowToken, 0) }
        site.stopSuggestions()
        login.stopSuggestions()
    }

    private fun showExisting(profiles: List<VaultStore.Profile>, uid: String, offline: Boolean = false) {
        if (profiles.size == 1) existingActions(profiles.first(), uid, offline)
        else showProtectedDialog(AlertDialog.Builder(this).setTitle("Choose an existing recipe")
            .setItems(profiles.map { "${it.site} · ${it.login} · v${it.version}" }.toTypedArray()) { _, index ->
                if (owner == uid) existingActions(profiles[index], uid, offline)
            }.setNegativeButton("Cancel", null))
    }

    private fun existingActions(profile: VaultStore.Profile, uid: String, offline: Boolean) {
        message("A recipe already exists for this site and login.")
        val label = if (offline) "Last synced recipe" else "Existing recipe"
        val actions = AlertDialog.Builder(this).setTitle("$label · v${profile.version}")
            .setMessage("${profile.site} · ${profile.login}")
            .setPositiveButton(if (offline) "Use last synced" else "Use current") { _, _ ->
                if (owner == uid) load(Version(profile.id))
            }.setNegativeButton("Cancel", null)
        if (!offline) actions.setNeutralButton(if (profile.draft == null) "Rotate" else "Resume rotation") { _, _ ->
            if (owner == uid) work("Opening new version…") {
                    checkOwner(uid)
                    val draft = requireNotNull(cloud).vault.prepare(profile.id)
                    setSelection(read(Version(profile.id, draft.id), uid))
            }
        }
        showProtectedDialog(actions)
    }

    private fun load(version: Version) {
        val uid = cloud?.auth?.uid ?: return
        work("Loading recipe…") { setSelection(read(version, uid)) }
    }

    private suspend fun read(version: Version, uid: String): Selection {
        val current = requireNotNull(cloud).current(version.id, uid, allowOffline = version.current)
        checkOwner(uid)
        val profile = current.profile
        if (version.history >= 0) {
            val entry = profile.history.getOrNull(version.history)
            check(entry?.number("version", 1) == version.number) { "This version changed. Open it again from the vault." }
            val archived = requireNotNull(entry)
            return Selection(version, current.copy(profile = profile.withHistoryIdentity(archived)), profile.historyOptions(archived))
        }
        val options = when {
            version.draft != null -> requireNotNull(profile.draft?.takeIf { it.id == version.draft }) {
                "This rotation changed. Open it again from the vault."
            }.options
            else -> profile.options
        }
        return Selection(version, current, options)
    }

    private fun setSelection(chosen: Selection) {
        selection = chosen
        populating = true
        site.stopSuggestions()
        login.stopSuggestions()
        site.setText(chosen.read.profile.site, false)
        login.setText(chosen.read.profile.login, false)
        modes.check(if (chosen.read.profile.secure) R.id.secure_mode else R.id.memorable_mode)
        populating = false
        updateSelection()
        message(null)
    }

    private fun clearForm() {
        dismissProtectedDialog()
        selection = null
        populating = true
        try {
            site.stopSuggestions()
            login.stopSuggestions()
            site.setText("", false)
            login.setText("", false)
            setMasterVisible(false)
            master.text.clear()
            salt.text.clear()
            if (!editingRecipe) counter.setText("1")
            length.setText("16")
            shift.setText("1")
            magic.setText("0")
            characterSets.values.forEach { it.isChecked = true }
            advancedOpen = false
            modes.check(R.id.secure_mode)
        } finally {
            populating = false
        }
        edited()
        updateSelection()
    }

    private fun updateSelection() {
        val chosen = selection
        val manual = chosen == null
        site.isEnabled = manual
        login.isEnabled = manual
        for (index in 0 until modes.childCount) modes.getChildAt(index).isEnabled = manual
        selectionLabel.visibility = shown(!manual)
        if (chosen != null) {
            val label = when {
                chosen.version.draft != null -> "New version"
                chosen.version.current -> "Current"
                else -> "Archived"
            }
            val offline = if (chosen.read.offline) " · Offline, last synced" else ""
            selectionLabel.text = "$label · v${chosen.options.number("counter", 1)}$offline"
        }
        updateMode()
    }

    private fun confirmDraft() {
        val chosen = selection ?: return
        val draft = chosen.version.draft ?: return
        val uid = owner ?: return
        showProtectedDialog(AlertDialog.Builder(this).setTitle("Make this version current?")
            .setMessage("Confirm after the website has accepted this password.")
            .setPositiveButton("Make current") { _, _ ->
                work("Saving version…") {
                    checkOwner(uid)
                    val version = requireNotNull(cloud).vault.confirm(chosen.version.id, draft)
                    setSelection(read(Version(chosen.version.id), uid))
                    message("Version $version is current.")
                }
            }.setNegativeButton("Cancel", null))
    }

    private fun work(label: String, allowStandalone: Boolean = false, keepOutput: Boolean = false,
                     block: suspend () -> Unit) {
        operation?.cancel()
        if (!keepOutput) clearOutput()
        generate.isEnabled = false
        if (keepOutput) editFields().forEach { it.isEnabled = false }
        message(label)
        operation = scope.launch(start = CoroutineStart.LAZY) {
            try {
                withTimeout(45_000) { block() }
            } catch (_: TimeoutCancellationException) {
                message("This is taking longer than expected. Check your vault before retrying.", true)
            } catch (error: CancellationException) {
                throw error
            } catch (error: Exception) {
                val offline = error is FirebaseFirestoreException && error.connectionError
                message(if (offline) "Vault is offline. Reconnect to sync changes." else error.userMessage(), true)
                standalone.visibility = shown(allowStandalone && offline)
            } finally {
                if (operation === coroutineContext[Job]) {
                    operation = null
                    generate.isEnabled = ready && (!editingRecipe || editBase != null)
                    if (keepOutput) editFields().forEach { it.isEnabled = true }
                    updateSave()
                }
            }
        }
        updateSave()
        operation?.start()
    }

    private fun editFields(): List<View> = listOf(site, login, master, showMaster, salt, length, shift, magic) + characterSets.values

    private fun edited() {
        if (populating || !::generate.isInitialized) return
        operation?.cancel()
        clearOutput()
        message(null)
    }

    private fun checkOwner(uid: String) {
        check(owner == uid && cloud?.auth?.uid == uid) { "Sign in again to open this recipe." }
        check(!appLocked) { "Unlock ZeroKey to open this recipe." }
    }

    private fun updateAccount(uid: String?) {
        if (owner != uid) {
            val hadAccount = owner != null
            owner = uid
            if (hadAccount) {
                clearForm()
                if (editingRecipe) finish()
            } else {
                dismissProtectedDialog()
                site.stopSuggestions()
                login.stopSuggestions()
                selection = null
                setMasterVisible(false)
                master.text.clear()
                edited()
                updateSelection()
            }
        }
    }

    @Suppress("DEPRECATION")
    private fun openVault() {
        startActivityForResult(Intent(this, VaultActivity::class.java), vaultRequest)
    }

    override fun onStart() {
        super.onStart()
        updateAccount(cloud?.auth?.uid)
        cloud?.auth?.addAuthStateListener(authListener)
        if (editingRecipe && ready && editBase == null && operation == null) loadEditor()
    }

    override fun onStop() {
        cloud?.auth?.removeAuthStateListener(authListener)
        dismissProtectedDialog()
        site.stopSuggestions()
        login.stopSuggestions()
        edited()
        setMasterVisible(false)
        master.text.clear()
        super.onStop()
    }

    override fun onAppAccessChanged(locked: Boolean) {
        if (!locked) return
        edited()
        site.stopSuggestions()
        login.stopSuggestions()
        setMasterVisible(false)
        master.text.clear()
    }

    @Deprecated("Activity results are used by the framework Activity")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (resultCode != RESULT_OK || requestCode != vaultRequest || data == null) return
        if (data.getBooleanExtra(VaultActivity.RESET, false)) {
            clearForm()
            return
        }
        if (data.getStringExtra(VaultActivity.OWNER) != cloud?.auth?.uid) return
        updateAccount(cloud?.auth?.uid)
        val id = data.getStringExtra(VaultActivity.PROFILE) ?: return
        load(Version(id, data.getStringExtra(VaultActivity.DRAFT),
            data.getIntExtra(VaultActivity.HISTORY, -1), data.getLongExtra(VaultActivity.VERSION, 0)))
    }

    override fun onDestroy() {
        scope.cancel()
        engine.close()
        super.onDestroy()
    }

    private fun showPassword(value: String, label: String?) {
        password = value
        updateOutput()
        message(label)
        result.doOnLayout {
            result.requestRectangleOnScreen(Rect(0, 0, result.width, result.height), false)
        }
    }

    private fun clearOutput() {
        password = null
        preview = null
        revealed = false
        standalone.visibility = View.GONE
        updateOutput()
    }

    private fun updateOutput() {
        val value = password
        result.visibility = shown(value != null)
        confirm.visibility = shown(value != null && selection?.version?.draft != null)
        output.text = when {
            value == null -> ""
            revealed -> value
            else -> "•".repeat(minOf(value.length, 24))
        }
        output.contentDescription = if (revealed || value == null) null else "Generated password hidden"
        reveal.text = if (revealed) "Hide password" else "Show password"
        updateSave()
    }

    private fun updateSave() {
        if (!editingRecipe) return
        val canSave = preview != null && operation == null && !appLocked
        saveEdit.isEnabled = canSave
        saveEdit.setColorFilter(if (canSave) accent else muted)
        saveEdit.alpha = if (canSave) 1f else 0.48f
    }

    private fun copy() {
        val value = password ?: return
        val clip = ClipData.newPlainText("ZeroKey password", value)
        clip.description.extras = PersistableBundle().apply {
            putBoolean(if (Build.VERSION.SDK_INT >= 33) ClipDescription.EXTRA_IS_SENSITIVE else "android.content.extra.IS_SENSITIVE", true)
        }
        getSystemService(ClipboardManager::class.java).setPrimaryClip(clip)
        message("Password copied.")
    }

    private fun message(value: String?, error: Boolean = false) {
        status.setTextColor(if (error) errorColor else muted)
        status.text = value
        status.visibility = shown(value != null)
    }

    private fun EditText.whole(label: String, min: Long, max: Long): Long =
        text.toString().trim().toLongOrNull()?.takeIf { it in min..max }
            ?: throw IllegalArgumentException("$label must be a whole number from $min to $max.")

    companion object {
        private const val vaultRequest = 100
        private const val limit = 9_007_199_254_740_991L
    }
}

class EditRecipeActivity : MainActivity() {
    override val editingRecipe = true
}
