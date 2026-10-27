(() => {
  const qs = new URLSearchParams(location.search);
  const category = (qs.get("category") || "gundam").trim().toLowerCase();
  const id = (qs.get("id") || "").trim();
  const auto = qs.get("auto") === "1";
  const preview = qs.get("preview") === "1";

  const el = {
    clock: document.getElementById("scanClock"),
    statusStrip: document.getElementById("statusStrip"),
    statusText: document.getElementById("statusText"),
    imageWrap: document.getElementById("unitImageWrap"),
    image: document.getElementById("recordImage"),
    placeholder: document.getElementById("targetPlaceholder"),
    visualCode: document.getElementById("visualCode"),
    designation: document.getElementById("designation"),
    name: document.getElementById("recordName"),
    series: document.getElementById("recordSeries"),
    cardId: document.getElementById("recordCardId"),
    progressLabel: document.getElementById("progressLabel"),
    progressPercent: document.getElementById("progressPercent"),
    progressFill: document.getElementById("progressFill"),
    confirmation: document.getElementById("confirmation"),
    redirectNote: document.getElementById("redirectNote"),
    actions: document.getElementById("scanActions"),
    openRecord: document.getElementById("openRecord"),
    footerStatus: document.getElementById("footerStatus")
  };

  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

  function targetUrl() {
    return `item.html?category=${encodeURIComponent(category)}&id=${encodeURIComponent(id)}`;
  }

  function updateClock() {
    el.clock.textContent = new Date().toLocaleTimeString([], {
      hour: "2-digit", minute: "2-digit", second: "2-digit"
    });
  }

  updateClock();
  setInterval(updateClock, 1000);

  function setProgress(value, label) {
    const n = Math.max(0, Math.min(100, Math.round(value)));
    el.progressPercent.textContent = `${n}%`;
    el.progressFill.style.width = `${n}%`;
    if (label) el.progressLabel.textContent = label;
  }

  function setStatus(text, footer = text) {
    el.statusText.textContent = text;
    el.footerStatus.textContent = footer;
  }

  async function fetchJson(path) {
    const response = await fetch(path, { cache: "no-cache" });
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    return response.json();
  }

  function getEntries(indexData) {
    if (Array.isArray(indexData)) return indexData;
    if (indexData && typeof indexData === "object") {
      for (const key of ["items", "records", "entries", "gundam", "models", "data"]) {
        if (Array.isArray(indexData[key])) return indexData[key];
      }
    }
    return [];
  }

  function findRecord(indexData) {
    if (indexData && !Array.isArray(indexData) && indexData[id]) {
      return { id, ...indexData[id] };
    }
    return getEntries(indexData).find(item =>
      item && String(item.id || item.archive_id || item.card_id || "").toLowerCase() === id.toLowerCase()
    );
  }

  function cleanPath(value) {
    return String(value || "").replace(/^\.\//, "").replace(/^\//, "");
  }

  async function loadRecord() {
    if (!id) throw new Error("Missing archive ID.");
    const index = await fetchJson(`data/${encodeURIComponent(category)}/index.json`);
    let record = findRecord(index);
    if (!record) throw new Error(`No archive record found for ${id}.`);

    const detailPath = record.file || record.json || record.record || record.path;
    if (detailPath) {
      try {
        const detail = await fetchJson(`data/${encodeURIComponent(category)}/${cleanPath(detailPath)}`);
        record = { ...record, ...detail };
      } catch (error) {
        console.warn("Detailed record unavailable; using index entry.", error);
      }
    }
    return record;
  }

  function hydrate(record) {
    const designation = record.designation || record.code || record.model_number || id;
    const name = record.name || record.title || record.model || "ARCHIVE UNIT";
    const series = record.series || record.source || record.franchise || record.continuity || "GUNDAM ARCHIVE";

    el.designation.textContent = designation;
    el.name.textContent = name;
    el.series.textContent = series;
    el.cardId.textContent = id;
    el.visualCode.textContent = `CARD // ${id}`;

    const imagePath = cleanPath(record.image || record.image_path || record.thumbnail || record.thumbnail_path);
    if (!imagePath) {
      el.placeholder.querySelector("strong").textContent = "NO IMAGE REGISTERED";
      return;
    }

    el.image.src = imagePath;
    el.image.alt = name;
    el.image.onload = () => {
      el.placeholder.hidden = true;
      el.image.hidden = false;
      requestAnimationFrame(() => el.image.classList.add("is-visible"));
    };
    el.image.onerror = () => {
      el.image.hidden = true;
      el.placeholder.hidden = false;
      el.placeholder.querySelector("strong").textContent = "IMAGE UNAVAILABLE";
    };
  }

  async function run() {
    el.openRecord.href = targetUrl();
    el.cardId.textContent = id || "----";
    el.visualCode.textContent = `CARD // ${id || "----"}`;

    try {
      setStatus("IDENTIFICATION CARD DETECTED", "CARD DETECTED");
      setProgress(12, "READING CARD");
      const recordPromise = loadRecord();

      await sleep(180);
      setProgress(30, "QUERYING ARCHIVE INDEX");
      const record = await recordPromise;
      hydrate(record);

      await sleep(220);
      setStatus("ARCHIVE UNIT LOCATED", "UNIT LOCATED");
      setProgress(52, "VISUAL PROFILE ACQUIRED");
      el.imageWrap.classList.add("is-scanning");

      await sleep(430);
      setProgress(76, "DECODING UNIT IDENTITY");
      await sleep(280);
      setProgress(94, "VERIFYING ARCHIVE MATCH");
      await sleep(240);
      setProgress(100, "IDENTIFICATION COMPLETE");

      el.confirmation.hidden = false;
      el.statusStrip.classList.add("is-confirmed");
      setStatus("IDENTITY CONFIRMED", "CONFIRMED");
      el.actions.hidden = false;

      if (preview) {
        el.redirectNote.textContent = "PREVIEW MODE // REDIRECT PAUSED";
        el.redirectNote.hidden = false;
        return;
      }

      if (auto) {
        el.redirectNote.textContent = "OPENING ARCHIVE RECORD...";
        el.redirectNote.hidden = false;
        await sleep(850);
        window.location.href = targetUrl();
        return;
      }

      el.redirectNote.textContent = "IDENTIFICATION COMPLETE // OPEN ARCHIVE RECORD";
      el.redirectNote.hidden = false;
    } catch (error) {
      console.error(error);
      setProgress(100, "IDENTIFICATION FAILED");
      setStatus("ARCHIVE MATCH FAILED", "ERROR");
      el.designation.textContent = "NO MATCH";
      el.name.textContent = "IDENTIFICATION FAILED";
      el.series.textContent = error.message || "The archive record could not be loaded.";
      el.actions.hidden = false;
    }
  }

  run();
})();