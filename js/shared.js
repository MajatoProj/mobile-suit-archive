requestAnimationFrame(() => {
  document.body.classList.add("page-ready");
});

// Back/forward restores the page as it was when we left it: faded out. Undo that.
window.addEventListener("pageshow", event => {
  if (event.persisted) document.body.classList.remove("page-leaving");
});

window.archiveNavigate = function(url) {
  if (!url) return;
  document.body.classList.add("page-leaving");
  setTimeout(() => {
    window.location.href = url;
  }, 360);
};

/* Persistent compact category rotator */
const rotator = document.querySelector("[data-category-rotator]");
const rotatorCards = rotator ? [...rotator.querySelectorAll("[data-rotator-card]")] : [];
let rotatorIndex = 0;

function wrapRotator(index) {
  return (index + rotatorCards.length) % rotatorCards.length;
}

function currentCategory() {
  if (document.body.classList.contains("theme-gundam")) return "gundam";
  if (document.body.classList.contains("theme-digimon")) return "digimon";
  if (document.body.classList.contains("external-page")) return "external";

  const params = new URLSearchParams(window.location.search);
  const category = params.get("category") || params.get("type");
  if (category === "gundam" || category === "digimon") return category;
  if (category === "mecha" || category === "fantasy") return "external";

  return "gundam";
}

function updateRotator() {
  if (!rotatorCards.length) return;

  rotatorCards.forEach(card => {
    card.classList.remove("rotator-front", "rotator-left", "rotator-right");
  });

  rotatorCards[rotatorIndex].classList.add("rotator-front");
  rotatorCards[wrapRotator(rotatorIndex - 1)].classList.add("rotator-left");
  rotatorCards[wrapRotator(rotatorIndex + 1)].classList.add("rotator-right");
}

if (rotatorCards.length) {
  const active = currentCategory();
  const found = rotatorCards.findIndex(card => card.dataset.category === active);
  rotatorIndex = found >= 0 ? found : 0;
  updateRotator();

  rotatorCards.forEach((card, index) => {
    card.addEventListener("click", () => {
      // On phones all three are plain buttons, so skip the rotate-first step.
      if (index !== rotatorIndex && !window.matchMedia("(max-width: 760px)").matches) {
        rotatorIndex = index;
        updateRotator();
        return;
      }

      window.archiveNavigate(card.dataset.href);
    });
  });

  rotator.addEventListener("keydown", event => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      rotatorIndex = wrapRotator(rotatorIndex - 1);
      updateRotator();
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      rotatorIndex = wrapRotator(rotatorIndex + 1);
      updateRotator();
    }
  });
}

/* Smooth internal page transitions */
document.addEventListener("click", event => {
  const link = event.target.closest("a[href]");
  if (!link) return;
  if (event.defaultPrevented) return;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  if (link.target && link.target !== "_self") return;
  if (link.hasAttribute("download")) return;

  const href = link.getAttribute("href");
  if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;

  const url = new URL(link.href, window.location.href);
  if (url.origin !== window.location.origin) return;

  event.preventDefault();
  window.archiveNavigate(url.href);
});

/* One fetch per JSON file per page: category.js and couple-projects.js both
   need the same index and records. "no-cache" revalidates (cheap 304) instead
   of re-downloading, so edits still show up immediately. */
const archiveJsonCache = new Map();
window.fetchArchiveJson = function(url) {
  if (!archiveJsonCache.has(url)) {
    archiveJsonCache.set(url, fetch(url, { cache: "no-cache" }).then(response => {
      if (!response.ok) throw new Error(`${response.status} ${url}`);
      return response.json();
    }).catch(error => {
      archiveJsonCache.delete(url);
      throw error;
    }));
  }
  // Each caller gets its own copy, so one script can't change another's data.
  return archiveJsonCache.get(url).then(data => structuredClone(data));
};

/* Cards show a small WebP made by tools/card_thumbs.py; the full PNG is for the item page. */
window.cardThumb = function(path) {
  return String(path || "").replace(/\.png$/i, "-card.webp");
};

// A missing thumbnail falls back to the full image named in data-full.
document.addEventListener("error", event => {
  const img = event.target;
  if (img.tagName === "IMG" && img.dataset.full && !img.src.endsWith(img.dataset.full)) {
    img.src = img.dataset.full;
  }
}, true);

/* Image palette: the main colour of a kit picture. Used by the item page hero and the card glow. */
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

// Each card's glow takes the main colour of its own kit picture.
document.addEventListener("load", event => {
  const img = event.target;
  if (img.tagName !== "IMG" || !img.classList.contains("gundam-record-image")) return;
  try {
    const palette = extractImagePalette(img);
    const card = img.closest(".gundam-record");
    if (palette && card) card.style.setProperty("--glow-rgb", palette.primary.join(", "));
  } catch (error) {
    // A picture we can't read keeps the default glow.
  }
}, true);
