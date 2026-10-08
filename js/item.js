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
    img.decoding = "async";

    img.addEventListener("load", () => {
      applyAutomaticImagePalette(imageBox, img);
    }, { once: true });

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


/* Automatic palette extraction from the Gundam image itself. */
function applyAutomaticImagePalette(imageBox, img) {
  try {
    const palette = extractImagePalette(img);
    if (!palette) return;

    const primary = palette.primary;
    const secondary = palette.secondary || palette.primary;
    const neutral = palette.neutral || [145, 155, 165];
    const primaryDark = darkenRgb(primary, 0.79);
    const secondaryDark = darkenRgb(secondary, 0.86);

    imageBox.style.setProperty("--hero-primary-rgb", primary.join(", "));
    imageBox.style.setProperty("--hero-secondary-rgb", secondary.join(", "));
    imageBox.style.setProperty("--hero-neutral-rgb", neutral.join(", "));
    imageBox.style.setProperty(
      "--hero-neutral-alpha",
      String(Math.max(0.025, Math.min(0.13, palette.neutralStrength || 0.04)))
    );
    imageBox.style.setProperty("--hero-primary-dark-rgb", primaryDark.join(", "));
    imageBox.style.setProperty("--hero-secondary-dark-rgb", secondaryDark.join(", "));
    imageBox.classList.add("bg-auto-palette");
  } catch (error) {
    console.debug("Automatic Gundam palette unavailable:", error);
  }
}

function extractImagePalette(img) {
  const canvas = document.createElement("canvas");
  const size = 112;
  canvas.width = size;
  canvas.height = size;

  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return null;

  context.clearRect(0, 0, size, size);
  context.drawImage(img, 0, 0, size, size);

  const pixels = context.getImageData(0, 0, size, size).data;

  const binCount = 12;
  const hueBins = Array.from({ length: binCount }, () => ({
    weight: 0, r: 0, g: 0, b: 0
  }));

  const neutrals = {
    light: { weight: 0, r: 0, g: 0, b: 0 },
    mid:   { weight: 0, r: 0, g: 0, b: 0 },
    dark:  { weight: 0, r: 0, g: 0, b: 0 }
  };

  let opaqueWeight = 0;
  let chromaticWeight = 0;

  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];
    const alpha = pixels[i + 3] / 255;

    if (alpha < 0.25) continue;

    opaqueWeight += alpha;
    const hsv = rgbToHsv(r, g, b);

    if (hsv.s < 0.16) {
      let bucket;
      if (hsv.v >= 0.72) bucket = neutrals.light;
      else if (hsv.v <= 0.28) bucket = neutrals.dark;
      else bucket = neutrals.mid;

      const neutralWeight =
        alpha * (hsv.v >= 0.72 || hsv.v <= 0.28 ? 0.58 : 0.34);

      bucket.weight += neutralWeight;
      bucket.r += r * neutralWeight;
      bucket.g += g * neutralWeight;
      bucket.b += b * neutralWeight;
      continue;
    }

    // Coverage-first: colour area matters far more than saturation.
    const saturationFactor = 0.82 + Math.min(hsv.s, 1) * 0.18;
    const brightnessFactor = 0.88 + Math.min(hsv.v, 1) * 0.12;
    const weight = alpha * saturationFactor * brightnessFactor;

    const binIndex = Math.floor(hsv.h * binCount) % binCount;
    const bin = hueBins[binIndex];

    bin.weight += weight;
    bin.r += r * weight;
    bin.g += g * weight;
    bin.b += b * weight;
    chromaticWeight += weight;
  }

  if (opaqueWeight < 2) return null;

  const neutralBuckets = Object.values(neutrals)
    .filter(bucket => bucket.weight > 0)
    .sort((a, b) => b.weight - a.weight);

  const totalNeutralWeight = neutralBuckets.reduce(
    (sum, bucket) => sum + bucket.weight, 0
  );

  const dominantNeutral = neutralBuckets[0]
    ? averageBinRgb(neutralBuckets[0])
    : [145, 155, 165];

  const neutralShare = Math.min(
    1,
    totalNeutralWeight / Math.max(opaqueWeight * 0.58, 0.0001)
  );

  // Smooth neighboring hue bins so one colour isn't split unfairly.
  const ranked = hueBins
    .map((bin, index) => {
      const prev = hueBins[(index - 1 + binCount) % binCount];
      const next = hueBins[(index + 1) % binCount];
      return {
        index,
        score: bin.weight + prev.weight * 0.42 + next.weight * 0.42
      };
    })
    .filter(entry => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  if (!ranked.length || chromaticWeight < 0.75) {
    const lightWeight = neutrals.light.weight;
    const darkWeight = neutrals.dark.weight;

    let primary;
    let secondary;

    if (lightWeight > darkWeight * 1.15) {
      primary = blendRgb(dominantNeutral, [185, 205, 218], 0.42);
      secondary = [92, 112, 126];
    } else if (darkWeight > lightWeight * 1.15) {
      primary = blendRgb(dominantNeutral, [72, 84, 98], 0.48);
      secondary = [105, 122, 136];
    } else {
      primary = blendRgb(dominantNeutral, [130, 146, 158], 0.38);
      secondary = [88, 105, 118];
    }

    return {
      primary, secondary,
      neutral: dominantNeutral,
      neutralStrength: 0.10
    };
  }

  const primaryIndex = ranked[0].index;
  let primary = averageHueClusterRgb(hueBins, primaryIndex);
  const primaryHue = binHueDegrees(primaryIndex, binCount);

  let secondary = null;
  for (const candidate of ranked.slice(1)) {
    const candidateHue = binHueDegrees(candidate.index, binCount);
    const hueDistance = circularHueDistance(primaryHue, candidateHue);

    if (hueDistance >= 55 && candidate.score >= ranked[0].score * 0.12) {
      secondary = averageHueClusterRgb(hueBins, candidate.index);
      break;
    }
  }

  const neutralMix = Math.min(0.18, neutralShare * 0.16);
  primary = blendRgb(primary, dominantNeutral, neutralMix);

  if (secondary) {
    secondary = blendRgb(secondary, dominantNeutral, neutralMix * 0.45);
  } else {
    secondary = blendRgb(
      primary,
      dominantNeutral,
      Math.min(0.22, neutralShare * 0.18)
    );
  }

  return {
    primary,
    secondary,
    neutral: dominantNeutral,
    neutralStrength: 0.02 + neutralShare * 0.065
  };
}

function averageHueClusterRgb(bins, centerIndex) {
  const count = bins.length;
  const indices = [
    (centerIndex - 1 + count) % count,
    centerIndex,
    (centerIndex + 1) % count
  ];

  let weight = 0, r = 0, g = 0, b = 0;

  indices.forEach((index, position) => {
    const bin = bins[index];
    const multiplier = position === 1 ? 1 : 0.42;
    const w = bin.weight * multiplier;

    weight += w;
    r += bin.r * multiplier;
    g += bin.g * multiplier;
    b += bin.b * multiplier;
  });

  if (weight <= 0.0001) return [120, 145, 165];

  return [
    Math.round(r / weight),
    Math.round(g / weight),
    Math.round(b / weight)
  ];
}

function averageBinRgb(bin) {
  const divisor = Math.max(bin.weight, 0.0001);
  return [
    Math.round(bin.r / divisor),
    Math.round(bin.g / divisor),
    Math.round(bin.b / divisor)
  ];
}

function binHueDegrees(index, totalBins) {
  return ((index + 0.5) / totalBins) * 360;
}

function circularHueDistance(a, b) {
  const raw = Math.abs(a - b) % 360;
  return Math.min(raw, 360 - raw);
}

function blendRgb(a, b, amount) {
  const t = Math.max(0, Math.min(1, amount));
  return a.map((channel, index) =>
    Math.round(channel * (1 - t) + b[index] * t)
  );
}

function darkenRgb(rgb, amount) {
  return rgb.map(channel =>
    Math.max(0, Math.min(255, Math.round(channel * (1 - amount))))
  );
}

function rgbToHsv(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  let h = 0;

  if (delta !== 0) {
    if (max === r) h = ((g - b) / delta) % 6;
    else if (max === g) h = (b - r) / delta + 2;
    else h = (r - g) / delta + 4;

    h /= 6;
    if (h < 0) h += 1;
  }

  const s = max === 0 ? 0 : delta / max;
  return { h, s, v: max };
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

function makeBuildStatusBlock(statusInfo) {
  const block = document.createElement("div");
  block.className = `build-status-block status-${statusInfo.key}`;
  const statusIcon = makeStatusIconMarkup(statusInfo.key);

  if (statusInfo.hideProgress) {
    block.innerHTML = `
      <div class="build-status-header build-status-header-no-progress">
        <div class="build-status-copy">
          <span class="build-status-kicker">BUILD STATUS</span>
          <strong>${escapeHtml(statusInfo.label)}</strong>
        </div>
        <div class="build-status-symbol-wrap">${statusIcon}</div>
      </div>
    `;
    return block;
  }

  block.innerHTML = `
    <div class="build-status-header">
      <div class="build-status-circle">
        <span>${statusInfo.percent}%</span>
      </div>
      <div class="build-status-copy">
        <span class="build-status-kicker">BUILD STATUS</span>
        <strong>${escapeHtml(statusInfo.label)}</strong>
      </div>
      <div class="build-status-symbol-wrap">${statusIcon}</div>
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
