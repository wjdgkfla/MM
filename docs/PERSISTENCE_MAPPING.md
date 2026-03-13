# Persistence Mapping Plan

This project now uses a data access layer (`src/lib/data`) so API routes do not depend directly on in-memory arrays.

## Current Architecture

- API routes call `dataAccess` from `src/lib/data/index.ts`.
- `dataAccess` currently points to `mockDataAccess` (in-memory via `src/lib/db.ts`).
- UI pages only talk to API routes.

This keeps UI independent from storage details and makes DB migration a data-layer swap.

## Data Access Contracts

Defined in `src/lib/data/contracts.ts`:

- `ListingsRepository`
- `UsersRepository`
- `FavoritesRepository`
- `ConversationsRepository`
- `MessagesRepository`
- `MarketplaceDataAccess`

To move to real DB: implement these interfaces with SQL/ORM and export that implementation from `src/lib/data/index.ts`.

## Table Mapping

### `listings` table
Maps from `Listing` fields:

- `id`
- `title`
- `description`
- `price`
- `category`
- `condition`
- `status`
- `image_urls` (array/json)
- `seller_id` (FK -> users.id)
- `campus_location`
- `pickup_zone`
- `pickup_notes`
- `tags` (array/json)
- `favorite_count` (denormalized counter placeholder)
- `created_at`
- `updated_at`

Note: `sellerProfile` in listing is currently a snapshot for UI speed. In DB-backed mode, this can be derived by joining `users`.

### `users` table
Maps from `User` fields:

- `id`
- `display_name`
- `gmu_email`
- `gmu_email_verified`
- `profile_image_url`
- `is_student_seller`
- `home_campus`
- `campus_verification`
- `last_active_at`
- `joined_at`
- `trust_badge`
- `reputation_score`
- `listing_count` (denormalized placeholder)

### `favorites` table
Currently client-local only. Future schema:

- `user_id` (FK -> users.id)
- `listing_id` (FK -> listings.id)
- `created_at`

Composite unique index: `(user_id, listing_id)`.

### `conversations` table
Currently derived from messages. Future schema:

- `id`
- `listing_id` (FK -> listings.id)
- `buyer_id` (FK -> users.id)
- `seller_id` (FK -> users.id)
- `last_message_preview`
- `last_message_at`
- `created_at`
- `updated_at`

Unique index: `(listing_id, buyer_id, seller_id)`.

### `messages` table
Maps from `Message` fields:

- `id`
- `conversation_id` (FK -> conversations.id) or derivable from listing+participants
- `listing_id` (if denormalized)
- `from_user_id`
- `to_user_id`
- `body`
- `created_at`

## Migration Steps (When Ready)

1. Implement `sqlDataAccess` (or ORM equivalent) that satisfies `MarketplaceDataAccess`.
2. Switch `src/lib/data/index.ts` export from `mockDataAccess` to `sqlDataAccess`.
3. Keep API route contracts unchanged to avoid UI churn.
4. Replace local favorites hook with API-backed favorites once auth is available.
