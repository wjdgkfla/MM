import { FirebaseApp, getApp, getApps, initializeApp } from 'firebase/app'
import { Auth, getAuth } from 'firebase/auth'

function getFirebaseClientConfig() {
  return {
    apiKey: (process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '').trim(),
    authDomain: (process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '').trim(),
    projectId: (process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '').trim(),
    appId: (process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '').trim(),
  }
}

export function isFirebaseClientConfigured() {
  const config = getFirebaseClientConfig()
  return Boolean(config.apiKey && config.authDomain && config.projectId && config.appId)
}

export function getFirebaseClientApp(): FirebaseApp {
  if (!isFirebaseClientConfigured()) {
    throw new Error(
      'Firebase client is not configured. Set NEXT_PUBLIC_FIREBASE_API_KEY, NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN, NEXT_PUBLIC_FIREBASE_PROJECT_ID, and NEXT_PUBLIC_FIREBASE_APP_ID.'
    )
  }

  const existing = getApps()
  if (existing.length > 0) {
    return getApp()
  }

  return initializeApp(getFirebaseClientConfig())
}

export function getFirebaseClientAuth(): Auth {
  return getAuth(getFirebaseClientApp())
}
