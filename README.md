# SGLR Rating

A field inspection app built for Kerala's **Sustainable Green Lake Resort (SGLR) Rating** programme. Divisional officers inspect resorts on a 200-point sanitation rubric (Faecal Sludge / Solid Waste / Grey Water), the District Committee reviews each submission, and an admin tier manages the whole system.

Built with **Expo (React Native + expo-router)** and **Supabase** (Postgres + RLS).

---

## Roles

| Role | What they do |
|---|---|
| **Divisional** | Browses the resort list, fills the SGLR checklist for each resort, submits inspections for review. Sees prior-rejection comments when re-inspecting. |
| **District** | Reviews submitted inspections, approves / rejects with comments, can unfreeze approved ones. Three tabs (Pending / Approved / Rejected). |
| **Admin** | Manages officers, resorts, and the checklist itself. Sees all inspections, audit log, analytics, and CSV exports. |

---

## Tech stack

- **Expo SDK 54** + **React Native 0.81** + **React 19**
- **expo-router 6** (file-based routing with route groups)
- **Supabase JS 2** — Postgres + RLS + Storage (anon key, app-layer PIN auth)
- **expo-print** + **expo-sharing** — PDF generation
- **expo-file-system** (legacy API) — CSV export
- **AsyncStorage** — session + draft persistence
- **TypeScript 5.9** throughout

---

## Setup

### 1. Clone + install

```bash
git clone https://github.com/DarkMatrix07/SGLR_V2.0.git
cd SGLR_V2.0
npm install
```

### 2. Environment

Copy `.env.example` to `.env` and fill in your Supabase project values:

```
EXPO_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
```

> Note: `.env` is git-ignored. The publishable key (`sb_publishable_*`) is preferred over the legacy anon JWT.

### 3. Database

If you're standing up a fresh Supabase project, you need these tables:

- `officers` (id, phone, name, role, pin, is_active, created_at)
- `resorts` (id, serial_no, name, area, owner_name, owner_phone, room_count, is_active)
- `checklist_items` (id, category, subcategory, label, description, input_type, min_marks, max_marks, options, visibility_condition, sort_order)
- `inspections` (id, resort_id, officer_id, responses, total_score, stars, status, district_comments, reviewed_at, reviewed_by, updated_at, created_at)
- `app_settings` (key, value, description, updated_at)
- `audit_logs` (id, actor_officer_id, actor_name, action, entity_type, entity_id, details, created_at)

RLS is enabled but with anon-permissive policies — auth happens app-side via `officers.pin`. For production, tighten policies behind an admin-issued JWT.

### 4. Run

```bash
npx expo start
```

Scan the QR code in **Expo Go** on a phone (same Wi-Fi) or press `w` for the web preview.

---

## Test credentials

| Role | Phone | PIN |
|---|---|---|
| Divisional | `+919000000001` | `1234` |
| District | `+919876543210` | `5678` |
| Admin | `+919000000099` | `0000` |

---

## Project structure

```
app/
  index.tsx               — entry redirector (session → role home)
  login.tsx               — phone + PIN login form
  _layout.tsx             — root Stack
  (divisional)/
    index.tsx             — resort list with status badges
    inspect/[id].tsx      — checklist form (autosave drafts)
    summary/[id].tsx      — pre-submit review
    confirm/[id].tsx      — submission confirmation w/ reference
    view/[id].tsx         — read-only inspection view (post-submit)
    _layout.tsx           — RoleGate + Stack
  (district)/
    index.tsx             — Pending / Approved / Rejected tabs
    detail/[id].tsx       — review screen with Approve/Reject/Unfreeze
    _layout.tsx
  (admin)/
    index.tsx             — admin hub with live counts
    officers/             — list, new, [id]
    resorts/              — list, new, [id]
    checklist/            — list, new, [id]
    inspections/index.tsx — all inspections view
    audit/index.tsx       — audit log
    reports/index.tsx     — analytics + CSV export
    settings/index.tsx    — rating thresholds
    _layout.tsx

components/
  Spinner.tsx             — shared loading screen
  LogoutButton.tsx        — header action
  RoleGate.tsx            — auth + role guard
  OfficerForm.tsx
  ResortForm.tsx
  ChecklistItemForm.tsx

lib/
  supabase.ts             — Supabase client
  authRouting.ts          — signIn / getSession / signOut (AsyncStorage)
  checklist.ts            — CATEGORY_LABELS, scoring helpers, isVisible
  theme.ts                — color palette + formatStars/Date/capitalize
  types.ts                — Resort, Inspection, ChecklistResponse union
  audit.ts                — logAudit() writes to audit_logs

utils/
  generatePDF.ts          — pre/post-inspection PDFs
  export.ts               — CSV writer + share

assets/                   — placeholder Expo splash & icon
```

---

## Scoring rubric

Total score is **out of 200**:

- **A. Faecal Sludge Management** — 80 marks (includes a "negative-select" parent question for sanitation type)
- **B. Solid Waste Management** — 80 marks
- **C. Grey Water Management** — 40 marks

Each category is split into four subcategories: *infrastructure*, *practices*, *awareness*, *innovations*.

### Star tiers

| Stars | Minimum score |
|---|---|
| ★★★★★ Excellent | 170 |
| ★★★★ Good | 130 |
| ★★★ Average | 90 |
| ★★ Below Average | 50 |
| ★ Poor | < 50 |

Thresholds are configurable in **Admin → Settings** (persists to `app_settings`).

---

## Key workflows

### Divisional submission

1. Open resort → checklist form
2. Fill items (drafts auto-save every keystroke)
3. Tap **Review →** → summary with red-flagged unanswered items
4. **Submit** → confirmation screen with 8-char reference code

### District review

1. Pending inspection in inbox
2. Tap to review every item
3. Optional comments → **Approve** / **Reject**
4. Status updates, divisional sees outcome on resort list. Approved status can be **Unfrozen** back to pending.

### Admin operations

1. **Officers** → add/edit/deactivate, reset PIN
2. **Resorts** → CRUD the master list
3. **Checklist** → edit the SGLR rubric: add/remove questions, configure scoring options, set conditional visibility
4. **Reports** → CSV export of inspections / resorts / officers
5. **Audit Log** → who did what when (immutable trail)

---

## Known caveats

- **Anon-permissive RLS** — auth is enforced app-side. Anyone with the publishable key can read tables. Move to JWT-backed RLS before public deployment.
- **Star thresholds in `app_settings` are not yet read at runtime** — scoring still uses the hardcoded defaults (170/130/90/50). Wire-up is one `useEffect` away.
- **Checklist data is placeholder** — 23 items seeded for shape testing; replace with the official SGLR rubric before pilot.
- **Web build** works for admin desk use but the checklist form was designed mobile-first.

---

## Deployment

### Development (Expo Go)

```bash
npx expo start
```

### Production build (EAS)

```bash
npm install -g eas-cli
eas login
eas build --platform android --profile production
```

`eas.json` is already configured. The resulting APK / AAB can be sideloaded or uploaded to Play Console.

---

## Contributing

Branch off `main`, run `npx tsc --noEmit` before pushing, follow the conventional commit prefixes already in the log (`feat:`, `fix:`, `refactor:`, `chore:`).
