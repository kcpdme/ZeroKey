package top.kcpd.zerokey

import android.app.Activity
import android.content.Context
import android.content.res.ColorStateList
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.graphics.drawable.RippleDrawable
import android.graphics.drawable.StateListDrawable
import android.text.InputType
import android.view.Gravity
import android.view.View
import android.view.inputmethod.EditorInfo
import android.widget.Button
import android.widget.EditText
import android.widget.FrameLayout
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import androidx.appcompat.widget.AppCompatImageButton
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.doOnAttach
import androidx.core.widget.doAfterTextChanged

internal val Context.canvas get() = getColor(R.color.page_background)
internal val Context.surface get() = getColor(R.color.panel_background)
internal val Context.fieldSurface get() = getColor(R.color.field_background)
internal val Context.strokeColor get() = getColor(R.color.outline)
internal val Context.inkColor get() = getColor(R.color.ink)
internal val Context.muted get() = getColor(R.color.secondary_ink)
internal val Context.accent get() = getColor(R.color.action)
internal val Context.accentSurface get() = getColor(R.color.action_container)
internal val Context.onAccent get() = getColor(R.color.on_action)
internal val Context.errorColor get() = getColor(R.color.error_text)

internal fun Activity.dp(value: Int) = (resources.displayMetrics.density * value + 0.5f).toInt()
internal fun View.dp(value: Int) = (resources.displayMetrics.density * value + 0.5f).toInt()
internal fun Activity.column() = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }

internal fun Activity.text(label: String, size: Float = 14f, color: Int = muted) =
    TextView(this).apply {
        text = label
        textSize = size
        typeface = Typeface.DEFAULT
        setTextColor(color)
    }

internal fun Activity.heading(label: String, size: Float = 32f) = text(label, size, inkColor).apply {
    typeface = Typeface.create("sans-serif-medium", Typeface.NORMAL)
    ViewCompat.setAccessibilityHeading(this, true)
}

internal fun Activity.rounded(fill: Int, radius: Int, border: Int? = null) =
    GradientDrawable().apply {
        setColor(fill)
        cornerRadius = dp(radius).toFloat()
        border?.let { setStroke(dp(1), it) }
    }

internal fun Activity.pressable(fill: Int, radius: Int, border: Int? = null) =
    RippleDrawable(ColorStateList.valueOf((accent and 0x00FFFFFF) or 0x24000000), rounded(fill, radius, border), rounded(-1, radius))

internal fun Activity.button(label: String, click: () -> Unit) = action(label, false, click)
internal fun Activity.primaryButton(label: String, click: () -> Unit) = action(label, true, click)

private fun Activity.action(label: String, primary: Boolean, click: () -> Unit) = Button(this).apply {
    text = label
    textSize = 14f
    isAllCaps = false
    minimumHeight = dp(52)
    minHeight = minimumHeight
    typeface = Typeface.create("sans-serif-medium", Typeface.NORMAL)
    letterSpacing = 0.012f
    stateListAnimator = null
    setTextColor(ColorStateList(
        arrayOf(intArrayOf(-android.R.attr.state_enabled), intArrayOf()),
        intArrayOf(muted, if (primary) onAccent else accent),
    ))
    background = StateListDrawable().apply {
        addState(intArrayOf(-android.R.attr.state_enabled), rounded(fieldSurface, 24))
        addState(intArrayOf(), pressable(if (primary) accent else accentSurface, 24))
    }
    setPadding(dp(18), dp(7), dp(18), dp(7))
    setOnClickListener { click() }
}

internal fun Activity.icon(resource: Int, tint: Int = muted) = ImageView(this).apply {
    setImageResource(resource)
    setColorFilter(tint)
    scaleType = ImageView.ScaleType.CENTER_INSIDE
    importantForAccessibility = View.IMPORTANT_FOR_ACCESSIBILITY_NO
}

internal fun Activity.actionIcon(resource: Int, label: String) = AppCompatImageButton(this).apply {
    setImageResource(resource)
    setColorFilter(inkColor)
    scaleType = ImageView.ScaleType.CENTER_INSIDE
    setPadding(dp(12), dp(12), dp(12), dp(12))
    background = pressable(android.graphics.Color.TRANSPARENT, 24)
    contentDescription = label
    importantForAccessibility = View.IMPORTANT_FOR_ACCESSIBILITY_YES
    isFocusable = true
}

internal fun Activity.iconButton(resource: Int, label: String, click: () -> Unit) =
    actionIcon(resource, label).apply { setOnClickListener { click() } }

internal fun Activity.brandBar(action: View? = null) = LinearLayout(this).apply {
    gravity = Gravity.CENTER_VERTICAL
    val mark = icon(R.drawable.ic_key, accent).apply {
        setPadding(dp(8), dp(8), dp(8), dp(8))
        background = rounded(accentSurface, 11)
    }
    addView(mark, LinearLayout.LayoutParams(dp(36), dp(36)))
    addView(text("ZeroKey", 18f, inkColor).apply { setTypeface(null, Typeface.BOLD) },
        LinearLayout.LayoutParams(0, -2, 1f).apply { marginStart = dp(10) })
    if (action != null) addView(action, LinearLayout.LayoutParams(-2, -2))
    minimumHeight = dp(48)
}

internal fun Activity.dock(generator: Boolean, openOther: () -> Unit) = LinearLayout(this).apply {
    gravity = Gravity.CENTER
    setPadding(dp(20), dp(8), dp(20), dp(8))
    background = rounded(surface, 0)
    elevation = dp(3).toFloat()
    val row = LinearLayout(this@dock)
    addView(row, LinearLayout.LayoutParams(dp(440).coerceAtMost(resources.displayMetrics.widthPixels - dp(40)), -2))
    for ((label, active) in listOf("Vault" to !generator, "Generator" to generator)) {
        val isGenerator = label == "Generator"
        val tab = button(label, openOther).apply {
            id = if (isGenerator) R.id.generator_tab else R.id.vault_button
            isSelected = active
            if (active) setOnClickListener(null)
            isClickable = !active
            setTextColor(if (active) accent else muted)
            background = pressable(if (active) accentSurface else surface, 18)
            val glyph = getDrawable(if (isGenerator) R.drawable.ic_key else R.drawable.ic_vault)?.mutate()
            glyph?.setTint(if (active) accent else muted)
            glyph?.setBounds(0, 0, dp(19), dp(19))
            setCompoundDrawables(null, glyph, null, null)
            compoundDrawablePadding = dp(3)
            textSize = 12f
        }
        row.addView(tab, LinearLayout.LayoutParams(0, dp(55), 1f).apply {
            if (isGenerator) marginStart = dp(8)
        })
    }
}

internal fun EditText.prepare(label: String, type: Int = InputType.TYPE_CLASS_TEXT) {
    setSingleLine()
    inputType = type
    hint = label
    imeOptions = EditorInfo.IME_FLAG_NO_PERSONALIZED_LEARNING
    isSaveEnabled = false
    typeface = Typeface.create("sans-serif", Typeface.NORMAL)
    textSize = 16f
    setTextColor(context.inkColor)
    setHintTextColor(context.muted)
    minimumHeight = dp(56)
    setPadding(dp(16), dp(10), dp(16), dp(10))
    val activity = context as Activity
    background = StateListDrawable().apply {
        addState(intArrayOf(android.R.attr.state_focused), activity.rounded(context.fieldSurface, 16, context.accent))
        addState(intArrayOf(), activity.rounded(context.fieldSurface, 16))
    }
}

internal fun Activity.add(parent: LinearLayout, view: View, space: Int = 0) {
    parent.addView(view, LinearLayout.LayoutParams(-1, -2).apply { topMargin = dp(space) })
}

internal fun Activity.label(parent: LinearLayout, value: String, target: Int, space: Int = 0) {
    add(parent, text(value, 14f, inkColor).apply {
        labelFor = target
        typeface = Typeface.create("sans-serif-medium", Typeface.NORMAL)
    }, space)
}

internal fun Activity.card() = column().apply {
    setPadding(dp(16), dp(14), dp(16), dp(16))
    background = rounded(surface, 22, strokeColor)
}

internal fun Activity.page(scrollable: Boolean = true, navigation: View? = null,
                           floatingAction: View? = null, toolbar: View? = null): LinearLayout {
    val body = column().apply {
        setPadding(dp(22), dp(12), dp(22), dp(if (scrollable) 24 else 0))
        isFocusableInTouchMode = true
    }
    val content = if (scrollable) {
        ScrollView(this).apply {
            isFillViewport = true
            clipToPadding = false
            addView(body, FrameLayout.LayoutParams(-1, -2, Gravity.CENTER_HORIZONTAL))
        }
    } else body
    val root = column().apply {
        setBackgroundColor(canvas)
        importantForAutofill = View.IMPORTANT_FOR_AUTOFILL_NO_EXCLUDE_DESCENDANTS
        applyPageInsets(this)
        if (toolbar != null) addView(toolbar, LinearLayout.LayoutParams(
            minOf(resources.displayMetrics.widthPixels, dp(600)), -2,
        ).apply { gravity = Gravity.CENTER_HORIZONTAL })
        val frame = FrameLayout(this@page)
        frame.addView(content, FrameLayout.LayoutParams(
            minOf(resources.displayMetrics.widthPixels, dp(600)), -1, Gravity.CENTER_HORIZONTAL,
        ))
        if (floatingAction != null) {
            val overlay = FrameLayout(this@page)
            overlay.addView(floatingAction, FrameLayout.LayoutParams(dp(56), dp(56), Gravity.END or Gravity.BOTTOM).apply {
                marginEnd = dp(22)
                bottomMargin = dp(16)
            })
            frame.addView(overlay, FrameLayout.LayoutParams(
                minOf(resources.displayMetrics.widthPixels, dp(600)), -1, Gravity.CENTER_HORIZONTAL,
            ))
        }
        addView(frame, LinearLayout.LayoutParams(-1, 0, 1f))
        if (navigation != null) addView(navigation, LinearLayout.LayoutParams(-1, -2))
    }
    setContentView(root)
    body.requestFocus()
    return body
}

internal fun applyPageInsets(root: View) {
    ViewCompat.setOnApplyWindowInsetsListener(root) { view, insets ->
        val bars = insets.getInsetsIgnoringVisibility(
            WindowInsetsCompat.Type.systemBars() or WindowInsetsCompat.Type.displayCutout(),
        )
        view.setPadding(bars.left, bars.top, bars.right,
            maxOf(bars.bottom, insets.getInsets(WindowInsetsCompat.Type.ime()).bottom))
        insets
    }
    root.doOnAttach { ViewCompat.requestApplyInsets(it) }
}

internal fun EditText.watchText(callback: (String) -> Unit) = doAfterTextChanged { callback(it.toString()) }
internal fun shown(value: Boolean) = if (value) View.VISIBLE else View.GONE
internal fun Exception.userMessage(): String = when (this) {
    is IllegalArgumentException, is IllegalStateException -> message ?: "Try again."
    else -> "Could not finish. Try again."
}
