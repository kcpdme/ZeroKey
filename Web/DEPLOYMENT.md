# Deployment Guide

## Environment Variables

To deploy this application on Vercel or any other hosting provider, you must set the following environment variables. These values can be found in your Firebase Console under **Project Settings > General**.

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Your Firebase API Key |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Your Firebase Auth Domain |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Your Firebase Project ID |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Your Firebase Storage Bucket |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Your Firebase Messaging Sender ID |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Your Firebase App ID |
| `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` | reCAPTCHA v3 Site Key (for bot protection) |

## How to set on Vercel

1. Go to your project dashboard on Vercel.
2. Navigate to **Settings > Environment Variables**.
3. Add each variable name and its corresponding value.
4. Save and redeploy your application.

## reCAPTCHA Setup (Bot Protection)

1. Go to https://www.google.com/recaptcha/admin/create
2. Create a reCAPTCHA v3 key
3. Add domains: `localhost` and your production domain
4. Copy the **Site Key** to `NEXT_PUBLIC_RECAPTCHA_SITE_KEY`
5. Copy the **Secret Key** to Firebase Console → App Check → Your Web App

## Firestore Security Rules

Rules live in [`firestore.rules`](firestore.rules). Deploy them with:

```bash
firebase deploy --only firestore:rules
```

Updates must keep `userId` equal to the signed-in user, so a profile cannot be reassigned to someone else:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function signedIn() {
      return request.auth != null;
    }

    match /password_profiles/{document} {
      allow read: if signedIn() && request.auth.uid == resource.data.userId;
      allow create: if signedIn() && request.auth.uid == request.resource.data.userId;
      allow update: if signedIn()
        && request.auth.uid == resource.data.userId
        && request.auth.uid == request.resource.data.userId;
      allow delete: if signedIn() && request.auth.uid == resource.data.userId;
    }

    match /user_settings/{userId} {
      allow read, write: if signedIn() && request.auth.uid == userId;
    }
  }
}
```
