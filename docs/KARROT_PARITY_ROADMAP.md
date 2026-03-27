# Karrot Parity Roadmap (Mason Market)

## 1) Real auth stack parity
- Status: In progress
- Done:
  - Firebase email/password client auth on `/sign-in` and `/sign-up`
  - Server verifies Firebase ID token before issuing app session cookie
  - User profile is synced to Firestore on sign-in/sign-up
- Next:
  - Password reset flow
  - Optional email verification enforcement for GMU domains

## 2) Real persistent backend (products/users/messages/media)
- Status: In progress
- Done:
  - Firestore user sync
  - Admin one-click seed for users/listings/messages/reports/adminActivity
- Next:
  - Switch `dataAccess` listing/message/report operations to Firestore-backed repositories
  - Add Firebase Storage for listing images

## 3) Map + distance/radius discovery
- Status: Not started
- Next:
  - Add map view route/tab
  - Enable geolocation + radius filtering by pickup coordinates

## 4) Recent viewed history
- Status: Not started
- Next:
  - Track recent item views per user
  - Add `/recent` page

## 5) Buyer/seller transaction history
- Status: Not started
- Next:
  - Add transactions model + history pages
  - Segment statuses (available/reserved/sold/completed)

## 6) Post-transaction rating flow
- Status: Not started
- Next:
  - Purchase confirmation + seller rating
  - Update trust/reputation score from completed transactions

## 7) Chat depth parity
- Status: Partial
- Done:
  - Listing-linked conversations and threads
- Next:
  - Unread counts
  - Conversation metadata sync
  - Stronger transaction-coupled room lifecycle
