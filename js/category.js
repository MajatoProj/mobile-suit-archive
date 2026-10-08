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
const displayModeValue = document.getElementById("displayModeValue");
const activeFilterValue = document.getElementById("activeFilterValue");
const gundamExplorer = document.getElementById("gundamExplorer");
const timelineView = document.getElementById("gundamTimelineView");
const familiesView = document.getElementById("gundamFamiliesView");
const sourceFilters = document.getElementById("sourceFilters");
const gradeFilters = document.getElementById("gradeFilters");
const statusFilters = document.getElementById("statusFilters");
const sortControls = document.getElementById("sortControls");
const searchInput = document.getElementById("gundamSearch");
const statisticsButton = document.getElementById("statisticsButton");
const statisticsPanel = document.getElementById("statisticsPanel");

const SOURCE_LABELS = {
  all: "ALL",
  bandai: "BANDAI",
  "p-bandai": "P-BANDAI",
  base: "BASE EXCLUSIVE",
  "3rd-party": "3RD PARTY",
  custom: "CUSTOM"
};

const GRADE_LABELS = ["ALL", "HG", "RG", "MG", "PG"];

const STATUS_FILTERS = [
  { value: "all", label: "All" },
  { value: "unassigned", label: "Wanted" },
  { value: "backlog", label: "Backlog" },
  { value: "assembly", label: "Assembly" },
  { value: "detailing", label: "Detailing" },
  { value: "finishing", label: "Finishing" },
  { value: "completed", label: "Completed" },
  { value: "faulted", label: "Faulted" }
];

const SORT_OPTIONS = [
  { value: "timeline", label: "TIMELINE" },
  { value: "name", label: "NAME" },
  { value: "release-date", label: "RELEASE DATE" },
  { value: "build-date", label: "BUILD DATE" },
  { value: "status", label: "STATUS" }
];

const RELATIONSHIP_TYPE_LABELS = {
  "design-origin": "DESIGN ORIGIN",
  "successor": "SUCCESSOR",
  "variant": "VARIANT",
  "upgrade": "UPGRADE",
  "equipment-pack": "EQUIPMENT / PACK"
};

let allItems = [];
let activeSource = "all";
let activeGrade = "ALL";
let activeStatus = "all";
let activeSort = "timeline";
let activeView = "timeline";
let searchQuery = "";
let detailsHydrated = false;

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
      hydrateGundamDetails();
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
  updateDisplayMode();
  renderStatistics();

  document.querySelectorAll("[data-gundam-view]").forEach(button => {
    button.addEventListener("click", () => {
      activeView = button.dataset.gundamView;

      document.querySelectorAll("[data-gundam-view]").forEach(b => {
        b.classList.toggle("active", b === button);
      });

      timelineView.hidden = activeView !== "timeline";
      familiesView.hidden = activeView !== "families";
      updateDisplayMode();
    });
  });

  if (searchInput) {
    let searchTimer = null;
    searchInput.addEventListener("input", () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        searchQuery = String(searchInput.value || "").trim();
        renderGundam();
      }, 90);
    });
  }

  if (statisticsButton && statisticsPanel) {
    statisticsButton.addEventListener("click", () => {
      const nextOpen = statisticsPanel.hidden;
      statisticsPanel.hidden = !nextOpen;
      statisticsButton.classList.toggle("active", nextOpen);
      statisticsButton.setAttribute("aria-expanded", String(nextOpen));
    });
  }
}

function renderFilterButtons() {
  sourceFilters.innerHTML = "";
  gradeFilters.innerHTML = "";
  statusFilters.innerHTML = "";
  sortControls.innerHTML = "";

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

  STATUS_FILTERS.forEach(entry => {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.status = entry.value;
    button.className = `filter-button status-filter-button${entry.value === "all" ? " status-filter-all" : ""}`;
    button.classList.toggle("active", entry.value === activeStatus);
    button.title = entry.label;
    button.setAttribute("aria-label", entry.label);

    if (entry.value === "all") {
      button.textContent = "ALL";
    } else {
      button.innerHTML = makeStatusIconMarkup(entry.value);
    }

    button.addEventListener("click", () => {
      activeStatus = entry.value;
      statusFilters.querySelectorAll(".status-filter-button").forEach(b => {
        b.classList.toggle("active", b.dataset.status === entry.value);
      });
      renderGundam();
    });

    statusFilters.appendChild(button);
  });

  SORT_OPTIONS.forEach(entry => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "filter-button sort-button";
    button.dataset.sort = entry.value;
    button.textContent = entry.label;
    button.classList.toggle("active", entry.value === activeSort);
    button.addEventListener("click", () => {
      activeSort = entry.value;
      sortControls.querySelectorAll(".sort-button").forEach(b => {
        b.classList.toggle("active", b.dataset.sort === entry.value);
      });
      renderGundam();
    });
    sortControls.appendChild(button);
  });
}

function filteredGundamItems() {
  const terms = normalizeSearchText(searchQuery).split(/\s+/).filter(Boolean);

  return allItems.filter(item => {
    const sourceMatch =
      activeSource === "all" ||
      (activeSource === "custom" && item.custom) ||
      item.source === activeSource;

    const gradeMatch =
      activeGrade === "ALL" ||
      item.grade_family === activeGrade ||
      item.grade === activeGrade;

    const status = getBuildStatusInfo(item.build_status ?? item.buildStatus ?? item.status);
    const statusMatch = activeStatus === "all" || status.key === activeStatus;

    const searchable = buildSearchText(item);
    const searchMatch = !terms.length || terms.every(term => searchable.includes(term));

    return sourceMatch && gradeMatch && statusMatch && searchMatch;
  });
}

function renderGundam() {
  const items = filteredGundamItems();
  updateArchiveSummary(items);
  renderStatistics();
  renderTimeline(items);
  renderFamilies(items);
}

function updateDisplayMode() {
  if (!displayModeValue) return;
  displayModeValue.textContent = activeView === "families" ? "FAMILIES" : "TIMELINE";
}

function updateArchiveSummary(items) {
  const total = allItems.length;
  const visible = items.length;
  const hasFilters =
    activeSource !== "all" ||
    activeGrade !== "ALL" ||
    activeStatus !== "all" ||
    Boolean(searchQuery.trim());

  count.textContent = hasFilters ? `${visible} / ${total}` : String(total);

  if (activeFilterValue) {
    const labels = [];
    if (activeSource !== "all") labels.push(SOURCE_LABELS[activeSource] || activeSource.toUpperCase());
    if (activeGrade !== "ALL") labels.push(activeGrade);
    if (activeStatus !== "all") {
      const status = STATUS_FILTERS.find(entry => entry.value === activeStatus);
      labels.push((status && status.label ? status.label : activeStatus).toUpperCase());
    }
    if (searchQuery.trim()) labels.push(`“${searchQuery.trim()}”`);

    activeFilterValue.textContent = labels.length ? labels.join(" / ") : "ALL";
    activeFilterValue.title = labels.length ? labels.join(" / ") : "No filters active";
  }
}

function renderStatistics() {
  if (!statisticsPanel || type !== "gundam") return;

  const counts = {
    owned: 0,
    completed: 0,
    inBuild: 0,
    backlog: 0,
    wanted: 0,
    faulted: 0
  };

  allItems.forEach(item => {
    const status = getBuildStatusInfo(item.build_status ?? item.buildStatus ?? item.status).key;

    if (status === "unassigned") counts.wanted += 1;
    else counts.owned += 1;

    if (status === "completed") counts.completed += 1;
    if (["assembly", "detailing", "finishing"].includes(status)) counts.inBuild += 1;
    if (status === "backlog") counts.backlog += 1;
    if (status === "faulted") counts.faulted += 1;
  });

  const rows = [
    ["OWNED", counts.owned],
    ["COMPLETED", counts.completed],
    ["IN BUILD", counts.inBuild],
    ["BACKLOG", counts.backlog],
    ["WANTED", counts.wanted],
    ["FAULTED", counts.faulted]
  ];

  statisticsPanel.innerHTML = `
    <div class="statistics-head">
      <span class="panel-label">COLLECTION STATUS</span>
      <span class="statistics-total">${allItems.length} TOTAL RECORDS</span>
    </div>
    <div class="statistics-grid">
      ${rows.map(([label, value]) => `
        <div class="statistics-cell">
          <span>${escapeHtml(label)}</span>
          <strong>${value}</strong>
        </div>
      `).join("")}
    </div>
  `;
}

async function hydrateGundamDetails() {
  if (type !== "gundam" || !allItems.length || detailsHydrated) return;

  const hydrated = await Promise.all(allItems.map(async meta => {
    if (!meta.file) return meta;

    try {
      const response = await fetch(`data/gundam/${meta.file}`, { cache: "no-store" });
      if (!response.ok) return meta;
      const record = await response.json();
      return { ...meta, ...record, file: meta.file };
    } catch {
      return meta;
    }
  }));

  allItems = hydrated;
  detailsHydrated = true;
  renderGundam();
}

function normalizeSearchText(value) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function buildSearchText(item) {
  const suit = item.mobile_suit_data || {};
  const specs = item.specs || {};
  const relationships = Array.isArray(item.relationships) ? item.relationships : [];
  const origins = Array.isArray(item.design_origins) ? item.design_origins : [];

  const values = [
    item.id,
    item.designation,
    item.name,
    item.summary,
    item.description,
    item.continuity,
    item.series,
    item.timeline_label,
    item.timeline_parent,
    item.family,
    item.source,
    item.grade,
    item.grade_family,
    item.scale,
    item.build_status,
    suit.pilot,
    suit.height,
    suit.weight,
    ...(Array.isArray(suit.armament) ? suit.armament : []),
    ...(Array.isArray(suit.features) ? suit.features : []),
    ...Object.values(specs),
    ...origins.flatMap(origin => [origin && origin.id, origin && origin.designation, origin && origin.name]),
    ...relationships.flatMap(rel => [rel && rel.type, rel && rel.id, rel && rel.designation, rel && rel.name])
  ];

  return normalizeSearchText(values.filter(Boolean).join(" "));
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
    "Build Series": [
      "Gundam Build Fighters",
      "Gundam Build Fighters: GM's Counterattack",
      "Gundam Build Fighters Try",
      "Gundam Build Fighters Honoo Try",
      "Gundam Build Fighters Try: Island Wars",
      "Gundam Build Divers",
      "Gundam Build Divers Re:RISE"
    ],
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
        .sort((a, b) => compareArchiveItems(a, b, "timeline"))
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

    const allFamilyItems = allItems.filter(item => cleanGroupValue(item.family) === family);
    const ownedFamilyItems = allFamilyItems.filter(isOwnedRecord);
    const familyPercent = allFamilyItems.length
      ? Math.round((ownedFamilyItems.length / allFamilyItems.length) * 100)
      : 0;

    const heading = document.createElement("div");
    heading.className = "family-heading";
    heading.innerHTML = `
      <span class="panel-label">DESIGN LINEAGE</span>
      <h2>${escapeHtml(family.toUpperCase())}</h2>
      <div class="family-heading-meta">
        <span class="family-count">${familyItems.length} RECORD${familyItems.length === 1 ? "" : "S"}</span>
        <span class="family-completion-label">COLLECTION ${ownedFamilyItems.length} / ${allFamilyItems.length}</span>
      </div>
      <div class="family-completion-meter" title="Owned records in this family: ${ownedFamilyItems.length} of ${allFamilyItems.length}">
        <span style="width:${familyPercent}%"></span>
      </div>
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

      stage.items
        .slice()
        .sort((a, b) => compareArchiveItems(a, b, "family-branch"))
        .forEach(item => {
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

    // Relationship links: legacy Design Origins plus typed relationships.
    const relationshipLinks = collectRelationshipLinks(familyItems);

    if (relationshipLinks.length) {
      const relationshipPanel = document.createElement("div");
      relationshipPanel.className = "relationship-note";

      const grouped = [];
      relationshipLinks.forEach(link => {
        const sourceKey = link.sourceId || `name:${link.sourceName}`;
        const groupKey = `${link.type}|${sourceKey}|${link.arrow}`;
        let group = grouped.find(entry => entry.groupKey === groupKey);

        if (!group) {
          group = {
            groupKey,
            type: link.type,
            arrow: link.arrow,
            sourceId: link.sourceId,
            sourceName: link.sourceName,
            targets: []
          };
          grouped.push(group);
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

      const rows = grouped.map(group => {
        const source = group.sourceId
          ? `<a class="relationship-source" href="item.html?category=gundam&id=${encodeURIComponent(group.sourceId)}">${escapeHtml(group.sourceName)}</a>`
          : `<span class="relationship-source">${escapeHtml(group.sourceName)}</span>`;

        const targets = group.targets.map(target => {
          const targetMarkup = target.targetId
            ? `<a class="relationship-target" href="item.html?category=gundam&id=${encodeURIComponent(target.targetId)}">${escapeHtml(target.targetName)}</a>`
            : `<span class="relationship-target">${escapeHtml(target.targetName)}</span>`;

          return `
            <div class="relationship-target-row">
              <span class="relationship-arrow" aria-hidden="true">${escapeHtml(group.arrow)}</span>
              ${targetMarkup}
            </div>
          `;
        }).join("");

        return `
          <div class="relationship-row${group.targets.length > 1 ? " is-branch" : ""}">
            <span class="relationship-type-chip type-${escapeClass(group.type)}">${escapeHtml(RELATIONSHIP_TYPE_LABELS[group.type] || group.type.toUpperCase())}</span>
            ${source}
            <div class="relationship-targets">${targets}</div>
          </div>
        `;
      }).join("");

      relationshipPanel.innerHTML = `
        <span class="panel-label">RELATIONSHIP LINKS</span>
        <div class="relationship-list">${rows}</div>
      `;
      section.appendChild(relationshipPanel);
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


function compareTimelineItems(a, b) {
  const ao = Number.isFinite(Number(a.timeline_order))
    ? Number(a.timeline_order)
    : Number.MAX_SAFE_INTEGER;
  const bo = Number.isFinite(Number(b.timeline_order))
    ? Number(b.timeline_order)
    : Number.MAX_SAFE_INTEGER;

  return ao - bo || compareItemsByName(a, b);
}

function compareArchiveItems(a, b, context = "timeline") {
  if (activeSort === "name") return compareItemsByName(a, b);

  if (activeSort === "release-date") {
    return compareDateFields(a, b, "Release date") || compareItemsByName(a, b);
  }

  if (activeSort === "build-date") {
    return compareDateFields(a, b, "Build date") || compareItemsByName(a, b);
  }

  if (activeSort === "status") {
    const rank = {
      unassigned: 0,
      backlog: 1,
      assembly: 2,
      detailing: 3,
      finishing: 4,
      completed: 5,
      faulted: 6
    };
    const as = getBuildStatusInfo(a.build_status ?? a.buildStatus ?? a.status).key;
    const bs = getBuildStatusInfo(b.build_status ?? b.buildStatus ?? b.status).key;
    return (rank[as] ?? 99) - (rank[bs] ?? 99) || compareItemsByName(a, b);
  }

  if (context === "family-branch") {
    return compareItemsByName(a, b);
  }

  return compareTimelineItems(a, b);
}

function compareDateFields(a, b, label) {
  const av = getRecordDate(a, label);
  const bv = getRecordDate(b, label);

  if (!av && !bv) return 0;
  if (!av) return 1;
  if (!bv) return -1;
  return av.localeCompare(bv);
}

function getRecordDate(item, label) {
  const specs = item.specs || {};
  if (label === "Release date") return String(specs["Release date"] || item.release_date || "").trim();
  if (label === "Build date") return String(specs["Build date"] || item.build_date || "").trim();
  return "";
}

function isOwnedRecord(item) {
  return getBuildStatusInfo(item.build_status ?? item.buildStatus ?? item.status).key !== "unassigned";
}

function collectRelationshipLinks(items) {
  const links = [];
  const seen = new Set();

  const add = link => {
    const sourceKey = link.sourceId || link.sourceName;
    const targetKey = link.targetId || link.targetName;
    let dedupeKey;

    if (["variant", "equipment-pack"].includes(link.type)) {
      dedupeKey = `${link.type}|${[sourceKey, targetKey].sort().join("|")}`;
    } else {
      dedupeKey = `${link.type}|${sourceKey}|${targetKey}`;
    }

    if (seen.has(dedupeKey)) return;
    seen.add(dedupeKey);
    links.push(link);
  };

  items.forEach(item => {
    if (Array.isArray(item.design_origins)) {
      item.design_origins.forEach(origin => {
        if (!origin) return;
        add({
          type: "design-origin",
          arrow: "→",
          sourceId: origin.id || "",
          sourceName: origin.name || origin.designation || origin.id || "Unknown",
          targetId: item.id || "",
          targetName: item.name || item.designation || item.id || "Unknown"
        });
      });
    } else if (item.design_origin) {
      add({
        type: "design-origin",
        arrow: "→",
        sourceId: "",
        sourceName: item.design_origin,
        targetId: item.id || "",
        targetName: item.name || item.designation || item.id || "Unknown"
      });
    }

    if (Array.isArray(item.relationships)) {
      item.relationships.forEach(rel => {
        if (!rel || !rel.type) return;
        const type = String(rel.type).trim().toLowerCase();
        if (!RELATIONSHIP_TYPE_LABELS[type] || type === "design-origin") return;

        const relatedId = rel.id || "";
        const relatedName = rel.name || rel.designation || rel.id || "Unknown";
        const currentId = item.id || "";
        const currentName = item.name || item.designation || item.id || "Unknown";

        if (type === "variant" || type === "equipment-pack") {
          add({
            type,
            arrow: "↔",
            sourceId: currentId,
            sourceName: currentName,
            targetId: relatedId,
            targetName: relatedName
          });
        } else {
          add({
            type,
            arrow: "→",
            sourceId: currentId,
            sourceName: currentName,
            targetId: relatedId,
            targetName: relatedName
          });
        }
      });
    }
  });

  return links;
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
  items.slice().sort((a, b) => compareArchiveItems(a, b, "timeline")).forEach(item => holder.appendChild(makeGundamCard(item)));

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

  const aliases = {
    complete: "completed",
    done: "completed",
    finished: "completed",
    backlog: "backlog",
    assembly: "assembly",
    assembling: "assembly",
    build: "assembly",
    detailing: "detailing",
    detail: "detailing",
    finishing: "finishing",
    finish: "finishing",
    faulted: "faulted",
    stored: "faulted",
    retired: "faulted"
  };

  const raw = String(value || "").trim().toLowerCase();
  if (!raw) {
    return { key: "unassigned", label: "Wanted", percent: 0, hideProgress: false };
  }

  const key = aliases[raw] || raw;
  return map[key]
    ? { key, ...map[key] }
    : { key: "unassigned", label: "Wanted", percent: 0, hideProgress: false };
}

function getBuildStatusVisual(statusKey) {
  const key = String(statusKey || "").trim().toLowerCase();

  const map = {
    unassigned: { icon: "search", title: "Wanted / looking for" },
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
    search: `
      <svg class="status-svg status-svg-search" viewBox="0 0 24 24" aria-hidden="true">
        <circle class="icon-glass" cx="10.2" cy="10.2" r="5.5"></circle>
        <path class="icon-metal" d="m14.3 14.3 5.1 5.1"></path>
      </svg>
    `,
    clock: `
      <svg class="status-svg status-svg-clock" viewBox="0 0 24 24" aria-hidden="true">
        <circle class="icon-clock-case" cx="12" cy="12" r="8.5"></circle>
        <circle class="icon-clock-face" cx="12" cy="12" r="6.7"></circle>
        <path class="icon-clock-hands" d="M12 7.7v4.7l3 1.9"></path>
      </svg>
    `,
    brush: `
      <svg class="status-svg status-svg-brush" viewBox="0 0 24 24" aria-hidden="true">
        <path class="icon-brush-handle" d="M14.9 4.6 19.4 9.1"></path>
        <path class="icon-brush-ferrule" d="m11.8 8 4.2 4.2"></path>
        <path class="icon-brush-bristles" d="M12.1 11.7c-1.1 1.1-1.8 2.5-2.1 4-.4 1.8-1.5 3-3.1 3.5-1.3.4-2.7.1-3.8-.7 1.4-.3 2.5-1 3.3-1.9 1-1 1.6-2.3 1.9-3.8l3.8-1.1Z"></path>
        <path class="icon-brush-paint" d="M4.2 18.4c1.4-.2 2.5-.8 3.4-1.7"></path>
      </svg>
    `,
    nipper: `
      <svg class="status-svg status-svg-nipper" viewBox="0 0 24 24" aria-hidden="true">
        <path class="icon-nipper-metal" d="M10.4 10.3 6.1 5.9"></path>
        <path class="icon-nipper-metal" d="M13.6 10.3 17.9 5.9"></path>
        <circle class="icon-nipper-pivot" cx="12" cy="11.2" r="1.4"></circle>
        <path class="icon-nipper-handle-red" d="M10.8 11.2 7.2 18"></path>
        <path class="icon-nipper-handle-blue" d="M13.2 11.2 16.8 18"></path>
      </svg>
    `,
    spark: `
      <svg class="status-svg status-svg-spark" viewBox="0 0 24 24" aria-hidden="true">
        <path class="icon-spark-main" d="M12 3.8 13.9 9l5.3 1.9-5.3 1.9-1.9 5.4-1.9-5.4-5.3-1.9L10.1 9 12 3.8Z"></path>
        <circle class="icon-spark-dot" cx="18.4" cy="5.6" r="1.1"></circle>
      </svg>
    `,
    crown: `
      <svg class="status-svg status-svg-crown" viewBox="0 0 24 24" aria-hidden="true">
        <path class="icon-crown-body" d="M5 17.5 3.8 8.3l4.3 3.2L12 6.4l3.9 5.1 4.3-3.2-1.2 9.2Z"></path>
        <path class="icon-crown-base" d="M5.2 17.5h13.6"></path>
      </svg>
    `,
    vault: `
      <svg class="status-svg status-svg-vault" viewBox="0 0 24 24" aria-hidden="true">
        <rect class="icon-vault-door" x="4.2" y="4.2" width="15.6" height="15.6" rx="1.6"></rect>
        <circle class="icon-vault-wheel" cx="12" cy="12" r="3.4"></circle>
        <path class="icon-vault-wheel" d="M12 8.6v6.8"></path>
        <path class="icon-vault-wheel" d="M8.6 12h6.8"></path>
      </svg>
    `
  };

  return icons[name] || icons.search;
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
  const status = getBuildStatusInfo(item.build_status ?? item.buildStatus ?? item.status);
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

  const compactPercent = status.hideProgress
    ? ""
    : `<span class="status-percent">${status.percent}%</span>`;

  const compactMeter = status.hideProgress
    ? ""
    : `
      <div class="status-meter" aria-hidden="true">
        <span class="status-meter-fill status-${escapeClass(status.key)}" style="width:${status.percent}%"></span>
      </div>
    `;

  const statusMarkup = `
    <div class="build-status-compact" data-build-status="${escapeHtml(status.key)}">
      <span class="status-chip status-${escapeClass(status.key)}">${escapeHtml(status.label)}</span>
      ${compactPercent}
    </div>
    ${compactMeter}
  `;

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
