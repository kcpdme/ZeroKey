package top.kcpd.zerokey

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import android.util.LruCache
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ensureActive
import kotlinx.coroutines.sync.Semaphore
import kotlinx.coroutines.sync.withPermit
import kotlinx.coroutines.withContext
import java.net.HttpURLConnection
import java.net.IDN
import java.net.URI
import java.net.URL
import java.util.Locale

internal object SiteIcons {
    private val images = LruCache<String, Bitmap>(96)
    private val requests = Semaphore(4)

    fun clear() { images.evictAll() }

    fun domain(site: String): String? {
        val url = if (site.contains("://")) site.trim() else "https://${site.trim()}"
        val address = runCatching { URI(url) }.getOrNull() ?: return null
        if (address.scheme.lowercase(Locale.ROOT) !in setOf("http", "https") || address.rawUserInfo != null) return null
        val host = address.host?.let { runCatching { IDN.toASCII(it) }.getOrNull() }
            ?.lowercase(Locale.ROOT)?.trimEnd('.') ?: return null
        val suffix = host.substringAfterLast('.')
        if (!host.contains('.') || suffix.length !in 2..63 || !suffix.first().isLetter() ||
            suffix in setOf("local", "localhost", "internal", "test", "example", "invalid", "onion", "lan")) return null
        return host
    }

    suspend fun get(host: String): Bitmap? = withContext(Dispatchers.IO) {
        requests.withPermit {
            images.get(host)?.let { return@withPermit it }
            val endpoint = Uri.parse("https://www.google.com/s2/favicons").buildUpon()
                .appendQueryParameter("domain", host).appendQueryParameter("sz", "64").build()
            val result = runCatching { download(URI(endpoint.toString())) }.getOrNull()
            ensureActive()
            if (result != null) images.put(host, result)
            result
        }
    }

    private fun download(start: URI): Bitmap? {
        var current = start
        repeat(3) {
            val host = current.host ?: return null
            if (current.scheme != "https" || current.userInfo != null || current.port !in setOf(-1, 443) ||
                (host != "www.google.com" && !host.endsWith(".gstatic.com"))) return null
            val connection = URL(current.toString()).openConnection() as HttpURLConnection
            try {
                connection.instanceFollowRedirects = false
                connection.connectTimeout = 2_500
                connection.readTimeout = 2_500
                val code = connection.responseCode
                if (code in 300..399) {
                    current = current.resolve(connection.getHeaderField("Location") ?: return null)
                } else if (code == 200) {
                    val bytes = connection.inputStream.use { stream ->
                        val limit = 128 * 1024
                        val output = java.io.ByteArrayOutputStream()
                        val chunk = ByteArray(4096)
                        while (output.size() <= limit) {
                            val count = stream.read(chunk)
                            if (count < 0) break
                            output.write(chunk, 0, count)
                        }
                        if (output.size() > limit) return null
                        output.toByteArray()
                    }
                    val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
                    BitmapFactory.decodeByteArray(bytes, 0, bytes.size, bounds)
                    if (bounds.outWidth !in 8..256 || bounds.outHeight !in 8..256) return null
                    return BitmapFactory.decodeByteArray(bytes, 0, bytes.size)
                } else return null
            } finally {
                connection.disconnect()
            }
        }
        return null
    }
}
