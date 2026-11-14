# 0028. Resources, slice 2: notes

- Status: Accepted
- Date: 2026-11-13
- Plan §3.4 (notes anchored to a count), §4 (data model: Notes), §5.2. Completes the Resources tab begun in [0027](0027-resources-links.md). Changes the saved data (version 6). Builds on [0004](0004-versioned-persistence-behind-a-repository.md), [0012](0012-undo-redo-as-snapshots.md) and [0021](0021-project-backup-files-and-the-error-screen.md).

## Context
Decision 0027 put Links and Notes on one Resources tab and split the work into slices. This is the second: notes, "text, optional count anchor, section?, part?" in the plan. The choices below were made with the project owner before building.

## Decisions
- **One anchor per note, plus an optional part.** A note is about the whole dance, or one section, or one whole count, and may also be about one part: `{ id, text, anchor, partId }` with `anchor` one of `{ kind: 'dance' }`, `{ kind: 'section', sectionId }`, `{ kind: 'count', count }`. Sections are contiguous, so a count already sits in exactly one section; making the section a separate field would only let a note say "Section 1" while its count falls in Section 3 and force the app to pick a winner. (The alternative, independent section, count and part fields like links have, was declined.)
- **A single count, not a range.** "Arms up on 5-6" is anchored to count 5 and says "5-6" in its text. One moment is simple to store and to show, and a later "show this note when the playhead reaches it" has one clear trigger. An end count can be added later without breaking saved notes (a new optional field).
- **Notes are shown only on the Resources tab for now.** Showing them beside the stage as the playhead reaches them is the next slice, with its own layout and phone decisions (the stage header and bottom bar are already tight at 150% zoom and on phones).
- **Plain text**, up to 5000 characters, line breaks kept, no formatting. It may be emptied while editing (so clearing a box to retype does not delete the note); only adding a note needs text.
- **Display order** matches links: a whole-dance group, then each section in song order; inside a group the section's own notes, then notes at counts, earliest first, ties in the order added. A note at a count is filed under the section its count falls in.
- **Removing a section keeps its notes** as whole-dance notes (a note at a count needs no change: the count falls in the section that stretched over it); **removing a part keeps its notes**, about any part. Removing a note is undoable, so it has no confirmation.

## Also changed
- **Typing in a note, and in a link's title, is one undo step.** Undo only merged typing for `name` fields, so each letter typed in a link's title (slice 1) was its own step, and a note's text would have been worse. `editGroup` (`model/history.ts`) now also groups a link's `title` and a note's `text`.
- **`Textarea`**, a shared component (raw `<textarea>` is not allowed on screens), and a `name` option on `NumberField` so many "Set" and "Count" fields on one page each have a unique accessible name. `fromSetAndCount` (`model/tempo.ts`) is the inverse of `toSetAndCount`, extracted now that the formation timing and notes both need it.

## Data
Version 6 adds `notes: Note[]` (migrated projects get `[]`); `fixtures/v6.json` is the frozen example, with a note of each anchor kind. A backup file's notes are validated strictly (`problemWithNotes`): an anchor that is not exactly one of the three, a section that does not exist, a count that is not a whole number in range, an unknown part, a repeated id, or text over the limit makes the file count as damaged.

## Consequences
- A director can write down choreography reminders next to the links, attached to the place they are about. Nothing yet shows them while the dance plays.
- Note text is untrusted input (typed, or from an imported file): it is only ever shown as text in a text box, never as markup.
- Not done, on purpose: note ranges, formatting, showing notes on the stage or per dancer, and sharing notes with dancers.
