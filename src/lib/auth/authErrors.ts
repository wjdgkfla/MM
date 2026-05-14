const SUPABASE_AUTH_MESSAGES: Record<string, string> = {
  'Invalid login credentials': 'The email or password you entered is incorrect.',
  'Email not confirmed': 'Please confirm your email before signing in.',
  'User already registered': 'An account already exists for this email. Try signing in instead.',
  'Password should be at least 6 characters': 'Password is too weak. Use at least 6 characters.',
  'Unable to validate email address: invalid format': 'That email address looks invalid. Please check and try again.',
  'Email rate limit exceeded': 'Too many attempts. Please wait a moment and try again.',
  'over_email_send_rate_limit': 'Too many attempts. Please wait a moment and try again.',
  'signup_disabled': 'Sign-ups are temporarily disabled. Please try again shortly.',
  'email_address_not_authorized': 'This email is not authorized to sign up.',
}

const GENERIC_SIGN_IN_MESSAGE = 'We could not sign you in right now. Please try again in a moment.'
const GENERIC_SIGN_UP_MESSAGE = 'We could not create your account right now. Please try again in a moment.'
const CONFIG_MESSAGE = 'Mason Market sign-in is temporarily unavailable. Please try again shortly.'

export function friendlyAuthError(error: unknown, fallback: 'sign-in' | 'sign-up' = 'sign-in'): string {
  const defaultMessage = fallback === 'sign-up' ? GENERIC_SIGN_UP_MESSAGE : GENERIC_SIGN_IN_MESSAGE

  if (error instanceof Error && error.message.includes('not configured')) {
    return CONFIG_MESSAGE
  }

  if (error instanceof Error && error.message) {
    // Check Supabase error messages
    for (const [key, friendly] of Object.entries(SUPABASE_AUTH_MESSAGES)) {
      if (error.message.includes(key)) return friendly
    }
    // Surface other readable messages directly
    if (!error.message.toLowerCase().includes('supabase')) {
      return error.message
    }
  }

  // Supabase error objects have a `message` property
  const errObj = error as { message?: string; status?: number }
  if (errObj?.message) {
    for (const [key, friendly] of Object.entries(SUPABASE_AUTH_MESSAGES)) {
      if (errObj.message.includes(key)) return friendly
    }
    return errObj.message
  }

  return defaultMessage
}
