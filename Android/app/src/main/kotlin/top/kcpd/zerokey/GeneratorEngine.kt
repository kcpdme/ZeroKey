package top.kcpd.zerokey

import android.content.Context
import android.net.Uri
import android.webkit.RenderProcessGoneDetail
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.webkit.JavaScriptReplyProxy
import androidx.webkit.WebViewAssetLoader
import androidx.webkit.WebViewCompat
import androidx.webkit.WebViewFeature
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.coroutines.withTimeout
import org.json.JSONObject

/** The bundled engine only communicates with the app's isolated asset origin. */
internal class GeneratorEngine(context: Context) : AutoCloseable {
    private val ready = CompletableDeferred<JavaScriptReplyProxy>()
    private val pending = mutableMapOf<Long, CompletableDeferred<JSONObject>>()
    private var view: WebView? = null
    private var nextId = 0L

    init {
        if (WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)) {
            val assets = WebViewAssetLoader.Builder()
                .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(context)).build()
            try {
                val web = WebView(context)
                view = web
                web.settings.apply {
                    javaScriptEnabled = true
                    allowFileAccess = false
                    allowContentAccess = false
                    blockNetworkLoads = true
                    mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
                }
                web.webViewClient = object : WebViewClient() {
                    override fun shouldInterceptRequest(view: WebView, request: WebResourceRequest): WebResourceResponse {
                        if (request.url.toString() in assetsAllowed) {
                            assets.shouldInterceptRequest(request.url)?.let { return it }
                        }
                        return WebResourceResponse("text/plain", "UTF-8", 403, "Forbidden", emptyMap(), byteArrayOf().inputStream())
                    }

                    override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest) = true
                    override fun onReceivedError(view: WebView, request: WebResourceRequest, error: WebResourceError) {
                        if (request.isForMainFrame) close()
                    }
                    override fun onRenderProcessGone(view: WebView, detail: RenderProcessGoneDetail): Boolean {
                        close()
                        return true
                    }
                }
                WebViewCompat.addWebMessageListener(web, "ZeroKeyNative", setOf(origin)) { _, message, source, main, reply ->
                    if (main && source == sourceOrigin) message.data?.let { receive(it, reply) }
                }
                web.loadUrl(page)
            } catch (_: RuntimeException) {
                close()
            }
        } else {
            close()
        }
    }

    suspend fun awaitReady() = withTimeout(15_000) { ready.await(); Unit }

    suspend fun generate(recipe: JSONObject): String = request("generate", recipe).getString("password")

    suspend fun account(site: String, login: String, algorithm: String): VaultStore.Account {
        val fields = JSONObject().put("site", site).put("login", login).put("algorithm", algorithm)
        val response = request("account", fields)
        return VaultStore.Account(response.getString("login"), response.getString("secureSite"),
            response.getString("memorableSite"), response.getString("savedSite"))
    }

    private suspend fun request(action: String, fields: JSONObject): JSONObject = withContext(Dispatchers.Main.immediate) {
        val bridge = withTimeout(15_000) { ready.await() }
        check(view != null) { unavailable }
        check(WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)) { unavailable }
        val id = ++nextId
        val response = CompletableDeferred<JSONObject>()
        pending[id] = response
        try {
            bridge.postMessage(JSONObject().put("id", id).put("action", action).put("recipe", fields).toString())
            withTimeout(30_000) { response.await() }
        } finally {
            pending.remove(id)
        }
    }

    private fun receive(message: String, reply: JavaScriptReplyProxy) {
        runCatching {
            val result = JSONObject(message)
            when {
                result.optBoolean("ready") -> ready.complete(reply)
                result.optBoolean("unavailable") -> close()
                else -> pending.remove(result.optLong("id"))?.let {
                    if (result.has("error")) it.completeExceptionally(IllegalArgumentException(result.getString("error")))
                    else it.complete(result)
                }
            }
        }.onFailure { close() }
    }

    override fun close() {
        ready.completeExceptionally(IllegalStateException(unavailable))
        pending.values.forEach { it.completeExceptionally(IllegalStateException(unavailable)) }
        pending.clear()
        val web = view
        view = null
        web?.destroy()
    }

    companion object {
        private const val origin = "https://" + WebViewAssetLoader.DEFAULT_DOMAIN
        private const val page = "$origin/assets/engine.html"
        private val sourceOrigin = Uri.parse(origin)
        private val assetsAllowed = setOf(page, "$origin/assets/engine.js")
        private const val unavailable = "Password engine unavailable. Update Android System WebView and reopen ZeroKey."
    }
}
