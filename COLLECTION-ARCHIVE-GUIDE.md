# Collection Archive — Single Guide

This is the working guide for the local Collection Archive project.

---

## 1. Repository root

Example:

```text
C:\Users\Jeremy\Documents\gundam archive\collection-archive
```

Typical root structure:

```text
collection-archive/
├── index.html
├── archive.html
├── category.html
├── item.html
├── external.html
├── robots.txt
├── organize-archive-folders.py
├── css/
├── js/
├── data/
└── assets/
```

---

## 2. Run the archive locally

Open Command Prompt in the repository root and run:

```bat
"C:\Users\Jeremy\AppData\Local\Programs\Python\Python313\python.exe" -m http.server 8000
```

Then open:

```text
http://localhost:8000/
```

Direct archive page:

```text
http://localhost:8000/archive.html
```

Stop the server with:

```text
Ctrl + C
```

If port 8000 is already in use:

```bat
"C:\Users\Jeremy\AppData\Local\Programs\Python\Python313\python.exe" -m http.server 8001
```

Then open:

```text
http://localhost:8001/
```

---

## 3. Archive data structure

Each vault has its own `index.json`.

```text
data/
├── gundam/
│   └── index.json
├── digimon/
│   └── index.json
├── mecha/
│   └── index.json
└── fantasy/
    └── index.json
```

The individual JSON files are stored in subfolders.

Images mirror the same organization under:

```text
assets/images/
```

Do not split the main `index.json` for a vault. It is the lightweight catalog used to build the archive page.

---

## 4. Folder organization rules

The universal organizer uses these rules:

### Gundam

```text
continuity / series
```

Example:

```text
data/gundam/cosmic-era/seed-freedom/STTS-909-HGCE.json
assets/images/gundam/cosmic-era/seed-freedom/STTS-909-HGCE.png
```

### Digimon

Primarily:

```text
series / world
```

Fallback metadata can include franchise, universe, family, or line.

### Mecha

Primarily:

```text
franchise-or-brand / series
```

### Fantasy

Primarily:

```text
franchise-or-universe / series
```

---

## 5. Universal folder organizer

Keep this file in the repository root:

```text
organize-archive-folders.py
```

### Organize all vaults

```bat
"C:\Users\Jeremy\AppData\Local\Programs\Python\Python313\python.exe" organize-archive-folders.py
```

### Preview changes first

```bat
"C:\Users\Jeremy\AppData\Local\Programs\Python\Python313\python.exe" organize-archive-folders.py --dry-run
```

This is useful before a large reorganization because it does not move or edit anything.

### Organize one vault only

Gundam:

```bat
"C:\Users\Jeremy\AppData\Local\Programs\Python\Python313\python.exe" organize-archive-folders.py --category gundam
```

Digimon:

```bat
"C:\Users\Jeremy\AppData\Local\Programs\Python\Python313\python.exe" organize-archive-folders.py --category digimon
```

Mecha:

```bat
"C:\Users\Jeremy\AppData\Local\Programs\Python\Python313\python.exe" organize-archive-folders.py --category mecha
```

Fantasy:

```bat
"C:\Users\Jeremy\AppData\Local\Programs\Python\Python313\python.exe" organize-archive-folders.py --category fantasy
```

### What the organizer does

It:

- reads each vault's `index.json`;
- finds the matching individual JSON;
- finds the matching image;
- creates the correct subfolders;
- moves existing files;
- updates the `file` and `image` paths in `index.json`;
- updates the individual JSON's `image` path;
- creates `index.before-folder-organize.json` as a backup;
- does not generate images;
- does not automatically overwrite an existing conflicting destination file.

A normal new-entry run may show:

```text
JSONs verplaatst: 1
Images verplaatst: 1
JSON image-paths bijgewerkt: 1
```

A run with nothing new may show:

```text
JSONs verplaatst: 0
Images verplaatst: 0
JSON image-paths bijgewerkt: 0
```

---

## 6. Adding a new Gundam

Recommended workflow:

1. Create the record with the Gundam Entry Builder.
2. Update `data/gundam/index.json`.
3. Put the new individual JSON temporarily in:

```text
data/gundam/
```

4. Put the PNG temporarily in:

```text
assets/images/gundam/
```

5. The JSON and image should use the archive ID as the filename.

Example:

```text
ASW-G-08-6TH-HG.json
ASW-G-08-6TH-HG.png
```

6. Run:

```bat
"C:\Users\Jeremy\AppData\Local\Programs\Python\Python313\python.exe" organize-archive-folders.py --category gundam
```

The organizer moves both files to the correct continuity/series folder and updates the paths.

---

## 7. Adding entries to Digimon, Mecha, or Fantasy

Use the same basic workflow.

### Digimon

Place new files temporarily in:

```text
data/digimon/
assets/images/digimon/
```

Then run:

```bat
"C:\Users\Jeremy\AppData\Local\Programs\Python\Python313\python.exe" organize-archive-folders.py --category digimon
```

### Mecha

Place new files temporarily in:

```text
data/mecha/
assets/images/mecha/
```

Then run:

```bat
"C:\Users\Jeremy\AppData\Local\Programs\Python\Python313\python.exe" organize-archive-folders.py --category mecha
```

### Fantasy

Place new files temporarily in:

```text
data/fantasy/
assets/images/fantasy/
```

Then run:

```bat
"C:\Users\Jeremy\AppData\Local\Programs\Python\Python313\python.exe" organize-archive-folders.py --category fantasy
```

---

## 8. Gundam build statuses

Supported build states:

```text
blank / unassigned = Wanted / Looking For
backlog            = 10%
assembly           = 35%
detailing          = 65%
finishing          = 85%
completed          = 100%
faulted            = no percentage
```

`faulted` means the kit is owned but retired, stored away, broken, used for parts, or otherwise not part of the active build pipeline.

---

## 9. Timeline ordering

Use:

```json
"timeline_position": 3
```

for the position of a series/story stage inside its continuity.

Use:

```json
"timeline_order": 1
```

only when multiple Gundams in the same series actually need ordering.

Do not add `timeline_order: 1` to every single-entry series.

Example:

```text
Rising Freedom Gundam        timeline_order: 1
Mighty Strike Freedom Gundam timeline_order: 2
```

---

## 10. Families and relationships

Family ordering can branch.

Example:

```text
Freedom Gundam
└── Strike Freedom Gundam
    ├── Rising Freedom Gundam
    └── Mighty Strike Freedom Gundam
```

Two branch entries may share the same `family_order`.

Optional relationship records can use:

```json
"relationships": [
  {
    "type": "successor",
    "id": "TARGET-ID",
    "designation": "TARGET DESIGNATION",
    "name": "TARGET NAME"
  }
]
```

Supported relationship types include:

```text
successor
variant
upgrade
equipment/pack
```

Do not add empty `relationships: []` fields unless needed.

---

## 11. Images

For archive images:

- use the actual kit/product/source image where possible;
- preserve the real model;
- remove/clean the background only;
- keep the full subject visible;
- leave some padding around the model;
- use transparent PNG where possible;
- name the PNG exactly after the archive ID.

Example:

```text
STTS-909-HGCE.png
```

Do not use an unrelated or recreated Gundam in place of the actual kit.

---

## 12. Site patch ZIPs vs data ZIPs

Keep these separate.

### Site patch ZIP

A site patch should normally contain files such as:

```text
category.html
item.html
css/
js/
```

A site patch should **not** include `data/` unless specifically intended.

### Data update

A data update may contain:

```text
data/
assets/images/
```

Check the ZIP contents before copying over the repository.

This separation prevents a site update from accidentally overwriting collection data.

---

## 13. Testing after an update

After changing files:

1. Start the local server.
2. Open:

```text
http://localhost:8000/
```

3. Check the affected vault.
4. Verify images display.
5. Open several individual records.
6. Check search/filter/sorting.
7. Check the browser console if something does not load.
8. Only then upload/commit the changes to GitHub.

---

## 14. GitHub Pages

The normal public entrance is:

```text
https://YOURUSERNAME.github.io/collection-archive/
```

Direct main archive:

```text
https://YOURUSERNAME.github.io/collection-archive/archive.html
```

Direct NFC record links use:

```text
item.html?category=gundam&id=YOUR-ID
```

Example:

```text
item.html?category=gundam&id=ZGMF-X10A-HGCE
```

The same format works for:

```text
category=digimon
category=mecha
category=fantasy
```

---

## 15. Quick everyday workflow

For normal collection work:

```text
1. Add/update JSON.
2. Add the matching image.
3. Run organize-archive-folders.py.
4. Start the local HTTP server.
5. Test the archive.
6. Commit/upload to GitHub.
```

Main commands:

```bat
"C:\Users\Jeremy\AppData\Local\Programs\Python\Python313\python.exe" organize-archive-folders.py
```

```bat
"C:\Users\Jeremy\AppData\Local\Programs\Python\Python313\python.exe" -m http.server 8000
```

That is the core maintenance workflow.
