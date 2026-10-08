# Collection Archive

A static, GitHub Pages-ready collection archive designed for NFC cards.

## Current structure

- **Startup / entrance** — warning strip, system checks, progress sequence, subtle HUD,
  space background, and an automatic shutter/flash transition.
- **Main Archive** — a stacked, orbit-like three-card selector with no extra bottom selection bar:
  - Gundam
  - Digimon
  - External Archives
- **Gundam** — space-first, dark navy, restrained blue/teal technical HUD,
  specification-terminal styling, minimal red accent.
- **Digimon** — digitalized nature: dark teal/green, branch/network motifs,
  cyan data lines, subtle binary / digital-world atmosphere.
- **External Archives** — neutral gateway with a split-screen branch choice:
  - **Mecha Prototypes** — industrial / workshop / prototype-lab aesthetic,
    gunmetal and amber accents.
  - **Fantasy Archive** — Fate / fantasy direction with grasslands, ruins, castles,
    green / ivory / muted gold and a relic/archive feel.
- **External split-screen interaction** — the hovered side becomes more saturated,
  grows and overlaps slightly; the other side fades, desaturates and recedes.
- **Category menu** — available from category and item pages.
- **Direct PC access** — bookmark `archive.html` to skip the intro.
- **NFC-ready item links** — use URLs such as:
  `item.html?category=gundam&id=YOUR-ID`.

## Privacy / discoverability

This is **not private hosting**. A GitHub Pages site is public to anyone who knows
the URL. The project includes:

- `<meta name="robots" content="noindex,nofollow,noarchive">`
- `robots.txt` with `Disallow: /`

These request that search engines do not index the site, but they are not access
control. Do not put sensitive data on the site.

## Put it on GitHub Pages

1. Create a GitHub repository, e.g. `collection-archive`.
2. Upload the contents of this ZIP to the repository root.
3. Commit the files.
4. Open **Settings → Pages**.
5. Under **Build and deployment**, select:
   - Source: **Deploy from a branch**
   - Branch: **main**
   - Folder: **/ (root)**
6. Save.
7. GitHub will show the published Pages URL.

The normal entrance is:

`https://YOURUSERNAME.github.io/collection-archive/`

The direct main archive is:

`https://YOURUSERNAME.github.io/collection-archive/archive.html`

## NFC links

Example direct NFC URL:

`https://YOURUSERNAME.github.io/collection-archive/item.html?category=gundam&id=DEMO-GUNDAM`

When you add a real item, give it a short stable `id` in `data/items.json`, then
write the matching URL to the NFC card.

Examples:

- `category=gundam`
- `category=digimon`
- `category=mecha`
- `category=fantasy`

## Add collection entries

Edit `data/items.json`.

Example:

```json
{
  "category": "gundam",
  "id": "ZGMF-X10A",
  "designation": "ZGMF-X10A",
  "name": "Freedom Gundam",
  "summary": "HGCE 1/144 build.",
  "description": "Your longer notes can go here.",
  "image": "assets/images/gundam/freedom.jpg",
  "specs": {
    "Grade": "HGCE",
    "Scale": "1/144",
    "Build date": "2026",
    "Paint": "Your paint recipe"
  }
}
```

The included records are only demonstrations. Remove them when you start adding
your real collection.

## File map

```text
collection-archive/
├── index.html              startup / entrance
├── archive.html            central three-card archive
├── external.html           split-screen External Archives selector
├── category.html           shared themed category page
├── item.html               shared NFC-ready item page
├── robots.txt
├── css/
│   ├── main.css
│   ├── startup.css
│   ├── archive.css
│   ├── external.css
│   └── themes.css
├── js/
│   ├── startup.js
│   ├── archive.js
│   ├── external.js
│   ├── shared.js
│   ├── category.js
│   └── item.js
├── data/
│   └── items.json
└── assets/
    └── images/
```

## Notes for the next design pass

The structure is intentionally ready for your own mockups and reference art.

Good next steps:
- replace CSS-only category art with your chosen images;
- tune the orbit/card positions from your mockup;
- design the real Gundam / Digimon / External category content;
- add build logs, galleries, evolution / development trees, paint recipes and tags;
- add smoother item-to-item navigation once the real collection data exists.


## Interaction update

- Internal pages now fade/scale smoothly between each other.
- The category button opens a compact rotating three-card selector instead of a plain link list.
- On External Archives, the upper-left link is labeled **Return** because it returns to the previous archive level.
- The External Archives card subtitle is **Independent mecha & fantasy collections**.

## Category selector update

The previous popup category menu has been replaced with a persistent compact rotator in the header.

- It is always visible on category, item and External Archives pages.
- Only a color identity and one-word label are shown:
  - GUNDAM
  - DIGIMON
  - EXTERNAL
- Click a side card to rotate it smoothly to the front.
- Click the front card to enter that archive.


## Gundam archive prototype

The Gundam category now demonstrates the proposed two-mode browser:

- **Timeline**
  - Cosmic Era → SEED / SEED Destiny / Stargazer / SEED Freedom
  - Universal Century → Mobile Suit Gundam / Char's Counterattack / Gundam Unicorn
  - Post Disaster → Iron-Blooded Orphans / IBO Gekko
  - Build Series → Build Fighters
- **Families**
  - Freedom Family
  - Justice Family
  - Strike Family
  - Unicorn Family
  - Barbatos Family
  - Astaroth Family
  - RX / Gundam Family
  - Build Derivatives

Prototype filtering is included for:

- Source: Bandai / P-Bandai / Base Exclusive / 3rd Party / Custom
- Grade: HG / RG / MG / PG
- Scale remains visible per kit (for example 1/144, 1/100, 1/60).

The badges use subtle abstract watermark icons rather than brand logos.

The included Gundam records are layout/data prototypes. Replace their source/grade/ownership
fields with the exact kits in the collection before treating the archive as final.


## Dynamic Gundam grouping

Gundam Timeline and Families are now data-driven:

- Any new `continuity` automatically creates a Timeline section.
- Any new `series` automatically creates a series node inside that continuity.
- Any new `family` automatically creates a Family section.
- Missing `continuity`, `series`, or `family` values are shown under **UNSORTED / UNASSIGNED**.
- A Gundam record is never intentionally hidden just because grouping metadata is incomplete.

Known sections still get a preferred display order, while new/unknown sections are appended automatically.

## Adding Gundams later

Two helpers are included:

1. `data/gundam-template.json` — a ready-to-copy record template.
2. `gundam-entry-builder.html` — a local/static form that generates a complete JSON object for you.

The entry builder does **not** modify GitHub by itself. It simply produces clean JSON, which you paste into the
`items` array in `data/items.json`. This keeps the public site static and avoids needing a backend or login system.


## Improved Gundam Entry Builder

`gundam-entry-builder.html` now:

- loads the existing `data/items.json` automatically;
- suggests existing continuities, series and families;
- shows a live Gundam-card preview;
- shows the generated JSON live;
- downloads a single-entry JSON file;
- downloads a complete updated `items.json` with the new record appended;
- replaces an existing Gundam record when the same ID is entered, instead of duplicating it;
- preserves Digimon, Mecha Prototype and Fantasy records;
- allows continuity / series / family to be left blank for UNSORTED / UNASSIGNED.

A small `+ ADD GUNDAM` link is shown in the Gundam archive toolbar.

## Builder security change

The Gundam Entry Builder is no longer part of the published site and there is no public-site link to it.

A separate local-only builder is provided as its own download. Keep that tool on your computer.
Because GitHub Pages is static, public visitors cannot modify this repository without GitHub credentials
and write permission. The local builder only creates/downloads JSON files; you manually upload the result.


## Per-record data architecture

The public site no longer uses one large `data/items.json`.

Each archive now has its own folder:

```text
data/
├── gundam/
│   ├── index.json
│   └── <one JSON file per Gundam>
├── digimon/
│   ├── index.json
│   └── <one JSON file per Digimon model>
├── mecha/
│   ├── index.json
│   └── <one JSON file per mecha model>
└── fantasy/
    ├── index.json
    └── <one JSON file per fantasy model>
```

Category pages load only that archive's `index.json`. The index contains the lightweight
metadata required to build cards, filters, timeline groups, and families. Opening a record
then loads only that model's individual JSON file.

This keeps the archive scalable and avoids maintaining one increasingly large collection file.


## Gundam image display

A Gundam's single transparent `image` PNG is now reused in two places:

- as a small contained thumbnail on Timeline / Family cards;
- as the larger subject image on the individual record page.

The large record image receives an automatically generated CSS background based on `continuity`:

- Cosmic Era
- Universal Century
- Post Disaster
- Build Series

No second image is required. An individual record can optionally override the automatic choice with:

```json
"background_theme": "cosmic-era"
```

Supported values are `cosmic-era`, `universal-century`, `post-disaster`, and `build-series`.


## Structured Gundam record data

Gundam records can now store:

```json
"mobile_suit_data": {
  "pilot": "Kira Yamato",
  "height": "18.03 m",
  "weight": "71.5 t",
  "armament": [
    "MMI-GAU2 Picus 76mm CIWS ×2",
    "MA-M20 Lupus Beam Rifle"
  ],
  "features": [
    "HiMAT Mode",
    "Full Burst Mode"
  ]
}
```

The item page renders this as a clean technical data block rather than a paragraph.
Older description text using the headings PILOT / HEIGHT / WEIGHT / ARMAMENT / FEATURES
is still parsed as a compatibility fallback.

The right-hand record panel is grouped into ARCHIVE, KIT, and BUILD sections.

## Gundam data policy

The public Gundam archive intentionally ships empty. Do not add demo, placeholder, or premade Gundam records to `data/gundam/`.

New Gundams should only come from the user's own Entry Builder output. The default `data/gundam/index.json` therefore contains an empty `items` array.


## Gundam build status

Gundam records can optionally store:

```json
"build_status": "backlog"
```

Supported values:
- `backlog`
- `assembly`
- `detailing`
- `finishing`
- `completed`

On the archive cards:
- Backlog Gundams are shown in a grayed-out style.
- A compact progress meter is shown for any saved build status.

On the individual record page:
- The BUILD panel shows a larger status block with a circle + progress bar.


### Unassigned status = Wanted

A blank `build_status` is intentionally treated as **Wanted / Looking For**:
- archive card is grayed out;
- status displays as `WANTED`;
- progress displays as `0%`.

This lets the archive contain kits the user is actively looking for before they are owned.
