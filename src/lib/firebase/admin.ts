import { App, cert, getApps, initializeApp } from 'firebase-admin/app'
import { Auth, getAuth } from 'firebase-admin/auth'
import { Firestore, getFirestore } from 'firebase-admin/firestore'
import fs from 'node:fs'
import path from 'node:path'

function readEnv(name: string) {
  const value = process.env[name]
  return typeof value === 'string' && value.trim().length > 0 ? value : ''
}

export function isFirebaseAdminConfigured() {
  const envConfigured = Boolean(
    readEnv('FIREBASE_PROJECT_ID') &&
      readEnv('FIREBASE_CLIENT_EMAIL') &&
      readEnv('FIREBASE_PRIVATE_KEY')
  )
  if (envConfigured) return true

  return Boolean(readServiceAccountFromFile())
}

type ServiceAccountConfig = {
  projectId: string
  clientEmail: string
  privateKey: string
}

function readServiceAccountFromFile(): ServiceAccountConfig | null {
  const filePath = path.join(process.cwd(), 'firebase-service-account.json')
  if (!fs.existsSync(filePath)) return null

  try {
    const raw = fs.readFileSync(filePath, 'utf8')
    const parsed = JSON.parse(raw)
    const projectId = typeof parsed?.project_id === 'string' ? parsed.project_id : ''
    const clientEmail = typeof parsed?.client_email === 'string' ? parsed.client_email : ''
    const privateKey = typeof parsed?.private_key === 'string' ? parsed.private_key : ''
    if (!projectId || !clientEmail || !privateKey) return null
    return { projectId, clientEmail, privateKey }
  } catch {
    return null
  }
}

function getFirebaseAdminApp(): App | null {
  if (!isFirebaseAdminConfigured()) {
    return null
  }

  const existing = getApps()[0]
  if (existing) return existing

  const envProjectId = readEnv('FIREBASE_PROJECT_ID')
  const envClientEmail = readEnv('FIREBASE_CLIENT_EMAIL')
  const envPrivateKey = readEnv('FIREBASE_PRIVATE_KEY')
  const fromFile = readServiceAccountFromFile()

  const projectId = envProjectId || fromFile?.projectId || ''
  const clientEmail = envClientEmail || fromFile?.clientEmail || ''
  const privateKey = (envPrivateKey ? envPrivateKey.replace(/\\n/g, '\n') : fromFile?.privateKey) || ''

  return initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  })
}

export function getFirebaseAdminDb(): Firestore | null {
  const app = getFirebaseAdminApp()
  if (!app) return null
  return getFirestore(app)
}

export function getFirebaseAdminAuth(): Auth | null {
  const app = getFirebaseAdminApp()
  if (!app) return null
  return getAuth(app)
}

export async function getFirebaseAdminStatus() {
  const projectId = readEnv('FIREBASE_PROJECT_ID')
  const clientEmail = readEnv('FIREBASE_CLIENT_EMAIL')
  const privateKeyRaw = readEnv('FIREBASE_PRIVATE_KEY')
  const configured = isFirebaseAdminConfigured()
  const fileConfigured = Boolean(readServiceAccountFromFile())

  if (!configured) {
    return {
      configured,
      env: {
        FIREBASE_PROJECT_ID: Boolean(projectId),
        FIREBASE_CLIENT_EMAIL: Boolean(clientEmail),
        FIREBASE_PRIVATE_KEY: Boolean(privateKeyRaw),
        FIREBASE_SERVICE_ACCOUNT_FILE: fileConfigured,
      },
      connected: false,
      details: 'Missing one or more FIREBASE_* env vars.',
    }
  }

  try {
    const db = getFirebaseAdminDb()
    if (!db) {
      return {
        configured,
        env: {
          FIREBASE_PROJECT_ID: true,
          FIREBASE_CLIENT_EMAIL: true,
          FIREBASE_PRIVATE_KEY: true,
        },
        connected: false,
        details: 'Firebase Admin did not initialize.',
      }
    }

    const collections = await db.listCollections()
    return {
      configured,
      env: {
        FIREBASE_PROJECT_ID: true,
        FIREBASE_CLIENT_EMAIL: true,
        FIREBASE_PRIVATE_KEY: true,
        FIREBASE_SERVICE_ACCOUNT_FILE: fileConfigured,
      },
      connected: true,
      details: `Connected. Collections found: ${collections.length}.`,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown Firebase connection error'
    return {
      configured,
      env: {
        FIREBASE_PROJECT_ID: true,
        FIREBASE_CLIENT_EMAIL: true,
        FIREBASE_PRIVATE_KEY: true,
        FIREBASE_SERVICE_ACCOUNT_FILE: fileConfigured,
      },
      connected: false,
      details: message,
    }
  }
}
