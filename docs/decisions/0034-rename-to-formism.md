# 0034. The app is renamed Formism; internal identifiers keep their old spelling

- Status: Accepted
- Date: 2026-11-23

## Context
The app was called "Dance 360" while it was built. Before the first public deployment the project owner chose **Formism** (form, as in formation, plus the "-ism" of an art movement) and bought `formism.app`. Browser storage is tied to the site's address, so a rename is cheapest before testers have saved work.

## Decision
- **Everything a person sees says Formism**: the page title, the headers, error messages, the docs, and the name of new backup files, which end in `.formism.json` (the import button accepts any `.json`, so old `.dance360.json` backups still import).
- **Internal identifiers are not renamed**: the browser storage keys (`dance360:project:*`, `dance360:theme`, `dance360:device-preferences`, the legacy `dance360-project`), the IndexedDB database `dance360-audio`, and the backup file's `kind` marker `dance-360-project`. Nobody sees them, and changing them would make existing projects and songs disappear from the browser, and make every earlier backup fail to import. A rename of any of them would need a migration that copies the old data first; that is not worth doing for a name nobody sees.
- The package is named `formism`. The GitHub repository keeps its name and URL for now (renaming it is the owner's choice on GitHub).

## Consequences
- A reader of the code sees `dance360` in a few constants; `docs/architecture.md` explains why.
- Old and new backup files both import. Nothing about saved data changes, so no migration or data version bump.
