package top.kcpd.zerokey

import android.app.Activity
import android.content.Intent
import android.os.SystemClock
import android.text.method.PasswordTransformationMethod
import android.view.View
import android.widget.EditText
import android.widget.TextView
import androidx.test.core.app.ActivityScenario
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class GeneratorParityTest {
    private lateinit var vectors: JSONObject
    private val instrumentation = InstrumentationRegistry.getInstrumentation()

    @Before fun loadWebVectors() {
        vectors = instrumentation.context.assets.open("determinism-vectors.json").bufferedReader().use {
            JSONObject(it.readText())
        }
    }

    @Test fun pbkdf2Matches2500WebPasswords() = verify("pbkdf2", "pbkdf2")
    @Test fun memorableMatches2500WebPasswords() = verify("memorable", "memorizable")

    @Test fun nativeFormGeneratesAndRevealsBothKnownPasswords() {
        val secure = vectors.getJSONObject("pbkdf2")
        val memorable = vectors.getJSONObject("memorable")
        val memorableRow = memorable.getJSONArray("inputs").objects().indexOfFirst { it.getString("label") == "standard" }
        val params = secure.getJSONArray("inputs").getJSONObject(0).getJSONObject("params")
        val secureRecipes = secure.getJSONArray("recipes").objects()
        val saltedRecipe = secureRecipes.indexOfFirst { it.getString("label") == "salt-only" }
        var secureFormHeight = 0

        launchGenerator().use { screen ->
            screen.waitForView(R.id.generate, enabled = true)
            screen.onActivity {
                secureFormHeight = it.findViewById<View>(R.id.generator_inputs).height
                assertTrue(secureFormHeight > 0)
                assertTrue(it.findViewById<View>(R.id.salt).isShown)
                it.findViewById<EditText>(R.id.site).setText(params.optString("site"))
                it.findViewById<EditText>(R.id.login).setText(params.optString("login"))
                val master = it.findViewById<EditText>(R.id.master_key)
                master.setText(params.optString("masterPassword"))
                assertTrue(master.transformationMethod is PasswordTransformationMethod)
                val eye = it.findViewById<View>(R.id.show_master_key)
                eye.performClick()
                assertNull(master.transformationMethod)
                assertEquals("Hide master key", eye.contentDescription)
                eye.performClick()
                assertTrue(master.transformationMethod is PasswordTransformationMethod)
                it.findViewById<View>(R.id.advanced_options).performClick()
                it.findViewById<EditText>(R.id.rotation).setText("2")
                it.findViewById<View>(R.id.generate).performClick()
            }
            val nextCounter = secureRecipes.indexOfFirst { it.getString("label") == "next-counter" }
            assertRevealed(screen, secure.getJSONArray("expected").getJSONArray(0).getString(nextCounter))

            screen.onActivity {
                it.findViewById<EditText>(R.id.rotation).setText("1")
                it.findViewById<View>(R.id.advanced_options).performClick()
                val salt = secureRecipes[saltedRecipe].getJSONObject("options").getString("userSalt")
                it.findViewById<EditText>(R.id.salt).setText(salt)
                it.findViewById<View>(R.id.generate).performClick()
            }
            assertRevealed(screen, secure.getJSONArray("expected").getJSONArray(0).getString(saltedRecipe))

            screen.onActivity {
                it.findViewById<View>(R.id.memorable_mode).performClick()
                assertFalse(it.findViewById<View>(R.id.generated_password).isShown)
                assertFalse(it.findViewById<View>(R.id.salt).isShown)
            }
            screen.waitFor("The Memorable form did not settle") {
                !it.findViewById<View>(R.id.generator_inputs).isLayoutRequested
            }
            screen.onActivity {
                assertEquals(secureFormHeight, it.findViewById<View>(R.id.generator_inputs).height)
                it.findViewById<View>(R.id.generate).performClick()
            }
            assertRevealed(screen, memorable.getJSONArray("expected").getJSONArray(memorableRow).getString(0))
        }
    }

    private data class Vector(val label: String, val request: JSONObject, val expected: String)

    private fun verify(key: String, algorithm: String) = runBlocking {
        val suite = vectors.getJSONObject(key)
        val expected = suite.getJSONArray("expected")
        val recipes = suite.getJSONArray("recipes").objects()
        val cases = suite.getJSONArray("inputs").objects().flatMapIndexed { row, input ->
            recipes.mapIndexed { col, recipe ->
                val request = JSONObject(input.getJSONObject("params").toString()).put("algorithm", algorithm)
                if (recipe.has("options")) request.put("options", recipe.getJSONObject("options"))
                Vector(input.getString("label") + " / " + recipe.getString("label"), request,
                    expected.getJSONArray(row).getString(col))
            }
        }
        assertEquals(2_500, cases.size)
        withContext(Dispatchers.Main) {
            GeneratorEngine(instrumentation.targetContext).use { engine ->
                engine.awaitReady()
                cases.chunked(12).forEach { batch ->
                    batch.map { vector -> async { engine.generate(vector.request) } }.awaitAll()
                        .zip(batch).forEach { (actual, vector) ->
                            assertTrue("Password differs from Web in ${vector.label}", actual == vector.expected)
                        }
                }
            }
        }
    }

    private fun assertRevealed(screen: ActivityScenario<MainActivity>, expected: String) {
        screen.waitForView(R.id.show_password)
        screen.onActivity {
            val result = it.findViewById<TextView>(R.id.generated_password)
            assertNotNull(result.contentDescription)
            it.findViewById<View>(R.id.show_password).performClick()
            assertEquals(expected, result.text.toString())
        }
    }

    private fun JSONArray.objects() = (0 until length()).map(::getJSONObject)
}

internal fun launchGenerator(): ActivityScenario<MainActivity> = ActivityScenario.launch(
    Intent(InstrumentationRegistry.getInstrumentation().targetContext, MainActivity::class.java),
)

internal fun <A : Activity> ActivityScenario<A>.waitForView(id: Int, enabled: Boolean = false) =
    waitFor("Expected native view $id to be available") {
        val view = it.findViewById<View>(id)
        view != null && view.isShown && (!enabled || view.isEnabled)
    }

internal fun <A : Activity> ActivityScenario<A>.waitFor(message: String, test: (A) -> Boolean) {
    val deadline = SystemClock.elapsedRealtime() + 20_000
    while (SystemClock.elapsedRealtime() < deadline) {
        var found = false
        onActivity { found = test(it) }
        if (found) return
        SystemClock.sleep(60)
    }
    throw AssertionError(message)
}
