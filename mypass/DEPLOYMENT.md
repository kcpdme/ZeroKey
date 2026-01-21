# Deployment Guide

## Environment Variables
To deploy this application on Vercel or any other hosting provider, you must set the following environment variables. These values can be found in your Firebase Console under **Project Settings > General**.

| Variable Keyword | Description |
|------------------|-------------|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Your Firebase API Key |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Your Firebase Auth Domain |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Your Firebase Project ID |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Your Firebase Storage Bucket |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Your Firebase Messaging Sender ID |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Your Firebase App ID |

### How to set on Vercel
1. Go to your project dashboard on Vercel.
2. Navigate to **Settings > Environment Variables**.
3. Add each variable name and its corresponding value from your Firebase console.
4. Save and redeploy your application.
