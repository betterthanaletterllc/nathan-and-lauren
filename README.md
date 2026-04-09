# Nathan & Lauren — Wedding Save the Date

Personalized digital save-the-date app with guest tracking dashboard.

## What's Inside

### Guest Landing Pages (`/guest/[slug]`)
- Personalized OG meta tags (guest name appears in iMessage/text previews)
- Dynamic OG image with guest name
- Elegant save-the-date design with animated waves
- Per-guest or global "note from the couple"
- Mailing address collection form
- Add to Google Calendar / Apple Calendar (.ics download)
- Tracks: link opens, address submissions, calendar saves

### Dashboard (`/dashboard`)
- Google OAuth login (whitelisted to your + Lauren's emails)
- **Overview**: summary cards, progress bar, recent activity
- **Guest List**: sortable/filterable table, add guests, copy links, delete
- **Nudge List**: guests who haven't responded, flagged after configurable threshold
- **Activity Feed**: chronological log of opens, submissions, calendar saves
- **Settings**: global note editor, per-guest notes, reminder threshold, CSV format reference
- **Guest Detail** (`/dashboard/guest/[slug]`): full info + landing page preview
- **CSV Import**: bulk upload guests (Name, Slug, Party Size, Note)
- **CSV Export**: download all addresses, print-ready

---

## Setup

### 1. Create a Neon Database
1. Go to [neon.tech](https://neon.tech) and create a new project
2. Copy the connection string

### 2. Google OAuth Credentials
1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a new project (or use existing)
3. Go to **APIs & Services → Credentials**
4. Create an **OAuth 2.0 Client ID** (Web application)
5. Add authorized redirect URI: `https://nathanandlauren.com/api/auth/callback/google`
   - For local dev also add: `http://localhost:3000/api/auth/callback/google`
6. Copy the Client ID and Client Secret

### 3. Environment Variables
Copy `.env.example` to `.env.local` and fill in:
```
DATABASE_URL=your-neon-connection-string
NEXTAUTH_SECRET=run-`openssl rand -base64 32`-to-generate
NEXTAUTH_URL=https://nathanandlauren.com
GOOGLE_CLIENT_ID=from-step-2
GOOGLE_CLIENT_SECRET=from-step-2
ADMIN_EMAILS=your@gmail.com,laurens@gmail.com
```

### 4. Install & Run
```bash
npm install
npm run db:push    # creates tables in Neon
npm run dev        # http://localhost:3000
```

### 5. Deploy to Vercel
1. Push to GitHub
2. Import in [vercel.com](https://vercel.com)
3. Add all env vars from `.env.local` to Vercel's Environment Variables
4. Set your custom domain (`nathanandlauren.com`)
5. Done!

---

## Usage

### Adding Guests
1. Sign in at `/dashboard`
2. Go to **Guest List** tab → add guests one by one, or…
3. **Import CSV** with columns: `Name, Slug, Party Size, Note`
   - Only `Name` is required; slug auto-generates if blank

### Sending Links
Each guest gets a unique URL: `nathanandlauren.com/guest/mike-and-sarah`

When texted via iMessage or most messaging apps, the preview will show:
> **Mike, Save the Date!**
> Nathan & Lauren are getting married · February 27, 2027 · Cancún, Mexico

### Tracking
- Dashboard updates in real-time as guests open links and submit addresses
- Nudge List highlights stragglers past your configured threshold
- Export addresses as CSV when ready to print invitations

### Notes
- **Global note**: Set in Settings → appears on all guest pages
- **Per-guest note**: Set in Settings or Guest List → overrides global for that guest
- Example: "We've reserved a room block — call the resort at 555-0123 to book!"

---

## Tech Stack
- **Next.js 14** (App Router)
- **Neon Postgres** + **Drizzle ORM**
- **NextAuth.js** (Google provider)
- **Vercel OG** (dynamic social images)
- **Tailwind CSS**
- **PapaParse** (CSV handling)

---

## Future Ideas
- [ ] Guest map visualization (plot addresses on a map)
- [ ] Auto-reminder scheduling via cron
- [ ] RSVP / meal preference collection
- [ ] Direct pipeline to AlpacaCard for printing invitations
- [ ] Multi-event support (rehearsal dinner, welcome drinks)
