# Review Studio — SPEC (multi-tenant guest review + admin studio)

## Who
- Guests (no login) at `/app/{slug}`, `/?restaurant={slug}`, or `/` (default `kaka-restaurant`). Phone-first, max 480px, image-free.
- Owners (email+password) → only restaurants in `users.restaurant_ids`.
- Super-admin (`users.platform_role="superadmin"`) → all restaurants, create workspaces, add/remove owner logins.
Credentials: memory/test_credentials.md.

## Guest flow — gamified "reward run" (components/guest/GuestFlow.tsx)
HUD (sticky): restaurant name/location, coin counter with floating "+N" pops (coins derived from state: rate 20, each pick 10, note≥10 chars 15, draft 30, share 50, reward 100), level rail (happy: Rate·Faves·Vibe·Share·Reward; unhappy: Rate·Tell us·Gift), back button.
- Level 1 rate (emoji face + stars, auto-advance). 1–3★ → FeedbackForm (private issues + note → "Thank you. Our restaurant manager has been notified directly." → "Grab your sorry gift 🎁").
- 4–5★ → Level 2 dish tiles (menu or defaults, emoji) → Level 3 vibe chips + optional shout-out → "Cook my post ✨" → CookingScreen (min 1.8s) → Level 4 DraftLevel: ONE editable draft, tone switcher Foodie / Quick & Crisp / Desi Mix (regenerates), Remix (same tone). AI failure → cook-error screen (Try again / Use a quick draft (offline synth) / Write my own).
- "Copy & share on Google": copy + window.open(google_review_url, new tab) + review log (client_id) → RewardLevel.
- RewardLevel (StateScreens/ScratchCard): name + phone → SMS code (demo adapter shows code on screen, tap to fill) → POST rewards/claim → canvas scratch card (auto-reveal ≥50% cleared, or "Reveal it instantly") → confetti → Done screen.
- Loading/error screens: SplashScreen, guest-not-found, guest-offline, cook-error. Toasts top-center.
- Offline: banner text unchanged; drafts from local synthesizer; posts queued; reward needs network (inline note).
- Preview mode (admin phone mockup): no writes, no Google, fake reward code PREVIEW-123.

## Rewards
restaurant.reward {enabled, title (4–5★), sorry_title (1–3★), details, valid_days}; edited in Setup tab "Scratch-card reward". Claim requires verified phone when otp_enabled and the SMS adapter is available; one open (unredeemed, unexpired) claim per phone per restaurant (repeat returns same code). Claim attaches contact to the review_log / crm_feedback via ref_client_id. Admin "Rewards" tab: list, search by code/phone, Mark redeemed.

## AI drafts (lib/drafts.py)
Adapter adapters/drafts.py (gpt-4o-mini via EMERGENT_LLM_KEY, temp 0.9). DraftRequest.tone ∈ foodie|crisp|desi → DraftResponse {text, tone, tone_label, source, rewrites}. Uniqueness vs last 300 review texts + existing_reviews (>0.85 → up to 2 rewrites then reshuffle).

## Adapters (env-selected): DRAFT_ADAPTER, OTP_ADAPTER (auto = twilio_verify if TWILIO_ACCOUNT_SID/TWILIO_AUTH_TOKEN/TWILIO_VERIFY_SERVICE exist else demo [MOCK, code returned as demo_code] | twilio_verify | demo | disabled; add providers in adapters/otp.py _ADAPTERS), SIMILARITY_ADAPTER, WHATSAPP_ADAPTER (wa_me), REVIEW_DESTINATION (google).

## API (/api)
- auth: POST /auth/login, POST /auth/logout, GET /auth/me, POST /auth/change-password
- admin (tenant-gated by lib/auth.accessible_restaurant → 404 when not visible; require_super → 403):
  GET/POST /admin/restaurants, GET/PATCH /admin/restaurants/{rid}, POST/PATCH/DELETE /admin/restaurants/{rid}/menu[/{item_id}],
  GET/POST/DELETE /admin/restaurants/{rid}/owners[/{user_id}] (super only; delete = soft: drop membership, disable if none left),
  GET /admin/restaurants/{rid}/analytics|reviews|feedback?status=|rewards, PATCH /admin/restaurants/{rid}/feedback/{fid}, POST /admin/restaurants/{rid}/rewards/{cid}/redeem
- public: GET /public/restaurants/{slug}, POST …/visits, …/drafts, …/reviews, …/feedback, …/otp/send (demo_code in demo mode), …/otp/check, …/whatsapp, …/rewards/claim

## Data
users{id,email,password_hash,platform_role,restaurant_ids,session_version,disabled}, restaurants{id,slug,name,location,google_place_id,whatsapp_number,otp_enabled,menu[{id,name}],existing_reviews,theme{accent,background,card,font,spacing,shape}},
visits, review_logs{client_id, contact_method: sms_verified|whatsapp_pending|unverified}, reward_claims{id,restaurant_id,code,title,details,source,contact_*,ref_client_id,expires_at,redeemed_at}, otp_demo_codes, crm_feedback{status new|resolved}, contact_verifications, otp_sends.
Seed (startup, idempotent): rest-kaka "Kaka Restaurant" (Hyderabad, menu: Kaka Special Biryani, Chicken 65, Mutton Haleem, Double Ka Meetha), rest-mana "Mana Restaurant" (Shankarpally, Poppins/rounded theme).

## Admin studio (/admin)
Top bar: restaurant switcher, Create new restaurant (super), Password, Sign out. Tabs: Review Logs & Analytics, Restaurant Setup & Menu (+ existing Google reviews, owner logins for super), Theme Studio (colours/font/spacing/shape + live phone preview running GuestFlow in preview mode; Save publishes), CRM Feedback (filter + New/Resolved toggle).
