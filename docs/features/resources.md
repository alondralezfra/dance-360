# Resources

*Code: `src/features/resources/` (screen), `src/model/resources.ts` (the rules), `src/store/slices/resourcesSlice.ts` (the actions). Route: `/projects/:id/resources` (the **Resources** tab). Plan: §2, §3.6, §5.2. Decision: [0027](../decisions/0027-resources-links.md).*

## What it does today

The tab has one section so far, **Links**. (Notes join it in the next slice.)

### Links (`LinksSection`)
- **Add** a link by pasting a web address into the form at the top and choosing **+ Add link** (or pressing Enter). The title is optional: a blank one becomes the site's name ("youtube.com"). A bare address such as `youtube.com/watch?v=abc` gets `https://` added. Only **http and https** addresses are accepted: anything else (`javascript:`, `data:`, `file:`, `mailto:`...), an empty entry or something that is not an address is refused with a message ("That is not a web link...") and nothing is added; what you typed stays so you can fix it.
- Each link is a **row**, edited in place (every change is saved and can be undone): its **title**; its **kind** (Tutorial video, Reference video, Rehearsal recording, Document, Other; new links are Other); the **section** it is about (Whole dance, or one of the project's sections); the **part** it is about (Any part, or one of the parts); a **start time** for videos ("1:23", "83" or "1:02:03"; shown tidied as 1:23; empty means none); and its **web address**. The start time and the address are checked when you leave the field or press Enter: a good entry is saved (the address in standard form), a bad one puts back what was there. The start time is only shown, never added to the address.
- **Open** opens the link in a **new tab** (`target="_blank"`, `rel="noopener noreferrer"`, so the site cannot reach back into the app). **✕** removes the link (Undo brings it back). A link whose saved address is somehow not a plain web address (a damaged or hand-edited project) shows "Not a web link" instead of an Open button.
- Links are **organised by section**: a "Whole dance" group first (links with no section), then one group per section in song order, each under a small heading; links keep the order they were added within a group. Empty groups are not shown.
- **Nothing is fetched** from a link: no thumbnail, title or preview, no embedded player. It works offline and nothing leaves the device. (Those could come later; they would need a privacy note and a security policy change.)
- Removing a **section** or a **part** keeps the links about it: a link about a removed section becomes a whole-dance link, one about a removed part becomes "Any part".
- **Saved with the project** (data version 5, `resources`), included in a **backup file**, and checked strictly when a backup is imported: a link with a bad address, an unknown kind, or about a section or part that does not exist makes the file count as damaged.
- On a **phone** each row puts the title, Open and ✕ on the first line and the fields below; every control is at least 40px and the page does not scroll sideways. The project **tabs** now scroll sideways on a phone (the four no longer fit beside Undo/Redo), keeping the open tab in view ([projects.md](projects.md)).

## Not built yet
- **Notes** (text, optionally anchored to a count, section or part): the next slice.
- Link thumbnails, titles fetched from the site, and an in-app player; clicking a dancer to see their videos; showing links beside the stage.
