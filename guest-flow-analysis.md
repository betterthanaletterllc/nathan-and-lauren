# Guest Flow Deep Dive — nathanandlauren.com

*Analysis of the current guest experience, friction points, and a proposal for the next build phase. August 1, 2026.*

---

## Part 1 — How the site works today

There are two front doors, and they don't talk to each other.

**nathanandlauren.com** is a beautiful but static landing page: your names, the date, a link to the resort on Google Maps, and a live countdown to February 26. That's it. There is no way for a guest to get from the main site to *their* page. The only interactive element is a nearly-invisible "Manage" link at the bottom that goes to the admin dashboard.

**nathanandlauren.com/guest/[slug]** is where everything actually happens. Each of the ~59 households has a personal link (e.g. `/guest/deana-martin`) that you text them. The page greets them by first names ("Deana, Martin, & Jake"), and what they see below the greeting is controlled by the **phase system** — a global setting with per-household overrides, moving through `save_the_date → rsvp → checklist → arrived → final`.

Here is exactly what renders in each phase (from `GuestPageClient.tsx`):

| Section | save_the_date | rsvp | checklist | arrived | final |
|---|---|---|---|---|---|
| Save-the-date card + address form | ✔ | only if address not yet submitted | same | same | same |
| Video + RSVP form (per person, meal, allergies, plus-one) | — | ✔ | ✔ | — | ✔ |
| Countdown + travel checklist | — | — | ✔ (only after RSVP submitted) | — | ✔ |
| Welcome to Cancún: resort map + event schedule + table | — | — | — | ✔ | ✔ |
| Add-to-calendar block | ✔ | ✔ | ✔ | ✔ | ✔ |

The underlying data model is in good shape. Households (`guests`) hold address, travel, and tracking fields; `householdMembers` holds per-person RSVP, meal, structured flight details, and — importantly — **four per-person event-attendance columns (`attendingWelcome`, `attendingCeremony`, `attendingReception`, `attendingBrunch`) that already exist in the database and are already accepted by the RSVP API, but are never shown to guests.** The events feature you want is half-built; the guest UI just never surfaced it.

### The guest's journey as it stands

A guest's entire relationship with the site is: receive a text → tap the link → do the one thing the current phase asks → hit a thank-you message → leave. Concretely:

1. **Save the date.** They see the invitation card and submit their mailing address. Nice and focused. This part works well.
2. **RSVP.** Same page now shows a video and per-person Joyfully Accept / Regretfully Decline with dinner selection. They submit — and the form is replaced by a permanent "Thank you for your RSVP!" message. They cannot see what they picked, cannot change a meal, cannot add a forgotten child. The page is now a dead end for them.
3. **Checklist.** When you flip the global phase (or their override) to `checklist`, their page grows a countdown and the travel checklist — hotel button, flight search, per-person passport/flights/hotel, transport, emergency contact, song request. But nothing tells the guest this happened. Unless you text everyone "check your link again," the checklist just sits there.
4. **Arrived / final.** The page becomes the on-site guide: resort map, event schedule, table number.

## Part 2 — Friction points

**1. The site is phase-shaped, not guest-shaped.** The phase system answers "what do Nathan & Lauren want to collect right now?" — it doesn't answer the guest's question, which is "what do I need to know and do?" A guest who RSVP'd sees a thank-you note where their information used to be. A guest booking flights in the checklist phase can't see the event schedule (it's gated behind `arrived`), so **they can't know they need to land by Thursday afternoon for the rehearsal dinner** — the single most important fact for booking the right flight. Information exists but arrives after the decision it should have informed.

**2. There is no urgency anywhere.** No RSVP deadline exists in the schema, settings, or UI. The only countdown is to the wedding itself, which is ambient, not actionable. For a destination wedding, the dates that actually drive guest behavior are the RSVP deadline and the room-block release date — neither appears anywhere.

**3. RSVP is one-shot and opaque.** Once `rsvpSubmittedAt` is set, the form is gone forever (guest-side). Guests can't review their meal choice, fix a typo in a plus-one's name, or change salmon to chicken. Every change becomes a text to you and a manual dashboard edit.

**4. The RSVP → checklist handoff doesn't exist.** Your instinct — "immediately getting people to the checklist" — is exactly right, and it's also where I found a real bug: `memberChecklist` state is initialized once at page load, filtered to members whose `rsvpStatus` was already `"coming"` *at load time*. So a guest who RSVPs and then sees the checklist in the same visit gets an **empty per-person checklist** (no passport/flight cards for anyone) until they reload the page. Same for a freshly added plus-one. Today the moment of highest guest motivation — right after saying yes — lands on a broken half-page.

**5. Guests can say "coming" without picking a dinner.** The submit button only requires an accept/decline per person, not a meal. With a meal-change window coming, you'll want the initial submission to be complete (and the API currently recomputes `partySize` as *all* members including decliners, which slightly inflates that number — minor, but worth fixing while we're in there).

**6. The room block is a bare button.** "Book Hotel Room" opens whatever URL is in settings. No group code shown, no deadline, no context. Guests who call the resort or book through their own travel agent have no way to know the code `butoracwonderlywedd` exists — which means bookings that should count toward your block, don't.

**7. Kids are admin-only.** `isChild` exists and the dashboard can add children, but a guest household that had a baby since you built the list, or whose kids you didn't have names for, has no way to add them during RSVP. Only plus-ones can be added guest-side.

**8. A lost text = a lost guest.** The slug link is the *only* key to a guest's page. If someone loses the thread, gets a new phone, or a spouse wants their own access, there's no recovery path on the main site. The main site should be the front door: look yourself up, land on your page.

## Part 3 — The proposed guest experience

The reframe: turn the guest page from a **form that changes** into a **home base that fills in**. One page, same URL, same design language — but organized as sections a guest can navigate, with a status strip that always answers "what do I still need to do?" The phase system stays (it's built, it works, per-household overrides are valuable) but it becomes the *unlock* mechanism for sections rather than the page's whole identity.

### The new page, top to bottom

**Hero + status strip.** Names, date, venue — then a slim strip that is the guest's dashboard: before RSVPing, "**RSVP by November 1 — 92 days left**" (live-derived from a new `rsvp_deadline` setting); after RSVPing, "✔ RSVP'd · Travel checklist 3 of 6 · Meal changes open until Nov 26"; near the wedding, "6 days to go 🎉". This one element delivers your "rsvp deadline and days left" ask and makes every return visit instantly orienting. A sticky mini-nav (RSVP · Events · Travel · Schedule) lets guests jump rather than scroll-hunt.

**RSVP section — now with a living summary.** Before submission: the current form, plus two additions — a "**+ Add a child**" button (first name, last name, optional meal — inserts a `householdMembers` row with `isChild: true`; the API pattern for plus-one inserts already does 90% of this) and per-person meal selection becoming *required* for anyone marked coming. After submission, instead of the dead-end thank-you: a **summary card** — "Deana — Salmon · Martin — Chicken Fettuccine · Jake (child) — Chicken Fettuccine" — with a "Change meal" control that stays active until the meal deadline (3 months out = **November 26, 2026**, stored as `meal_change_deadline` so you can nudge it if the resort's real cutoff differs). After the deadline the summary stays but the controls lock, with a line saying meals are final and to text you for emergencies. Attendance changes (coming ↔ not coming) can stay editable until the RSVP deadline, then lock the same way.

**Events section — visible from the RSVP phase onward, not just on arrival.** This is the schedule moved forward to where it changes decisions: Welcome Party / Rehearsal Dinner (Thursday, Feb 25), Ceremony & Reception (Friday, Feb 26), Farewell Brunch (Saturday, Feb 27) — whatever you configure. Each event shows date, time, location, dress code. For the events where headcount matters (rehearsal dinner, brunch), add per-person "count me in" toggles wired to the **already-existing** `attendingWelcome`/`attendingBrunch` columns — you'd get rehearsal-dinner and brunch headcounts for free in the dashboard. Two small settings-schema additions make this work: each event gets a `key` (to map to an attendance column) and optionally a `tag` filter so an event can be scoped (e.g. if the rehearsal dinner ends up being immediate-family-only, tag those households and only they see it — your household tags already exist).

**Travel section — "Where to stay" gets real.** The room block becomes a proper card: a primary "**Book your room**" button using your deep link with the code pre-filled, and directly beneath it, in small print: "*Group code: `butoracwonderlywedd` — mention it if you book by phone or search on your own so your stay counts toward our room block.*" Plus a room-block deadline line (new `room_block_deadline` setting — worth confirming the release date in your group contract, typically 60–90 days out). The flight-search button, per-person checklist, and household details stay as they are — they're good — with the schedule right above so guests book Thursday-arrival flights.

**The handoff you asked for.** When a guest submits their RSVP with at least one person coming, the page doesn't stop at "thank you" — it immediately reveals the travel section and smooth-scrolls to it, with the thank-you recast as "You're in! Here's everything for getting to Cancún." Mechanically this means: sync `memberChecklist` from the just-submitted RSVP data on success (which also fixes the empty-checklist bug), and show the checklist in **any** phase ≥ rsvp once RSVP'd — the separate `checklist` phase then just controls when you *start* nudging people who RSVP'd early, rather than gating the section's existence.

**Schedule/arrived content** stays phase-gated as today (resort map, table number on the day), since it genuinely is for later.

### The front door: find your invitation

On nathanandlauren.com, beneath the countdown: "**Find your invitation**." One input. A guest types a phone number *or* first and last name; we match against `householdMembers` (phone normalized to last-10-digits; names case-insensitive) and redirect to their `/guest/[slug]`, setting a long-lived cookie so future visits to the main site greet them with "Welcome back, Deana — go to your page." Design choices worth making deliberately:

- **Match handling:** exact single match → straight to the page. Multiple or zero matches → "Hmm, we couldn't find that — text Nathan & Lauren." No name suggestions, no "did you mean" — that would let anyone enumerate your guest list.
- **Security posture, honestly stated:** name lookup means anyone who knows a guest's name could view that household's page (RSVP status, table number — no addresses are ever rendered guest-side). For a 70-person wedding this is the standard pattern (Zola and The Knot work exactly this way) and I think it's the right call for simplicity, with basic per-IP rate limiting on the lookup endpoint. If you want it tighter, the option is phone-only lookup, or name → "we texted your link to the number on file" — but that adds friction and an SMS dependency. My recommendation: ship the simple version.

## Part 4 — What this means in code

Nothing here requires restructuring the app. It's one migration-free settings expansion, one small schema addition, two new API routes, a guest-page refactor, and a landing-page addition.

**New settings keys** (all editable in the existing Settings tab, which keeps its explicit-save pattern): `rsvp_deadline`, `meal_change_deadline`, `room_block_code`, `room_block_deadline`, and an upgraded `event_schedule` JSON shape (`key`, `tag`, `rsvpable` fields added per event). No database migration needed for any deadline logic — the settings table absorbs it all.

**Schema:** no new columns required for the core asks (kids, event attendance, and per-person meals all already exist). The only candidate is a nullable `guests.lastViewedAt` if we want "welcome back" behavior — skippable.

**New API routes:** `POST /api/find-invitation` (lookup + rate limit) and `PATCH /api/rsvp` (meal/attendance updates inside their windows, logging changes to `activityLog` so the dashboard can show "Deana changed salmon → chicken on 10/12"). The existing RSVP POST gets child-insert support (a near-copy of the plus-one branch) and required-meal validation.

**Guest page refactor:** `GuestPageClient.tsx` (995 lines) gets split into section components — `RsvpSection`, `EventsSection`, `TravelSection`, `StatusStrip` — under a slim orchestrator that owns shared state. This is also where the stale-state bug dies: member checklist state derives from the live RSVP state rather than a mount-time snapshot.

**Dashboard additions (small):** deadline settings inputs; an "RSVP'd but checklist untouched" nudge view now that the deadline exists; event-attendance counts on the stat cards (the drilldown pattern is already there).

### Suggested build order

1. **Deadlines + hotel block + events visibility** — settings keys, status strip numbers, room-block card with code, events section rendering from rsvp phase. Highest guest-visible value per line of code, and all of it matters *before* RSVPs start arriving. Small.
2. **RSVP upgrades** — add-a-child, required meals, summary card, change-until-deadline (PATCH route), partySize fix. Medium.
3. **The handoff** — post-RSVP reveal + scroll + state-sync bug fix, checklist un-gated from its phase once RSVP'd. Small-medium, ships with #2 naturally.
4. **Find your invitation** — landing page UI + lookup route + cookie. Medium.
5. **Hub polish** — sticky mini-nav, per-event attendance toggles, dashboard nudge views. Medium, can trail.

Items 1–3 are worth landing before you flip anyone to the `rsvp` phase, so the first RSVP a guest ever submits already flows into the checklist with the deadline visible. Item 4 can ship any time but earns its keep the day invitations go out (people will Google the site rather than scroll for the text).

## Open questions before building

1. **What's the actual RSVP deadline?** For a Feb 26 destination wedding, Nov 1, 2026 is a sensible default (92 days out today) — but check what date your Dreams group contract requires final counts, and when the room block releases, and I'll wire whatever you choose.
2. **Meal-change cutoff: exactly Nov 26 (3 months to the day), or match the resort's real food-count deadline?** It's one settings value either way.
3. **Rehearsal dinner scope: everyone, or a subset?** If subset, we scope it with your existing household tags; if everyone, simpler still.
4. **Kids and meals:** do children pick from the same dinner options, or is there a kids' meal? (One more entry in `food_options` handles it.)
5. **Lookup comfort level:** simple name/phone lookup as recommended, or phone-only?

Answer those and I can start with build item 1.
