package top.kcpd.zerokey

import android.content.Context
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.os.SystemClock
import android.util.Log
import androidx.room.Room
import com.google.firebase.FirebaseApp
import com.google.firebase.FirebaseOptions
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.FirebaseFirestoreException
import com.google.firebase.firestore.FirebaseFirestoreSettings
import com.google.firebase.firestore.ListenerRegistration
import com.google.firebase.firestore.MemoryCacheSettings
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

internal class Cloud private constructor(context: Context, app: FirebaseApp) {
    val auth = FirebaseAuth.getInstance(app)
    val vault: VaultStore
    val cache = Room.databaseBuilder(context, RecipeCache::class.java, "vault-recipes.db").build().recipes()
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)
    private val roomWrites = Mutex()
    private var subscription: ListenerRegistration? = null
    private var session = 0L
    private val accountState = MutableStateFlow<Account>(Account.Restoring)
    val account = accountState.asStateFlow()
    private val connectivity = context.getSystemService(ConnectivityManager::class.java)
    private var connected = hasNetwork()
    private var serverState = Sync.CONNECTING
    private val mutableState = MutableStateFlow(Sync.CONNECTING)
    val sync = mutableState.asStateFlow()

    sealed interface Account {
        data object Restoring : Account
        data object SignedOut : Account
        data class SignedIn(val uid: String) : Account
    }

    enum class Sync { CONNECTING, ONLINE, OFFLINE, UNAVAILABLE }
    data class Read(val profile: VaultStore.Profile, val offline: Boolean = false)

    init {
        val db = if (BuildConfig.FIREBASE_EMULATOR) FirebaseFirestore.getInstance(app)
            else FirebaseFirestore.getInstance(app, "default")
        if (BuildConfig.FIREBASE_EMULATOR) {
            auth.useEmulator("10.0.2.2", 9099)
            db.useEmulator("10.0.2.2", 8080)
        }
        db.firestoreSettings = FirebaseFirestoreSettings.Builder(db.firestoreSettings)
            .setLocalCacheSettings(MemoryCacheSettings.newBuilder().build()).build()
        vault = VaultStore(db)
        connectivity.registerDefaultNetworkCallback(object : ConnectivityManager.NetworkCallback() {
            override fun onAvailable(network: Network) = networkChanged()
            override fun onLost(network: Network) = networkChanged()
            override fun onCapabilitiesChanged(network: Network, capabilities: NetworkCapabilities) = networkChanged()
        })
        auth.addAuthStateListener { switchAccount(it.uid) }
    }

    suspend fun current(id: String, owner: String, allowOffline: Boolean): Read {
        check(auth.uid == owner) { "Sign in again to open this recipe." }
        return try {
            val recipe = vault.fetch(id)
            check(recipe.userId == owner && auth.uid == owner) { "Sign in again to open this recipe." }
            Read(recipe)
        } catch (error: FirebaseFirestoreException) {
            if (!allowOffline || !error.connectionError || auth.uid != owner) throw error
            val cached = cache.find(owner, id)?.profile() ?: throw error
            check(auth.uid == owner && sync.value != Sync.UNAVAILABLE) { "Sign in again to open this recipe." }
            Read(cached, offline = true)
        }
    }

    private fun switchAccount(uid: String?) {
        val account = if (uid == null) Account.SignedOut else Account.SignedIn(uid)
        if (accountState.value == account) return
        val identity = ++session
        subscription?.remove()
        subscription = null
        updateSync(Sync.CONNECTING)
        accountState.value = account
        // The server request can start while Room removes rows for previous accounts.
        scope.launch {
            roomWrites.withLock { if (identity == session) cache.keepOnly(uid.orEmpty()) }
        }
        if (uid == null) return
        var initialSyncStartedAt: Long? = SystemClock.elapsedRealtime()
        var event = 0L
        subscription = vault.listen(uid) { profiles, error ->
            if (identity != session) return@listen
            val latest = ++event
            if (profiles == null && error == null) {
                // An initial snapshot from memory can arrive before an online server responds.
                if (serverState == Sync.ONLINE) updateSync(Sync.OFFLINE)
            } else if (error != null) {
                updateSync(Sync.UNAVAILABLE)
            }
            scope.launch {
                roomWrites.withLock {
                    if (identity != session) return@withLock
                    if (error?.code == FirebaseFirestoreException.Code.PERMISSION_DENIED ||
                        error?.code == FirebaseFirestoreException.Code.UNAUTHENTICATED) {
                        cache.replace(uid, emptyList())
                    } else if (profiles != null) {
                        cache.replace(uid, profiles.map(RecipeRow::from))
                        if (latest == event) {
                            updateSync(Sync.ONLINE)
                            initialSyncStartedAt?.let {
                                Log.d("ZeroKeySignIn", "First Vault sync completed in ${SystemClock.elapsedRealtime() - it} ms")
                                initialSyncStartedAt = null
                            }
                        }
                    }
                }
            }
        }
    }

    private fun hasNetwork(): Boolean =
        connectivity.activeNetwork?.let(connectivity::getNetworkCapabilities)
            ?.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET) == true

    private fun networkChanged() {
        scope.launch {
            val available = hasNetwork()
            if (available == connected) return@launch
            connected = available
            updateSync(if (serverState == Sync.UNAVAILABLE) serverState else Sync.CONNECTING)
        }
    }

    private fun updateSync(state: Sync) {
        serverState = state
        mutableState.value = if (!connected && state != Sync.UNAVAILABLE) Sync.OFFLINE else state
    }

    companion object {
        private var instance: Cloud? = null

        @Synchronized fun get(context: Context): Cloud? {
            instance?.let { return it }
            val application = context.applicationContext
            val app = if (BuildConfig.FIREBASE_EMULATOR) FirebaseApp.initializeApp(application, FirebaseOptions.Builder()
                .setApplicationId("1:123456789:android:0123456789abcdef")
                .setApiKey("demo-key")
                .setProjectId("demo-zerokey-android").build(), "zerokey-emulator")
            else FirebaseApp.initializeApp(application)
            return app?.let { Cloud(application, it).also { instance = it } }
        }
    }
}

internal val FirebaseFirestoreException.connectionError get() =
    code == FirebaseFirestoreException.Code.UNAVAILABLE || code == FirebaseFirestoreException.Code.DEADLINE_EXCEEDED
