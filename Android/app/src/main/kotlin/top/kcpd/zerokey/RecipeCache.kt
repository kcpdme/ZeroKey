package top.kcpd.zerokey

import androidx.room.ColumnInfo
import androidx.room.Dao
import androidx.room.Database
import androidx.room.Entity
import androidx.room.Index
import androidx.room.Insert
import androidx.room.Query
import androidx.room.RoomDatabase
import androidx.room.Transaction
import kotlinx.coroutines.flow.Flow
import org.json.JSONArray
import org.json.JSONObject
import java.util.Locale

@Entity(tableName = "recipes", primaryKeys = ["owner", "id"], indices = [
    Index(value = ["owner", "siteKey"]), Index(value = ["owner", "loginKey"]),
])
internal data class RecipeRow(
    val owner: String, val id: String, val site: String, val login: String,
    @ColumnInfo(collate = ColumnInfo.NOCASE) val siteKey: String,
    @ColumnInfo(collate = ColumnInfo.NOCASE) val loginKey: String,
    val algorithm: String, val options: String, val tags: String, val favorite: Boolean,
    val history: String, val draftId: String?, val draftOptions: String?, val expiresAt: Long?,
) {
    fun profile() = VaultStore.Profile(id, owner, site, login, algorithm, JSONObject(options).values(),
        JSONArray(tags).strings(), favorite, JSONArray(history).objects(),
        draftId?.let { VaultStore.Draft(it, JSONObject(draftOptions ?: "{}").values()) }, expiresAt)

    companion object {
        fun from(profile: VaultStore.Profile) = RecipeRow(
            profile.userId, profile.id, profile.site, profile.login, lookupSite(profile.site), lookupText(profile.login),
            profile.algorithm, JSONObject(profile.options.onlyRecipeSettings()).toString(), JSONArray(profile.tags).toString(), profile.favorite,
            JSONArray(profile.history.map { entry ->
                JSONObject(entry.onlyRecipeSettings() + ("version" to entry.number("version", 1))).apply {
                    put("site", entry["site"] as? String)
                    put("login", entry["login"] as? String)
                    if (entry["completeRecipe"] == true) put("completeRecipe", true)
                }
            }).toString(),
            profile.draft?.id, profile.draft?.options?.let { JSONObject(it.onlyRecipeSettings()).toString() }, profile.expiresAt,
        )
    }
}

@Dao
internal abstract class RecipeDao {
    @Query("SELECT * FROM recipes WHERE owner = :owner ORDER BY favorite DESC, siteKey, loginKey")
    abstract fun observe(owner: String): Flow<List<RecipeRow>>

    @Query("SELECT * FROM recipes WHERE owner = :owner AND id = :id")
    abstract suspend fun find(owner: String, id: String): RecipeRow?

    @Query("SELECT * FROM recipes WHERE owner = :owner AND loginKey = :login")
    abstract suspend fun forLogin(owner: String, login: String): List<RecipeRow>

    @Query("SELECT DISTINCT site FROM recipes WHERE owner = :owner AND siteKey LIKE :prefix ESCAPE '\\' ORDER BY siteKey LIMIT 8")
    abstract fun sites(owner: String, prefix: String): Flow<List<String>>

    @Query("SELECT DISTINCT login FROM recipes WHERE owner = :owner AND loginKey LIKE :prefix ESCAPE '\\' ORDER BY loginKey LIMIT 8")
    abstract fun logins(owner: String, prefix: String): Flow<List<String>>

    @Query("DELETE FROM recipes WHERE owner != :owner")
    abstract suspend fun keepOnly(owner: String)

    @Query("DELETE FROM recipes WHERE owner = :owner")
    protected abstract suspend fun deleteOwner(owner: String)

    @Insert
    protected abstract suspend fun insert(rows: List<RecipeRow>)

    @Transaction
    open suspend fun replace(owner: String, rows: List<RecipeRow>) {
        deleteOwner(owner)
        if (rows.isNotEmpty()) insert(rows)
    }
}

@Database(entities = [RecipeRow::class], version = 1)
internal abstract class RecipeCache : RoomDatabase() {
    abstract fun recipes(): RecipeDao
}

internal fun lookupText(value: String) = value.trim().lowercase(Locale.ROOT)
internal fun lookupSite(value: String) = lookupText(value).removePrefix("https://").removePrefix("http://").removePrefix("www.")
internal fun searchPrefix(value: String) = value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%"
internal fun JSONObject.values(): Options = keys().asSequence().associateWith { key -> opt(key).takeUnless { it == JSONObject.NULL } }
private fun JSONArray.strings() = (0 until length()).map(::getString)
private fun JSONArray.objects() = (0 until length()).map { getJSONObject(it).values() }
