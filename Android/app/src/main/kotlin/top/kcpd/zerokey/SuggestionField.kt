package top.kcpd.zerokey

import android.content.Context
import android.graphics.Rect
import android.widget.ArrayAdapter
import androidx.appcompat.widget.AppCompatAutoCompleteTextView
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.emptyFlow
import kotlinx.coroutines.launch

/** Room owns the filtering. The native dropdown handles display and keyboard selection. */
internal class SuggestionField(context: Context, private val scope: CoroutineScope) : AppCompatAutoCompleteTextView(context) {
    var lookup: (String) -> Flow<List<String>> = { emptyFlow() }
    private val suggestions = ArrayAdapter<String>(context, android.R.layout.simple_dropdown_item_1line)
    private var request: Job? = null

    init {
        setAdapter(suggestions)
        watchText { if (!isPerformingCompletion) refreshSuggestions() }
        setOnItemClickListener { _, _, _, _ -> stopSuggestions() }
        setOnClickListener { refreshSuggestions() }
    }

    // Do not let the widget filter or replace the Room results when the text changes.
    override fun enoughToFilter() = true
    override fun performFiltering(text: CharSequence?, keyCode: Int) = Unit

    override fun onFocusChanged(focused: Boolean, direction: Int, previouslyFocusedRect: Rect?) {
        super.onFocusChanged(focused, direction, previouslyFocusedRect)
        if (focused) refreshSuggestions() else stopSuggestions()
    }

    override fun onWindowFocusChanged(hasWindowFocus: Boolean) {
        super.onWindowFocusChanged(hasWindowFocus)
        if (hasWindowFocus) refreshSuggestions() else stopSuggestions()
    }

    override fun onDetachedFromWindow() {
        stopSuggestions()
        super.onDetachedFromWindow()
    }

    private fun refreshSuggestions() {
        stopSuggestions()
        if (!isShown || !isEnabled || !hasFocus() || !hasWindowFocus()) return
        val query = text.toString()
        request = scope.launch {
            delay(75)
            lookup(query).collect { matches ->
                if (!isShown || !isEnabled || !hasFocus() || !hasWindowFocus() || text.toString() != query) return@collect
                val items = matches.filter { it != query }
                if (items.isEmpty()) dismissDropDown()
                suggestions.setNotifyOnChange(false)
                suggestions.clear()
                suggestions.addAll(items)
                suggestions.notifyDataSetChanged()
                if (items.isNotEmpty() && !isPopupShowing) showDropDown()
            }
        }
    }

    fun stopSuggestions() {
        request?.cancel()
        request = null
        dismissDropDown()
    }
}
