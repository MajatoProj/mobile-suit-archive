requestAnimationFrame(() => {
  document.body.classList.add("page-ready");
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
  const category = params.get("category");
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
      if (index !== rotatorIndex) {
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
