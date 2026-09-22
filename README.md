# POS App

Multi-file React POS with a cashier checkout screen and an admin-only
dashboard, backed by Firebase (Auth, Firestore, Cloud Functions).

## Setup

1. `npm install` (root — React app)
2. `cd functions && npm install` (Cloud Functions)
3. Copy `.env.example` to `.env` and fill in your Firebase project config
4. `firebase deploy --only firestore:rules,functions`
5. `npm run dev` to run the app locally

## Status

- [x] Project structure
- [x] Design tokens (Tailwind) and hero screens (Checkout, Dashboard)
- [x] Role-gated routing (`RequireRole`)
- [x] `setUserRole` Cloud Function + Firestore security rules
- [ ] Wire Checkout/Dashboard to live Firestore data (currently sample data —
      see `TODO` comments in each screen)
- [ ] Staff management screen (calls `setUserRole`)
- [ ] Products / Stock screens
- [ ] Reports screen
- [ ] Phase B: PayChangu webhook Cloud Function for automatic payment
      confirmation

## Payment flow (current: Phase A, manual confirmation)

1. Cashier builds the cart and picks a payment method.
2. Cash confirms immediately. Mobile money / card create a transaction with
   `status: "pending_payment"`.
3. Cashier visually confirms the customer's payment notification and taps
   "Confirm payment received" — transaction moves to `status: "confirmed"`.

Phase B will replace step 3 with a PayChangu API call plus a webhook
Cloud Function that confirms automatically.
