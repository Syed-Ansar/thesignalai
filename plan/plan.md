# Guest Engagement & Reputation Platform: Multi-Tenant Review Studio

A multi-restaurant platform, in the spirit of Reelo and Candour: guests scan a QR code, rate their visit in seconds, and either get three AI-written Google review ideas (4–5★) or send private feedback to the manager (1–3★).
Restaurant owners manage their menu, branding, review logs and complaints in an admin studio. Kaka Restaurant is the default workspace. Every outside service sits behind a swappable adapter, and the frontend uses only open-source, vendor-neutral libraries.

## Who it's for
- **Guests** at a restaurant table, on a phone. They have no account and will drop off if anything takes more than a few seconds.
- **Restaurant owners/managers**, who sign in with email and password and see only their own restaurant(s).
- **The platform operator (super-admin)**, who signs in with a built-in admin account, sees every restaurant, creates new workspaces and creates owner logins.

## Built to swap technologies (adapter pattern)
Each outside technology is reached through one adapter. Switching providers means adding a new adapter and changing a setting; screens, data and the rest of the app stay the same.

| Capability | Phase 1 adapter | Could be swapped for later |
|---|---|---|
| AI review drafting | gpt-4o-mini (Emergent LLM key) | Claude, Gemini, a self-hosted model |
| Phone OTP | Twilio Verify SMS | MSG91, Gupshup, Firebase |
| WhatsApp verification | wa.me chat link | Meta WhatsApp Cloud API, Gupshup |
| Sign-in | In-house email + password | Google sign-in, a managed login service, company SSO |
| Uniqueness check | Wording-similarity comparison | AI meaning-based matching |
| Menu source | Manual menu from admin | Petpooja / other POS import |
| Review destination | Google review link | Zomato, TripAdvisor |
| Data storage | Current database | Any other database |
| Offline storage on the phone | Browser local storage | IndexedDB |

**Frontend: no vendor lock-in.**
- **Open-source libraries only:** React, routing, data fetching, the styling toolkit, headless UI components, the animation library and self-hosted open-source fonts. There are no hosted vendor SDKs (no vendor login widgets, analytics or Firebase).
- **One communication path:** the frontend talks only to this app's own API, so changing a provider never touches the frontend.
- **Themes are plain CSS variables,** portable to any frontend framework.
- **The offline engine uses only web standards** (service worker, browser storage, WebOTP, Clipboard).

## Core features and experience

### Guest review flow (phone screen, max 480px wide)
- **Opened by restaurant link:** `/app/kaka-restaurant` or `?restaurant=kaka-restaurant`. A bare link opens Kaka Restaurant. The restaurant's name, location, menu, colours, font, spacing, button shape, Google link and OTP setting all load for that restaurant.
- **No images, loads instantly:** just text, chips and buttons. It keeps working offline, showing the banner *"You are offline. Your review draft will still work locally."*
- **Animated 3-step progress bar:** Step 1 of 3: Rate → Step 2 of 3: Select → Step 3 of 3: Review & Copy.
- **Step 1, Rate:** *"How was your experience at {Restaurant} today?"* with 5 tappable stars.
  - 1–3★ opens the private feedback form: *"What went wrong with your food or service?"*. After sending, the guest sees *"Thank you. Our manager has been notified directly."*. If the guest is offline, the feedback is saved on the phone and sent automatically once the connection returns.
  - 4–5★ moves on to Step 2.
- **Step 2, Select:**
  - Dish chips come from the restaurant's admin menu. If the menu is empty, defaults are shown: Delicious Biryani, Authentic Spices, Fresh Starters, Great Desserts.
  - Vibe chips: Quick Service, Polite Staff, Clean & Hygienic, Family Friendly, Value for Money.
  - Optional note.
  - Optional collapsed drawer: *"Want updates or rewards? Enter Name & Phone (Optional)"*.
    - **Phone OTP:** a real SMS code is sent through Twilio Verify. The code box supports one-tap autofill (iOS keyboard suggestion, and Android auto-read where the phone supports it).
    - **"Verify via WhatsApp":** opens WhatsApp with a pre-filled message containing the session code, addressed to the restaurant's WhatsApp number.
    - If the phone field is left blank, verification is skipped entirely. If the restaurant has OTP turned off, the drawer asks for name and phone only.
  - **"Generate 3 Review Ideas"** button.
- **Step 3, Review & Copy:**
  - **Privacy:** phone numbers (+91 and 10-digit), emails and bill numbers are removed from guest text before it reaches the AI.
  - **Three drafts:** Short & Direct, Descriptive & Detailed, and Warm/Casual Hinglish. They're written by the AI adapter at creativity 0.9, with a time-based variation seed so drafts don't repeat.
  - **Uniqueness check:** each draft is compared with reviews already copied for that restaurant and with Google reviews the owner has pasted into admin. Any draft more than 85% similar is rewritten automatically before the guest sees it.
  - **Editing:** tapping a card fills an editable text box.
  - **"✨ Copy & Jump to Google Review":**
    - The text is copied, with a fallback for older phones.
    - The copy is logged: restaurant, time, rating, dishes, the AI draft, the final edited text and verified contact details.
    - A full-screen celebration appears: *"🎉 Thank you! Your review is copied. Redirecting you to Google to drop it in 1 second..."*. The same tab then goes to the restaurant's Google review page.

### Admin & Customization Studio (`/admin`)
- **Sign-in:** everyone signs in with email and password, with a sign-out button. Roles:
  - **Super-admin:** a built-in account that sees every restaurant, creates workspaces, and creates or removes owner logins.
  - **Owner:** sees and edits only the restaurant(s) assigned to them.
- **Restaurant switcher (top bar):** lists the restaurants you can access. The super-admin also gets "Create new restaurant".
- **Tab 1, Review Logs & Analytics:**
  - Cards: Total Reviews Generated, Conversion Rate (reviews copied ÷ guests who tapped a star), Top Mentioned Dishes.
  - A newest-first list of logged reviews: time, stars, dishes, final copied text, and verified guest name/phone with how they were verified.
- **Tab 2, Restaurant Setup & Menu:**
  - Fields: name, link slug, Google Place ID, WhatsApp Business number, OTP on/off.
  - Menu manager: add, edit and delete signature dishes.
  - **"Existing Google reviews"** box: the owner pastes current reviews here for the uniqueness check.
  - **Owner logins** (super-admin only): add an owner by email with a starting password, or remove one.
- **Tab 3, Theme Studio:**
  - Colours: accent, background, card.
  - Font: Inter, Plus Jakarta Sans, Poppins or System Sans.
  - Spacing: Compact, Comfortable or Spacious.
  - Button shape: Pill, Soft Rounded or Sharp Square.
  - A phone mockup on the right runs the real guest flow and updates instantly with every change. **Save** publishes the change to the live guest link.
- **Tab 4, CRM Feedback:** a table of 1–3★ complaints (time, stars, issue, message) with a New / Resolved toggle and a status filter.

## User flow
1. A guest scans the table QR and the restaurant's branded rating screen opens immediately.
2. 4–5★: pick dishes and vibes → optionally add name and phone and verify (SMS code or WhatsApp) → see three drafts → edit one → copy → celebration → Google review page, ready to paste.
3. 1–3★: describe the problem → thank-you screen → the complaint appears as "New" in the owner's CRM tab, even if it was sent offline.
4. The owner signs in at `/admin` with email and password → picks their restaurant → checks reviews and conversion → edits the menu and theme while watching the phone preview → marks complaints as resolved.
5. The super-admin signs in → creates a new restaurant workspace → adds the owner's email and a starting password → shares the guest link and the login with the owner.

## UI/UX feel
- **Guest side:** bare and fast, with no photos. Large touch targets, pill chips, smooth transitions between steps, and a playful star tap. Every visual (colour, font, spacing, corners) comes from the restaurant's own theme.
- **Admin side:** a calm, professional workspace. Tabs on the left, the phone preview pinned on the right on desktop, and stacked panels on smaller screens.

## Implementation phases

### Phase 1: MVP (built now)
Everything in "Core features and experience" above:
- Restaurant links for the guest flow, the 3-step flow, offline support and complaint sync
- AI drafts with privacy scrubbing and the uniqueness check
- Twilio SMS codes and the WhatsApp link button
- Review logging and the celebration redirect
- The admin studio with all 4 tabs, live phone preview and restaurant switcher
- Email + password sign-in with super-admin and owner roles
- Every outside service built behind the adapters listed above

### Phase 2: Growth tools
- QR code generator with printable table cards, tracking scans per table
- Real WhatsApp verification and messaging (a Meta WhatsApp Cloud API adapter)
- Google sign-in for owners (a new sign-in adapter) and "forgot password" by email
- Instant manager alerts (WhatsApp/email) for each new complaint
- Petpooja POS order import (a new menu-source adapter), so ordered dishes show up as chips automatically
- CSV export of reviews and complaints

### Phase 3: Reputation & loyalty
- Pull live Google reviews into the dashboard automatically, with AI-suggested owner replies
- Rewards and win-back campaigns for verified guests
- Group view for multi-outlet chains
- Regional voice options for drafts (Telugu-English, Tamil-English)

## Assumptions
- **Sign-in:**
  - The latest answer (email + password) replaces the earlier plan of Google sign-in for owners. Sign-in is built in-house to stay vendor-free, instead of using a managed login service, and Google sign-in can come back later as an adapter.
  - The super-admin account is created at build time. Its email and password are shared in the build summary and can be changed afterwards.
  - Owners get their login from the super-admin. They can change their own password from admin, but there's no self-signup and no "forgot password" email in Phase 1; the super-admin resets it.
  - Owners see only restaurants assigned to them. Only the super-admin can create workspaces or manage owner logins.
- **Adapters and the frontend:**
  - Each adapter is chosen by a setting, and only the Phase 1 adapters in the table are built now. The "could be swapped for" column is a design guarantee, not extra work in this phase.
  - The frontend keeps its current open-source stack (React, Tailwind, headless open-source UI components) and has no vendor SDKs.
- **Twilio and the WhatsApp button:**
  - Twilio needs three keys from you (Account SID, Auth Token, Verify Service ID). They're collected through a secure card before that part is built.
  - Until the keys are added, the contact drawer saves name and phone as **unverified**, and the review flow is unaffected.
  - Android one-tap auto-read needs a custom Twilio message format that Twilio must approve. Until then, Android guests type or paste the 6-digit code; iOS autofill works either way.
  - The "Verify via WhatsApp" button only opens a chat in Phase 1, so those guests are logged as **"WhatsApp: pending"**. Confirming the message needs the Phase 2 Meta adapter.
- **AI and uniqueness check:** the uniqueness check compares wording and phrasing on the server, not meaning-level AI matching. Each draft gets at most 2 automatic rewrites, then a final reshuffle, so the guest never waits more than a few seconds. Drafts use gpt-4o-mini through the Emergent LLM key, as agreed earlier.
- **Existing app and restaurants:** Kaka Restaurant is the default workspace. Mana Restaurant becomes a second sample restaurant, and its earlier Petpooja order feature moves to Phase 2 as an adapter. The guest side is rebuilt image-free with the 3-step flow described here.
- **Analytics and the Google link:**
  - Conversion rate = reviews copied ÷ visits where a star was tapped.
  - The guest goes to Google in the same tab after 700ms, as in your code snippet. Restaurants without a Google Place ID fall back to a Google search for the restaurant name.
