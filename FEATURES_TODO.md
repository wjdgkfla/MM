# Mason Market — Feature Backlog

Features to consider adding. Prioritized by impact.

---

## 🟢 High Impact (do these first)

### 1. Swipeable Image Carousel on Listing Detail
- Replace static image dots with a swipeable carousel
- Library: `embla-carousel-react` (lightweight, no deps)
- Affects: `src/app/item/[id]/page.tsx`

### 2. Public Comments / Q&A on Listings
- Buyers can post public questions on a listing (visible to everyone)
- Reduces redundant "is this still available?" DMs
- Actual 당근마켓 feature
- Needs: `comments` table in Supabase + comment UI on listing detail page

---

## 🟡 Medium Impact

### 3. Infinite Scroll on Browse Page
- Replace "Load more" button with scroll-triggered loading
- Library: `react-intersection-observer`
- Affects: `src/app/page.tsx`

### 4. Social Login (Google)
- Let GMU students sign in with their `@gmu.edu` Google account
- Supabase Auth supports this natively (OAuth provider)
- Would replace email/password flow for most users

### 5. Real VAPID Keys → Web Push Live
- Currently push notifications are stubbed with placeholder keys
- Run: `npx web-push generate-vapid-keys`
- Add keys to `.env.local` and Vercel env vars
- Notify buyers when seller replies, notify seller on new offer

---

## 🔵 Low Impact / Nice to Have

### 6. GPS "Detect My Campus" Button
- Auto-select nearest campus in search/sell form
- Simple: `navigator.geolocation` + distance calc to 4 campus coords
- Not critical — students know which campus they're on

### 7. Image Slider on Listing Cards (Browse Grid)
- Hover/tap to preview multiple photos without opening the listing
- Affects: `src/components/ListingCard.tsx`

### 8. Saved Search Match Notifications
- "Notify me when a TI-84 is listed under $50"
- Create/list/delete are done (`/saved` page has a "Saved searches" section)
- Needs: cron job or Supabase Edge Function to match new listings against
  saved searches and fire a notification

### 9. Offer Counter / Negotiation Thread
- Seller can counter an offer instead of just accept/decline
- Extends the existing make-an-offer system

---

## ✅ Already Done (for reference)
- Make-an-offer system
- Real-time messaging (2s poll)
- Web push notifications (stubbed — needs real VAPID keys)
- Seller ratings / manner temperature
- Admin panel
- Campus + condition + price + zone filters
- Price watches (with drop notifications)
- Saved searches (create/list/delete — match notifications still pending, see item 8)
- Report a user directly from a conversation (not just via a listing)
- Push-notification opt-out toggle in Settings
- PWA manifest + service worker
- Mark as sold from conversation
- Favorites / saved listings
- Seasonal banner (SeasonalRibbon)
- Rotating word hero + TypeAhead search
