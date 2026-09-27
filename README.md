# Chikondi Store POS

Multi-file React POS: a cashier checkout screen and an admin dashboard
(Overview, Products, Staff), backed by Firebase Auth + Firestore. No
Cloud Functions, no Cloudflare Worker, no paid Firebase plan required —
role checks happen through each staff member's own Firestore document,
and staff accounts are created client-side using a temporary secondary
Firebase app instance (a standard trick that avoids signing the admin
out when creating someone else's account).

## Setup

1. `npm install`
2. In the [Firebase console](https://console.firebase.google.com) for
   the `rodart-pos` project:
   - **Authentication** → Sign-in method → enable **Email/Password**
   - **Firestore Database** → Create database → **production mode**
3. Deploy the security rules in `firestore.rules` (Firestore console →
   Rules tab → paste and Publish — no CLI needed if you'd rather not
   install the Firebase CLI in Codespaces)
4. `npm run dev`

## Bootstrap your first admin account

There's no open sign-up screen on purpose — staff accounts are only
created by an existing admin, from the Staff tab. That means the very
first admin has to be created by hand, once:

1. Firebase console → Authentication → Add user → enter your email and
   a password.
2. Copy that new user's UID.
3. Firestore console → start collection `users` → document ID = that
   UID → add fields:
   - `name` (string) — your name
   - `email` (string) — same email
   - `role` (string) — `admin`
   - `active` (boolean) — `true`
4. Sign in with that email/password on the Login screen. You'll land
   in the cashier Checkout view by default — go to `/admin` in the URL
   to reach the dashboard, and use the **Staff** tab from there to add
   the rest of your team (cashiers and any further admins) properly.

## PayChangu

`src/cashier/screens/Checkout.jsx` has a `PAYCHANGU_LINK` constant —
replace the placeholder with your own static checkout link from the
PayChangu merchant dashboard. The flow:

1. Cashier builds the cart, picks Mobile Money or Card.
2. The app opens your PayChangu link in a new tab; the customer enters
   the total shown on the button themselves (a static link can't pass
   the amount automatically).
3. Cashier taps "Confirm payment received" once the customer's payment
   goes through — the sale moves from `pending_payment` to `confirmed`
   and stock is deducted.

Cash confirms instantly with no PayChangu step.

**Phase B (later):** swap this for PayChangu's real API plus a webhook,
so confirmation happens automatically instead of by the cashier's own
eyes on the customer's phone. That's the point where a small backend
(a Cloudflare Worker or similar) becomes necessary again — everything
in this build works without one.

## Status

- [x] Cashier Checkout — live Firestore products, real transaction writes, stock deduction
- [x] Admin Overview — live transactions and today's totals
- [x] Admin Products — add/edit/delete, live list
- [x] Admin Staff — add cashier/admin accounts, toggle active/disabled
- [x] Firestore security rules — role-based via each user's own doc
- [ ] Stock tab (adjustments beyond sale deductions — restocks, corrections)
- [ ] Reports tab (daily/weekly/monthly exports)
- [ ] Audit log tab (voids, manual confirms — collection is ready, UI isn't)
- [ ] Phase B: real PayChangu API + webhook for automatic payment confirmation
