# Dance Director App: Product Plan & MVP Spec

*Status: brainstorming / pre-build. Tech stack intentionally not chosen yet.*

---

## 1. Vision

A web app (mobile-friendly now, native app possible later) that serves as a **one-stop workspace for a director planning a single dance performance**. It replaces the scatter of spreadsheets, group chats, Drive folders, and single-purpose formation tools with one place where **formations, people, parts, music, and resources are all connected**.

**Origin:** the creator directed dances on a college dance team. An existing app handled formations (including playing a song or video to check timing) but nothing else. Tracking part assignments, tutorial videos, documentation, schedules, and outfits happened elsewhere.

**Core insight:** the value is not "a formation tool plus extras." It's that everything is linked. Clicking a dancer should show their parts, formations, and videos in one place.

**Primary user (MVP):** the director. Dancers get logins later (see Section 8).

---

## 2. Core Concepts & Terminology

| Concept | Meaning |
|---|---|
| **Account** | A director's login. Owns projects. |
| **Project** | One dance performance/piece. Contains the song, cast, parts, formations, resources, notes. (Original mental model: one project = one performance, not a whole team season.) |
| **Dancer** | A person in the project's cast. Starts as a simple roster entry with no login. |
| **Part** | A color-coded subgroup doing a distinct choreography (e.g. "Part A: floor level", "Part B: standing"). A project may have 1 to ~5 parts running simultaneously. |
| **Section** | A range of counts in the song (e.g. "Sets 5–8", or named "Verse 1", "Chorus"). Parts are assigned per section. |
| **Formation** | Everyone's positions on stage at a specific count. |
| **Set / Count** | Dance timing: a set is 8 counts. Positions in the dance are expressed as "Set 3, Count 5." |
| **Tempo map** | Converts counts to real audio time: BPM + the moment Set 1 Count 1 lands + optional tempo-change points. |
| **Resource** | A video link, document, or note attached to a project, section, and/or part. |

---

## 3. Key Design Decisions

### 3.1 Counts are the source of truth

Formations are stored as **"Set X, Count Y"**, never as raw timestamps. The tempo map translates counts to audio time at playback.

**Why:** if the audio turns out to be offset (or BPM needs adjustment), fix it once in the tempo map and every formation shifts correctly. A pure-timestamp model would force redoing everything.

### 3.2 Ways to place formations on the timeline (MVP supports 1 and 2)

1. **Grid placement:** click/drag formation markers along a waveform with a count grid drawn over it; markers snap to counts.
2. **Tap-to-snap:** the director plays the song and taps a button to advance formations; each tap **snaps to the nearest count** so imprecise tapping doesn't matter.
3. **Auto beat detection:** app suggests a beat grid from the audio; director confirms. *Tempo and first beat are estimated when a song is attached (docs/decisions/0018); a full beat grid (every beat, tempo changes) is still later.*
4. *(Later)* **Tap tempo:** tap along to find BPM and starting point.
5. *(Optional)* **No-audio mode:** build with counts and a metronome, attach the final audio later.
6. *(Optional)* **Song section labels:** markers like "verse / chorus / drop" for fast navigation.

Manual BPM and start-offset adjustment must always be available.

### 3.3 Transitions

Open question to settle during design: when a formation is placed at a count, do dancers **arrive** on that count (traveling during the preceding counts) or **leave** on it? Proposed default: **arrive on the marked count**, with a per-formation adjustable transition length in counts.

### 3.4 Where counts matter

- Formation placement (primary)
- Sections (defined as count ranges)
- Part assignments (attached to sections)
- Notes (can be anchored to a count, e.g. "arms up on 5-6")
- Video links (optional start time + section tag)

Counts do **not** matter for: roster, schedule, outfits.

### 3.5 Parts and dancers switching choreos

Dancers frequently switch between choreographies partway through a song, so part assignment is **per dancer, per section**, not per dancer overall.

- A dancer's stage dot takes the color of their **current** part.
- A formation is just everyone's positions at that moment; parts control coloring and filtering ("show only Part B").
- Videos and notes can attach to a specific part within a section.
- **Validation:** every dancer should have a part in every section; flag any gaps.

**Decided while building step 2 (see `docs/decisions/0007-parts-sections-and-assignments.md`):**
- Sections are **contiguous**: defined only by a start count, each running until the next starts; the first is pinned to count 0 and there is always at least one (so no gaps or overlaps).
- A **new section copies the previous section's assignments**; a **new dancer starts unassigned** (neutral dot, flagged as a gap).
- Part colours come from a fixed 8-colour, colour-blind-safe palette (stored by id, tuned per theme); a project can have up to 8 parts.
- Parts and the assignment grid live on a **Cast & Parts** tab; the "show only Part X" stage filter is deferred until the timeline exists.
- **A part can be limited to specific sections** (a checklist dropdown: "All sections" or any combination), see `docs/decisions/0008-parts-limited-to-sections.md`. In a section, parts limited to it replace the all-sections parts; where **exactly one part applies, everyone is in it automatically** (no per-dancer picking, no "missing assignment"). A new section keeps the previous section's parts. This lets a song be one uniform part with only some sections (e.g. the choruses) split into several.
- **A section where no part applies is not an error** (the dance isn't split there, so everyone dances together; shown as "Everyone" in gray). A "missing assignment" only means two or more parts apply and a dancer hasn't been put in one. New projects start with one part called **Everyone** on all sections. See `docs/decisions/0009-uncovered-sections-and-default-part.md`.

### 3.6 Video hosting

Not hosting uploads (too expensive). MVP = **paste links** (YouTube, Drive, etc.) with a title, a type tag (tutorial / reference / rehearsal recording), and attachment to section and/or part. Auto-fetch thumbnail and title where possible; embed for in-app playback. Note: private Drive links only play for people with access, which matters once dancer logins exist. Hosted video can be a later add-on.

---

## 4. Data Model (conceptual)

```
Account (director)
 └── Project
      ├── Song (audio file) + TempoMap (BPM, start offset, tempo changes)
      ├── Stage settings (dimensions, orientation)
      ├── Dancers (cast)
      ├── Parts (name, color)
      ├── Sections (name, start count, end count)
      ├── Assignments (dancer × section → part)
      ├── Formations (count position, transition length, notes)
      │    └── DancerPositions (dancer, x, y)
      ├── Resources (link, title, type, section?, part?, start time?)
      └── Notes (text, optional count anchor, section?, part?)
```

**Built for the future dancer role:**
- Real accounts with a **role on each project membership** from day one. Only `director` exists at first; `dancer` is added later.
- Cast members start as plain roster entries; later, a roster entry can be **linked to a dancer account**.
- Every dancer-facing screen = a **read-only filtered view** of data the director already created. No separate data model needed.
- Optional: roster library at the account level so dancers aren't retyped for each project (MVP fallback: copy a roster from a previous project).

---

## 5. Information Architecture

### 5.1 Account level
- **Projects home:** grid of project cards (name, song, performance date, formation thumbnail, progress hint). New / archive / duplicate.
- **Roster library** *(optional for MVP)*
- **Account & settings:** profile, password, default preferences (count display, stage size); later, dancer invitations.

### 5.2 Project workspace (sidebar / tab bar)
1. **Overview:** dashboard with song, performance date, quick links, and a **"problems" list** (e.g. "3 dancers have no part in Set 5", "Formation 7 has 11 of 12 dancers placed").
2. **Stage:** formation editor + playback (main screen).
3. **Cast & Parts:** project roster, part list with colors, and the **assignment grid**.
4. **Resources:** video links and docs organized by section and part.
5. **Notes:** possibly its own tab, or embedded in Stage/Resources and anchored to counts.
6. **Schedule** and **Outfits:** placeholders for later so structure doesn't change when added.
7. **Project settings:** song, tempo setup, stage dimensions, sharing, delete.

### 5.3 Assignment grid (handles mid-song choreo switching)

Dancers as rows, sections as columns, each cell a color-coded part:

```
          Intro   Verse 1   Chorus   Bridge   Final
Maya      Part A  Part A    Part B   Part B   All
Jordan    Part A  Part B    Part B   Part A   All
Priya     Part B  Part B    Part A   Part A   All
```

Empty cells = "missing assignment" warnings. Click to change a cell; drag across a row to fill multiple sections.

### 5.4 Stage screen layout (desktop)

```
┌──────────────────────────────────────────────────────────┐
│  Project name        ▶ Play   ⏮ ⏭   Set 3 · Count 5      │
├───────────┬──────────────────────────────┬───────────────┤
│ Dancers   │                              │ Formation 4   │
│ ● Maya    │                              │ Set 3, Ct 5   │
│ ● Jordan  │        STAGE CANVAS          │ Move time: 4  │
│ ● Priya   │        (dancer dots)         │ Notes...      │
│           │                              │ Show parts:   │
│ Parts     │                              │ ☑A ☑B ☐C      │
│ filter    │                              │               │
├───────────┴──────────────────────────────┴───────────────┤
│ ▁▂▅▇▅▃▂▁▂▅▇▆▃▂▁  waveform with count grid                │
│  [F1]      [F2]        [F3]     [F4]        [F5]         │
└──────────────────────────────────────────────────────────┘
```

- **Left:** dancer list + part filters (click a dancer to highlight on stage)
- **Center:** stage canvas (drag dots; multi-select to move groups)
- **Right:** selected formation details (count, transition length, notes)
- **Bottom:** timeline with waveform, count grid, formation markers
- **Top:** playback controls and live count readout

### 5.5 Navigation principles
- Breadcrumbs ("Projects › Spring Showcase › Stage").
- Clicking a dancer's name anywhere can open a small panel with their parts, formations, and videos.

---

## 6. Responsive / Device Strategy

The phone is a **different set of jobs**, not a squeezed desktop. Directors on phones mostly **watch, review, and make quick fixes**; **building** happens on iPad and desktop.

### 6.1 Tiers

| Tier | Layout |
|---|---|
| **Desktop / large iPad landscape** | Full layout: dancer panel, stage, details panel, and timeline all visible. |
| **iPad portrait / large phone** | Stage central; side panels become slide-over drawers; timeline becomes a compact strip. |
| **Phone** | Stage only by default; panels are drawers (see 6.2); bottom tab bar for switching sections. |

### 6.2 Phone stage view (the creator's preferred interaction)

Show **only the stage**. Drag/swipe in from the **left edge** to reveal the dancer/parts panel; swipe from the **right edge** to reveal the formation details/notes panel. The functionality is largely the same as on desktop; only the arrangement changes. Additional phone modes under consideration:
- **Watch mode (default):** stage fills the screen, play/pause + thin scrubber.
- **Edit mode:** pick a formation from a horizontal strip, drag dots; tools in a pull-up bottom sheet.
- **Timeline mode:** separate full-width view for waveform/grid/markers.

*(Exact details to be refined during UI design.)*

### 6.3 What degrades on small screens (candidates to simplify)
Features needing **precision**, **lots of simultaneous info**, or **bulk operations**:
- Drag-box multi-select → replace with tapping a part's color chip to select its dots
- Fine waveform dragging → keep tap-to-snap + nudge-by-one-count buttons
- Assignment grid → per-dancer vertical list by default, grid via horizontal scroll
- Multi-part overlay filters → simple "show all / show one part" toggle
- Bulk row-fill in the assignment grid → larger screens
- Schedule (later) → list instead of calendar grid

| Task | Phone | iPad | Desktop |
|---|---|---|---|
| Watch playback | ✅ great | ✅ | ✅ |
| Check who's in which part | ✅ | ✅ | ✅ |
| Add video link or note | ✅ | ✅ | ✅ |
| Nudge a dancer's position | ✅ | ✅ | ✅ |
| Build formations from scratch | ⚠️ possible | ✅ | ✅ best |
| Fine timeline editing | ⚠️ limited | ✅ | ✅ best |
| Bulk assignment editing | ⚠️ limited | ✅ | ✅ best |

### 6.4 Dancer view (future, mobile-first)
Same project, narrower tabs: **My Parts**, **Stage** (read-only playback with their dot highlighted), **Videos**, **Schedule**. A director-facing **"view as dancer"** button shows the project through this restricted lens.

### 6.5 Decisions to make now to keep mobile/app possible
1. **Design for touch from day one:** generous tap targets; nothing essential depends on hover or right-click.
2. **Adaptable UI pieces:** panels that can be a sidebar or a drawer depending on width, so one codebase covers all tiers.
3. **Playback engine separate from screens:** the logic that turns counts into positions over time must be independent of layout, so it's reused in the editor, phone watch mode, and the dancer view.
4. **Mobile web first, app later:** a responsive site installable to the home screen (PWA) may cover most needs; native app later if offline use or better audio handling is needed. Offline matters because rehearsal spaces often have poor signal.
5. **Cloud data + autosave + sync conflict handling** so edits on a phone and a laptop reconcile cleanly. *Decided (docs/decisions/0015): local-first with background sync; a conflict stops and asks ("use theirs" / "keep mine as a copy"); first release is one director on many devices; sync is opt-in because a roster is personal data.*

**Known technical risk:** audio playback on phones has quirks (autoplay restrictions, timing accuracy varies), which affects how precisely formations land on counts. Research when choosing tools.

---

## 7. MVP Definition

> A director can create a project, upload its music, set the tempo, build a sequence of formations on a stage, assign roster dancers to color-coded parts per section, play it all back in time with the song, and attach reference videos and notes.

### MVP features
1. Account login + projects list and per-project workspace (with a role field on memberships for future dancers)
2. Project roster (cast)
3. Parts (color-coded) and sections (count ranges), with per-section dancer assignments (the assignment grid)
4. Stage canvas with formations placed at counts
5. Audio upload, tempo setup (BPM + start point), playback with optional metronome
6. Grid-based placement and tap-to-snap for formations
7. Video links organized by section and part, plus notes
8. Overview "problems" checks (missing assignments, incomplete formations)
9. Responsive layout that works on desktop, iPad, and phone (watch/review/quick-fix on phone)

### Explicitly out of MVP (phase 2+)
- Schedule (practices, performances, conflict checks)
- Outfit coordination
- Dancer logins and the dancer view
- Notifications / reminders
- Attendance tracking, comments, shareable links
- Auto beat detection, tap tempo, hosted video uploads
- Native mobile app

### Suggested build order (layers, each usable on its own)
1. Static formation editor (stage + dots + multiple formations)
2. Roster + parts + assignment grid, linked to dot colors
3. Audio + tempo map + timeline + playback
4. Resources + notes
5. Overview problem checks
6. Responsive/mobile refinements
7. Phase 2: schedule, outfits, dancer role

*The formation editor with synced playback is the hardest piece. Everything else is fairly standard app functionality.*

---

## 8. Future Roadmap

- **Dancer login & dancer view:** invitations, linking roster entries to accounts, read-only filtered views, mobile-first
- **Schedule:** practices and performances tied to the project, conflict checks
- **Outfits:** per-dancer, per-project coordination
- **Notifications & reminders**
- **Collaboration:** comments, co-directors, shareable links
- **Hosted video uploads** (once cost is manageable)
- **Native app** if the PWA falls short
- **Multi-project/team features:** roster library across projects, duplicating a project as a template
- **Smart formation suggestions:** place a target shape and let the app assign each dancer a spot, minimising how far everyone moves (idea, see §10)

---

## 9. Open Questions

- **Transition semantics:** arrive-on vs. leave-on at a marked count; default transition length?
- **Roster library:** include in MVP or copy-roster-between-projects instead?
- **Notes:** separate tab, or only anchored inside Stage/Resources?
- **Tempo changes:** *Decided (docs/decisions/0013): one BPM per project in the MVP; the saved tempo gets an empty list of tempo changes in the same migration that adds the song, so changes can be supported later without another data change.*
- **Music files:** *Decided for now (0013): the file is stored in the browser (IndexedDB), the project saves only its name/length/hash, and another device asks you to re-attach the file.* Still open: licensing considerations when sharing with dancers, and cloud storage (opt-in).
- **Half-counts ("&"):** *Decided for now (0013): whole counts only.* Revisit with the choreographers before or soon after the timeline exists; it is a data migration, cheapest while there are few projects.
- **Stage setup:** fixed stage shapes/sizes, or fully customizable (including audience orientation)?
- **Formation tools:** helpers like align, distribute evenly, mirror, line/circle presets, path preview (nice-to-have). Smart assignment of dancers to a hand-placed shape is a bigger idea of its own: see §10.
- **Version history** (saved snapshots you can return to later) for formations. *Undo/redo itself is decided and built: session-only, last 100 steps, every project edit, snapshot-based (docs/decisions/0012). Revisit if live co-editing becomes a goal.*
- **Repository structure:** *Decided (docs/decisions/0016): one repository, modular inside (the backend is Supabase; server code goes in a `supabase/` folder). Splitting into workspaces and then separate repositories is reconsidered only when a stated trigger fires.*
- **Next step after this doc:** research tools/frameworks/platforms (languages, frontend framework, canvas library, audio handling, backend/database, hosting) with the risks above in mind.

---

## 10. Idea: smart formation suggestions *(an idea to explore, not scheduled)*

### The idea (from the creator)
The director has a formation on stage (say a box, with parts and everything set up). For the next formation they only **place the dots for the shape they want, without saying who goes where**. The app then fills in the next formation: it decides which dancer goes to which spot so that it makes the most sense spatially and **dancers move as little as possible**. The creator is open to other uses of machine learning or AI, but only ones that are simple, easy to use and genuinely helpful. **No redundant AI features.**

### What this actually needs
The core of it is not machine learning. Matching N dancers to N target spots so that the total (or worst) travel is smallest is a classic **assignment problem** with exact, instant solutions (the Hungarian algorithm; N is only about 8-40). That is better than ML for this job: deterministic, no training data, free, works offline, predictable, and explainable ("this assignment moves everyone 112 ft in total"). So the recommendation is to build it as an ordinary "Smart assign" tool and be honest in the UI about what it is, rather than branding it AI.

### Design questions to settle when we build it
- **Input:** the director drops unlabelled target dots (any number up to the cast size; extra dancers stay where they are, or the rest are placed in the nearest free spots).
- **What "best" means.** All dancers share the same travel time (the formation's travel counts), so the **longest move** sets the pace. Options: minimise total distance, minimise the longest move, or minimise the sum of squared distances (a good balance, and it tends to avoid paths crossing). Probably pick a sensible default and let the director switch.
- **Constraints that make it genuinely useful:** keep dancers of the same part together or on the same side; pin some dancers so they don't move; stay inside the stage; avoid dancers' paths colliding or crossing mid-transition (checkable with `positionsAt`).
- **Always a preview.** Show each dancer's path, let the director accept, tweak (swap two dancers) or undo. It never silently changes a formation.

### Other AI/ML ideas, judged by "does this save a real step?"
- **Worth considering:**
  1. *Tidy a rough shape:* snap hand-placed dots to a clean line, circle, box or arc with even spacing. Mostly geometry, no ML needed.
  2. *Path conflict warnings:* flag dancers who would collide or cross during a transition. Pure algorithm built on the playback engine.
  3. *Beat and tempo detection* from the audio (already planned in §3.2). Signal processing rather than ML.
  4. *Sketch or describe a shape:* "a diamond", or a photo of a whiteboard drawing, turned into dots. This is the one place modern AI (a language or vision model) adds a capability that is otherwise hard. Only worth it if directors really ask for it, and it needs a cost and privacy decision because content leaves the device.
- **Probably not worth it:** AI-written choreography, formations generated from the music (hard to trust), chatbots, or auto-summarised notes. The director can already do these faster than they could check an AI's output.

### Rules for any AI or smart feature
Previewable and undoable in one step; never changes data without confirmation; explains what it did; works offline and without an account where possible; never uploads audio, video or the roster without explicit opt-in; and has a clear benefit to the director over doing it by hand.

### Where it fits
It needs **undo/redo** (see §9) to be safe to use, and works best after multi-select and the basic formation tools exist. Suggested order: undo/redo, then tidy-a-shape and path conflict warnings, then smart assignment.
