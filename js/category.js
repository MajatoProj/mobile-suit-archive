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

    const groupedStages = [];
    familyItems.forEach(item => {
      const rawOrder = Number(item.family_order);
      const orderKey = Number.isFinite(rawOrder) ? rawOrder : "UNASSIGNED";
      const existing = groupedStages.find(stage => stage.orderKey === orderKey);
      if (existing) {
        existing.items.push(item);
      } else {
        groupedStages.push({ orderKey, items: [item] });
      }
    });

    groupedStages.forEach((stage, stageIndex) => {
      const stageEl = document.createElement("div");
      stageEl.className = `family-stage${stage.items.length > 1 ? " is-branch" : ""}`;

      const stack = document.createElement("div");
      stack.className = "family-stage-stack";

      stage.items.forEach(item => {
        const row = document.createElement("div");
        row.className = "family-branch-row";
        row.appendChild(makeGundamCard(item));
        stack.appendChild(row);
      });

      stageEl.appendChild(stack);

      if (stageIndex < groupedStages.length - 1) {
        const connector = document.createElement("div");
        connector.className = "family-connector";
        connector.setAttribute("aria-hidden", "true");
        connector.innerHTML = `<span></span>`;
        stageEl.appendChild(connector);
      }

      flow.appendChild(stageEl);
    });

    // Show stored cross-design relationships as clean, separate rows.
    const originLinks = familyItems.flatMap(item => {
      if (Array.isArray(item.design_origins)) {
        return item.design_origins.map(origin => ({
          sourceId: origin.id || "",
          sourceName: origin.name || origin.designation || origin.id || "Unknown",
          targetId: item.id || "",
          targetName: item.name || item.designation || item.id || "Unknown"
        }));
      }

      // Legacy single-text field support.
      return item.design_origin
        ? [{
            sourceId: "",
            sourceName: item.design_origin,
            targetId: item.id || "",
            targetName: item.name || item.designation || item.id || "Unknown"
          }]
        : [];
    });

    if (originLinks.length) {
      const origin = document.createElement("div");
      origin.className = "design-origin-note";

      // Merge relationships that share the same origin into one branch row.
      // Example:
      // Strike Freedom Gundam → Mighty Strike Freedom Gundam
      //                       → Rising Freedom Gundam
      const groupedOrigins = [];

      originLinks.forEach(link => {
        const sourceKey = link.sourceId || `name:${link.sourceName}`;
        let group = groupedOrigins.find(entry => entry.sourceKey === sourceKey);

        if (!group) {
          group = {
            sourceKey,
            sourceId: link.sourceId,
            sourceName: link.sourceName,
            targets: []
          };
          groupedOrigins.push(group);
        }

        const targetKey = link.targetId || `name:${link.targetName}`;
        if (!group.targets.some(target => target.targetKey === targetKey)) {
          group.targets.push({
            targetKey,
            targetId: link.targetId,
            targetName: link.targetName
          });
        }
      });

      const rows = groupedOrigins.map(group => {
        const source = group.sourceId
          ? `<a class="design-origin-source" href="item.html?category=gundam&id=${encodeURIComponent(group.sourceId)}">${escapeHtml(group.sourceName)}</a>`
          : `<span class="design-origin-source">${escapeHtml(group.sourceName)}</span>`;

        const targets = group.targets.map(target => {
          const targetMarkup = target.targetId
            ? `<a class="design-origin-target" href="item.html?category=gundam&id=${encodeURIComponent(target.targetId)}">${escapeHtml(target.targetName)}</a>`
            : `<span class="design-origin-target">${escapeHtml(target.targetName)}</span>`;

          return `
            <div class="design-origin-target-row">
              <span class="design-origin-arrow" aria-hidden="true">→</span>
              ${targetMarkup}
            </div>
          `;
        }).join("");

        return `
          <div class="design-origin-row${group.targets.length > 1 ? " is-branch" : ""}">
            ${source}
            <div class="design-origin-targets">${targets}</div>
          </div>
        `;
      }).join("");

      origin.innerHTML = `
        <span class="panel-label">DESIGN ORIGIN LINK${originLinks.length > 1 ? "S" : ""}</span>
        <div class="design-origin-list">${rows}</div>
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
    backlog: { label: "Backlog", percent: 10, hideProgress: false },
    assembly: { label: "Assembly", percent: 35, hideProgress: false },
    detailing: { label: "Detailing", percent: 65, hideProgress: false },
    finishing: { label: "Finishing", percent: 85, hideProgress: false },
    completed: { label: "Completed", percent: 100, hideProgress: false },
    faulted: { label: "Faulted", percent: null, hideProgress: true }
  };

  const key = String(value || "").trim().toLowerCase();

  if (!key) {
    return { key: "unassigned", label: "Wanted", percent: 0, hideProgress: false };
  }

  return map[key] || { key: "unassigned", label: "Wanted", percent: 0, hideProgress: false };
}


function getBuildStatusVisual(statusKey) {
  const key = String(statusKey || "").trim().toLowerCase();

  const map = {
    unassigned: { icon: "clock", title: "Wanted" },
    backlog: { icon: "clock", title: "Backlog" },
    assembly: { icon: "nipper", title: "Assembly" },
    detailing: { icon: "brush", title: "Detailing" },
    finishing: { icon: "spark", title: "Finishing" },
    completed: { icon: "crown", title: "Completed" },
    faulted: { icon: "vault", title: "Faulted / stored away" }
  };

  return map[key] || map.unassigned;
}

function getStatusIconSvg(name) {
  const icons = {
    clock: `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="8.5"></circle>
        <path d="M12 7.7v4.7l3 1.9"></path>
      </svg>
    `,
    brush: `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M14.8 4.8l4.4 4.4"></path>
        <path d="M8.4 17.9c1.1-1.1 2.5-1.8 4-2.1l6.8-6.8a1.9 1.9 0 0 0 0-2.7l-1.5-1.5a1.9 1.9 0 0 0-2.7 0l-6.8 6.8c-.3 1.5-1 2.9-2.1 4-.9.9-2.1 1.5-3.4 1.6 0 0 .6 1.9 2 2.4 1.8.6 2.9-.7 3.7-1.7Z"></path>
      </svg>
    `,
    nipper: `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M10.3 10.2 6.1 5.9"></path>
        <path d="M13.7 10.2 17.9 5.9"></path>
        <path d="M10.8 10.7 7.2 18"></path>
        <path d="M13.2 10.7 16.8 18"></path>
        <circle cx="12" cy="11.2" r="1.4"></circle>
      </svg>
    `,
    spark: `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 3.8 13.9 9l5.3 1.9-5.3 1.9-1.9 5.4-1.9-5.4-5.3-1.9L10.1 9 12 3.8Z"></path>
      </svg>
    `,
    crown: `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5 17.5 3.8 8.3l4.3 3.2L12 6.4l3.9 5.1 4.3-3.2-1.2 9.2Z"></path>
        <path d="M5.2 17.5h13.6"></path>
      </svg>
    `,
    vault: `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="4.2" y="4.2" width="15.6" height="15.6" rx="1.6"></rect>
        <circle cx="12" cy="12" r="3.4"></circle>
        <path d="M12 8.6v6.8"></path>
        <path d="M8.6 12h6.8"></path>
      </svg>
    `
  };

  return icons[name] || icons.clock;
}

function makeStatusIconMarkup(statusKey) {
  const visual = getBuildStatusVisual(statusKey);
  return `
    <span
      class="mini-state-icon icon-${statusKey}"
      title="${escapeHtml(visual.title)}"
      aria-label="${escapeHtml(visual.title)}"
    >
      ${getStatusIconSvg(visual.icon)}
    </span>
  `;
}

function makeGundamCard(item) {
  const status = getBuildStatusInfo(item.build_status);
  const link = document.createElement("a");
  const visualStatus =
    status.key === "faulted"
      ? " is-faulted"
      : (status.key === "backlog" || status.key === "unassigned" ? " is-backlog" : "");
  link.className = `gundam-record${visualStatus}`;
  link.href = `item.html?category=gundam&id=${encodeURIComponent(item.id)}`;

  const sourceLabel = SOURCE_LABELS[item.source] || String(item.source || "").toUpperCase();
  const custom = item.custom
    ? `<span class="kit-badge badge-custom"><i></i>CUSTOM</span>`
    : "";

  const thumbnail = item.image
    ? `<img class="gundam-record-image" src="${escapeHtml(item.image)}" alt="" loading="lazy">`
    : "";

  const cardTitle = item.name || item.designation || item.id;
  const topStatusIcon = makeStatusIconMarkup(status.key);

  const statusMarkup = status.key
    ? `
      <div class="build-status-compact">
        <span class="status-chip status-${escapeClass(status.key)}">${escapeHtml(status.label)}</span>
        ${status.hideProgress ? "" : `<span class="status-percent">${status.percent}%</span>`}
      </div>
      ${status.hideProgress ? "" : `
        <div class="status-meter" aria-hidden="true">
          <span class="status-meter-fill status-${escapeClass(status.key)}" style="width:${status.percent}%"></span>
        </div>
      `}
    `
    : "";

  link.innerHTML = `
    <div class="gundam-record-visual ${item.image ? "has-image" : ""}">
      ${thumbnail}
      <span class="unit-ghost">${escapeHtml((item.designation || item.id).slice(0, 8))}</span>
      <span class="unit-crosshair" aria-hidden="true"></span>
    </div>

    <div class="gundam-record-topline">
      <span class="kit-badge badge-${escapeClass(item.source)}"><i></i>${escapeHtml(sourceLabel)}</span>
      <span class="gundam-record-topicons">${topStatusIcon}</span>
    </div>

    <h4>${escapeHtml(cardTitle)}</h4>

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
