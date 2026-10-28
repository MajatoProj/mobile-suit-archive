(() => {
  const params = new URLSearchParams(location.search);
  if ((params.get("type") || "").toLowerCase() !== "gundam") return;

  const INDEX_URL = "data/gundam/index.json";
  const projectCache = new Map();
  let projectGroups = [];
  let applyQueued = false;
  let applying = false;

  const clean = value => String(value ?? "").trim();
  const escapeHtml = value => String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

  function extractItems(data) {
    if (Array.isArray(data)) return data;
    if (!data || typeof data !== "object") return [];
    for (const key of ["items", "records", "entries", "gundam", "models", "data"]) {
      if (Array.isArray(data[key])) return data[key];
    }
    return [];
  }

  async function loadDetail(item) {
    if (!item?.file) return item;
    try {
      const path = `data/gundam/${String(item.file).replace(/^\/?/, "")}`;
      return { ...item, ...(await window.fetchArchiveJson(path)) };
    } catch (_) {
      return item;
    }
  }

  function groupTitle(groupName) {
    const parts = clean(groupName).split("//").map(x => x.trim()).filter(Boolean);
    return parts.length > 1 ? parts.slice(1).join(" // ") : clean(groupName);
  }

  function statusLabel(value) {
    const key = clean(value).toLowerCase();
    return ({
      backlog: "BACKLOG",
      assembly: "ASSEMBLY",
      detailing: "DETAILING",
      finishing: "FINISHING",
      completed: "COMPLETED",
      faulted: "FAULTED"
    })[key] || (key ? key.toUpperCase() : "UNASSIGNED");
  }

  function projectHref(groupName) {
    return `project.html?category=gundam&group=${encodeURIComponent(groupName)}`;
  }

  function variantLabel(item) {
    return clean(item.project_variant) || clean(item.name).match(/\(([^)]+)\)/)?.[1] || "UNIT";
  }

  function sourceInfo(items) {
    const aliases = { "third-party": "3rd-party", thirdparty: "3rd-party", bootleg: "3rd-party", gundambase: "base" };
    const sources = [...new Set(items.map(item => clean(item.source).toLowerCase()).map(key => aliases[key] || key).filter(Boolean))];
    if (sources.length !== 1) {
      return { key: "mixed", label: "MIXED SOURCE" };
    }

    const key = sources[0];
    const labels = {
      bandai: "BANDAI",
      "p-bandai": "P-BANDAI",
      base: "BASE EXCLUSIVE",
      "3rd-party": "3RD PARTY",
      custom: "CUSTOM"
    };

    return {
      key: key.replace(/[^a-z0-9_-]+/g, "-") || "unknown",
      label: labels[key] || key.toUpperCase()
    };
  }

  function buildProgress(item) {
    const key = clean(item.build_status ?? item.buildStatus ?? item.status).toLowerCase() || "unassigned";
    const table = {
      unassigned: { key: "unassigned", label: "WANTED", percent: 0, hideProgress: false },
      wanted: { key: "unassigned", label: "WANTED", percent: 0, hideProgress: false },
      backlog: { key: "backlog", label: "BACKLOG", percent: 10, hideProgress: false },
      assembly: { key: "assembly", label: "ASSEMBLY", percent: 35, hideProgress: false },
      detailing: { key: "detailing", label: "DETAILING", percent: 65, hideProgress: false },
      finishing: { key: "finishing", label: "FINISHING", percent: 85, hideProgress: false },
      completed: { key: "completed", label: "COMPLETED", percent: 100, hideProgress: false },
      faulted: { key: "faulted", label: "FAULTED", percent: null, hideProgress: true }
    };
    return table[key] || { key, label: key.toUpperCase(), percent: 0, hideProgress: false };
  }

  function projectStatusIcon(statusKey) {
    const key = String(statusKey || "").trim().toLowerCase();

    const visualMap = {
      unassigned: { icon: "search", title: "Wanted / looking for" },
      backlog: { icon: "clock", title: "Backlog" },
      assembly: { icon: "nipper", title: "Assembly" },
      detailing: { icon: "brush", title: "Detailing" },
      finishing: { icon: "spark", title: "Finishing" },
      completed: { icon: "crown", title: "Completed" },
      faulted: { icon: "vault", title: "Faulted / stored away" }
    };

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
      nipper: `
        <svg class="status-svg status-svg-nipper" viewBox="0 0 24 24" aria-hidden="true">
          <path class="icon-nipper-metal" d="M10.4 10.3 6.1 5.9"></path>
          <path class="icon-nipper-metal" d="M13.6 10.3 17.9 5.9"></path>
          <circle class="icon-nipper-pivot" cx="12" cy="11.2" r="1.4"></circle>
          <path class="icon-nipper-handle-red" d="M10.8 11.2 7.2 18"></path>
          <path class="icon-nipper-handle-blue" d="M13.2 11.2 16.8 18"></path>
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

    const visual = visualMap[key] || visualMap.unassigned;

    return `
      <span
        class="mini-state-icon icon-${escapeHtml(key || "unassigned")}"
        title="${escapeHtml(visual.title)}"
        aria-label="${escapeHtml(visual.title)}"
      >
        ${icons[visual.icon] || icons.search}
      </span>
    `;
  }

  function projectProgress(items) {
    const states = items.map(buildProgress);
    const uniqueKeys = [...new Set(states.map(state => state.key))];

    if (uniqueKeys.length === 1) return states[0];

    const measurable = states.filter(state => Number.isFinite(state.percent));
    if (!measurable.length) {
      return { key: "faulted", label: "MIXED", percent: null, hideProgress: true };
    }

    const percent = Math.round(
      measurable.reduce((sum, state) => sum + state.percent, 0) / measurable.length
    );

    return {
      key: "assembly",
      label: "PROJECT",
      percent,
      hideProgress: false
    };
  }

  function makeProjectCard(group) {
    const items = group.items.slice(0, 2);
    const blue = items.find(x => clean(x.project_variant).toLowerCase() === "blue") || items[0];
    const pink = items.find(x => clean(x.project_variant).toLowerCase() === "pink") || items[1] || items[0];
    const image = items.map(x => clean(x.project_image)).find(Boolean);
    const title = groupTitle(group.name);
    const source = sourceInfo(items);
    const progress = projectProgress(items);
    const topStatusIcon = projectStatusIcon(progress.key);
    const card = document.createElement("a");

    const visualStatus =
      progress.key === "faulted"
        ? " is-faulted"
        : (progress.key === "backlog" || progress.key === "unassigned" ? " is-backlog" : "");

    card.className = `gundam-record couple-project-record${visualStatus}`;
    card.dataset.projectGroup = group.name;
    card.href = projectHref(group.name);
    card.setAttribute("aria-label", `Open ${title}`);

    const compactPercent = progress.hideProgress
      ? ""
      : `<span class="status-percent">${progress.percent}%</span>`;

    const compactMeter = progress.hideProgress
      ? ""
      : `
        <div class="status-meter couple-status-meter" aria-hidden="true">
          <span class="status-meter-fill status-${escapeHtml(progress.key)}" style="width:${progress.percent}%"></span>
        </div>
      `;

    card.innerHTML = `
      <div class="gundam-record-visual couple-record-visual ${image ? "has-image" : ""}">
        ${image
          ? `<img class="gundam-record-image couple-record-image" src="${escapeHtml(window.cardThumb(image))}" data-full="${escapeHtml(image)}" alt="" loading="lazy">`
          : ""}
        <span class="unit-ghost">DUO</span>
        <span class="unit-crosshair" aria-hidden="true"></span>
      </div>

      <div class="gundam-record-topline couple-record-topline">
        <span class="couple-record-tags">
          <span class="kit-badge badge-${escapeHtml(source.key)}"><i></i>${escapeHtml(source.label)}</span>
          <span class="kit-badge badge-project"><i></i>COUPLE BUILD</span>
        </span>
        <span class="gundam-record-topicons">${topStatusIcon}</span>
      </div>

      <h4>${escapeHtml(title)}</h4>

      <div class="couple-card-units" aria-label="Project units">
        <span class="couple-unit-chip is-blue">
          <b>${escapeHtml(variantLabel(blue))}</b>
        </span>
        <span class="couple-unit-chip is-pink">
          <b>${escapeHtml(variantLabel(pink))}</b>
        </span>
      </div>

      <div class="gundam-record-meta">
        <span>${escapeHtml(blue.grade || pink.grade || "")}</span>
        <span>${escapeHtml(blue.scale || pink.scale || "")}</span>
        <span>2 UNITS</span>
      </div>

      <div class="build-status-compact" data-build-status="${escapeHtml(progress.key)}">
        <span class="status-chip status-${escapeHtml(progress.key)}">${escapeHtml(progress.label)}</span>
        ${compactPercent}
      </div>
      ${compactMeter}
    `;

    return card;
  }

  function linkForId(root, id) {
    return [...root.querySelectorAll("a.gundam-record")].find(link => {
      if (link.classList.contains("couple-project-record")) return false;
      try { return new URL(link.href, location.href).searchParams.get("id") === id; }
      catch (_) { return false; }
    });
  }

  function enhanceTimeline(group) {
    document.querySelectorAll(".series-items").forEach(holder => {
      if (holder.querySelector(`.couple-project-record[data-project-group="${CSS.escape(group.name)}"]`)) return;

      const links = group.items.map(item => linkForId(holder, item.id)).filter(Boolean);
      if (links.length !== group.items.length || links.length < 2) return;

      const insertBefore = links[0];
      const card = makeProjectCard(group);
      insertBefore.before(card);
      links.forEach(link => link.remove());
      holder.classList.add("has-couple-project-card");
    });
  }

  function enhanceFamilies(group) {
    document.querySelectorAll(".family-block").forEach(block => {
      if (block.querySelector(`.couple-project-record[data-project-group="${CSS.escape(group.name)}"]`)) return;

      const links = group.items.map(item => linkForId(block, item.id)).filter(Boolean);
      if (links.length !== group.items.length || links.length < 2) return;

      const rows = links.map(link => link.closest(".family-branch-row")).filter(Boolean);
      const card = makeProjectCard(group);
      card.classList.add("couple-project-family-card");

      if (rows.length) {
        // Take the units' place in the flow, so the connector before them still points at a card.
        rows[0].replaceChildren(card);
        rows.slice(1).forEach(row => row.remove());
        const stage = rows[0].closest(".family-stage");
        if (stage && stage.querySelectorAll(".family-branch-row").length < 2) stage.classList.remove("is-branch");
      } else {
        const flow = block.querySelector(".family-flow");
        if (flow) block.insertBefore(card, flow);
        else block.appendChild(card);
        links.forEach(link => link.remove());
      }
    });
  }

  function apply() {
    if (applying || !projectGroups.length) return;
    applying = true;
    try {
      projectGroups.forEach(group => {
        enhanceTimeline(group);
        enhanceFamilies(group);
      });
    } finally {
      applying = false;
    }
  }

  function scheduleApply() {
    if (applyQueued) return;
    applyQueued = true;
    requestAnimationFrame(() => {
      applyQueued = false;
      apply();
    });
  }

  async function init() {
    try {
      const index = await window.fetchArchiveJson(INDEX_URL);
      const paired = extractItems(index).filter(item => clean(item.project_group));
      if (!paired.length) return;

      const enriched = await Promise.all(paired.map(async item => {
        if (projectCache.has(item.id)) return projectCache.get(item.id);
        const full = await loadDetail(item);
        projectCache.set(item.id, full);
        return full;
      }));

      const groups = new Map();
      enriched.forEach(item => {
        const key = clean(item.project_group);
        if (!key) return;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(item);
      });

      projectGroups = [...groups.entries()]
        .filter(([, items]) => items.length >= 2)
        .map(([name, items]) => ({ name, items }));

      scheduleApply();
      new MutationObserver(scheduleApply).observe(document.body, { childList: true, subtree: true });
    } catch (error) {
      console.warn("Couple project cards unavailable:", error);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
