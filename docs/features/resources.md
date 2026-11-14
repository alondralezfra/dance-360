# Resources

*Code: `src/features/resources/` (screen), `src/model/resources.ts` (the rules), `src/store/slices/resourcesSlice.ts` (the actions). Route: `/projects/:id/resources` (the **Resources** tab). Plan: §2, §3.6, §5.2. Decision: [0027](../decisions/0027-resources-links.md).*

## What it does today

The tab has two sections: **Links**, then **Notes**.

### Links (`LinksSection`)
- **Add** a link by pasting a web address into the form at the top and choosing **+ Add link** (or pressing Enter). The title is optional: a blank one becomes the site's name ("youtube.com"). A bare address such as `youtube.com/watch?v=abc` gets `https://` added. Only **http and https** addresses are accepted: anything else (`javascript:`, `data:`, `file:`, `mailto:`...), an empty entry or something that is not an address is refused with a message ("That is not a web link...") and nothing is added; what you typed stays so you can fix it.
- Each link is a **row**, edited in place (every change is saved and can be undone): its **title**; its **kind** (Tutorial video, Reference video, Rehearsal recording, Document, Other; new links are Other); the **section** it is about (Whole dance, or one of the project's sections); the **part** it is about (Any part, or one of the parts); a **start time** for videos ("1:23", "83" or "1:02:03"; shown tidied as 1:23; empty means none); and its **web address**. The start time and the address are checked when you leave the field or press Enter: a good entry is saved (the address in standard form), a bad one puts back what was there. The start time is only shown, never added to the address.
- **Open** opens the link in a **new tab** (`target="_blank"`, `rel="noopener noreferrer"`, so the site cannot reach back into the app). **✕** removes the link (Undo brings it back). A link whose saved address is somehow not a plain web address (a damaged or hand-edited project) shows "Not a web link" instead of an Open button.
- Links are **organised by section**: a "Whole dance" group first (links with no section), then one group per section in song order, each under a small heading; links keep the order they were added within a group. Empty groups are not shown.
- **Nothing is fetched** from a link: no thumbnail, title or preview, no embedded player. It works offline and nothing leaves the device. (Those could come later; they would need a privacy note and a security policy change.)
- Removing a **section** or a **part** keeps the links about it: a link about a removed section becomes a whole-dance link, one about a removed part becomes "Any part".
- **Saved with the project** (data version 5, `resources`), included in a **backup file**, and checked strictly when a backup is imported: a link with a bad address, an unknown kind, or about a section or part that does not exist makes the file count as damaged.
- On a **phone** each row puts the title, Open and ✕ on the first line and the fields below; every control is at least 40px and the page does not scroll sideways. The project **tabs** now scroll sideways on a phone (the four no longer fit beside Undo/Redo), keeping the open tab in view ([projects.md](projects.md)).

### Notes (`NotesSection`)
- **Add** a note by typing in the box at the top and choosing **+ Add note** (or pressing **Ctrl/Cmd + Enter** in the box). The text can run to several lines (Enter makes a line break) and up to 5000 characters. A blank note is refused ("Write the note first."), and nothing is added.
- **What it is about** (the first menu beside the box): **Whole dance** (the default), **one of the sections**, or **A count**. Choosing A count shows **Set** and **Count** fields (the same as the formations use; a note starts at Set 1 · Count 1). It is always **one** thing: a count already sits inside exactly one section, so there is no separate section to disagree with it. For a stretch ("arms up on 5-6") say so in the text; the note is anchored to its first count. The note can **also** be about **one part** (Any part by default). What the form was last set to is kept for the next note, since notes tend to come in runs about one place.
- Each note is a **row**, edited in place (every change is saved and can be undone): its **text**, what it is about, and which part. **✕** removes the note (Undo brings it back). Typing in a note's text is **one** undo step, not one per letter (the same is now true of a link's title).
- Notes are **organised by section** like links: a "Whole dance" group first, then one group per section in song order; a note at a count is filed under the section that count falls in. Inside a group, notes about the section itself come first, then notes at counts, **earliest count first**; ties keep the order added. If a note's section or count changes, it moves to the right heading.
- Removing a **section** keeps the notes about it, as whole-dance notes (a note at a count stays at that count, now inside the section that stretched over it). Removing a **part** keeps its notes, about any part.
- **Saved with the project** (data version 6, `notes`), included in a **backup file**, and checked strictly on import: a note about a section that does not exist, a count that is not a whole number in range, an unknown part, a repeated id, or text over the limit makes the file count as damaged.
- On a **phone** the text box is full width with the menus below it; every control is at least 40px and the page does not scroll sideways.

## Not built yet
- **Showing notes beside the stage** when the playhead reaches them (and per dancer or part), the next slice.
- Note ranges (an end count), formatting, and sharing notes with dancers.
- Link thumbnails, titles fetched from the site, and an in-app player; clicking a dancer to see their videos; showing links beside the stage.
