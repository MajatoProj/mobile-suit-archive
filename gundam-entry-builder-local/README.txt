GUNDAM ENTRY BUILDER v17 — AUTO FOLDERS

New records now use continuity / series subfolders automatically.

Examples:
- Cosmic Era + Mobile Suit Gundam SEED Freedom -> cosmic-era/seed-freedom/
- Anno Domini + Mobile Suit Gundam 00 Second Season -> anno-domini/00-second-season/
- Build Series + Gundam Build Fighters Try -> build-series/build-fighters-try/

The individual JSON still downloads as ID.json because browsers cannot reliably create nested download folders.
After downloading, place it in the folder shown by the builder status message.
The updated index.json already stores the nested relative file path.

If Image path is left blank, the builder automatically generates the matching nested PNG path.
A manually entered custom image path is preserved.
