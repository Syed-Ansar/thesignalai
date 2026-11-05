# Mana Review — SPEC

Mobile-first, offline-first PWA review assistant for Mana Restaurant, Shankarpally. No login, no auth roles.

## Flow (single page `/`, optional `?order=PP-98214` from QR)
1. Star gate: "How was your dining experience today?" (stars 1–5).
2. 1–3★ → private CRM form ("What went wrong with your food or service?"), issue pills + textarea → POST /api/crm-feedback
   (offline / network failure → queued in localStorage `mana-review:crm-queue`, flushed on `online` event or SW `sync` tag `crm-sync`).
   Shows "Thank you. Our restaurant manager has been notified directly."
3. 4–5★ → tag selection (Food Specialties / Service & Ambiance / Value + "From your order" Petpooja dish pills) + optional note → "Generate 3 Review Ideas".
4. Drafts: POST /api/generate-drafts (gpt-4o-mini via Emergent LLM key, temp 1.05) → 3 cards option_1/2/3; offline or AI failure → local template synthesizer (source="offline").
   Tap card → fills editable textarea → "Copy Review & Open Google" → clipboard + toast "Review copied! Paste it on Google." + opens
   https://search.google.com/local/writereview?placeid={GOOGLE_PLACE_ID} (env GOOGLE_PLACE_ID, placeholder YOUR_GOOGLE_PLACE_ID).
- PII: phone (+91/10-digit), email, bill numbers stripped client-side (lib/pii.ts) and server-side (lib/pii.py).
- Offline banner when navigator.onLine === false. SW at /sw.js (network-first, cache fallback). Config/order/tag model cached in localStorage.

## API (all under /api)
- GET /config → AppConfig
- GET /orders/{order_id} → PetpoojaOrder (404 if missing)
- POST /crm-feedback (rating 1–3, message, issues, order_id, client_id dedupe) → CrmFeedback; GET /crm-feedback list
- POST /generate-drafts (rating 4–5, tags ≥1, note, dishes, order_id) → {option_1, option_2, option_3, source}

## Data
- petpooja_orders: seeded PP-98214 (Special Chicken Biryani, Paneer Tikka, Butter Naan) via `python seed.py`.
- crm_feedback: id, rating, message, issues, order_id, client_id, created_offline, status, created_at.
