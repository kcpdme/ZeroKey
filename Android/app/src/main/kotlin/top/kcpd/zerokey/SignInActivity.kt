package top.kcpd.zerokey

import android.os.Bundle
import android.text.InputType
import android.text.method.PasswordTransformationMethod
import android.view.Gravity
import android.view.View
import android.view.inputmethod.EditorInfo
import android.widget.Button
import android.widget.CheckBox
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.TextView
import androidx.credentials.CredentialManager
import androidx.credentials.CustomCredential
import androidx.credentials.GetCredentialRequest
import androidx.credentials.exceptions.GetCredentialCancellationException
import androidx.credentials.exceptions.NoCredentialException
import com.google.android.libraries.identity.googleid.GetSignInWithGoogleOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import com.google.firebase.auth.GoogleAuthProvider
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await

class SignInActivity : AppActivity() {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)
    private var operation: Job? = null
    private lateinit var email: EditText
    private lateinit var password: EditText
    private lateinit var showPassword: CheckBox
    private lateinit var emailButton: Button
    private lateinit var status: TextView
    private var googleButton: Button? = null

    override fun onCreate(state: Bundle?) {
        super.onCreate(state)
        val cloud = Cloud.get(this)
        if (cloud?.auth?.currentUser != null) {
            complete()
            return
        }
        val body = page()
        val back = button("Back to Vault", ::finish).apply {
            id = R.id.sign_in_back
            val arrow = getDrawable(R.drawable.ic_arrow_back)?.mutate()
            arrow?.setTint(muted)
            arrow?.setBounds(0, 0, dp(18), dp(18))
            setCompoundDrawablesRelative(arrow, null, null, null)
            compoundDrawablePadding = dp(8)
        }
        body.addView(back, LinearLayout.LayoutParams(-2, -2))
        val mark = icon(R.drawable.ic_vault, accent).apply {
            background = rounded(accentSurface, 18)
            setPadding(dp(14), dp(14), dp(14), dp(14))
        }
        body.addView(mark, LinearLayout.LayoutParams(dp(56), dp(56)).apply { topMargin = dp(30) })
        add(body, heading("Sign in to ZeroKey"), 16)
        add(body, text("Use the same account as kcpd.top to sync your recipes.", 15f), 8)
        if (cloud == null) {
            add(body, text("Vault sign-in is unavailable in this build.", color = errorColor), 24)
            return
        }

        val form = card()
        email = EditText(this).apply {
            id = R.id.account_email
            prepare("you@example.com", InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_EMAIL_ADDRESS)
            imeOptions = imeOptions or EditorInfo.IME_ACTION_NEXT
        }
        password = EditText(this).apply {
            id = R.id.account_password
            prepare("Enter your password", InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_PASSWORD)
            imeOptions = imeOptions or EditorInfo.IME_ACTION_DONE
            setOnEditorActionListener { _, action, _ ->
                if (action != EditorInfo.IME_ACTION_DONE) return@setOnEditorActionListener false
                emailButton.performClick()
                true
            }
        }
        showPassword = CheckBox(this).apply {
            text = "Show password"
            setTextColor(muted)
            minimumHeight = dp(44)
            setOnCheckedChangeListener { _, checked ->
                password.transformationMethod = if (checked) null else PasswordTransformationMethod.getInstance()
                password.setSelection(password.length())
            }
        }
        label(form, "Email address", R.id.account_email)
        add(form, email, 6)
        label(form, "Account password", R.id.account_password, 14)
        add(form, password, 6)
        add(form, showPassword)
        status = text("").apply { accessibilityLiveRegion = View.ACCESSIBILITY_LIVE_REGION_POLITE }
        add(form, status)
        message(null)
        emailButton = primaryButton("Sign in with email") {
            val address = email.text.toString().trim()
            val credential = password.text.toString()
            when {
                address.isEmpty() -> { message("Enter your email address.", true); email.requestFocus() }
                credential.isEmpty() -> { message("Enter your account password.", true); password.requestFocus() }
                else -> authenticate("Signing in…", "Could not sign in. Check your email and password.") {
                    cloud.auth.signInWithEmailAndPassword(address, credential).await()
                }
            }
        }.apply { id = R.id.email_sign_in }
        add(form, emailButton, 10)
        add(body, form, 24)
        addGoogle(body, cloud)
    }

    @Suppress("DiscouragedApi")
    private fun addGoogle(body: LinearLayout, cloud: Cloud) {
        val clientId = resources.getIdentifier("default_web_client_id", "string", packageName)
        if (clientId == 0) return
        add(body, text("or").apply { gravity = Gravity.CENTER }, 14)
        googleButton = button("Continue with Google") {
            authenticate("Opening Google sign-in…", "Could not sign in with Google. Try again.") {
                val request = GetCredentialRequest.Builder().addCredentialOption(
                    GetSignInWithGoogleOption.Builder(getString(clientId)).build()).build()
                val credential = CredentialManager.create(this).getCredential(this, request).credential
                check(credential is CustomCredential && credential.type == GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL)
                val token = GoogleIdTokenCredential.createFrom(credential.data).idToken
                cloud.auth.signInWithCredential(GoogleAuthProvider.getCredential(token, null)).await()
            }
        }
        add(body, requireNotNull(googleButton), 12)
    }

    private fun authenticate(progress: String, failure: String, signIn: suspend () -> Unit) {
        if (operation?.isActive == true) return
        message(progress)
        emailButton.isEnabled = false
        googleButton?.isEnabled = false
        operation = scope.launch {
            try {
                signIn()
                complete()
            } catch (_: GetCredentialCancellationException) {
                message(null)
            } catch (_: NoCredentialException) {
                message("No Google account is available. You can sign in with email.", true)
            } catch (error: CancellationException) {
                throw error
            } catch (_: Exception) {
                message(failure, true)
            } finally {
                emailButton.isEnabled = true
                googleButton?.isEnabled = true
            }
        }
    }

    private fun message(value: String?, error: Boolean = false) {
        status.text = value
        status.setTextColor(if (error) errorColor else muted)
        status.visibility = shown(value != null)
    }

    private fun complete() {
        if (::password.isInitialized) password.text.clear()
        setResult(RESULT_OK)
        finish()
    }

    override fun onStop() {
        if (::password.isInitialized) {
            showPassword.isChecked = false
            password.text.clear()
        }
        super.onStop()
    }

    override fun onDestroy() {
        scope.cancel()
        super.onDestroy()
    }
}
