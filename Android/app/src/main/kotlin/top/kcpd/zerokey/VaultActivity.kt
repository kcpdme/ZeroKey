package top.kcpd.zerokey

import androidx.appcompat.app.AlertDialog
import androidx.appcompat.content.res.AppCompatResources
import androidx.appcompat.view.ContextThemeWrapper
import androidx.appcompat.widget.ListPopupWindow
import android.content.Intent
import android.graphics.Color
import android.graphics.Rect
import android.graphics.Typeface
import android.graphics.drawable.ColorDrawable
import android.graphics.drawable.InsetDrawable
import android.os.Build
import android.os.Bundle
import android.text.TextPaint
import android.text.TextUtils
import android.util.TypedValue
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.view.inputmethod.InputMethodManager
import android.view.inputmethod.EditorInfo
import androidx.core.graphics.ColorUtils
import android.widget.ArrayAdapter
import android.widget.Button
import android.widget.EditText
import android.widget.FrameLayout
import android.widget.ImageView
import android.widget.HorizontalScrollView
import android.widget.LinearLayout
import android.widget.ListView
import android.widget.TextView
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.lifecycleScope
import androidx.lifecycle.repeatOnLifecycle
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.launch
import kotlinx.coroutines.withTimeout
import kotlin.math.ceil

class VaultActivity : AppActivity() {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)
    private var operation: Job? = null
    private var overflowMenu: ListPopupWindow? = null
    private var cloud: Cloud? = null
    private var owner: String? = null
    private var renderedAccount: Cloud.Account? = null
    private lateinit var status: TextView
    private lateinit var sync: TextView
    private lateinit var emptyMark: View
    private lateinit var emptySpinner: View
    private lateinit var emptyTitle: TextView
    private lateinit var emptyDetail: TextView
    private lateinit var openGenerator: View
    private lateinit var adapter: RecipeAdapter
    private var syncState = Cloud.Sync.CONNECTING
    private var cacheLoaded = false
    private var profiles = emptyList<VaultStore.Profile>()
    private var search = ""
    private var category: String? = null
    private var hasRendered = false
    private lateinit var chips: LinearLayout
    private val chipButtons = mutableMapOf<String?, Button>()
    private var renderedCategories = emptyList<RecipeCategory>()
    private var useSiteIcons = false
    private val visibleIcons = mutableSetOf<Job>()

    override fun onCreate(state: Bundle?) {
        super.onCreate(state)
        val service = Cloud.get(this)
        cloud = service
        if (Build.VERSION.SDK_INT >= 34) {
            overrideActivityTransition(OVERRIDE_TRANSITION_OPEN, R.anim.tab_enter, R.anim.tab_exit)
            overrideActivityTransition(OVERRIDE_TRANSITION_CLOSE, R.anim.tab_enter, R.anim.tab_exit)
        }
        render(service?.account?.value)
        if (service != null) lifecycleScope.launch {
            repeatOnLifecycle(Lifecycle.State.STARTED) {
                service.account.collectLatest { account ->
                    render(account)
                    if (account is Cloud.Account.SignedIn) observeRecipes(service, account.uid)
                }
            }
        }
    }

    override fun onStart() {
        super.onStart()
        useSiteIcons = AppPreferences.icons(this)
        render(cloud?.account?.value)
    }

    override fun onStop() {
        cancelIcons()
        dismissProtectedDialog()
        overflowMenu?.dismiss()
        super.onStop()
    }

    override fun onAppAccessChanged(locked: Boolean) {
        if (locked) {
            overflowMenu?.dismiss()
            cancelIcons()
        } else if (::adapter.isInitialized) {
            adapter.notifyDataSetChanged()
        }
    }

    override fun onDestroy() {
        scope.cancel()
        super.onDestroy()
    }

    private fun render(session: Cloud.Account?) {
        val sessionUid = (session as? Cloud.Account.SignedIn)?.uid
        val account = if (session != null && cloud?.auth?.uid != sessionUid) {
            Cloud.Account.Restoring
        } else session
        if (hasRendered && renderedAccount == account) return
        val uid = (account as? Cloud.Account.SignedIn)?.uid
        if (owner != uid) {
            search = ""
            category = null
        }
        hasRendered = true
        renderedAccount = account
        owner = uid
        cancelIcons()
        dismissProtectedDialog()
        overflowMenu?.dismiss()
        profiles = emptyList()
        syncState = Cloud.Sync.CONNECTING
        cacheLoaded = false
        useSiteIcons = AppPreferences.icons(this)
        val fab = iconButton(R.drawable.ic_add, "New recipe", ::newRecipe).apply {
            id = R.id.new_recipe
            setColorFilter(onAccent)
            background = pressable(accent, 18)
            elevation = dp(5).toFloat()
        }
        val ui = page(scrollable = false, navigation = dock(generator = false, openOther = ::finish), floatingAction = fab)
        add(ui, brandBar(settingsAction()))
        val searchBox = EditText(this).apply {
            id = R.id.vault_search
            prepare("Search sites, logins or tags")
            imeOptions = (imeOptions and EditorInfo.IME_MASK_ACTION.inv()) or EditorInfo.IME_ACTION_SEARCH
            isEnabled = uid != null
            val glyph = getDrawable(R.drawable.ic_search)?.mutate()
            glyph?.setTint(muted)
            glyph?.setBounds(0, 0, dp(20), dp(20))
            setCompoundDrawablesRelative(glyph, null, null, null)
            compoundDrawablePadding = dp(10)
            setText(search)
            watchText { search = it; filter() }
            setOnEditorActionListener { view, action, _ ->
                if (action != EditorInfo.IME_ACTION_SEARCH) return@setOnEditorActionListener false
                getSystemService(InputMethodManager::class.java).hideSoftInputFromWindow(view.windowToken, 0)
                true
            }
        }
        add(ui, searchBox, 10)
        if (uid == null) {
            addAccountStatus(ui, account)
            return
        }
        chips = LinearLayout(this)
        renderedCategories = emptyList()
        add(ui, HorizontalScrollView(this).apply {
            isHorizontalScrollBarEnabled = false
            clipToPadding = false
            clipChildren = false
            addView(chips)
        }, 10)
        sync = text("").apply {
            accessibilityLiveRegion = View.ACCESSIBILITY_LIVE_REGION_POLITE
        }
        add(ui, sync, 9)
        status = text("").apply { accessibilityLiveRegion = View.ACCESSIBILITY_LIVE_REGION_POLITE }
        add(ui, status)
        message(null)
        addRecipes(ui)
        updateChips()
        filter()
    }

    private suspend fun observeRecipes(service: Cloud, uid: String) {
        service.sync.collectLatest { state ->
            // A new sync state starts with a fresh Room read after the server transaction commits.
            service.cache.observe(uid).collect { cached ->
                if (service.auth.uid != uid || owner != uid) return@collect
                cacheLoaded = true
                profiles = cached.map(RecipeRow::profile)
                syncState = state
                sync.text = when {
                    profiles.isEmpty() -> ""
                    state == Cloud.Sync.OFFLINE -> "Offline · Last synced recipes"
                    state == Cloud.Sync.UNAVAILABLE -> "Could not sync your vault"
                    else -> ""
                }
                sync.setTextColor(if (state == Cloud.Sync.UNAVAILABLE) errorColor else muted)
                sync.visibility = shown(sync.text.isNotEmpty())
                updateChips()
                filter()
            }
        }
    }

    private fun addAccountStatus(ui: LinearLayout, account: Cloud.Account?) {
        val title = when (account) {
            Cloud.Account.Restoring -> "Opening Vault…"
            Cloud.Account.SignedOut -> "Sign in to your vault"
            else -> "Vault unavailable"
        }
        val empty = column().apply {
            gravity = Gravity.CENTER
            setPadding(dp(12), dp(16), dp(12), dp(16))
            if (account == Cloud.Account.Restoring) {
                addView(busyIndicator(), LinearLayout.LayoutParams(dp(34), dp(34)).apply { bottomMargin = dp(16) })
            }
            add(this, heading(title, 23f).apply {
                gravity = Gravity.CENTER
                accessibilityLiveRegion = View.ACCESSIBILITY_LIVE_REGION_POLITE
            })
            if (account != Cloud.Account.Restoring) {
                add(this, text(if (account == Cloud.Account.SignedOut) "Sign in to sync and open your saved recipes."
                    else "You can still generate passwords on this device.").apply { gravity = Gravity.CENTER }, 8)
            }
            if (account == Cloud.Account.SignedOut) addView(primaryButton("Sign in") {
                startActivity(Intent(this@VaultActivity, SignInActivity::class.java))
            }.apply { id = R.id.vault_sign_in }, LinearLayout.LayoutParams(-2, -2).apply { topMargin = dp(18) })
        }
        ui.addView(empty, LinearLayout.LayoutParams(-1, 0, 1f))
    }

    private fun addRecipes(ui: LinearLayout) {
        val rows = RecipeAdapter()
        adapter = rows
        val separatorInset = dp(recipeStartPadding + recipeIconSize + recipeLabelGap)
        val rtl = resources.configuration.layoutDirection == View.LAYOUT_DIRECTION_RTL
        val list = ListView(this).apply {
            id = R.id.vault_list
            adapter = rows
            divider = InsetDrawable(
                ColorDrawable(ColorUtils.setAlphaComponent(strokeColor, 168)),
                if (rtl) 0 else separatorInset, 0, if (rtl) separatorInset else 0, 0,
            )
            dividerHeight = dp(1)
            itemsCanFocus = true
            clipToPadding = false
            setPadding(0, dp(8), 0, dp(84))
        }
        val empty = column().apply {
            gravity = Gravity.CENTER
            setPadding(dp(18), dp(18), dp(18), dp(18))
            emptyMark = icon(R.drawable.ic_vault, accent).apply {
                setPadding(dp(12), dp(12), dp(12), dp(12))
                background = rounded(accentSurface, 15)
            }
            emptySpinner = busyIndicator().apply { id = R.id.vault_progress_spinner }
            addView(FrameLayout(this@VaultActivity).apply {
                addView(emptyMark, FrameLayout.LayoutParams(-1, -1))
                addView(emptySpinner, FrameLayout.LayoutParams(dp(34), dp(34), Gravity.CENTER))
            }, LinearLayout.LayoutParams(dp(48), dp(48)))
            emptyTitle = heading("", 20f).apply {
                gravity = Gravity.CENTER
                accessibilityLiveRegion = View.ACCESSIBILITY_LIVE_REGION_POLITE
            }
            add(this, emptyTitle, 13)
            emptyDetail = text("").apply { gravity = Gravity.CENTER }
            add(this, emptyDetail, 6)
            openGenerator = button("Open generator", ::finish)
            addView(openGenerator, LinearLayout.LayoutParams(-2, -2).apply { topMargin = dp(16) })
        }
        val frame = FrameLayout(this).apply {
            addView(list, FrameLayout.LayoutParams(-1, -1))
            addView(empty, FrameLayout.LayoutParams(-1, -1))
        }
        ui.addView(frame, LinearLayout.LayoutParams(-1, 0, 1f))
        list.emptyView = empty
    }

    private fun settingsAction() = iconButton(R.drawable.ic_account, "Account and settings") {
        startActivity(Intent(this, SettingsActivity::class.java))
    }.apply { id = R.id.settings_button }

    private fun updateChips() {
        val tags = recipeCategories(profiles.flatMap { it.tags })
        if (category != null && category != favoritesCategory && tags.none { it.key == category }) category = null
        if (renderedCategories == tags && chips.childCount > 0) return
        renderedCategories = tags
        drawChips()
    }

    private fun drawChips() {
        chips.removeAllViews()
        chipButtons.clear()
        chips.clipChildren = false
        val labels = listOf(null to "All", favoritesCategory to "Favorites") + renderedCategories.map { it.key to it.label }
        for ((index, label) in labels.withIndex()) {
            val (key, title) = label
            val chip = button(title) {
                category = key
                updateChipSelection()
                filter()
            }.apply {
                if (key == null) id = R.id.filter_all
                minHeight = dp(48)
                minimumHeight = minHeight
                minWidth = 0
                minimumWidth = 0
                compoundDrawablePadding = dp(7)
            }
            chipButtons[key] = chip
            chips.addView(chip, LinearLayout.LayoutParams(-2, -2).apply {
                if (index < labels.lastIndex) marginEnd = dp(8)
            })
        }
        updateChipSelection()
    }

    private fun updateChipSelection() {
        for ((key, chip) in chipButtons) {
            val selected = key == category
            val ink = if (selected) onAccent else muted
            chip.isSelected = selected
            chip.setTextColor(if (selected) onAccent else inkColor)
            chip.background = InsetDrawable(
                pressable(if (selected) accent else surface, 18, if (selected) null else strokeColor),
                0, dp(5), 0, dp(5),
            )
            chip.setPadding(dp(11), dp(6), dp(11), dp(6))
            chip.elevation = if (selected) dp(2).toFloat() else 0f
            val marker = when (key) {
                null -> getDrawable(R.drawable.ic_filter_all)?.mutate()?.apply {
                    setTint(ink)
                    setBounds(0, 0, dp(18), dp(18))
                }
                favoritesCategory -> getDrawable(R.drawable.ic_star_small)?.mutate()?.apply {
                    setTint(ink)
                    setBounds(0, 0, dp(16), dp(16))
                }
                else -> {
                    val tint = if (selected) onAccent else recipeCategory(key).color
                    rounded(tint, 6).apply { setBounds(0, 0, dp(9), dp(9)) }
                }
            }
            chip.setCompoundDrawablesRelative(marker, null, null, null)
        }
    }

    private fun filter() {
        val query = lookupText(search)
        val visible = profiles.filter { profile ->
            val inCategory = when (category) {
                null -> true
                favoritesCategory -> profile.favorite
                else -> profile.tags.any { lookupText(it) == category }
            }
            inCategory && (query.isEmpty() || (listOf(profile.site, profile.login) + profile.tags).any { query in lookupText(it) })
        }
        adapter.apply {
            setNotifyOnChange(false)
            clear()
            addAll(visible)
            notifyDataSetChanged()
        }
        val filtered = query.isNotEmpty() || category != null
        val emptyVault = profiles.isEmpty() && syncState == Cloud.Sync.ONLINE && !filtered
        val firstSync = profiles.isEmpty() && syncState == Cloud.Sync.CONNECTING
        val waiting = !cacheLoaded || firstSync
        emptySpinner.visibility = shown(waiting)
        emptyMark.visibility = shown(!waiting)
        emptyTitle.text = when {
            !cacheLoaded -> "Opening Vault…"
            firstSync -> "Syncing recipes…"
            filtered -> "No matching recipes"
            emptyVault -> "No saved recipes"
            syncState == Cloud.Sync.OFFLINE -> "No saved recipes on this device"
            else -> "Could not sync your vault"
        }
        emptyDetail.text = when {
            waiting -> ""
            filtered -> "Change your search or category."
            emptyVault -> "Generate a password to save your first recipe."
            else -> "Connect to the internet to sync your vault."
        }
        openGenerator.visibility = shown(emptyVault)
    }

    private fun cancelIcons() {
        visibleIcons.toList().forEach(Job::cancel)
        visibleIcons.clear()
    }

    private inner class RecipeAdapter : ArrayAdapter<VaultStore.Profile>(this@VaultActivity, 0) {
        override fun getView(position: Int, convertView: View?, parent: ViewGroup): View =
            (convertView as? RecipeRowView ?: RecipeRowView()).apply { bind(requireNotNull(getItem(position))) }
    }

    private inner class RecipeRowView : LinearLayout(this@VaultActivity) {
        private val badge = text("", 17f, accent).apply {
            gravity = Gravity.CENTER
            typeface = Typeface.create("sans-serif-medium", Typeface.NORMAL)
        }
        private val favicon = ImageView(context).apply {
            scaleType = ImageView.ScaleType.FIT_CENTER
            setPadding(dp(7), dp(7), dp(7), dp(7))
            visibility = View.GONE
        }
        private val site = text("", 16f, inkColor).apply {
            typeface = Typeface.create("sans-serif-medium", Typeface.NORMAL)
            maxLines = 1
            ellipsize = TextUtils.TruncateAt.END
        }
        private val login = text("", 14f).apply {
            maxLines = 1
            ellipsize = TextUtils.TruncateAt.END
        }
        private val star = icon(R.drawable.ic_star_small, accent).apply {
            importantForAccessibility = View.IMPORTANT_FOR_ACCESSIBILITY_YES
            contentDescription = "Favorite"
        }
        private var recipe: VaultStore.Profile? = null
        private val more = actionIcon(R.drawable.ic_more_vertical, "Recipe actions").apply {
            id = R.id.recipe_overflow
            setColorFilter(muted)
            setOnClickListener { anchor -> recipe?.let { showActions(it, anchor) } }
        }
        private var iconJob: Job? = null

        init {
            gravity = Gravity.CENTER_VERTICAL
            minimumHeight = dp(66)
            setPaddingRelative(dp(recipeStartPadding), dp(8), 0, dp(8))
            background = pressable(Color.TRANSPARENT, 12)
            isFocusable = true
            setOnClickListener { recipe?.let { select(it) } }
            val tile = FrameLayout(context).apply {
                background = rounded(fieldSurface, 14)
                importantForAccessibility = View.IMPORTANT_FOR_ACCESSIBILITY_NO_HIDE_DESCENDANTS
                addView(badge, FrameLayout.LayoutParams(-1, -1))
                addView(favicon, FrameLayout.LayoutParams(-1, -1))
            }
            addView(tile, LayoutParams(dp(recipeIconSize), dp(recipeIconSize)))
            val labels = column().apply {
                add(this, site)
                add(this, login, 2)
            }
            addView(labels, LayoutParams(0, -2, 1f).apply { marginStart = dp(recipeLabelGap) })
            addView(star, LayoutParams(dp(16), dp(16)))
            addView(more, LayoutParams(dp(48), dp(48)))
        }

        fun bind(profile: VaultStore.Profile) {
            iconJob?.cancel()
            recipe = profile
            badge.text = profile.site.firstOrNull()?.uppercaseChar()?.toString() ?: "?"
            badge.visibility = View.VISIBLE
            favicon.visibility = View.GONE
            favicon.setImageDrawable(null)
            site.text = profile.site
            login.text = profile.login
            star.visibility = shown(profile.favorite)
            more.contentDescription = "Actions for ${profile.site}, ${profile.login}"

            val host = if (useSiteIcons) SiteIcons.domain(profile.site) else null
            if (host != null && !AppLock.locked(context)) {
                iconJob = scope.launch {
                    val image = SiteIcons.get(host)
                    if (image != null && AppPreferences.icons(context) && !AppLock.locked(context)) {
                        favicon.setImageBitmap(image)
                        favicon.visibility = View.VISIBLE
                        badge.visibility = View.GONE
                    }
                }.also { task ->
                    visibleIcons.add(task)
                    task.invokeOnCompletion { scope.launch { visibleIcons.remove(task) } }
                }
            }
        }

        override fun onDetachedFromWindow() {
            iconJob?.cancel()
            super.onDetachedFromWindow()
        }
    }

    private fun showActions(profile: VaultStore.Profile, anchor: View) {
        val service = requireNotNull(cloud)
        if (profile.userId != service.auth.uid || appLocked) return
        val entries = listOf(
            RecipeAction("Generate", R.drawable.ic_key, accent) { select(profile) },
            RecipeAction("Rotate", R.drawable.ic_rotate, getColor(R.color.recipe_action_rotate)) { rotationActions(profile) },
            RecipeAction("Edit", R.drawable.ic_edit, getColor(R.color.recipe_action_edit)) { editRecipe(profile) },
            RecipeAction(if (profile.favorite) "Unstar" else "Star",
                if (profile.favorite) R.drawable.ic_star_small else R.drawable.ic_star_outline,
                getColor(R.color.recipe_action_star)) {
                write(profile, "Updating favorite…") { service.vault.favorite(profile.id, !profile.favorite) }
            },
            RecipeAction("Category", R.drawable.ic_tag, getColor(R.color.recipe_action_category)) { editCategories(profile) },
            RecipeAction("Delete", R.drawable.ic_delete, errorColor) {
                showProtectedDialog(AlertDialog.Builder(this).setTitle("Delete ${profile.site}?")
                    .setMessage("This removes the recipe and its version history from your vault.")
                    .setPositiveButton("Delete") { _, _ ->
                        write(profile, "Deleting recipe…") { service.vault.delete(profile.id) }
                    }.setNegativeButton("Cancel", null))
            },
        )
        overflowMenu?.dismiss()
        val popup = buildRecipeMenu(anchor, entries)
        popup.setOnItemClickListener { _, _, position, _ ->
            popup.dismiss()
            if (profile.userId == service.auth.uid && !appLocked) {
                entries[position].run()
            }
        }
        popup.setOnDismissListener { if (overflowMenu === popup) overflowMenu = null }
        overflowMenu = popup
        popup.show()
    }

    private fun buildRecipeMenu(anchor: View, entries: List<RecipeAction>): ListPopupWindow {
        val sidePadding = dp(12)
        val iconSize = dp(20)
        val iconGap = dp(10)
        val labelSize = 15f
        val labelTypeface = Typeface.create("sans-serif-medium", Typeface.NORMAL)
        val paint = TextPaint().apply {
            typeface = labelTypeface
            textSize = TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_SP, labelSize, resources.displayMetrics)
        }
        val labelWidth = ceil(entries.maxOf { paint.measureText(it.label) }).toInt()
        val frame = Rect().also(anchor::getWindowVisibleDisplayFrame)
        val menuWidth = (2 * sidePadding + iconSize + iconGap + labelWidth).coerceAtMost(frame.width())
        val rows = object : ArrayAdapter<RecipeAction>(this, 0, entries) {
            override fun getView(position: Int, convertView: View?, parent: ViewGroup): View {
                val action = requireNotNull(getItem(position))
                val row = convertView as? TextView ?: text("", labelSize, inkColor).apply {
                    typeface = labelTypeface
                    gravity = Gravity.CENTER_VERTICAL
                    minimumHeight = dp(48)
                    setPaddingRelative(sidePadding, 0, sidePadding, 0)
                    compoundDrawablePadding = iconGap
                    maxLines = 1
                    ellipsize = TextUtils.TruncateAt.END
                }
                row.text = action.label
                val icon = AppCompatResources.getDrawable(this@VaultActivity, action.icon)?.mutate()
                icon?.setTint(action.tint)
                icon?.setBounds(0, 0, iconSize, iconSize)
                row.setCompoundDrawablesRelative(icon, null, null, null)
                return row
            }
        }
        val menuContext = ContextThemeWrapper(this, R.style.ThemeOverlay_ZeroKey_RecipeMenu)
        return ListPopupWindow(menuContext).apply {
            anchorView = anchor
            setDropDownGravity(Gravity.END)
            isModal = true
            inputMethodMode = ListPopupWindow.INPUT_METHOD_NOT_NEEDED
            setBackgroundDrawable(rounded(surface, 14, strokeColor))
            setContentWidth(menuWidth)
            setAdapter(rows)
        }
    }

    private data class RecipeAction(val label: String, val icon: Int, val tint: Int, val run: () -> Unit)

    private fun history(profile: VaultStore.Profile) {
        val entries = profile.history.withIndex().reversed()
        showProtectedDialog(AlertDialog.Builder(this).setTitle("Version history")
            .setItems(entries.map { "Version ${it.value.number("version", 1)}" }.toTypedArray()) { _, index ->
                val entry = entries[index]
                select(profile, history = entry.index, number = entry.value.number("version", 1))
            }.setNegativeButton("Close", null))
    }

    private fun rotationActions(profile: VaultStore.Profile) {
        val service = requireNotNull(cloud)
        val draft = profile.draft
        val openDraft = {
            if (draft != null) select(profile, draft = draft.id)
            else write(profile, "Preparing new version…") { select(profile, draft = service.vault.prepare(profile.id).id) }
        }
        if (draft == null && profile.history.isEmpty()) {
            openDraft()
            return
        }

        val items = linkedMapOf(if (draft == null) "Start rotation" to openDraft else "Resume rotation" to openDraft)
        if (profile.history.isNotEmpty()) items["Version history"] = { history(profile) }
        if (draft != null) items["Discard rotation"] = {
            showProtectedDialog(AlertDialog.Builder(this).setTitle("Discard this rotation?")
                .setPositiveButton("Discard") { _, _ ->
                    write(profile, "Discarding rotation…") { service.vault.discard(profile.id, draft.id) }
                }.setNegativeButton("Cancel", null))
        }
        val entries = items.entries.toList()
        showProtectedDialog(AlertDialog.Builder(this).setTitle("Password versions")
            .setItems(entries.map { it.key }.toTypedArray()) { _, index -> entries[index].value.invoke() }
            .setNegativeButton("Close", null))
    }

    private fun editCategories(profile: VaultStore.Profile) {
        showProtectedDialog(categoryPicker(profile.site, profiles.flatMap { it.tags }, profile.tags) { selected ->
            if (selected.map(::lookupText).toSet() != profile.tags.map(::lookupText).toSet()) {
                write(profile, "Saving categories…") { requireNotNull(cloud).vault.updateCategories(profile.id, profile.tags, selected) }
            }
        })
    }

    private fun editRecipe(profile: VaultStore.Profile) {
        startActivity(Intent(this, EditRecipeActivity::class.java)
            .putExtra(OWNER, profile.userId).putExtra(PROFILE, profile.id))
    }

    private fun newRecipe() {
        if (appLocked) return
        setResult(RESULT_OK, Intent().putExtra(RESET, true))
        finish()
    }

    private fun select(profile: VaultStore.Profile, draft: String? = null, history: Int = -1, number: Long = 0) {
        if (profile.userId != cloud?.auth?.uid || appLocked) return
        setResult(RESULT_OK, Intent().putExtra(OWNER, profile.userId).putExtra(PROFILE, profile.id)
            .putExtra(DRAFT, draft).putExtra(HISTORY, history).putExtra(VERSION, number))
        finish()
    }

    private fun write(profile: VaultStore.Profile, label: String, update: suspend () -> Unit) {
        val service = requireNotNull(cloud)
        if (profile.userId != service.auth.uid || appLocked) return
        if (service.sync.value != Cloud.Sync.ONLINE) {
            message("Reconnect to change recipes.", true)
            return
        }
        work(label) { withTimeout(15_000) { update() } }
    }

    private fun work(label: String, block: suspend () -> Unit) {
        if (operation?.isActive == true) return
        val uid = owner
        message(label)
        operation = scope.launch {
            try {
                block()
                if (owner == uid) message(null)
            } catch (_: kotlinx.coroutines.TimeoutCancellationException) {
                if (owner == uid) message("Sync is taking longer than expected. Check the vault before retrying.", true)
            } catch (error: CancellationException) {
                throw error
            } catch (error: Exception) {
                if (owner == uid) message(error.userMessage(), true)
            }
        }
    }

    private fun message(value: String?, error: Boolean = false) {
        status.text = value
        status.setTextColor(if (error) errorColor else muted)
        status.visibility = shown(value != null)
    }

    companion object {
        private const val recipeStartPadding = 4
        private const val recipeIconSize = 42
        private const val recipeLabelGap = 12
        private const val favoritesCategory = "\u0000favorites"
        internal const val OWNER = "owner"
        internal const val RESET = "reset"
        internal const val PROFILE = "profile"
        internal const val DRAFT = "draft"
        internal const val HISTORY = "historyIndex"
        internal const val VERSION = "historyVersion"
    }
}
