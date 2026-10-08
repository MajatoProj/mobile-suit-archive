const params = new URLSearchParams(window.location.search);
const category = params.get("category") || "";
const id = params.get("id") || "";

const themeMap = {
  gundam: "theme-gundam",
  digimon: "theme-digimon",
  mecha: "theme-mecha",
  fantasy: "theme-fantasy"
};

document.body.classList.add(themeMap[category] || "theme-gundam");

const backMap = {
  gundam: "category.html?type=gundam",
  digimon: "category.html?type=digimon",
  mecha: "category.html?type=mecha",
  fantasy: "category.html?type=fantasy"
};

document.getElementById("itemBackLink").href = backMap[category] || "archive.html";
document.getElementById("itemCategory").textContent =
  category ? `ARCHIVE RECORD // ${category.toUpperCase()}` : "ARCHIVE RECORD";

loadItem().catch(showMissing);

async function loadItem() {
  if (!category || !id) return showMissing();

  const indexResponse = await fetch(`data/${category}/index.json`, { cache: "no-store" });
  if (!indexResponse.ok) throw new Error("Index not found.");

  const index = await indexResponse.json();
  const meta = (index.items || []).find(item => String(item.id) === id);

  if (!meta || !meta.file) return showMissing();

  const itemResponse = await fetch(`data/${category}/${meta.file}`, { cache: "no-store" });
  if (!itemResponse.ok) throw new Error("Record file not found.");

  const record = await itemResponse.json();
  const item = { ...meta, ...record };

  renderItem(item);
}

function renderItem(item) {
  document.getElementById("itemTitle").textContent = item.name || item.id;
  document.getElementById("itemDesignation").textContent = item.designation || item.id;
  document.getElementById("itemName").textContent = item.name || item.id;
  renderSuitData(item);
  document.title = `${item.name || item.id} // Collection Archive`;

  const imageBox = document.getElementById("itemImage");
  applyImageBackground(imageBox, item);

  if (item.image) {
    imageBox.innerHTML = "";
    const img = document.createElement("img");
    img.src = item.image;
    img.alt = item.name || item.id;
    imageBox.appendChild(img);
  }

  renderSpecs(item);
}

function applyImageBackground(imageBox, item) {
  imageBox.classList.remove(
    "bg-cosmic-era",
    "bg-universal-century",
    "bg-post-disaster",
    "bg-build-series",
    "bg-gundam-default"
  );

  const requested = String(item.background_theme || item.continuity || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  const themeMap = {
    "cosmic-era": "bg-cosmic-era",
    "ce": "bg-cosmic-era",
    "universal-century": "bg-universal-century",
    "uc": "bg-universal-century",
    "post-disaster": "bg-post-disaster",
    "pd": "bg-post-disaster",
    "build-series": "bg-build-series"
  };

  imageBox.classList.add(themeMap[requested] || "bg-gundam-default");
}

function renderSuitData(item) {
  const container = document.getElementById("itemSuitData");
  const description = document.getElementById("itemDescription");

  container.innerHTML = "";
  description.textContent = "";

  const data = normalizeSuitData(item);

  if (data) {
    container.hidden = false;

    const overview = document.createElement("div");
    overview.className = "suit-data-overview";

    [
      ["Pilot", data.pilot],
      ["Height", data.height],
      ["Weight", data.weight]
    ].forEach(([label, value]) => {
      if (!value) return;

      const cell = document.createElement("div");
      cell.className = "suit-data-cell";
      cell.innerHTML = `
        <span class="suit-data-label">${escapeHtml(value ? label : "")}</span>
        <strong>${escapeHtml(value)}</strong>
      `;
      overview.appendChild(cell);
    });

    if (overview.children.length) container.appendChild(overview);

    if (data.armament.length) {
      container.appendChild(
        makeSuitListBlock("ARMAMENT", data.armament, "armament-list")
      );
    }

    if (data.features.length) {
      container.appendChild(
        makeSuitListBlock("FEATURES", data.features, "feature-list")
      );
    }
  } else {
    container.hidden = true;
  }

  const extraNotes = data?.extraNotes || item.description || "";
  if (extraNotes && !isOnlyStructuredDescription(item.description, data)) {
    description.textContent = extraNotes;
  } else {
    description.textContent = "";
  }

  description.hidden = !description.textContent.trim();
}

function normalizeSuitData(item) {
  const stored = item.mobile_suit_data;

  if (stored && typeof stored === "object") {
    return {
      pilot: String(stored.pilot || "").trim(),
      height: String(stored.height || "").trim(),
      weight: String(stored.weight || "").trim(),
      armament: normalizeList(stored.armament),
      features: normalizeList(stored.features),
      extraNotes: String(item.description || "").trim()
    };
  }

  return parseLegacySuitDescription(item.description || "");
}

function parseLegacySuitDescription(text) {
  const source = String(text || "").trim();
  if (!source) return null;

  const headings = ["PILOT", "HEIGHT", "WEIGHT", "ARMAMENT", "FEATURES"];
  const matcher = /\b(PILOT|HEIGHT|WEIGHT|ARMAMENT|FEATURES)\b/gi;
  const matches = [...source.matchAll(matcher)];

  if (!matches.length) return null;

  const sections = {};
  let firstHeadingStart = matches[0].index ?? 0;

  matches.forEach((match, index) => {
    const heading = match[1].toUpperCase();
    const valueStart = (match.index ?? 0) + match[0].length;
    const valueEnd =
      index + 1 < matches.length
        ? (matches[index + 1].index ?? source.length)
        : source.length;

    sections[heading] = source
      .slice(valueStart, valueEnd)
      .replace(/^[\s:–—-]+/, "")
      .trim();
  });

  const leadingText = source.slice(0, firstHeadingStart).trim();

  return {
    pilot: sections.PILOT || "",
    height: sections.HEIGHT || "",
    weight: sections.WEIGHT || "",
    armament: normalizeList(sections.ARMAMENT || ""),
    features: normalizeList(sections.FEATURES || ""),
    extraNotes: leadingText
  };
}

function normalizeList(value) {
  if (Array.isArray(value)) {
    return value.map(v => String(v).trim()).filter(Boolean);
  }

  const text = String(value || "").trim();
  if (!text) return [];

  const split = text
    .split(/\r?\n|;\s*|\s+\u2022\s+/)
    .map(v => v.trim())
    .filter(Boolean);

  return split.length ? split : [text];
}

function makeSuitListBlock(title, values, className) {
  const block = document.createElement("section");
  block.className = `suit-data-block ${className}`;

  const heading = document.createElement("h3");
  heading.textContent = title;
  block.appendChild(heading);

  const list = document.createElement("ul");

  values.forEach(value => {
    const li = document.createElement("li");
    li.textContent = value;
    list.appendChild(li);
  });

  block.appendChild(list);
  return block;
}

function isOnlyStructuredDescription(description, data) {
  if (!description || !data) return false;
  return !String(data.extraNotes || "").trim();
}


function getBuildStatusInfo(value) {
  const map = {
    backlog: { label: "Backlog", percent: 10 },
    assembly: { label: "Assembly", percent: 35 },
    detailing: { label: "Detailing", percent: 65 },
    finishing: { label: "Finishing", percent: 85 },
    completed: { label: "Completed", percent: 100 }
  };

  const key = String(value || "").trim().toLowerCase();
  return map[key] ? { key, ...map[key] } : { key: "", label: "", percent: 0 };
}

function renderSpecs(item) {
  const specs = document.getElementById("itemSpecs");
  specs.innerHTML = "";

  const rawSpecs = { ...(item.specs || {}) };
  const sourceLabels = {
    "bandai": "Bandai",
    "p-bandai": "P-Bandai",
    "base": "Gundam Base / Exclusive",
    "3rd-party": "3rd Party"
  };

  const archiveRows = [
    ["Continuity", item.continuity],
    ["Series", item.series],
    ["Timeline", item.timeline_label],
    ["Family", item.family]
  ];

  const originRows = normalizeOrigins(item).map(origin => ({
    label: "Design origin",
    value:
      [origin.designation, origin.name].filter(Boolean).join(" — ") || origin.id,
    href: `item.html?category=gundam&id=${encodeURIComponent(origin.id)}`
  }));

  const kitRows = [
    ["Source", item.source ? (sourceLabels[item.source] || item.source) : ""],
    ["Grade", item.grade],
    ["Scale", item.scale],
    ["Release date", rawSpecs["Release date"]]
  ];

  const buildRows = [
    ["Build date", rawSpecs["Build date"]],
    ["Paint", rawSpecs["Paint"]],
    ["Top coat", rawSpecs["Top coat"]],
    ["Custom build", item.custom ? "Yes" : ""]
  ];

  appendSpecSection(specs, "ARCHIVE", archiveRows, originRows);
  appendSpecSection(specs, "KIT", kitRows);
  appendSpecSection(specs, "BUILD", buildRows, [], getBuildStatusInfo(item.build_status));

  const consumed = new Set([
    "Release date",
    "Build date",
    "Paint",
    "Top coat"
  ]);

  const otherRows = Object.entries(rawSpecs)
    .filter(([key, value]) => !consumed.has(key) && value !== "" && value != null);

  if (otherRows.length) {
    appendSpecSection(specs, "OTHER", otherRows);
  }

  if (!specs.children.length) {
    specs.innerHTML = `<p class="panel-label">NO SPECIFICATION DATA YET</p>`;
  }
}

function appendSpecSection(container, title, rows, linkRows = [], statusInfo = null) {
  const usableRows = rows.filter(([, value]) => value !== "" && value != null);
  const usableLinks = linkRows.filter(row => row && row.value);
  const hasStatus = statusInfo && statusInfo.key;

  if (!usableRows.length && !usableLinks.length && !hasStatus) return;

  const section = document.createElement("section");
  section.className = "spec-section";

  const titleEl = document.createElement("h3");
  titleEl.className = "spec-section-title";
  titleEl.textContent = title;
  section.appendChild(titleEl);

  if (hasStatus) {
    section.appendChild(makeBuildStatusBlock(statusInfo));
  }

  usableRows.forEach(([key, value]) => {
    section.appendChild(makeSpecRow(key, value));
  });

  usableLinks.forEach(row => {
    section.appendChild(makeSpecRow(row.label, row.value, row.href));
  });

  container.appendChild(section);
}


function makeBuildStatusBlock(statusInfo) {
  const block = document.createElement("div");
  block.className = `build-status-block status-${statusInfo.key}`;
  block.innerHTML = `
    <div class="build-status-header">
      <div class="build-status-circle">
        <span>${statusInfo.percent}%</span>
      </div>
      <div class="build-status-copy">
        <span class="build-status-kicker">BUILD STATUS</span>
        <strong>${escapeHtml(statusInfo.label)}</strong>
      </div>
    </div>
    <div class="build-status-bar" aria-hidden="true">
      <span class="build-status-fill" style="width:${statusInfo.percent}%"></span>
    </div>
  `;
  return block;
}

function makeSpecRow(key, value, href = "") {
  const row = document.createElement("div");
  row.className = "spec-row";

  const keySpan = document.createElement("span");
  keySpan.textContent = key;

  let valueNode;

  if (href) {
    valueNode = document.createElement("a");
    valueNode.href = href;
  } else {
    valueNode = document.createElement("span");
  }

  valueNode.textContent = value;
  row.append(keySpan, valueNode);

  return row;
}

function normalizeOrigins(item) {
  if (Array.isArray(item.design_origins)) {
    return item.design_origins.filter(origin => origin && origin.id);
  }

  return [];
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function showMissing() {
  document.getElementById("itemMissing").hidden = false;
  document.getElementById("itemTitle").textContent = "RECORD NOT FOUND";
  document.getElementById("itemName").textContent = "Missing archive record";
}
