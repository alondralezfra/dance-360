# 0027. Resources, slice 1: links

- Status: Accepted
- Date: 2026-11-14
- Plan §3.6 (video hosting), §5.2 (Resources and Notes), and the open question "Notes: separate tab, or only anchored inside Stage/Resources?". Changes the saved data (version 5). Builds on [0004](0004-versioned-persistence-behind-a-repository.md) (migrations), [0021](0021-project-backup-files-and-the-error-screen.md) (backup files) and [0012](0012-undo-redo-as-snapshots.md) (undo).

## Context
The plan wants a director's videos, documents and notes in the same place as the formations, linked to the section and part they are about. The first step is the links; notes follow. The decisions below were made with the project owner before building.

## Decisions
- **One Resources tab for Links and Notes** (answering the plan's open question). Notes get their own section on the same tab in the next slice and can later also be shown beside the stage; the project tabs stay at four.
- **Build in slices, each its own branch and PR:** links first (data version 5), notes second (data version 6). A small migration each is cheap, and neither slice carries a field the other uses.
- **A resource is any web link with a type tag**, not only videos: `{ id, title, url, kind, sectionId, partId, startSec }`. Kinds: tutorial video, reference video, rehearsal recording, document, other. `sectionId` and `partId` are `null` for the whole dance / any part. `startSec` is a start time to *show*; the address is never rewritten (a YouTube `t=` parameter would be site-specific).
- **Nothing is fetched from a link, and nothing is embedded.** The app shows the title and address and opens the link in a new tab. That keeps it working offline, keeps the privacy note unchanged (no third party sees what the director attached), and needs no change to the security policy planned for hosting (a content security policy would otherwise have to allow other sites' frames and images). Thumbnails, fetched titles and an in-app player stay possible later as their own slice.
- **Only http and https addresses.** `normalizeUrl` (`model/resources.ts`) is the one rule: it trims, adds `https://` to a bare address, and refuses every other scheme (`javascript:`, `data:`, `file:`, `mailto:`...) and anything that is not a host with a dot (or localhost). It applies when adding, when editing, and when importing a backup file; a link is also only rendered as a link if its saved address still passes. Links open with `rel="noopener noreferrer"` so the site cannot reach back into the app.
- **Removing a section or part keeps its links**, detaching them (whole dance / any part), instead of deleting someone's saved work or asking first. Removing a link itself is undoable, so it has no confirmation.
- **The address is stored in standard form** (`URL.href`), so what is saved is what is shown and a re-check on import gives the same answer.

## Data
Version 5 adds `resources: Resource[]` (migrated projects get `[]`); `fixtures/v5.json` is the frozen example. A backup file's links are validated strictly (`problemWithResources`): a bad address, an unknown kind, a duplicate id, or a section or part that does not exist makes the file count as damaged, like any other malformed list.

## The phone tab row
Adding a fourth tab made the project tabs 316px wide where a phone has 266px beside Undo/Redo (the tabs are `min-h-11`, Undo/Redo 40px each, per the touch rule). The plan also lists Schedule, Outfits and Settings tabs to come. The owner chose **tabs that scroll sideways on a phone**: no scrollbar is drawn, the open tab is scrolled fully into view (also when its address is opened directly), and the next tab peeks in at the edge. Considered and not chosen: moving Undo/Redo to the top row (the project name field would shrink to about 50px, and it still only fits about five tabs) and squeezing the padding (fits with 10px to spare, so a slightly wider font on another machine would overflow). Two existing e2e checks assumed the tabs always fit ("no stray scrollbar at 390px" and "all three project tabs fit on one row"); they now check what still matters: no drawn scrollbar, every tab reachable, the open tab fully in view.

## Consequences
- A director can attach and organise links today; nothing about the link is checked (a dead or private link just fails in the new tab).
- The link text is untrusted input (a pasted address, or an imported file): it is only ever shown as text and in an `href` that has passed `normalizeUrl`.
- Not done, on purpose: thumbnails or titles from the site, an embedded player, link-checking, bulk import of links, and showing links on the stage or per dancer.
