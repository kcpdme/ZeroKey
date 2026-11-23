package top.kcpd.zerokey

import com.google.firebase.Timestamp
import com.google.firebase.firestore.DocumentSnapshot
import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.FirebaseFirestoreException
import com.google.firebase.firestore.ListenerRegistration
import com.google.firebase.firestore.MetadataChanges
import com.google.firebase.firestore.SetOptions
import com.google.firebase.firestore.Source
import kotlinx.coroutines.tasks.await
import org.json.JSONObject
import java.util.Calendar
import java.util.UUID

internal typealias Options = Map<String, Any?>

/** Firebase remains the source of truth for every change to a vault recipe. */
internal class VaultStore(private val db: FirebaseFirestore) {
    data class Account(val login: String, val secureSite: String, val memorableSite: String, val savedSite: String) {
        fun matches(profile: Profile): Boolean {
            val expected = if (profile.secure) secureSite else memorableSite
            if (profile.site == expected) return true
            // Stored sites are already lowercase and trimmed. Handle Web's retained repeated prefixes.
            val stripped = profile.site.replaceFirst(protocol, "").removePrefix("www.")
            val normalized = if (profile.secure) stripped.trimEnd('/') else stripped.substringBefore('/').substringBefore('?')
            return normalized == expected
        }
    }

    data class Draft(val id: String, val options: Options) {
        val version get() = options.number("counter", 1)
    }

    data class Profile(
        val id: String, val userId: String, val site: String, val login: String, val algorithm: String,
        val options: Options, val tags: List<String> = emptyList(), val favorite: Boolean = false,
        val history: List<Options> = emptyList(), val draft: Draft? = null, val expiresAt: Long? = null,
    ) {
        val secure get() = algorithm == "pbkdf2"
        val version get() = options.number("counter", 1)

        fun historyOptions(entry: Options): Options = (if (entry["completeRecipe"] == true) emptyMap() else options) +
            entry.onlyRecipeSettings().filterKeys { it != "counter" } +
            ("counter" to entry.number("version", 1))

        fun withHistoryIdentity(entry: Options) = copy(
            site = entry["site"] as? String ?: site,
            login = entry["login"] as? String ?: login,
        )

        fun request(settings: Options, master: String) = JSONObject().put("site", site).put("login", login)
            .put("algorithm", algorithm).put("options", JSONObject(settings))
            .apply { if (secure) put("masterPassword", master) }
    }

    fun listen(uid: String, callback: (List<Profile>?, FirebaseFirestoreException?) -> Unit): ListenerRegistration =
        accounts(uid).addSnapshotListener(MetadataChanges.INCLUDE) { snapshot, error ->
            when {
                error != null -> callback(null, error)
                snapshot == null || snapshot.metadata.hasPendingWrites() -> Unit
                snapshot.metadata.isFromCache -> callback(null, null)
                else -> callback(snapshot.documents.mapNotNull(::read), null)
            }
        }

    suspend fun backup(uid: String): JSONObject = RecipeBackup.file(
        accounts(uid).get(Source.SERVER).await().documents.mapNotNull { row ->
            if (row.id.startsWith("seed-")) return@mapNotNull null
            val recipe = read(row)?.takeIf { it.userId == uid } ?: return@mapNotNull null
            RecipeBackup.profile(recipe, requireNotNull(row.data))
        },
    )

    suspend fun fetch(id: String): Profile = requireNotNull(read(ref(id).get(Source.SERVER).await())) {
        "This recipe no longer exists."
    }

    suspend fun matches(uid: String, account: Account): List<Profile> =
        accounts(uid).whereEqualTo("login", account.login).get(Source.SERVER).await()
            .documents.mapNotNull(::read).filter(account::matches)

    // The Web client writes this same per-user guard when it creates a recipe.
    suspend fun create(uid: String, account: Account, algorithm: String, options: Options): List<Profile> {
        val guard = db.collection("user_settings").document(uid)
        repeat(4) {
            val before = guard.get(Source.SERVER).await().get(guardField)
            val existing = matches(uid, account)
            if (existing.isNotEmpty()) return existing
            val target = db.collection("password_profiles").document()
            val created = db.runTransaction { tx ->
                if (before != tx.get(guard).get(guardField)) return@runTransaction false
                tx.set(target, mapOf("userId" to uid, "site" to account.savedSite, "login" to account.login,
                    "algorithm" to algorithm, "options" to options.onlyRecipeSettings(),
                    "createdAt" to FieldValue.serverTimestamp(), "updatedAt" to FieldValue.serverTimestamp()))
                tx.set(guard, mapOf(guardField to FieldValue.serverTimestamp()), SetOptions.merge())
                true
            }.await()
            if (created) return emptyList()
        }
        error("The vault changed. Try generating again.")
    }

    suspend fun prepare(id: String): Draft {
        val ref = ref(id)
        val draftId = UUID.randomUUID().toString()
        return db.runTransaction { tx ->
            val profile = requireNotNull(read(tx.get(ref)))
            profile.draft ?: Draft(draftId, nextOptions(profile)).also {
                tx.update(ref, "pendingVersion", mapOf("id" to it.id, "options" to it.options, "reason" to "Password changed"))
            }
        }.await()
    }

    suspend fun confirm(id: String, draftId: String): Long {
        val ref = ref(id)
        return db.runTransaction { tx ->
            val data = tx.get(ref)
            val current = requireNotNull(read(data))
            if (data.getString("lastConfirmedDraftId") == draftId) return@runTransaction current.version
            val draft = current.draft
            check(draft?.id == draftId && sameOptions(current, nextOptions(current), draft.options)) {
                "The current recipe or draft changed. Reopen it from the vault."
            }
            tx.update(ref, confirmedVersion(data, current, draftId, draft.options))
            draft.version
        }.await()
    }

    fun editingOptions(profile: Profile): Options = profile.draft?.options ?: nextOptions(profile)

    suspend fun saveEditedVersion(base: Profile, editId: String, account: Account, preview: Options) {
        val target = ref(base.id)
        val guard = db.collection("user_settings").document(base.userId)
        val identityChanged = account.savedSite != base.site || account.login != base.login
        val options = preview.onlyRecipeSettings()
        repeat(4) {
            val before = if (identityChanged) guard.get(Source.SERVER).await().get(guardField) else null
            if (identityChanged) {
                check(matches(base.userId, account).none { it.id != base.id }) {
                    "There is already a recipe for this site and login."
                }
            }
            val saved = db.runTransaction { tx ->
                val data = tx.get(target)
                val current = requireNotNull(read(data)) { "This recipe no longer exists." }
                check(current.userId == base.userId)
                if (data.getString("lastConfirmedDraftId") == editId) return@runTransaction true
                val draftMatches = current.draft?.id == base.draft?.id &&
                    (current.draft == null || sameOptions(current, current.draft.options, requireNotNull(base.draft).options))
                check(current.site == base.site && current.login == base.login && current.algorithm == base.algorithm &&
                    sameOptions(current, current.options, base.options) && draftMatches &&
                    editingOptions(current).number("counter", 1) == options.number("counter", 0)) {
                    "This recipe or rotation changed. Reopen Edit and generate again."
                }
                if (identityChanged && before != tx.get(guard).get(guardField)) return@runTransaction false
                tx.update(target, confirmedVersion(data, current, editId, options, account))
                if (identityChanged) tx.set(guard, mapOf(guardField to FieldValue.serverTimestamp()), SetOptions.merge())
                true
            }.await()
            if (saved) return
        }
        error("The vault changed. Try saving again.")
    }

    private fun confirmedVersion(data: DocumentSnapshot, profile: Profile, id: String,
                                 options: Options, account: Account? = null): Options {
        val now = Timestamp.now()
        val draft = fields(data.get("pendingVersion"))
        val policy = fields(data.get("passwordPolicy")).toMutableMap()
        val archived = historyRecipe(profile, profile.options) + mapOf(
            "version" to profile.version,
            "reason" to (draft["reason"] ?: "Password changed"),
            "changedAt" to (policy["lastRotatedAt"] ?: data.get("updatedAt") ?: data.get("createdAt") ?: now),
        )
        // Resolve older partial history rows against the old active recipe before editing any inputs.
        val history = if (account == null) profile.history else profile.history.map { entry ->
            entry + historyRecipe(profile.withHistoryIdentity(entry), profile.historyOptions(entry))
        }
        policy["lastRotatedAt"] = now
        val days = draft.number("expiryDays", policy.number("expiryDays", 0))
        if (days in 1..Int.MAX_VALUE.toLong()) {
            val date = Calendar.getInstance().apply { time = now.toDate(); add(Calendar.DATE, days.toInt()) }
            policy["expiryDays"] = days
            policy["nextExpiryAt"] = Timestamp(date.time)
        }
        val updated = mapOf("options" to options, "versionHistory" to (history + archived),
            "passwordPolicy" to policy, "updatedAt" to now, "lastConfirmedDraftId" to id,
            "pendingVersion" to FieldValue.delete())
        return if (account == null) updated else updated + mapOf("site" to account.savedSite, "login" to account.login)
    }

    private fun historyRecipe(profile: Profile, options: Options): Options =
        options.onlyRecipeSettings().filterKeys { it != "counter" } +
            mapOf("site" to profile.site, "login" to profile.login, "completeRecipe" to true)

    suspend fun discard(id: String, draftId: String) {
        val ref = ref(id)
        db.runTransaction { tx ->
            val draft = requireNotNull(read(tx.get(ref))).draft
            if (draft != null) {
                check(draft.id == draftId) { "This draft changed." }
                tx.update(ref, "pendingVersion", FieldValue.delete())
            }
        }.await()
    }

    suspend fun favorite(id: String, value: Boolean) { ref(id).update("favorite", value).await() }
    suspend fun tags(id: String, value: List<String>) { ref(id).update("tags", value).await() }
    suspend fun updateCategories(id: String, before: List<String>, after: List<String>) {
        val originalKeys = before.mapTo(mutableSetOf(), ::lookupText)
        val selected = after.associateBy(::lookupText)
        val removed = originalKeys - selected.keys
        val added = selected.filterKeys { it !in originalKeys }
        if (removed.isEmpty() && added.isEmpty()) return
        val target = ref(id)
        db.runTransaction { transaction ->
            val current = requireNotNull(read(transaction.get(target))) { "This recipe no longer exists." }
            val preserved = current.tags.filterNot { lookupText(it) in removed }
            val known = preserved.mapTo(mutableSetOf(), ::lookupText)
            val tags = preserved + added.filterKeys { it !in known }.values
            if (tags != current.tags) transaction.update(target, "tags", tags)
        }.await()
    }
    suspend fun delete(id: String) { ref(id).delete().await() }

    private fun accounts(uid: String) = db.collection("password_profiles").whereEqualTo("userId", uid)
    private fun ref(id: String) = db.collection("password_profiles").document(id)

    private fun read(row: DocumentSnapshot): Profile? {
        val data = row.data ?: return null
        val site = data["site"] as? String ?: return null
        val login = data["login"] as? String ?: return null
        val uid = data["userId"] as? String ?: return null
        val algorithm = data["algorithm"] as? String ?: return null
        if (algorithm !in setOf("pbkdf2", "memorizable")) return null
        val pending = fields(data["pendingVersion"])
        return Profile(row.id, uid, site, login, algorithm, fields(data["options"]),
            (data["tags"] as? List<*>)?.filterIsInstance<String>().orEmpty(), data["favorite"] == true,
            (data["versionHistory"] as? List<*>)?.map(::fields).orEmpty(),
            (pending["id"] as? String)?.let { Draft(it, fields(pending["options"])) },
            (fields(data["passwordPolicy"])["nextExpiryAt"] as? Timestamp)?.toDate()?.time)
    }

    private fun nextOptions(profile: Profile): Options {
        val counter = profile.history.fold(profile.version) { latest, entry -> maxOf(latest, entry.number("version", latest)) }
        val magic = profile.history.fold(profile.options.number("magicNumber", 0)) { latest, entry ->
            maxOf(latest, entry.number("magicNumber", latest))
        }
        check(counter < versionLimit && (profile.secure || magic < versionLimit)) { "This recipe reached its version limit." }
        val options = profile.options + ("counter" to counter + 1)
        return if (profile.secure) options else options + ("magicNumber" to magic + 1)
    }

    private fun sameOptions(profile: Profile, a: Options, b: Options): Boolean {
        if (a.number("counter", 1) != b.number("counter", 1)) return false
        if (!profile.secure) return a.number("shift", 1) == b.number("shift", 1) &&
            a.number("magicNumber", 0) == b.number("magicNumber", 0)
        return a.number("length", 16) == b.number("length", 16) &&
            a["userSalt"].orEmptyText() == b["userSalt"].orEmptyText() &&
            charsets.all { (a[it] != false) == (b[it] != false) }
    }

    companion object {
        private val protocol = Regex("^https?://")
        private const val guardField = "lastProfileCreatedAt"
        private const val versionLimit = 9_007_199_254_740_991L
    }
}

private val charsets = setOf("useLowercase", "useUppercase", "useNumbers", "useSymbols")
private val recipeFields = charsets + setOf("counter", "length", "userSalt", "shift", "magicNumber")
internal fun Options.onlyRecipeSettings(): Options = filterKeys { it in recipeFields }
internal fun Options.number(key: String, fallback: Long): Long = (this[key] as? Number)?.toLong() ?: fallback
internal fun Any?.orEmptyText(): String = this as? String ?: ""

@Suppress("UNCHECKED_CAST")
internal fun fields(value: Any?): Options = (value as? Map<String, Any?>).orEmpty()
