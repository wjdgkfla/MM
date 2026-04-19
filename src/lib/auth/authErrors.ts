const FIREBASE_AUTH_MESSAGES: Record<string, string> = {
  'auth/invalid-email': 'That email address looks invalid. Please check and try again.',
  'auth/user-disabled': 'This account has been disabled. Contact Mason Market support if you think this is a mistake.',
  'auth/user-not-found': 'No account found for that email. Try creating one instead.',
  'auth/wrong-password': 'Incorrect password. Please try again.',
  'auth/invalid-credential': 'The email or password you entered is incorrect.',
  'auth/invalid-login-credentials': 'The email or password you entered is incorrect.',
  'auth/too-many-requests': 'Too many failed attempts. Please wait a moment and try again.',
  'auth/network-request-failed': 'Network issue. Check your connection and try again.',
  'auth/email-already-in-use': 'An account already exists for this email. Try signing in instead.',
  'auth/weak-password': 'Password is too weak. Use at least 6 characters.',
  'auth/operation-not-allowed': 'This sign-in method is not enabled. Contact support.',
  'auth/popup-closed-by-user': 'Sign-in window was closed before completing.',
  'auth/requires-recent-login': 'Please sign in again to complete this action.',
}

const GENERIC_SIGN_IN_MESSAGE = 'We could not sign you in right now. Please try again in a moment.'
const GENERIC_SIGN_UP_MESSAGE = 'We could not create your account right now. Please try again in a moment.'
const CONFIG_MESSAGE = 'Mason Market sign-in is temporarily unavailable. Please try again shortly.'

function extractFirebaseCode(error: unknown): string | null {
  if (!error || typeof error !== 'object') return null
  const code = (error as { code?: unknown }).code
  return typeof code === 'string' ? code : null
}

export function friendlyAuthError(error: unknown, fallback: 'sign-in' | 'sign-up' = 'sign-in'): string {
  const defaultMessage = fallback === 'sign-up' ? GENERIC_SIGN_UP_MESSAGE : GENERIC_SIGN_IN_MESSAGE

  if (error instanceof Error && error.message.startsWith('Firebase client is not configured')) {
    return CONFIG_MESSAGE
  }

  const code = extractFirebaseCode(error)
  if (code && FIREBASE_AUTH_MESSAGES[code]) {
    return FIREBASE_AUTH_MESSAGES[code]
  }

  if (error instanceof Error && error.message && !error.message.toLowerCase().includes('firebase')) {
    return error.message
  }

  return defaultMessage
}
