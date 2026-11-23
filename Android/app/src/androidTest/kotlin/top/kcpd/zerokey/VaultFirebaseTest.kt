package top.kcpd.zerokey

import android.app.Activity
import android.app.Instrumentation
import android.content.ComponentName
import android.content.Intent
import android.accessibilityservice.AccessibilityServiceInfo
import android.graphics.Rect
import android.os.SystemClock
import android.os.Bundle
import android.os.ParcelFileDescriptor
import android.view.View
import android.view.accessibility.AccessibilityNodeInfo
import android.widget.Button
import android.widget.AutoCompleteTextView
import android.widget.CheckBox
import android.widget.EditText
import android.widget.ListView
import android.widget.RadioButton
import android.widget.TextView
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.room.Room
import androidx.test.core.app.ActivityScenario
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import com.google.firebase.FirebaseApp
import com.google.firebase.firestore.FirebaseFirestore
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.tasks.await
import kotlinx.coroutines.withTimeout
import kotlinx.coroutines.withContext
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Assume.assumeTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import java.util.UUID

@RunWith(AndroidJUnit4::class)
class VaultFirebaseTest {
    private lateinit var cloud: Cloud
    private lateinit var email: String
    private lateinit var uid: String
    private val accountPassword = "synthetic-auth-fixture"

    @Before fun makeSyntheticAccount() {
        assumeTrue("Requires a Firebase emulator build", BuildConfig.FIREBASE_EMULATOR)
        cloud = requireNotNull(Cloud.get(InstrumentationRegistry.getInstrumentation().targetContext))
        cloud.auth.signOut()
        email = "${UUID.randomUUID()}@example.test"
        uid = runBlocking { withTimeout(20_000) {
            requireNotNull(cloud.auth.createUserWithEmailAndPassword(email, accountPassword).await().user).uid
        } }
    }

    @After fun signOut() {
        if (::cloud.isInitialized) cloud.auth.signOut()
    }

    @Test fun launcherOpensVaultWithVisibleSearchAndSignInReturnsToVault() {
        val instrumentation = InstrumentationRegistry.getInstrumentation()
        val launcherIntent = Intent.makeMainActivity(ComponentName(instrumentation.targetContext, MainActivity::class.java))
        cloud.auth.signOut()
        lateinit var generator: ActivityScenario<MainActivity>
        val vault = instrumentation.opens(VaultActivity::class.java) {
            generator = ActivityScenario.launch(launcherIntent)
        }
        generator.use {
            instrumentation.runOnMainSync {
                val search = vault.findViewById<EditText>(R.id.vault_search)
                assertTrue(search.isShown)
                assertFalse(search.isEnabled)
            }
            val openSignIn = {
                instrumentation.opens(SignInActivity::class.java) {
                    instrumentation.runOnMainSync { vault.findViewById<View>(R.id.vault_sign_in).performClick() }
                }
            }
            val canceled = openSignIn()
            instrumentation.runOnMainSync { canceled.findViewById<View>(R.id.sign_in_back).performClick() }
            assertTrue(instrumentation.waitForNodeById("vault_sign_in").isVisibleToUser)
            assertNull(cloud.auth.uid)

            val signIn = openSignIn()
            instrumentation.runOnMainSync {
                signIn.findViewById<EditText>(R.id.account_email).setText(email)
                signIn.findViewById<EditText>(R.id.account_password).setText(accountPassword)
                signIn.findViewById<View>(R.id.email_sign_in).performClick()
                val progress = signIn.findViewById<TextView>(R.id.account_progress_title)
                assertTrue(progress.isShown)
                assertEquals("Signing in…", progress.text.toString())
                assertTrue(signIn.findViewById<View>(R.id.account_progress_spinner).isShown)
                assertFalse(signIn.findViewById<View>(R.id.account_email).isShown)
            }
            assertTrue(instrumentation.waitForNodeById("vault_search", enabled = true).isVisibleToUser)
            assertEquals(uid, cloud.auth.uid)
            instrumentation.runOnMainSync {
                val search = vault.findViewById<EditText>(R.id.vault_search)
                assertTrue(search.isShown)
                assertFalse(search.hasFocus())
                assertNull(vault.findViewById<View>(R.id.vault_sign_in))
                assertTrue(vault.findViewById<View>(R.id.settings_button).isShown)
                vault.findViewById<View>(R.id.generator_tab).performClick()
            }
            generator.waitForView(R.id.site)
        }

        val reopened = instrumentation.opens(VaultActivity::class.java) {
            generator = ActivityScenario.launch(launcherIntent)
        }
        generator.use {
            assertTrue(instrumentation.waitForNodeById("vault_search", enabled = true).isVisibleToUser)
            instrumentation.runOnMainSync {
                assertNull(reopened.findViewById<View>(R.id.vault_sign_in))
                reopened.findViewById<View>(R.id.generator_tab).performClick()
            }
            generator.waitForView(R.id.site)
        }
    }

    @Test fun firstSyncShowsProgressAndReopeningShowsCachedRecipes() = test {
        val site = "first-sync.example"
        val account = VaultStore.Account(email, site, site, site)
        cloud.vault.create(uid, account, "pbkdf2", emptyMap())
        waitForRecipe()
        cloud.auth.signOut()
        cloud.cache.observe(uid).first { it.isEmpty() }

        val instrumentation = InstrumentationRegistry.getInstrumentation()
        val firestore = FirebaseFirestore.getInstance(FirebaseApp.getInstance("zerokey-emulator"))
        firestore.disableNetwork().await()
        try {
            ActivityScenario.launch(VaultActivity::class.java).use { vault ->
                vault.waitForView(R.id.vault_sign_in, enabled = true)
                cloud.auth.signInWithEmailAndPassword(email, accountPassword).await()
                instrumentation.waitForNode("Syncing recipes…")
                vault.onActivity {
                    assertNull(it.findViewById<View>(R.id.vault_sign_in))
                    assertTrue(it.findViewById<View>(R.id.vault_progress_spinner).isShown)
                }
                firestore.enableNetwork().await()
                instrumentation.waitForNode(site)
                cloud.sync.first { it == Cloud.Sync.ONLINE }
                vault.onActivity { assertFalse(it.findViewById<View>(R.id.vault_progress_spinner).isShown) }
            }
            firestore.disableNetwork().await()
            ActivityScenario.launch(VaultActivity::class.java).use { vault ->
                instrumentation.waitForNode(site)
                instrumentation.waitForNode("Offline · Last synced recipes")
                vault.onActivity { assertNull(it.findViewById<View>(R.id.vault_sign_in)) }
            }
        } finally {
            firestore.enableNetwork().await()
        }
    }

    private fun <A : Activity> Instrumentation.opens(screen: Class<A>, action: () -> Unit): A {
        val monitor = addMonitor(screen.name, null, false)
        try {
            action()
            val activity = waitForMonitorWithTimeout(monitor, 15_000)
                ?: throw AssertionError("${screen.simpleName} did not open")
            waitForIdleSync()
            return screen.cast(activity) ?: throw AssertionError("Unexpected activity")
        } finally {
            removeMonitor(monitor)
        }
    }

    @Test fun settingsRoundTripKeepsGeneratorBelowStatusBar() {
        val instrumentation = InstrumentationRegistry.getInstrumentation()
        launchGenerator().use { generator ->
            generator.waitFor("Generator did not receive window insets") {
                val settings = it.findViewById<View>(R.id.settings_button)
                it.hasWindowFocus() && ViewCompat.getRootWindowInsets(settings) != null && settings.isLaidOut
            }
            var initialTop = 0
            val settings = instrumentation.opens(SettingsActivity::class.java) {
                generator.onActivity {
                    val button = it.findViewById<View>(R.id.settings_button)
                    initialTop = IntArray(2).also(button::getLocationInWindow)[1]
                    val statusBar = requireNotNull(ViewCompat.getRootWindowInsets(button))
                        .getInsetsIgnoringVisibility(WindowInsetsCompat.Type.statusBars()).top
                    assertTrue(initialTop >= statusBar)
                    button.performClick()
                }
            }
            instrumentation.runOnMainSync { settings.finish() }
            generator.waitFor("Generator did not regain focus") { it.hasWindowFocus() }
            generator.onActivity {
                val button = it.findViewById<View>(R.id.settings_button)
                assertEquals(initialTop, IntArray(2).also(button::getLocationInWindow)[1])
            }
        }
    }

    @Test fun clearFormResetsLoadedRecipeAndManualInputs() = test {
        val account = VaultStore.Account(email, "saved.example", "saved.example", "saved.example")
        cloud.vault.create(uid, account, "memorizable", mapOf("shift" to 2, "magicNumber" to 9))
        val profile = waitForRecipe()
        cloud.vault.tags(profile.id, listOf("Work"))

        val instrumentation = InstrumentationRegistry.getInstrumentation()
        launchGenerator().use { generator ->
            generator.waitForView(R.id.generate, enabled = true)
            val vault = instrumentation.opens(VaultActivity::class.java) {
                generator.onActivity {
                    it.findViewById<EditText>(R.id.salt).setText("temporary salt")
                    it.findViewById<View>(R.id.advanced_options).performClick()
                    it.findViewById<EditText>(R.id.rotation).setText("4")
                    it.findViewById<EditText>(R.id.length).setText("24")
                    it.findViewById<View>(R.id.vault_button).performClick()
                }
            }
            val deadline = SystemClock.elapsedRealtime() + 10_000
            var selected = false
            while (!selected && SystemClock.elapsedRealtime() < deadline) {
                instrumentation.runOnMainSync {
                    val row = vault.findViewById<ListView>(R.id.vault_list)?.getChildAt(0)
                    if (row != null && vault.hasWindowFocus()) selected = row.performClick()
                }
                if (!selected) SystemClock.sleep(100)
            }
            assertTrue("The saved recipe row did not open", selected)
            generator.waitFor("The saved recipe did not load in the generator") {
                val site = it.findViewById<EditText>(R.id.site)
                site.text.toString() == "saved.example" && !site.isEnabled
            }
            generator.onActivity {
                assertTrue(it.findViewById<RadioButton>(R.id.memorable_mode).isChecked)
                it.findViewById<View>(R.id.generate).performClick()
            }
            generator.waitForView(R.id.show_password)
            generator.onActivity {
                it.findViewById<View>(R.id.generator_clear_form).performClick()
                assertTrue(it.findViewById<RadioButton>(R.id.secure_mode).isChecked)
                assertFalse(it.findViewById<View>(R.id.generated_password).isShown)
                assertTrue(it.findViewById<EditText>(R.id.site).isEnabled)
                assertTrue(it.findViewById<EditText>(R.id.login).isEnabled)
                for (field in listOf(R.id.site, R.id.login, R.id.salt)) {
                    assertEquals("", it.findViewById<EditText>(field).text.toString())
                }
                assertEquals("1", it.findViewById<EditText>(R.id.rotation).text.toString())
                assertEquals("16", it.findViewById<EditText>(R.id.length).text.toString())
                it.findViewById<EditText>(R.id.site).setText("another.example")
                it.findViewById<EditText>(R.id.master_key).setText("temporary master key")
                it.findViewById<View>(R.id.show_master_key).performClick()
                it.findViewById<View>(R.id.generator_clear_form).performClick()
                assertEquals("", it.findViewById<EditText>(R.id.site).text.toString())
                assertEquals("", it.findViewById<EditText>(R.id.master_key).text.toString())
                assertEquals("Show master key", it.findViewById<View>(R.id.show_master_key).contentDescription)
                it.findViewById<EditText>(R.id.site).setText("discard.example")
                it.findViewById<EditText>(R.id.login).setText("discard@example.test")
                it.findViewById<RadioButton>(R.id.memorable_mode).performClick()
            }
            val reopened = instrumentation.opens(VaultActivity::class.java) {
                generator.onActivity { it.findViewById<View>(R.id.vault_button).performClick() }
            }
            instrumentation.runOnMainSync {
                val vaultTab = reopened.findViewById<View>(R.id.vault_button)
                val generatorTab = reopened.findViewById<View>(R.id.generator_tab)
                assertTrue(vaultTab.left < generatorTab.left)
                assertTrue(vaultTab.isSelected)
                assertTrue(reopened.findViewById<View>(R.id.new_recipe).performClick())
            }
            generator.waitFor("New recipe did not reset the generator") {
                it.findViewById<EditText>(R.id.site).text.isEmpty() &&
                    it.findViewById<EditText>(R.id.login).text.isEmpty() &&
                    it.findViewById<RadioButton>(R.id.secure_mode).isChecked
            }
        }
        assertEquals(listOf("Work"), cloud.vault.fetch(profile.id).tags)
    }

    @Suppress("DEPRECATION")
    @Test fun categoryChipsAndRowActionsWorkFromTheVault() = test {
        val work = VaultStore.Account(email, "work.example", "work.example", "work.example")
        val home = VaultStore.Account(email, "home.example", "home.example", "home.example")
        cloud.vault.create(uid, work, "pbkdf2", emptyMap())
        cloud.vault.create(uid, home, "pbkdf2", emptyMap())
        val workRecipe = cloud.vault.matches(uid, work).single()
        cloud.vault.tags(workRecipe.id, listOf("Work"))
        cloud.cache.observe(uid).first { rows -> rows.size == 2 && rows.any { it.profile().tags == listOf("Work") } }

        val instrumentation = InstrumentationRegistry.getInstrumentation()
        ActivityScenario.launch(VaultActivity::class.java).use { vault ->
            vault.waitFor("The vault list did not show both recipes") {
                it.hasWindowFocus() && it.findViewById<ListView>(R.id.vault_list)?.count == 2
            }
            vault.onActivity {
                val all = it.findViewById<Button>(R.id.filter_all)
                assertTrue(all.isSelected)
                assertTrue(all.compoundDrawablesRelative[0] != null)
                val candidates = arrayListOf<View>()
                it.window.decorView.findViewsWithText(candidates, "Work", View.FIND_VIEWS_WITH_TEXT)
                candidates.filterIsInstance<Button>().single { chip -> chip.text.toString() == "Work" }.performClick()
            }
            vault.waitFor("Work did not filter the vault") {
                val rows = it.findViewById<ListView>(R.id.vault_list)
                rows.count == 1 && rows.childCount == 1
            }
            vault.onActivity {
                val row = it.findViewById<ListView>(R.id.vault_list).getChildAt(0)
                val more = row.findViewById<View>(R.id.recipe_overflow)
                assertTrue(more.contentDescription.toString().contains("work.example"))
                more.performClick()
            }
            instrumentation.uiAutomation.waitForIdle(300, 3_000)
            listOf("Generate", "Rotate", "Edit", "Star", "Delete").forEach { instrumentation.waitForNode(it) }
            instrumentation.tapNode(instrumentation.waitForNode("Category"))
            val input = instrumentation.waitForNodeById("category_input")
            assertTrue(instrumentation.waitForNode("Work", checkable = true).isChecked)
            assertTrue(input.performAction(AccessibilityNodeInfo.ACTION_SET_TEXT, Bundle().apply {
                putCharSequence(AccessibilityNodeInfo.ACTION_ARGUMENT_SET_TEXT_CHARSEQUENCE, "Side projects")
            }))
            assertTrue(instrumentation.waitForNode("Create “Side projects”").performAction(AccessibilityNodeInfo.ACTION_CLICK))
            assertTrue(instrumentation.waitForNode("Side projects", checkable = true).isChecked)
            assertTrue(instrumentation.waitForNodeById("category_save").performAction(AccessibilityNodeInfo.ACTION_CLICK))
            cloud.cache.observe(uid).first { rows -> rows.any { it.profile().tags.contains("Side projects") } }
            assertEquals(listOf("Work", "Side projects"), cloud.vault.fetch(workRecipe.id).tags)
            vault.onActivity { it.findViewById<Button>(R.id.filter_all).performClick() }
            vault.waitFor("All did not restore both recipes") { it.findViewById<ListView>(R.id.vault_list)?.count == 2 }
            vault.onActivity { it.findViewById<EditText>(R.id.vault_search).setText("work") }
            vault.waitFor("Search did not filter the vault") { it.findViewById<ListView>(R.id.vault_list)?.count == 1 }
        }
    }

    @Test fun editSavesOnlyTheLatestPreviewAndKeepsOldPasswords() = test {
        val account = VaultStore.Account(email, "old.example", "old.example", "old.example")
        cloud.vault.create(uid, account, "pbkdf2", mapOf("counter" to 4))
        val original = waitForRecipe()
        val firestore = FirebaseFirestore.getInstance(FirebaseApp.getInstance("zerokey-emulator"))
        firestore.collection("password_profiles").document(original.id)
            .update("versionHistory", listOf(mapOf("version" to 3))).await()
        waitForRecipe { it.history.any { entry -> entry.number("version", 0) == 3L } }
        val master = "synthetic editor master key"
        val instrumentation = InstrumentationRegistry.getInstrumentation()
        var preview = ""
        ActivityScenario.launch(VaultActivity::class.java).use { vault ->
            vault.waitFor("The editable recipe did not appear") {
                it.hasWindowFocus() && it.findViewById<ListView>(R.id.vault_list)?.childCount == 1
            }
            vault.onActivity {
                it.findViewById<ListView>(R.id.vault_list).getChildAt(0)
                    .findViewById<View>(R.id.recipe_overflow).performClick()
            }
            val edit = instrumentation.opens(EditRecipeActivity::class.java) {
                instrumentation.tapNode(instrumentation.waitForNode("Edit"))
            }
            instrumentation.waitForNodeById("generate", enabled = true)
            instrumentation.runOnMainSync {
                assertFalse(edit.findViewById<View>(R.id.save_recipe_edit).isEnabled)
                assertEquals("old.example", edit.findViewById<EditText>(R.id.site).text.toString())
                edit.findViewById<EditText>(R.id.site).setText(" HTTPS://WWW.NEW.EXAMPLE/ ")
                edit.findViewById<EditText>(R.id.login).setText("updated@example.test")
                edit.findViewById<EditText>(R.id.master_key).setText(master)
                val choices = arrayListOf<View>()
                edit.window.decorView.findViewsWithText(choices, "Numbers", View.FIND_VIEWS_WITH_TEXT)
                choices.filterIsInstance<CheckBox>().single().isChecked = false
                edit.findViewById<View>(R.id.generate).performClick()
            }
            instrumentation.waitForNodeById("save_recipe_edit", enabled = true)
            assertEquals("old.example", cloud.vault.fetch(original.id).site)
            instrumentation.runOnMainSync {
                edit.findViewById<EditText>(R.id.length).setText("24")
                assertFalse(edit.findViewById<View>(R.id.save_recipe_edit).isEnabled)
                assertFalse(edit.findViewById<View>(R.id.generated_password).isShown)
                edit.findViewById<View>(R.id.generate).performClick()
            }
            instrumentation.waitForNodeById("save_recipe_edit", enabled = true)
            instrumentation.runOnMainSync {
                edit.findViewById<View>(R.id.show_password).performClick()
                preview = edit.findViewById<TextView>(R.id.generated_password).text.toString()
                edit.findViewById<View>(R.id.save_recipe_edit).performClick()
            }
            val save = instrumentation.waitForNode("Save version dialog button") { root ->
                root.findAccessibilityNodeInfosByViewId("android:id/button1").firstOrNull { it.isVisibleToUser }
            }
            instrumentation.tapNode(save)
            vault.waitFor("Saving did not return to the vault") { it.hasWindowFocus() }
        }
        val current = cloud.vault.fetch(original.id)
        assertEquals("new.example", current.site)
        assertEquals("updated@example.test", current.login)
        assertEquals(5L, current.version)
        assertEquals(24L, current.options.number("length", 0))
        assertEquals(false, current.options["useNumbers"])
        assertFalse(current.options.containsKey("masterPassword"))
        assertEquals(listOf(3L, 4L), current.history.map { it.number("version", 0) })
        withContext(Dispatchers.Main) {
            GeneratorEngine(instrumentation.targetContext).use { engine ->
                assertTrue("Saved recipe did not reproduce the preview",
                    engine.generate(current.request(current.options, master)) == preview)
                assertFalse(preview.any { it.isDigit() })
                for (entry in current.history) {
                    val old = original.options + ("counter" to entry.number("version", 0))
                    val expected = engine.generate(original.request(old, master))
                    val archived = current.withHistoryIdentity(entry)
                    assertTrue("Archived recipe no longer reproduced its password",
                        engine.generate(archived.request(current.historyOptions(entry), master)) == expected)
                }
            }
        }
        val cache = waitForRecipe { it.version == 5L }
        assertEquals("old.example", cache.history.last()["site"])
        val backup = cloud.vault.backup(uid).getJSONArray("profiles").getJSONObject(0)
        assertEquals(email, backup.getJSONArray("versionHistory").getJSONObject(1).getString("login"))
        val stale = runCatching { cloud.vault.saveEditedVersion(original, "stale-edit", account, current.options) }
        assertTrue("A stale edit replaced the current recipe", stale.isFailure)
        assertEquals(current, cloud.vault.fetch(original.id))
    }

    @Test fun createsOneRecipeAndKeepsCurrentUntilDraftConfirmation() = test {
        val account = VaultStore.Account(email, "example.com", "example.com", "example.com")
        val options = mapOf("counter" to 3, "length" to 24, "userSalt" to "fixture-salt",
            "useSymbols" to false, "masterPassword" to "must never be stored")
        val results = coroutineScope {
            val first = async { cloud.vault.create(uid, account, "pbkdf2", options) }
            val second = async { cloud.vault.create(uid, account, "pbkdf2", options) }
            listOf(first.await(), second.await())
        }
        assertEquals(1, results.count { it.isEmpty() })
        val recipe = results.flatten().single()
        assertEquals(3L, recipe.version)
        assertFalse(recipe.options.containsKey("masterPassword"))
        assertEquals(recipe.id, cloud.vault.create(uid, account, "memorizable", emptyMap()).single().id)

        val draft = cloud.vault.prepare(recipe.id)
        assertEquals(4L, draft.version)
        assertEquals(3L, cloud.vault.fetch(recipe.id).version)
        assertEquals(draft.id, cloud.vault.prepare(recipe.id).id)
        assertEquals(4L, cloud.vault.confirm(recipe.id, draft.id))
        assertEquals(4L, cloud.vault.confirm(recipe.id, draft.id))
        cloud.vault.favorite(recipe.id, true)
        cloud.vault.tags(recipe.id, listOf("Fixture"))

        val current = waitForRecipe { it.favorite && it.tags == listOf("Fixture") }
        assertEquals(4L, current.version)
        assertNull(current.draft)
        assertEquals(3L, current.history.single().number("version", 1))
        assertEquals("fixture-salt", current.historyOptions(current.history.single())["userSalt"])
        val backup = cloud.vault.backup(uid)
        assertEquals("1.1", backup.getString("version"))
        val exported = backup.getJSONArray("profiles").getJSONObject(0)
        assertEquals("example.com", exported.getString("site"))
        assertEquals(4L, exported.getJSONObject("options").getLong("counter"))
        assertEquals(3L, exported.getJSONArray("versionHistory").getJSONObject(0).getLong("version"))
        assertFalse(exported.has("userId"))
        assertFalse(exported.has("pendingVersion"))
        assertFalse(exported.getJSONObject("options").has("masterPassword"))
        cloud.vault.delete(current.id)
        cloud.cache.observe(uid).first { it.isEmpty() }
    }

    @Test fun appLockHidesGeneratorAndVaultWithoutSigningOut() = test {
        val instrumentation = InstrumentationRegistry.getInstrumentation()
        val context = instrumentation.targetContext
        val account = VaultStore.Account(email, "example.com", "example.com", "example.com")
        cloud.vault.create(uid, account, "pbkdf2", mapOf("counter" to 1))
        val recipe = waitForRecipe()
        val firestore = FirebaseFirestore.getInstance(FirebaseApp.getInstance("zerokey-emulator"))
        firestore.disableNetwork().await()
        instrumentation.runOnMainSync {
            AppLock.lock()
            AppPreferences.setBiometrics(context, true)
        }
        try {
            launchGenerator().use { generator ->
                generator.waitForView(R.id.unlock_app)
                generator.onActivity { assertFalse(it.findViewById<View>(R.id.site).isShown) }
                instrumentation.runOnMainSync { AppLock.unlock() }
                generator.waitForView(R.id.site)
                val vault = instrumentation.opens(VaultActivity::class.java) {
                    generator.onActivity { it.findViewById<View>(R.id.vault_button).performClick() }
                }
                instrumentation.runOnMainSync {
                    assertFalse(vault.findViewById<View>(R.id.unlock_app)?.isShown == true)
                    assertTrue(vault.findViewById<View>(R.id.vault_search).isShown)
                    AppLock.lock()
                }
                assertTrue(instrumentation.waitForNodeById("unlock_app").isVisibleToUser)
                instrumentation.runOnMainSync {
                    assertFalse(vault.findViewById<View>(R.id.vault_search).isShown)
                    AppLock.unlock()
                    vault.finish()
                }
                generator.waitForView(R.id.site)
                assertEquals(uid, cloud.auth.uid)
                assertTrue(cloud.current(recipe.id, uid, allowOffline = true).offline)
            }
        } finally {
            firestore.enableNetwork().await()
            instrumentation.runOnMainSync { AppPreferences.setBiometrics(context, false); AppLock.lock() }
        }
    }

    @Test fun themePreferenceAppliesToSettings() {
        val instrumentation = InstrumentationRegistry.getInstrumentation()
        val context = instrumentation.targetContext
        val old = AppPreferences.theme(context)
        try {
            for (theme in listOf(Appearance.LIGHT, Appearance.DARK)) {
                instrumentation.runOnMainSync { AppPreferences.setTheme(context, theme) }
                ActivityScenario.launch(SettingsActivity::class.java).use { settings ->
                    settings.waitForView(R.id.theme_setting)
                    settings.onActivity {
                        val expected = if (theme == Appearance.LIGHT) 0xFFF6F8FC.toInt() else 0xFF121722.toInt()
                        assertEquals(expected, it.canvas)
                        assertEquals(theme, AppPreferences.theme(it))
                    }
                }
            }
        } finally {
            instrumentation.runOnMainSync { AppPreferences.setTheme(context, old) }
        }
    }

    @Test fun homepageAutosavesAndOffersIndexedNativeSuggestions() = test {
        launchGenerator().use { generator ->
            generator.waitForView(R.id.generate, enabled = true)
            generator.onActivity {
                it.findViewById<EditText>(R.id.site).setText(" HTTPS://WWW.EXAMPLE.COM/ ")
                it.findViewById<EditText>(R.id.login).setText(" Fixture@Example.Test ")
                it.findViewById<EditText>(R.id.master_key).setText("synthetic site master")
                it.findViewById<View>(R.id.generate).performClick()
            }
            generator.waitForView(R.id.show_password)
        }
        val profile = waitForRecipe()
        assertEquals("example.com", profile.site)
        assertEquals("fixture@example.test", profile.login)
        assertEquals(uid, profile.userId)
        assertEquals(1L, profile.version)
        assertFalse(profile.options.containsKey("masterPassword"))
        assertEquals(listOf("example.com"), cloud.cache.sites(uid, searchPrefix("exam")).first())
        assertEquals(listOf("fixture@example.test"), cloud.cache.logins(uid, searchPrefix("fixture@")).first())
        assertTrue(cloud.cache.sites("different-account", "%").first().isEmpty())
        assertTrue(cloud.cache.logins(uid, searchPrefix("%")).first().isEmpty())

        val context = InstrumentationRegistry.getInstrumentation().targetContext
        val reopened = Room.databaseBuilder(context, RecipeCache::class.java, "vault-recipes.db").build()
        try {
            assertEquals(profile.id, reopened.recipes().find(uid, profile.id)?.id)
        } finally {
            reopened.close()
        }
        val firestore = FirebaseFirestore.getInstance(FirebaseApp.getInstance("zerokey-emulator"))
        firestore.disableNetwork().await()
        try {
            assertTrue(cloud.current(profile.id, uid, allowOffline = true).offline)
            launchGenerator().use { generator ->
                assertSuggestion(generator, R.id.site, "", "example.com")
                assertSuggestion(generator, R.id.site, "HTTPS://WWW.Exa", "example.com")
                assertSuggestion(generator, R.id.login, "FIXT", "fixture@example.test")
            }
        } finally {
            firestore.enableNetwork().await()
        }
        cloud.auth.signOut()
        cloud.cache.observe(uid).first { it.isEmpty() }
    }

    private fun Instrumentation.waitForNode(label: String, checkable: Boolean = false): AccessibilityNodeInfo =
        waitForNode(label) {
            it.findAccessibilityNodeInfosByText(label).firstOrNull { node ->
                node.text == label && node.isVisibleToUser && (!checkable || node.isCheckable)
            }
        }

    private fun Instrumentation.waitForNodeById(id: String, enabled: Boolean = false): AccessibilityNodeInfo {
        val service = uiAutomation.serviceInfo
        if (service.flags and AccessibilityServiceInfo.FLAG_REPORT_VIEW_IDS == 0) {
            service.flags = service.flags or AccessibilityServiceInfo.FLAG_REPORT_VIEW_IDS
            uiAutomation.serviceInfo = service
        }
        val resource = "${targetContext.packageName}:id/$id"
        return waitForNode(id) {
            it.findAccessibilityNodeInfosByViewId(resource).firstOrNull { node -> !enabled || node.isEnabled }
        }
    }

    private fun Instrumentation.tapNode(node: AccessibilityNodeInfo) {
        val position = Rect().also(node::getBoundsInScreen)
        ParcelFileDescriptor.AutoCloseInputStream(uiAutomation.executeShellCommand(
            "input tap ${position.centerX()} ${position.centerY()}",
        )).use { it.readBytes() }
    }

    private fun Instrumentation.waitForNode(label: String,
        find: (AccessibilityNodeInfo) -> AccessibilityNodeInfo?): AccessibilityNodeInfo {
        val deadline = SystemClock.elapsedRealtime() + 8_000
        while (SystemClock.elapsedRealtime() < deadline) {
            uiAutomation.rootInActiveWindow?.let(find)?.let { return it }
            SystemClock.sleep(100)
        }
        throw AssertionError("Expected to find $label")
    }

    private fun assertSuggestion(screen: ActivityScenario<MainActivity>, id: Int, prefix: String, expected: String) {
        screen.waitFor("Generator did not receive window focus") { it.hasWindowFocus() }
        screen.onActivity {
            it.findViewById<AutoCompleteTextView>(id).apply { requestFocus(); setText(prefix) }
        }
        screen.waitFor("Expected a suggested value for field $id") {
            it.findViewById<AutoCompleteTextView>(id).run { isPopupShowing && adapter.count >= 1 }
        }
        screen.onActivity {
            val field = it.findViewById<AutoCompleteTextView>(id)
            assertEquals(expected, field.adapter.getItem(0))
            field.dismissDropDown()
        }
    }

    private fun test(block: suspend () -> Unit) = runBlocking { withTimeout(55_000) { block() } }

    private suspend fun waitForRecipe(predicate: (VaultStore.Profile) -> Boolean = { true }): VaultStore.Profile =
        cloud.cache.observe(uid).first { rows -> rows.any { predicate(it.profile()) } }.map(RecipeRow::profile).single(predicate)
}
