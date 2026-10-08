const params = new URLSearchParams(window.location.search);
const type = params.get("type") || "gundam";

const themes = {
  gundam: {
    className: "theme-gundam",
    eyebrow: "COLLECTION ARCHIVE // GUNDAM",
    title: "MOBILE SUIT DATABASE",
    subtitle: "Browse the collection by timeline or by related mobile-suit family.",
    back: "archive.html"
  },
  digimon: {
    className: "theme-digimon",
    eyebrow: "COLLECTION ARCHIVE // DIGIMON",
    title: "DIGITAL WORLD ARCHIVE",
    subtitle: "A living digital ecosystem: nature, roots, network lines and data.",
    back: "archive.html"
  },
  mecha: {
    className: "theme-mecha",
    eyebrow: "EXTERNAL ARCHIVES // PROTOTYPE BRANCH",
    title: "MECHA PROTOTYPES",
    subtitle: "Third-party, aftermarket and independent mecha in an industrial test-lab archive.",
    back: "external.html"
  },
  fantasy: {
    className: "theme-fantasy",
    eyebrow: "EXTERNAL ARCHIVES // FANTASY BRANCH",
    title: "FANTASY ARCHIVE",
    subtitle: "Fate and fantasy plamo presented as relics, legends and scenic medieval records.",
    back: "external.html"
  }
};

const theme = themes[type] || themes.gundam;
document.body.classList.add(theme.className);
document.getElementById("categoryEyebrow").textContent = theme.eyebrow;
document.getElementById("categoryTitle").textContent = theme.title;
document.getElementById("categorySubtitle").textContent = theme.subtitle;
document.getElementById("backLink").href = theme.back;
document.title = `${theme.title} // Collection Archive`;

const grid = document.getElementById("itemsGrid");
const empty = document.getElementById("emptyState");
const count = document.getElementById("entryCount");
const gundamExplorer = document.getElementById("gundamExplorer");
const timelineView = document.getElementById("gundamTimelineView");
const familiesView = document.getElementById("gundamFamiliesView");
const sourceFilters = document.getElementById("sourceFilters");
const gradeFilters = document.getElementById("gradeFilters");

const SOURCE_LABELS = {
  all: "ALL",
  bandai: "BANDAI",
  "p-bandai": "P-BANDAI",
  base: "BASE EXCLUSIVE",
  "3rd-party": "3RD PARTY",
  custom: "CUSTOM"
};

const GRADE_LABELS = ["ALL", "HG", "RG", "MG", "PG"];

let allItems = [];
let activeSource = "all";
let activeGrade = "ALL";
let activeView = "timeline";

fetch(`data/${type}/index.json`, { cache: "no-store" })
  .then(response => {
    if (!response.ok) throw new Error(`Could not load ${type} index.`);
    return response.json();
  })
  .then(data => {
    allItems = data.items || [];
    count.textContent = allItems.length;

    if (!allItems.length) {
      empty.hidden = false;
      return;
    }

    if (type === "gundam") {
      grid.hidden = true;
      gundamExplorer.hidden = false;
      setupGundamArchive();
      renderGundam();
      return;
    }

    renderGenericItems(allItems);
  })
  .catch(() => {
    empty.hidden = false;
    empty.querySelector("h2").textContent = `Could not load data/${type}/index.json.`;
  });


function setupGundamArchive() {
  renderFilterButtons();

  document.querySelectorAll("[data-gundam-view]").forEach(button => {
    button.addEventListener("click", () => {
      activeView = button.dataset.gundamView;

      document.querySelectorAll("[data-gundam-view]").forEach(b => {
        b.classList.toggle("active", b === button);
      });

      timelineView.hidden = activeView !== "timeline";
      familiesView.hidden = activeView !== "families";
    });
  });
}

function renderFilterButtons() {
  Object.entries(SOURCE_LABELS).forEach(([value, label]) => {
    const button = document.createElement("button");
    button.className = "filter-button";
    button.type = "button";
    button.dataset.source = value;
    button.textContent = label;
    button.classList.toggle("active", value === activeSource);
    button.addEventListener("click", () => {
      activeSource = value;
      sourceFilters.querySelectorAll(".filter-button").forEach(b => {
        b.classList.toggle("active", b.dataset.source === value);
      });
      renderGundam();
    });
    sourceFilters.appendChild(button);
  });

  GRADE_LABELS.forEach(label => {
    const button = document.createElement("button");
    button.className = "filter-button";
    button.type = "button";
    button.dataset.grade = label;
    button.textContent = label;
    button.classList.toggle("active", label === activeGrade);
    button.addEventListener("click", () => {
      activeGrade = label;
      gradeFilters.querySelectorAll(".filter-button").forEach(b => {
        b.classList.toggle("active", b.dataset.grade === label);
      });
      renderGundam();
    });
    gradeFilters.appendChild(button);
  });
}

function filteredGundamItems() {
  return allItems.filter(item => {
    const sourceMatch =
      activeSource === "all" ||
      (activeSource === "custom" && item.custom) ||
      item.source === activeSource;

    const gradeMatch =
      activeGrade === "ALL" ||
      item.grade_family === activeGrade;

    return sourceMatch && gradeMatch;
  });
}

function renderGundam() {
  const items = filteredGundamItems();
  renderTimeline(items);
  renderFamilies(items);
}


function renderTimeline(items) {
  timelineView.innerHTML = "";

  // Known continuities/series get a preferred order, but anything new is
  // automatically appended. Missing values are always shown as UNSORTED / UNASSIGNED.
  const preferredContinuities = [
    "Cosmic Era",
    "Universal Century",
    "Post Disaster",
    "Build Series"
  ];

  const preferredSeries = {
    "Cosmic Era": ["SEED", "SEED Destiny", "Stargazer", "SEED Freedom"],
    "Universal Century": ["Mobile Suit Gundam", "Char's Counterattack", "Gundam Unicorn"],
    "Post Disaster": ["Iron-Blooded Orphans", "IBO Gekko"],
    "Build Series": ["Build Fighters", "Build Fighters Try", "Build Divers", "Re:RISE"],
    "UNSORTED / UNASSIGNED": ["UNSORTED / UNASSIGNED"]
  };

  const normalized = items.map(item => ({
    ...item,
    _continuity: cleanGroupValue(item.continuity),
    _series: cleanGroupValue(item.series)
  }));

  const continuityNames = uniqueValues(normalized.map(item => item._continuity));
  const orderedContinuities = sortWithPreference(
    continuityNames,
    preferredContinuities,
    "UNSORTED / UNASSIGNED"
  );

  orderedContinuities.forEach(continuity => {
    const continuityItems = normalized.filter(item => item._continuity === continuity);
    if (!continuityItems.length) return;

    const section = document.createElement("section");
    section.className = "continuity-block";

    const header = document.createElement("div");
    header.className = "continuity-header";
    header.innerHTML = `
      <span class="continuity-index">${String(orderedContinuities.indexOf(continuity) + 1).padStart(2, "0")}</span>
      <div>
        <span class="panel-label">TIMELINE / CONTINUITY</span>
        <h2>${escapeHtml(continuity.toUpperCase())}</h2>
      </div>
    `;
    section.appendChild(header);

    const rail = document.createElement("div");
    rail.className = "timeline-rail";

    const seriesNames = uniqueValues(continuityItems.map(item => item._series));
    const orderedSeries = sortWithPreference(
      seriesNames,
      preferredSeries[continuity] || [],
      "UNSORTED / UNASSIGNED"
    );

    orderedSeries.forEach(series => {
      const seriesItems = continuityItems.filter(item => item._series === series);
      if (!seriesItems.length) return;

      const node = document.createElement("article");
      node.className = "series-node";
      node.innerHTML = `
        <div class="series-marker"></div>
        <div class="series-heading">
          <span class="panel-label">SERIES</span>
          <h3>${escapeHtml(series)}</h3>
        </div>
        <div class="series-items"></div>
      `;

      const holder = node.querySelector(".series-items");
      seriesItems
        .slice()
        .sort(compareItemsByName)
        .forEach(item => holder.appendChild(makeGundamCard(item)));

      rail.appendChild(node);
    });

    section.appendChild(rail);
    timelineView.appendChild(section);
  });

  // Safety fallback: even malformed Gundam records should remain visible.
  if (!timelineView.children.length && items.length) {
    timelineView.appendChild(makeFallbackBucket(items, "UNSORTED / UNASSIGNED"));
  } else if (!timelineView.children.length) {
    timelineView.innerHTML = `<div class="gundam-no-results">NO GUNDAM RECORDS MATCH THE CURRENT FILTERS.</div>`;
  }
}

function renderFamilies(items) {
  familiesView.innerHTML = "";

  const preferredFamilies = [
    "Freedom Family",
    "Justice Family",
    "Strike Family",
    "Unicorn Family",
    "Barbatos Family",
    "Astaroth Family",
    "RX / Gundam Family",
    "Stargazer Family",
    "Build Derivatives"
  ];

  const normalized = items.map(item => ({
    ...item,
    _family: cleanGroupValue(item.family)
  }));

  const familyNames = uniqueValues(normalized.map(item => item._family));
  const orderedFamilies = sortWithPreference(
    familyNames,
    preferredFamilies,
    "UNSORTED / UNASSIGNED"
  );

  orderedFamilies.forEach(family => {
    const familyItems = normalized
      .filter(item => item._family === family)
      .sort((a, b) => {
        const ao = Number.isFinite(Number(a.family_order)) ? Number(a.family_order) : Number.MAX_SAFE_INTEGER;
        const bo = Number.isFinite(Number(b.family_order)) ? Number(b.family_order) : Number.MAX_SAFE_INTEGER;
        return ao - bo || compareItemsByName(a, b);
      });

    if (!familyItems.length) return;

    const section = document.createElement("section");
    section.className = "family-block";

    const heading = document.createElement("div");
    heading.className = "family-heading";
    heading.innerHTML = `
      <span class="panel-label">DESIGN LINEAGE</span>
      <h2>${escapeHtml(family.toUpperCase())}</h2>
      <span class="family-count">${familyItems.length} RECORD${familyItems.length === 1 ? "" : "S"}</span>
    `;
    section.appendChild(heading);

    const flow = document.createElement("div");
    flow.className = "family-flow";

    familyItems.forEach((item, index) => {
      const wrapper = document.createElement("div");
      wrapper.className = "family-step";

      wrapper.appendChild(makeGundamCard(item));

      if (index < familyItems.length - 1) {
        const connector = document.createElement("div");
        connector.className = "family-connector";
        connector.setAttribute("aria-hidden", "true");
        connector.innerHTML = `<span></span>`;
        wrapper.appendChild(connector);
      }

      flow.appendChild(wrapper);
    });

    // Show stored cross-design relationships when they are included in the index.
    const originLinks = familyItems.flatMap(item => {
      if (Array.isArray(item.design_origins)) {
        return item.design_origins.map(origin => {
          const source = origin.designation || origin.name || origin.id || "Unknown";
          return `${source} → ${item.name}`;
        });
      }

      // Legacy single-text field support.
      return item.design_origin ? [`${item.design_origin} → ${item.name}`] : [];
    });

    if (originLinks.length) {
      const origin = document.createElement("div");
      origin.className = "design-origin-note";
      origin.innerHTML = `
        <span class="panel-label">DESIGN ORIGIN LINK${originLinks.length > 1 ? "S" : ""}</span>
        ${originLinks.map(link => `<strong>${escapeHtml(link)}</strong>`).join("")}
      `;
      section.appendChild(origin);
    }

    section.appendChild(flow);
    familiesView.appendChild(section);
  });

  // Safety fallback: never hide records just because family metadata is missing.
  if (!familiesView.children.length && items.length) {
    const section = document.createElement("section");
    section.className = "family-block";
    section.innerHTML = `
      <div class="family-heading">
        <span class="panel-label">DESIGN LINEAGE</span>
        <h2>UNSORTED / UNASSIGNED</h2>
        <span class="family-count">${items.length} RECORD${items.length === 1 ? "" : "S"}</span>
      </div>
    `;
    const flow = document.createElement("div");
    flow.className = "family-flow";
    items.slice().sort(compareItemsByName).forEach(item => {
      const wrapper = document.createElement("div");
      wrapper.className = "family-step";
      wrapper.appendChild(makeGundamCard(item));
      flow.appendChild(wrapper);
    });
    section.appendChild(flow);
    familiesView.appendChild(section);
  } else if (!familiesView.children.length) {
    familiesView.innerHTML = `<div class="gundam-no-results">NO GUNDAM RECORDS MATCH THE CURRENT FILTERS.</div>`;
  }
}

function cleanGroupValue(value) {
  const text = String(value ?? "").trim();
  return text || "UNSORTED / UNASSIGNED";
}

function uniqueValues(values) {
  return [...new Set(values)];
}

function sortWithPreference(values, preferred, fallbackLabel) {
  const prefIndex = new Map(preferred.map((value, index) => [value, index]));

  return values.slice().sort((a, b) => {
    if (a === fallbackLabel && b !== fallbackLabel) return 1;
    if (b === fallbackLabel && a !== fallbackLabel) return -1;

    const ai = prefIndex.has(a) ? prefIndex.get(a) : Number.MAX_SAFE_INTEGER;
    const bi = prefIndex.has(b) ? prefIndex.get(b) : Number.MAX_SAFE_INTEGER;

    if (ai !== bi) return ai - bi;
    return a.localeCompare(b, undefined, { sensitivity: "base" });
  });
}

function compareItemsByName(a, b) {
  return String(a.name || a.id || "").localeCompare(
    String(b.name || b.id || ""),
    undefined,
    { sensitivity: "base" }
  );
}

function makeFallbackBucket(items, title) {
  const section = document.createElement("section");
  section.className = "continuity-block";

  section.innerHTML = `
    <div class="continuity-header">
      <span class="continuity-index">--</span>
      <div>
        <span class="panel-label">TIMELINE / CONTINUITY</span>
        <h2>${escapeHtml(title)}</h2>
      </div>
    </div>
  `;

  const rail = document.createElement("div");
  rail.className = "timeline-rail";

  const node = document.createElement("article");
  node.className = "series-node";
  node.innerHTML = `
    <div class="series-marker"></div>
    <div class="series-heading">
      <span class="panel-label">SERIES</span>
      <h3>UNSORTED / UNASSIGNED</h3>
    </div>
    <div class="series-items"></div>
  `;

  const holder = node.querySelector(".series-items");
  items.slice().sort(compareItemsByName).forEach(item => holder.appendChild(makeGundamCard(item)));

  rail.appendChild(node);
  section.appendChild(rail);
  return section;
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

function makeGundamCard(item) {
  const status = getBuildStatusInfo(item.build_status);
  const link = document.createElement("a");
  link.className = `gundam-record${status.key === "backlog" ? " is-backlog" : ""}`;
  link.href = `item.html?category=gundam&id=${encodeURIComponent(item.id)}`;

  const sourceLabel = SOURCE_LABELS[item.source] || String(item.source || "").toUpperCase();
  const custom = item.custom
    ? `<span class="kit-badge badge-custom"><i></i>CUSTOM</span>`
    : "";

  const thumbnail = item.image
    ? `<img class="gundam-record-image" src="${escapeHtml(item.image)}" alt="" loading="lazy">`
    : "";

  const statusMarkup = status.key
    ? `
      <div class="build-status-compact">
        <span class="status-chip status-${escapeClass(status.key)}">${escapeHtml(status.label)}</span>
        <span class="status-percent">${status.percent}%</span>
      </div>
      <div class="status-meter" aria-hidden="true">
        <span class="status-meter-fill status-${escapeClass(status.key)}" style="width:${status.percent}%"></span>
      </div>
    `
    : "";

  link.innerHTML = `
    <div class="gundam-record-visual ${item.image ? "has-image" : ""}">
      ${thumbnail}
      <span class="unit-ghost">${escapeHtml((item.designation || item.id).slice(0, 8))}</span>
      <span class="unit-crosshair" aria-hidden="true"></span>
    </div>

    <div class="gundam-record-topline">
      <span class="unit-designation">${escapeHtml(item.designation || item.id)}</span>
      <span class="kit-badge badge-${escapeClass(item.source)}"><i></i>${escapeHtml(sourceLabel)}</span>
    </div>

    <h4>${escapeHtml(item.name)}</h4>

    <div class="gundam-record-meta">
      <span>${escapeHtml(item.grade || "")}</span>
      <span>${escapeHtml(item.scale || "")}</span>
      ${custom}
    </div>

    ${statusMarkup}
  `;

  return link;
}

function renderGenericItems(items) {
  items.forEach(item => {
    const link = document.createElement("a");
    link.className = "item-card";
    link.href = `item.html?category=${encodeURIComponent(type)}&id=${encodeURIComponent(item.id)}`;
    link.innerHTML = `
      <span class="panel-label">${escapeHtml(item.designation || item.id)}</span>
      <h2>${escapeHtml(item.name)}</h2>
      <p>${escapeHtml(item.summary || "")}</p>
    `;
    grid.appendChild(link);
  });
}

function escapeClass(value) {
  return String(value || "unknown").replace(/[^a-z0-9]+/gi, "-").toLowerCase();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
