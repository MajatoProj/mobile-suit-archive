(() => {
  const qs = new URLSearchParams(location.search);
  const category = (qs.get("category") || "gundam").trim().toLowerCase();
  const groupName = (qs.get("group") || "").trim();

  const els = {
    title: document.getElementById("projectTitle"),
    subtitle: document.getElementById("projectSubtitle"),
    record: document.getElementById("projectRecord"),
    missing: document.getElementById("projectMissing"),
    left: document.getElementById("leftUnit"),
    right: document.getElementById("rightUnit"),
    image: document.getElementById("projectImage"),
    notes: document.getElementById("projectNotes")
  };

  const clean = value => String(value ?? "").trim();
  const esc = value => String(value ?? "")
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

  async function fetchJson(path) {
    const response = await fetch(path, { cache: "no-store" });
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    return response.json();
  }

  async function enrich(item) {
    if (!item.file) return item;
    try {
      const detail = await fetchJson(`data/${category}/${String(item.file).replace(/^\/?/, "")}`);
      return { ...item, ...detail };
    } catch (_) {
      return item;
    }
  }

  function titleFromGroup(value) {
    const parts = clean(value).split("//").map(x => x.trim()).filter(Boolean);
    return parts.length > 1 ? parts.slice(1).join(" // ") : clean(value);
  }

  function statusLabel(value) {
    const key = clean(value).toLowerCase();
    return ({ backlog:"BACKLOG", assembly:"ASSEMBLY", detailing:"DETAILING", finishing:"FINISHING", completed:"COMPLETED", faulted:"FAULTED" })[key] || (key ? key.toUpperCase() : "UNASSIGNED");
  }

  function fieldRows(item) {
    const specs = item.specs || {};
    const paint = clean(specs.Paint || specs.paint || item.paint);
    const coat = clean(specs["Top coat"] || specs.top_coat || item.top_coat);
    const source = clean(item.brand || item.source);
    const purchase = clean(item.purchase_source);

    return [
      ["DESIGNATION", item.designation],
      ["BRAND", source],
      ["GRADE", item.grade],
      ["SCALE", item.scale],
      ["STATUS", statusLabel(item.build_status ?? item.status)],
      ["DETAIL", paint],
      ["TOP COAT", coat],
      ["SOURCE", purchase]
    ].filter(([, value]) => clean(value));
  }

  function renderUnit(item, side) {
    const variant = clean(item.project_variant) || (side === "left" ? "UNIT 01" : "UNIT 02");
    const href = `item.html?category=${encodeURIComponent(category)}&id=${encodeURIComponent(item.id)}`;
    const rows = fieldRows(item).map(([label, value]) => `
      <div class="project-unit-row"><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>
    `).join("");

    return `
      <div class="project-unit-accent"></div>
      <span class="panel-label">${esc(variant)}</span>
      <h2>${esc(item.name || item.designation || item.id)}</h2>
      <p class="project-unit-id">${esc(item.designation || item.id)}</p>
      <dl class="project-unit-data">${rows}</dl>
      <a class="project-unit-link" href="${href}">OPEN INDIVIDUAL RECORD →</a>
    `;
  }

  function notesFor(items) {
    const explicit = items.map(x => clean(x.project_notes)).find(Boolean);
    if (explicit) return explicit;

    const variants = items.map(x => clean(x.project_variant)).filter(Boolean);
    const brand = items.map(x => clean(x.brand)).find(Boolean) || "Third-party";
    const blue = items.find(x => clean(x.project_variant).toLowerCase() === "blue");
    const blueDetail = clean(blue?.specs?.Paint || blue?.paint);
    let note = `${brand} ${variants.join(" + ")} Shia Qan[T] pair, registered as one shared build project.`;
    if (blueDetail) note += ` Blue unit: ${blueDetail.toLowerCase()}.`;
    return note;
  }

  async function init() {
    if (!groupName || category !== "gundam") {
      els.missing.hidden = false;
      return;
    }

    try {
      const index = await fetchJson(`data/${category}/index.json`);
      const matches = extractItems(index).filter(item => clean(item.project_group) === groupName);
      if (matches.length < 2) throw new Error("Project group incomplete.");

      const items = await Promise.all(matches.slice(0, 2).map(enrich));
      const blue = items.find(x => clean(x.project_variant).toLowerCase() === "blue") || items[0];
      const pink = items.find(x => clean(x.project_variant).toLowerCase() === "pink") || items[1];
      const image = items.map(x => clean(x.project_image)).find(Boolean);
      const title = titleFromGroup(groupName);

      els.title.textContent = title;
      els.subtitle.textContent = `${blue.designation || blue.id} / ${pink.designation || pink.id}`;
      els.left.innerHTML = renderUnit(blue, "left");
      els.right.innerHTML = renderUnit(pink, "right");
      els.notes.textContent = notesFor(items);

      if (image) {
        els.image.innerHTML = `<img src="${esc(image)}" alt="${esc(title)}">`;
      }

      els.record.hidden = false;
    } catch (error) {
      console.warn(error);
      els.missing.hidden = false;
    }
  }

  init();
})();
