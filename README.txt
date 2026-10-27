IDENTIFICATION GATEWAY v1
=========================

Reusable Identification Card gateway for the Collection Archive.
User-facing terminology says "Identification Card", not NFC.

FILES
-----
scan.html
css/scan.css
js/scan.js

No data files are included.

ACTIVE DIVISION
---------------
Gundam only. Other categories are intentionally left in a reserved / unavailable state.

CARD URL FORMAT
---------------
scan.html?category=gundam&id=ZGMF-X42S-HGCE

Examples:
Freedom: scan.html?category=gundam&id=ZGMF-X10A-HGCE
Destiny: scan.html?category=gundam&id=ZGMF-X42S-HGCE
Strike Freedom: scan.html?category=gundam&id=ZGMF-X20A-HGCE

FLOW
----
Identification Card detected -> Gundam index lookup -> image/profile acquisition ->
scan-line sweep -> designation decode -> lock-on / identity confirmation -> redirect.

Redirect target:
item.html?category=gundam&id=<ID>

The redirect route is centralized in buildTargetUrl() in js/scan.js. If the detail
page changes later, update that one function. Existing physical cards can keep the
same scan.html URLs.

PREVIEW MODE
------------
Append &preview=1 to stop before automatic redirect:
scan.html?category=gundam&id=ZGMF-X42S-HGCE&preview=1

DATA
----
Reads data/gundam/index.json.

INSTALL
-------
Drop scan.html, css/scan.css and js/scan.js into the repo while preserving paths.

Local test:
http://localhost:8000/scan.html?category=gundam&id=ZGMF-X42S-HGCE&preview=1
