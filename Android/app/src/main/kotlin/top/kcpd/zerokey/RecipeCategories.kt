package top.kcpd.zerokey

internal data class RecipeCategory(val value: String, val label: String, val color: Int) {
    val key get() = lookupText(value)
}

// Keep the built-in IDs compatible with the Web tag picker.
private val defaults = listOf(
    "Work" to 0xFF627BE5,
    "Personal" to 0xFF508D9F,
    "Finance" to 0xFFBE7C47,
    "Social" to 0xFFBD6576,
    "Shopping" to 0xFFBE7C47,
    "Entertainment" to 0xFF9D6CB4,
    "Gaming" to 0xFFBD6576,
    "Travel" to 0xFF508D9F,
    "Tech" to 0xFF627BE5,
    "Health" to 0xFF508D9F,
    "Education" to 0xFF697791,
    "Crypto" to 0xFF9D6CB4,
).associate { (label, color) ->
    val key = lookupText(label)
    key to RecipeCategory(key, label, color.toInt())
}

private val customColors = listOf(0xFF627BE5, 0xFF9D6CB4, 0xFFBD6576, 0xFFBE7C47, 0xFF508D9F, 0xFF697791)

internal fun recipeCategory(value: String): RecipeCategory {
    val name = value.trim()
    val key = lookupText(name)
    return defaults[key] ?: RecipeCategory(name, name, customColors[Math.floorMod(key.hashCode(), customColors.size)].toInt())
}

internal fun recipeCategories(tags: List<String>) =
    tags.filter(String::isNotBlank).map(::recipeCategory).distinctBy(RecipeCategory::key).sortedBy(RecipeCategory::key)
