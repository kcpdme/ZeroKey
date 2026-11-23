package top.kcpd.zerokey

import android.net.Uri
import android.os.Bundle
import android.view.View
import android.widget.Button
import android.widget.LinearLayout
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AlertDialog
import androidx.credentials.ClearCredentialStateRequest
import androidx.credentials.CredentialManager
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.lifecycleScope
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.TimeoutCancellationException
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlinx.coroutines.withTimeout
import kotlinx.coroutines.withTimeoutOrNull
import java.time.LocalDate

class SettingsActivity : AppActivity() {
    class ExportState : ViewModel() {
        internal var pending: Pair<String, String>? = null
    }

    private val cloud by lazy { Cloud.get(this) }
    private val exportState by lazy { ViewModelProvider(this)[ExportState::class.java] }
    private lateinit var export: Button
    private lateinit var status: android.widget.TextView
    private val saveDocument = registerForActivityResult(ActivityResultContracts.CreateDocument("application/json")) { uri ->
        val pending = exportState.pending
        exportState.pending = null
        if (uri != null && pending != null) writeBackup(uri, pending.first, pending.second)
        else export.isEnabled = cloud?.auth?.uid != null
    }

    override fun onCreate(state: Bundle?) {
        super.onCreate(state)
        render()
    }

    private fun render() {
        val page = page()
        val back = iconButton(R.drawable.ic_arrow_back, "Back", ::finish)
        page.addView(back, LinearLayout.LayoutParams(dp(48), dp(48)))
        add(page, heading("Settings"), 14)
        val appearance = card()
        add(appearance, heading("Appearance", 17f))
        add(appearance, button("Theme · ${AppPreferences.theme(this).title}", ::chooseTheme).apply {
            id = R.id.theme_setting
        }, 10)
        add(page, appearance, 18)

        val privacy = card()
        add(privacy, heading("Privacy and security", 17f))
        add(privacy, button("Biometric unlock · ${if (AppPreferences.biometrics(this)) "On" else "Off"}", ::changeBiometrics).apply {
            id = R.id.biometric_setting
        }, 10)
        add(privacy, button("Google site icons · ${if (AppPreferences.icons(this)) "On" else "Off"}", ::changeIcons), 9)
        add(page, privacy, 12)

        val account = card()
        val user = cloud?.auth?.currentUser
        add(account, heading("Account", 17f))
        val identity = user?.let { it.email ?: "Signed in" } ?: "Sign in from Vault to sync and export recipes."
        add(account, text(identity), 5)
        export = button("Export recipes", ::confirmExport).apply {
            id = R.id.export_recipes
            isEnabled = user != null && exportState.pending == null
        }
        add(account, export, 12)
        if (user != null) add(account, button("Sign out", ::confirmSignOut), 9)
        add(page, account, 12)
        status = text("").apply { accessibilityLiveRegion = View.ACCESSIBILITY_LIVE_REGION_POLITE }
        add(page, status, 12)
    }

    private fun chooseTheme() {
        val current = AppPreferences.theme(this)
        showProtectedDialog(AlertDialog.Builder(this).setTitle("Theme")
            .setSingleChoiceItems(Appearance.entries.map { it.title }.toTypedArray(), current.ordinal) { dialog, index ->
                dialog.dismiss()
                val chosen = Appearance.entries[index]
                AppPreferences.setTheme(this, chosen)
                if (chosen != current && !isDestroyed) render()
            }.setNegativeButton("Cancel", null))
    }

    private fun changeIcons() {
        if (AppPreferences.icons(this)) {
            AppPreferences.setIcons(this, false)
            SiteIcons.clear()
            render()
            return
        }
        showProtectedDialog(AlertDialog.Builder(this).setTitle("Load site icons from Google?")
            .setMessage("Google receives the website domain for each icon requested.")
            .setPositiveButton("Enable") { _, _ -> AppPreferences.setIcons(this, true); render() }
            .setNegativeButton("Cancel", null))
    }

    private fun changeBiometrics() {
        val turnOn = !AppPreferences.biometrics(this)
        if (turnOn && !canEnableBiometrics()) {
            message("Set up a fingerprint or supported face unlock in Android Settings first.", true)
            return
        }
        authenticateDevice(if (turnOn) "Enable biometric unlock" else "Turn off biometric unlock") {
            AppLock.unlock()
            AppPreferences.setBiometrics(this, turnOn)
            render()
        }
    }

    private fun confirmExport() {
        val uid = cloud?.auth?.uid ?: return
        showProtectedDialog(AlertDialog.Builder(this).setTitle("Export recipes as JSON?")
            .setMessage("This plain-text file includes logins, recipe options, history, notes and custom fields.")
            .setNegativeButton("Cancel", null)
            .setPositiveButton("Choose file") { _, _ ->
                prepareBackup(uid)
            })
    }

    private fun prepareBackup(uid: String) {
        val service = cloud ?: return
        if (service.auth.uid != uid || appLocked) return
        export.isEnabled = false
        message("Preparing export…")
        lifecycleScope.launch {
            try {
                val backup = withTimeout(20_000) { service.vault.backup(uid).toString(2) }
                if (service.auth.uid != uid || appLocked) return@launch
                exportState.pending = uid to backup
                saveDocument.launch("zerokey-recipes-${LocalDate.now()}.json")
                message("")
            } catch (_: TimeoutCancellationException) {
                message("Connect to the internet and try exporting again.", true)
            } catch (error: CancellationException) {
                throw error
            } catch (_: Exception) {
                exportState.pending = null
                message("Could not prepare the export. Check your connection.", true)
            } finally {
                export.isEnabled = exportState.pending == null && service.auth.uid != null
            }
        }
    }

    private fun writeBackup(uri: Uri, uid: String, contents: String) {
        if (cloud?.auth?.uid != uid) return
        lifecycleScope.launch {
            try {
                withContext(Dispatchers.IO) {
                    requireNotNull(contentResolver.openOutputStream(uri, "wt")).bufferedWriter(Charsets.UTF_8)
                        .use { it.write(contents) }
                }
                message("Recipes exported.")
            } catch (error: CancellationException) {
                throw error
            } catch (_: Exception) {
                message("Could not write the export to that location.", true)
            } finally {
                export.isEnabled = cloud?.auth?.uid != null
            }
        }
    }

    private fun confirmSignOut() {
        val service = cloud ?: return
        val uid = service.auth.uid ?: return
        showProtectedDialog(AlertDialog.Builder(this).setTitle("Sign out of ZeroKey?")
            .setMessage("Your local recipe cache will be cleared.")
            .setNegativeButton("Cancel", null)
            .setPositiveButton("Sign out") { _, _ ->
                if (service.auth.uid != uid) return@setPositiveButton
                exportState.pending = null
                service.auth.signOut()
                SiteIcons.clear()
                render()
                lifecycleScope.launch {
                    try {
                        withTimeoutOrNull(2_000) {
                            CredentialManager.create(this@SettingsActivity).clearCredentialState(ClearCredentialStateRequest())
                        }
                    } catch (error: CancellationException) {
                        throw error
                    } catch (_: Exception) {
                        // Firebase has already ended the session.
                    }
                }
            })
    }

    private fun message(text: String, error: Boolean = false) {
        status.text = text
        status.setTextColor(if (error) errorColor else muted)
    }
}
