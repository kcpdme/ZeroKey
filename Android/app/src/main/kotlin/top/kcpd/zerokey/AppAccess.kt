package top.kcpd.zerokey

import android.app.Application
import android.app.KeyguardManager
import android.content.Context
import android.os.Build
import android.os.Bundle
import android.view.Gravity
import android.view.View
import android.view.WindowManager
import android.view.inputmethod.InputMethodManager
import android.widget.FrameLayout
import android.widget.LinearLayout
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.appcompat.app.AppCompatDelegate
import androidx.biometric.BiometricManager
import androidx.biometric.BiometricManager.Authenticators.BIOMETRIC_STRONG
import androidx.biometric.BiometricManager.Authenticators.DEVICE_CREDENTIAL
import androidx.biometric.BiometricPrompt
import androidx.core.content.ContextCompat
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.lifecycle.DefaultLifecycleObserver
import androidx.lifecycle.LifecycleOwner
import androidx.lifecycle.ProcessLifecycleOwner
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.lifecycleScope
import androidx.lifecycle.repeatOnLifecycle
import kotlinx.coroutines.launch
import kotlinx.coroutines.flow.MutableStateFlow

internal class ZeroKeyApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        AppPreferences.theme(this).apply()
        ProcessLifecycleOwner.get().lifecycle.addObserver(object : DefaultLifecycleObserver {
            override fun onStop(owner: LifecycleOwner) { AppLock.lock() }
        })
    }
}

internal enum class Appearance(val title: String, private val mode: Int) {
    SYSTEM("System", AppCompatDelegate.MODE_NIGHT_FOLLOW_SYSTEM),
    LIGHT("Light", AppCompatDelegate.MODE_NIGHT_NO),
    DARK("Dark", AppCompatDelegate.MODE_NIGHT_YES);

    fun apply() = AppCompatDelegate.setDefaultNightMode(mode)
}

internal object AppPreferences {
    private fun prefs(context: Context) = context.getSharedPreferences("zerokey-settings", Context.MODE_PRIVATE)
    fun theme(context: Context) = Appearance.entries.firstOrNull { it.name == prefs(context).getString("theme", null) }
        ?: Appearance.SYSTEM
    fun setTheme(context: Context, appearance: Appearance) {
        prefs(context).edit().putString("theme", appearance.name).apply()
        appearance.apply()
    }
    fun icons(context: Context) = prefs(context).getBoolean("google-icons", false)
    fun setIcons(context: Context, enabled: Boolean) { prefs(context).edit().putBoolean("google-icons", enabled).apply() }
    fun biometrics(context: Context) = prefs(context).getBoolean("biometrics", false)
    fun setBiometrics(context: Context, enabled: Boolean) { prefs(context).edit().putBoolean("biometrics", enabled).apply() }
}

internal object AppLock {
    val unlocked = MutableStateFlow(false)
    fun locked(context: Context) = AppPreferences.biometrics(context) && !unlocked.value
    fun lock() { unlocked.value = false }
    fun unlock() { unlocked.value = true }
}

abstract class AppActivity : AppCompatActivity() {
    private var challenge: (() -> Unit)? = null
    private var content: View? = null
    private var screen: FrameLayout? = null
    private var lockScreen: View? = null
    private var unlockPromptOffered = false
    private lateinit var lockBack: OnBackPressedCallback
    private var protectedDialog: AlertDialog? = null
    protected val appLocked get() = AppLock.locked(this)
    private lateinit var prompt: BiometricPrompt
    private val deviceCredential = registerForActivityResult(ActivityResultContracts.StartActivityForResult()) {
        if (it.resultCode == RESULT_OK) authenticated() else challenge = null
    }

    override fun onCreate(state: Bundle?) {
        super.onCreate(state)
        window.addFlags(WindowManager.LayoutParams.FLAG_SECURE)
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(false) {
            override fun handleOnBackPressed() { moveTaskToBack(true) }
        }.also { lockBack = it })
        lifecycleScope.launch {
            repeatOnLifecycle(Lifecycle.State.STARTED) { AppLock.unlocked.collect { updateLockScreen() } }
        }
        WindowCompat.setDecorFitsSystemWindows(window, false)
        WindowCompat.getInsetsController(window, window.decorView).isAppearanceLightNavigationBars =
            resources.getBoolean(R.bool.light_system_bars)
        prompt = BiometricPrompt(this, ContextCompat.getMainExecutor(this),
            object : BiometricPrompt.AuthenticationCallback() {
                override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) = authenticated()

                override fun onAuthenticationError(code: Int, message: CharSequence) {
                    if (Build.VERSION.SDK_INT < 30 && code == BiometricPrompt.ERROR_NEGATIVE_BUTTON) {
                        openCredential()
                    } else {
                        challenge = null
                        if (code !in setOf(BiometricPrompt.ERROR_USER_CANCELED, BiometricPrompt.ERROR_CANCELED,
                                BiometricPrompt.ERROR_NEGATIVE_BUTTON)) {
                            android.widget.Toast.makeText(this@AppActivity, message, android.widget.Toast.LENGTH_LONG).show()
                        }
                    }
                }
            })
    }

    override fun setContentView(view: View) {
        content = view
        lockScreen = null
        val frame = FrameLayout(this)
        screen = frame
        frame.addView(view, FrameLayout.LayoutParams(-1, -1))
        updateLockScreen()
        super.setContentView(frame)
    }

    override fun onStart() {
        super.onStart()
        updateLockScreen()
    }

    private fun updateLockScreen() {
        val frame = screen ?: return
        val body = content ?: return
        val locked = appLocked
        lockBack.isEnabled = locked
        if (locked && lockScreen == null) {
            dismissProtectedDialog()
            currentFocus?.let { getSystemService(InputMethodManager::class.java).hideSoftInputFromWindow(it.windowToken, 0) }
            body.visibility = View.GONE
            val overlay = buildLockScreen()
            lockScreen = overlay
            frame.addView(overlay, FrameLayout.LayoutParams(-1, -1))
            overlay.requestFocus()
            if (frame.isAttachedToWindow) onAppAccessChanged(locked = true)
            offerAutomaticUnlock()
        } else if (!locked) {
            val overlay = lockScreen
            if (overlay != null) frame.removeView(overlay)
            lockScreen = null
            unlockPromptOffered = false
            body.visibility = View.VISIBLE
            if (overlay != null && frame.isAttachedToWindow) onAppAccessChanged(locked = false)
        }
    }

    private fun buildLockScreen(): View = FrameLayout(this).apply {
        id = R.id.app_lock_screen
        setBackgroundColor(canvas)
        isFocusableInTouchMode = true
        applyPageInsets(this)

        val exit = iconButton(R.drawable.ic_arrow_back, "Leave ZeroKey") { moveTaskToBack(true) }
        addView(exit, FrameLayout.LayoutParams(dp(48), dp(48), Gravity.TOP or Gravity.END).apply {
            topMargin = dp(12)
            marginEnd = dp(18)
        })
        val form = column().apply {
            gravity = Gravity.CENTER_HORIZONTAL
            setPadding(dp(28), dp(16), dp(28), dp(16))
            val mark = icon(R.drawable.ic_zerokey, accent).apply {
                setColorFilter(null)
            }
            addView(mark, LinearLayout.LayoutParams(dp(72), dp(72)))
            add(this, heading("ZeroKey is locked", 27f).apply { gravity = Gravity.CENTER }, 22)
            add(this, text("Unlock with your fingerprint, face or device screen lock.").apply {
                gravity = Gravity.CENTER
            }, 9)
            val unlock = primaryButton("Unlock ZeroKey", ::requestUnlock).apply {
                id = R.id.unlock_app
                getDrawable(R.drawable.ic_fingerprint)?.mutate()?.let { glyph ->
                    glyph.setTint(onAccent)
                    glyph.setBounds(0, 0, dp(22), dp(22))
                    setCompoundDrawablesRelative(glyph, null, null, null)
                    compoundDrawablePadding = dp(9)
                }
                gravity = Gravity.CENTER
            }
            add(this, unlock, 24)
        }
        addView(form, FrameLayout.LayoutParams(
            minOf(resources.displayMetrics.widthPixels, dp(480)), -2, Gravity.CENTER,
        ))
    }

    protected open fun onAppAccessChanged(locked: Boolean) = Unit

    protected fun showProtectedDialog(builder: AlertDialog.Builder) = showProtectedDialog(builder.create())

    protected fun showProtectedDialog(dialog: AlertDialog) {
        if (appLocked) return
        dismissProtectedDialog()
        protectedDialog = dialog
        dialog.show()
    }

    protected fun dismissProtectedDialog() {
        protectedDialog?.dismiss()
        protectedDialog = null
    }

    override fun onStop() {
        dismissProtectedDialog()
        if (challenge == null) unlockPromptOffered = false
        super.onStop()
    }

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        if (hasFocus) {
            ViewCompat.requestApplyInsets(window.decorView)
            offerAutomaticUnlock()
        }
    }

    override fun onPostResume() {
        super.onPostResume()
        offerAutomaticUnlock()
    }

    private fun offerAutomaticUnlock() {
        if (lockScreen == null || unlockPromptOffered) return
        window.decorView.post {
            if (!unlockPromptOffered && challenge == null && appLocked && hasWindowFocus() &&
                lifecycle.currentState.isAtLeast(Lifecycle.State.RESUMED) && !isFinishing && !isDestroyed) {
                requestUnlock()
            }
        }
    }

    private fun requestUnlock() {
        unlockPromptOffered = true
        authenticateDevice("Unlock ZeroKey") { AppLock.unlock() }
    }

    protected fun canEnableBiometrics() =
        BiometricManager.from(this).canAuthenticate(BIOMETRIC_STRONG) == BiometricManager.BIOMETRIC_SUCCESS

    protected fun authenticateDevice(title: String, onSuccess: () -> Unit) {
        if (challenge != null) return
        challenge = onSuccess
        if (Build.VERSION.SDK_INT < 30 && !canEnableBiometrics()) {
            openCredential()
            return
        }
        val builder = BiometricPrompt.PromptInfo.Builder().setTitle(title)
        if (Build.VERSION.SDK_INT >= 30) builder.setAllowedAuthenticators(BIOMETRIC_STRONG or DEVICE_CREDENTIAL)
        else builder.setAllowedAuthenticators(BIOMETRIC_STRONG).setNegativeButtonText("Use device screen lock")
        prompt.authenticate(builder.build())
    }

    @Suppress("DEPRECATION")
    private fun openCredential() {
        val intent = getSystemService(KeyguardManager::class.java)
            .createConfirmDeviceCredentialIntent("Unlock ZeroKey", "Use your device screen lock.")
        if (intent != null) deviceCredential.launch(intent)
        else {
            challenge = null
            android.widget.Toast.makeText(this, "Set a device screen lock to unlock ZeroKey.", android.widget.Toast.LENGTH_LONG).show()
        }
    }

    private fun authenticated() {
        val complete = challenge ?: return
        challenge = null
        if (!isFinishing && !isDestroyed) complete()
    }
}
