package top.kcpd.zerokey

import android.app.Activity
import android.content.res.ColorStateList
import android.view.Gravity
import android.view.KeyEvent
import android.view.View
import android.view.inputmethod.EditorInfo
import android.widget.CheckBox
import android.widget.EditText
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.ScrollView
import androidx.appcompat.app.AlertDialog

internal fun Activity.categoryPicker(site: String, tags: List<String>, current: List<String>,
                                     onSave: (List<String>) -> Unit): AlertDialog {
    val available = recipeCategories(tags + current).associateByTo(linkedMapOf(), RecipeCategory::key)
    val selected = current.mapTo(linkedSetOf(), ::lookupText)
    val body = column().apply {
        setPadding(dp(22), dp(14), dp(22), dp(12))
        isFocusableInTouchMode = true
    }
    add(body, heading("Category", 23f))
    add(body, text(site).apply { maxLines = 1; ellipsize = android.text.TextUtils.TruncateAt.END }, 4)
    val search = EditText(this).apply {
        id = R.id.category_input
        prepare("Find or create a tag")
        imeOptions = imeOptions or EditorInfo.IME_ACTION_DONE
    }
    add(body, search, 16)
    val rows = column()
    val list = ScrollView(this).apply {
        addView(rows, FrameLayout.LayoutParams(-1, -2))
        isVerticalScrollBarEnabled = true
    }
    body.addView(list, LinearLayout.LayoutParams(-1, -2).apply { topMargin = dp(12) })

    fun draw() {
        val typed = search.text.toString().trim()
        val query = lookupText(typed)
        val matches = available.values.filter { lookupText(it.label).contains(query) }
            .sortedWith(compareByDescending<RecipeCategory> { it.key in selected }.thenBy(RecipeCategory::key))
        val height = minOf(dp(if (query.isEmpty()) 245 else 150), dp(maxOf(1, matches.size) * 51))
        if (list.layoutParams.height != height) {
            list.layoutParams = list.layoutParams.apply { this.height = height }
        }
        rows.removeAllViews()
        if (matches.isEmpty()) {
            add(rows, text(if (query.isEmpty()) "No tags yet. Type a name to create one." else "No matching tags."))
        }
        for (tag in matches) {
            val checked = tag.key in selected
            val row = CheckBox(this).apply {
                text = tag.label
                textSize = 15f
                setTextColor(inkColor)
                buttonTintList = ColorStateList.valueOf(if (checked) accent else muted)
                minimumHeight = dp(46)
                minHeight = minimumHeight
                setPaddingRelative(dp(8), 0, dp(12), 0)
                background = pressable(if (checked) accentSurface else fieldSurface, 14)
                val marker = rounded(tag.color, 7).apply { setBounds(0, 0, dp(10), dp(10)) }
                setCompoundDrawablesRelative(null, null, marker, null)
                isChecked = checked
                setOnCheckedChangeListener { _, value ->
                    if (value) selected.add(tag.key) else selected.remove(tag.key)
                    background = pressable(if (value) accentSurface else fieldSurface, 14)
                    buttonTintList = ColorStateList.valueOf(if (value) accent else muted)
                }
            }
            add(rows, row, 5)
        }
    }

    fun addTypedTag() {
        val typed = search.text.toString().trim()
        if (typed.isEmpty()) return
        val tag = recipeCategory(typed)
        available.putIfAbsent(tag.key, tag)
        selected.add(tag.key)
        search.text.clear()
    }

    val create = button("", ::addTypedTag).apply {
        id = R.id.category_create
        gravity = Gravity.CENTER
    }
    add(body, create, 8)
    search.watchText {
        val typed = it.trim()
        create.text = "Create “$typed”"
        create.visibility = shown(typed.isNotEmpty() && lookupText(typed) !in available)
        draw()
    }
    search.setOnEditorActionListener { _, action, event ->
        if (action == EditorInfo.IME_ACTION_DONE ||
            (event?.keyCode == KeyEvent.KEYCODE_ENTER && event.action == KeyEvent.ACTION_DOWN)) {
            addTypedTag()
            true
        } else false
    }

    val actions = LinearLayout(this)
    lateinit var dialog: AlertDialog
    actions.addView(button("Cancel") { dialog.dismiss() }, LinearLayout.LayoutParams(0, -2, 1f))
    actions.addView(primaryButton("Save") {
        val chosen = selected.mapNotNull { available[it]?.value }
        dialog.dismiss()
        onSave(chosen)
    }.apply { id = R.id.category_save }, LinearLayout.LayoutParams(0, -2, 1f).apply { marginStart = dp(8) })
    add(body, actions, 12)
    create.visibility = View.GONE
    draw()
    body.requestFocus()
    dialog = AlertDialog.Builder(this).setView(body).create()
    dialog.window?.setSoftInputMode(android.view.WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE or
        android.view.WindowManager.LayoutParams.SOFT_INPUT_STATE_ALWAYS_HIDDEN)
    return dialog
}
