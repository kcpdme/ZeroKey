package top.kcpd.zerokey

import com.google.firebase.Timestamp
import org.json.JSONArray
import org.json.JSONObject
import java.time.Instant

/** Uses the Web backup format, including the confirmed recipe history. */
internal object RecipeBackup {
    fun file(profiles: List<JSONObject>, time: Instant = Instant.now()) = JSONObject()
        .put("version", "1.1")
        .put("exportedAt", time.toString())
        .put("profiles", JSONArray(profiles))

    fun profile(recipe: VaultStore.Profile, source: Options): JSONObject {
        val policy = fields(source["passwordPolicy"])
        val passwordPolicy = JSONObject(policy.filterKeys { it in setOf("expiryDays", "autoRemind", "reminderDays") })
        for (key in listOf("lastRotatedAt", "nextExpiryAt")) {
            iso(policy[key])?.let { passwordPolicy.put(key, it) }
        }
        val history = recipe.history.map { item ->
            JSONObject(item.onlyRecipeSettings().filterKeys { it != "counter" }).apply {
                put("version", item.number("version", 1))
                put("site", item["site"] as? String)
                put("login", item["login"] as? String)
                if (item["completeRecipe"] == true) put("completeRecipe", true)
                put("reason", item["reason"] as? String)
                put("notes", item["notes"] as? String)
                put("changedAt", iso(item["changedAt"]))
                put("expiresAt", iso(item["expiresAt"]))
            }
        }
        val customFields = (source["customFields"] as? List<*>)?.mapNotNull { raw ->
            val field = fields(raw)
            val key = field["key"] as? String ?: return@mapNotNull null
            val value = field["value"] as? String ?: return@mapNotNull null
            JSONObject().put("key", key).put("value", value).put("encrypted", field["encrypted"] as? Boolean)
        }.orEmpty()
        return JSONObject().put("site", recipe.site).put("login", recipe.login)
            .put("algorithm", recipe.algorithm).put("options", JSONObject(recipe.options.onlyRecipeSettings()))
            .put("favorite", recipe.favorite).put("tags", JSONArray(recipe.tags))
            .put("notes", source["notes"] as? String ?: "").put("customFields", JSONArray(customFields))
            .put("versionHistory", JSONArray(history)).apply {
                if (passwordPolicy.length() > 0) put("passwordPolicy", passwordPolicy)
            }
    }

    private fun iso(value: Any?): String? = when (value) {
        is Timestamp -> value.toDate().toInstant().toString()
        is String -> runCatching { Instant.parse(value).toString() }.getOrNull()
        else -> null
    }
}
