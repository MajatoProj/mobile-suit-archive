LOCAL GUNDAM ENTRY BUILDER

Keep this folder on your own computer. Do not upload it to the public GitHub Pages repository.

Workflow:
1. Download data/items.json from your GitHub repository.
2. Open gundam-entry-builder-local.html in your browser.
3. Click LOAD CURRENT items.json and select the downloaded file.
4. Fill in the Gundam.
5. Click DOWNLOAD UPDATED items.json.

The builder does not connect to GitHub, has no credentials, and cannot publish changes by itself.


SAVED VALUE DROPDOWNS / NORMALIZATION
- Continuity, Series, and Family are combined typeable dropdowns populated from the loaded items.json.
- You can still type a completely new value.
- Existing values are matched ignoring capitalization, spaces, and punctuation.
  Example: UC, Uc, U C, U-C, and u.c. resolve to the same existing canonical value.
- The spelling already present in items.json is kept as the canonical spelling.
- A new value remains as typed apart from trimmed/collapsed whitespace, and becomes reusable after it is saved to items.json and loaded next time.

COMBINED FIELDS
- Continuity, Series, and Family now use one combined field instead of a separate text box and USED... menu.
- Type directly to create/filter a value, or click the arrow to show saved values.


TIMELINE METADATA
The builder now stores optional timeline fields for later visual timeline work:

- timeline_position
  Main horizontal sequence number. Parallel series can share the same position.
  Example: SEED = 1, DESTINY = 2, STARGAZER = 2, FREEDOM = 3.

- timeline_lane
  One of: main, parallel, side-story, alternate.

- timeline_label
  Optional era/year label such as C.E. 71, C.E. 73, U.C. 0096.

- timeline_parent
  Optional series that a branch connects to.
  Example: STARGAZER can connect to Mobile Suit Gundam SEED Destiny.

These fields are saved now but do not yet change the public site's timeline rendering.


BUILD DATA FIELDS
- Release date: official kit release date.
- Build date: date this specific kit was completed/built.
- Paint: dropdown with None, Panel Line, Details, or Custom.
- Panel lining is no longer a separate field.
- Top coat remains a separate optional field.


INDIVIDUAL GUNDAM JSON FILES / DESIGN ORIGIN LINKS

The builder now supports a local Gundam library made from individual JSON files.

Recommended workflow:
- Save each Gundam as its own file, for example:
  ZGMF-X10A-HGCE.json
  RX-0-RG.json
  ASW-G-08-HG.json
- Use LOAD LIBRARY JSON(S) to select multiple previously made Gundam JSON files at once.
- You can also load an existing items.json; all Gundam records inside it become available to the builder.
- Use LOAD / EDIT GUNDAM JSON to reopen one individual Gundam file and populate the form.

Design Origin is now a real relationship:
- It can only select Gundams already present in the loaded local library.
- Multiple Design Origins can be added.
- Each link stores the target record ID, designation, and name.
- Free-text Design Origin entry is no longer used, so there cannot be a connection to a Gundam that does not exist in the loaded library.

Per-Gundam JSON files are a good long-term structure. For the published static site, a small index/manifest file will still be needed later because GitHub Pages cannot automatically enumerate every JSON file in a directory. The current site can continue using items.json until that migration is made.


INDEX-BASED WEBSITE WORKFLOW

The builder now targets the website's new Gundam data structure:

data/gundam/
- index.json
- one JSON file per Gundam

Recommended session:
1. Load the current data/gundam/index.json into the builder.
2. Optionally load/edit an individual Gundam JSON.
3. Download the individual Gundam JSON whenever you want to save that record.
4. Download the updated index.json when you want the archive listing updated.

The index contains lightweight card/timeline/family metadata. Full descriptions and build/spec
data stay in each Gundam's individual JSON file.


STRUCTURED MOBILE SUIT DATA
- Pilot, Height, Weight, Armament, and Features now have dedicated fields.
- Enter one Armament item per line.
- Enter one Feature per line.
- These values are saved under mobile_suit_data in the individual Gundam JSON.
- Additional Notes is now only for information that does not fit the structured fields.
- Loading an older Gundam JSON attempts to extract PILOT / HEIGHT / WEIGHT / ARMAMENT / FEATURES from its old Description text.


LOCAL PREVIEW IMAGE
- SELECT PREVIEW IMAGE lets you choose a PNG/JPG/WebP/GIF directly from your computer.
- The selected image is shown only in the builder's live preview.
- It is not uploaded anywhere and is not embedded into the JSON.
- The normal Image Path field remains the website path saved in the Gundam JSON.
- Clearing the form also clears the local preview image.


BUILD STATUS
- Build Status can be set to Backlog, Assembly, Detailing, Finishing, or Completed.
- The live preview shows a small progress meter for the selected status.
- Backlog also previews in a grayed-out style.
- The value is saved in both the individual Gundam JSON and the Gundam index.json.
