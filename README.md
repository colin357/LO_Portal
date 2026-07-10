# LO Portal

A portal that connects loan officers (LOs) with the real estate agents who refer them business.

- **Agent signup with a referral code** — the LO shares a code (or a prefilled link like
  `/signup?ref=SMITH-LOANS`), and every agent who registers with it is linked to that LO.
- **Video library** — agents see the LO's videos on loan programs, how to refer clients,
  and what makes the LO different. Supports YouTube, Vimeo, and Loom links.
- **Agent profile** — agents upload a headshot, logo, and contact info so marketing content
  can be generated on their behalf.
- **Weekly templates** — the LO uploads new marketing templates each week; agents log in
  and download them.
- **Admin area** (LO only) — manage videos and templates, view registered agents and whether
  they've uploaded their branding assets, and manage the referral code / signup link.

Built with React (Vite), React Router, and Firebase (Auth, Firestore, Storage).

## Setup

### 1. Create a Firebase project

1. Go to [console.firebase.google.com](https://console.firebase.google.com) and create a project.
2. **Authentication** → Sign-in method → enable **Email/Password**.
3. **Firestore Database** → Create database (production mode).
4. **Storage** → Get started.
5. Project settings → General → *Your apps* → add a **Web app** and copy the config values.

### 2. Configure the app

```bash
cp .env.example .env   # then paste your Firebase config values
npm install
npm run dev
```

### 3. Deploy security rules

Copy `firestore.rules` and `storage.rules` into the Firebase console
(Firestore → Rules, Storage → Rules), or with the Firebase CLI:

```bash
firebase deploy --only firestore:rules,storage
```

### 4. Composite indexes

The videos and templates queries filter by `loId` and order results, which requires composite
indexes. The first time you run the app, Firestore will log an error in the browser console with
a **direct link to create the index** — click it for each of:

- `videos`: `loId` (asc) + `order` (asc)
- `templates`: `loId` (asc) + `createdAt` (desc)

### 5. Create the loan officer account

Each LO account is created once, by hand:

1. In the app, sign up normally is agent-only — so instead go to **Firebase console → Authentication → Add user** and create the LO's email/password. Copy the new user's **UID**.
2. In **Firestore → users**, add a document with that UID as the document ID:

```json
{
  "role": "lo",
  "name": "Jane Smith",
  "email": "jane@lender.com"
}
```

3. Log in to the app as the LO, open **Admin → Referral Code**, and set a code
   (e.g. `SMITH-LOANS`). The share link shown there is what you send to agents.

## Data model

| Collection | Doc ID | Purpose |
|---|---|---|
| `users` | auth UID | Both LOs (`role: "lo"`) and agents (`role: "agent"`, with `loId` pointing at their LO) |
| `referralCodes` | the code (uppercase) | `{ loId }` — resolves a signup code to a loan officer |
| `videos` | auto | `{ loId, title, description, url, order }` |
| `templates` | auto | `{ loId, title, description, weekOf, fileUrl, previewUrl, createdAt }` |

Storage paths: `users/{uid}/headshot`, `users/{uid}/logo`, `templates/{loUid}/...`.

## Multi-LO ready

Nothing is hardcoded to a single loan officer: every video, template, and agent is keyed by
`loId`, so you can onboard additional LOs later just by repeating step 5 for each one.
