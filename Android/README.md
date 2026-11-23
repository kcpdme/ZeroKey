# ZeroKey for Android

ZeroKey opens in **Vault**. It shows **Opening Vault…** while Firebase restores your session. Saved recipes appear as soon as the local copy is ready. On first sign-in, **Syncing recipes…** appears while the vault downloads. Tap **Sign in** when you are signed out, using the Google or email account you use on the Web. The bottom bar shows **Vault** first, then **Generator**. Tap **+** in Vault to start with a cleared Generator form. The vault syncs with the same Firestore database as kcpd.top. Room keeps a local copy of your recipes and uses indexed lookups for the **Site** and **Login** dropdowns, including when you are offline. Signing out clears the local vault.

After you choose an account in Android's Google picker, ZeroKey shows **Signing in with Google…** while Firebase establishes the session. To diagnose a slow sign-in, run `adb logcat -s ZeroKeySignIn:D`. The timing messages record the Google picker duration, Firebase sign-in, and first successful recipe sync.

The generator saves new recipes when you are signed in. If it finds an existing site and login, choose the current recipe or select **Rotate**. Generate the new version, change the password at the site, then tap **Make current**.

Use **Edit** in a recipe's menu to change the site, login, or password settings for the next version. Generate a preview to enable the Save icon. Changing an input clears the preview. Save once the site accepts the new password. The previous recipe moves to **Version history**.

Offline, you can use your last synced current recipes or enter a recipe manually. Syncing new recipes and changing versions require a connection. The app runs the shared Web generator on-device. The master key and generated passwords stay out of Firebase and Room. The app clears them from the generator when it goes into the background.

Open the account icon to find **Settings**. **Theme** offers System, Light, and Dark. **Biometric unlock** prompts automatically when the app opens or returns from the background. Tap **Unlock ZeroKey** to try again if you cancel the prompt. Android can fall back to the device screen lock. Device unlock works offline and uses a separate check from Firebase sign-in. Sign in online once to sync recipes for offline use.

Use the search field at the top of **Vault** to search by site, login, or tag. Choose **Category** from a recipe's three-dot menu to select existing tags or create one by typing a name. The category chips filter by favorites and saved tags. **Google site icons** are optional and send the website domain to Google when enabled.

**Export recipes** creates a plain-text JSON backup that the Web app can import. It includes confirmed version history, notes, and custom fields. ZeroKey fetches the backup from your account before opening the Android file picker.

## Build and install

Use Node.js 22, JDK 17, and Android SDK Platform 36. Set `ANDROID_HOME` to your SDK directory. Run these commands from the repository root.

```bash
npm --prefix Web ci
cd Android
./gradlew assembleDebug
```

Install `app/build/outputs/apk/debug/app-debug.apk` on Android 8.0 (API 26) or later with an up-to-date Android System WebView. Android Studio can open the `Android/` folder as a project.

For vault access, place the Firebase client configuration for `top.kcpd.zerokey` in `Android/app/google-services.json`. To use the production vault, download the configuration from the `stateless-pass` project. Register the SHA-1 of the APK's signing certificate in Firebase and redownload the configuration for Google sign-in. A build without the file runs as a standalone generator.

## Verify on Android

Run the Auth and Firestore emulators from the repository root.

```bash
firebase emulators:start --config Web/firebase.json --project demo-zerokey-android --only auth,firestore
```

Start an Android emulator and run from `Android/`.

```bash
./gradlew -PfirebaseEmulator=true connectedDebugAndroidTest
```

The tests compare the Android generator against 5,000 fixed Web outputs. They also exercise the native form, Firebase sign-in, duplicate saves, draft confirmation, Room sync, and native offline suggestions. The emulator build uses a separate application ID.
