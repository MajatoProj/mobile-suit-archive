const cards = [...document.querySelectorAll(".category-card")];
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const carousel = document.getElementById("categoryCarousel");

let activeIndex = 0;
let touchStartX = null;

const destinations = {
  gundam: "category.html?type=gundam",
  digimon: "category.html?type=digimon",
  external: "external.html"
};

function wrap(i) {
  return (i + cards.length) % cards.length;
}

function update() {
  cards.forEach(c => c.classList.remove("pos-front", "pos-left", "pos-right"));

  cards[activeIndex].classList.add("pos-front");
  cards[wrap(activeIndex - 1)].classList.add("pos-left");
  cards[wrap(activeIndex + 1)].classList.add("pos-right");
}

function rotate(direction) {
  activeIndex = wrap(activeIndex + direction);
  update();
}

function enterActive() {
  const category = cards[activeIndex].dataset.category;
  const destination = destinations[category];

  if (window.archiveNavigate) {
    window.archiveNavigate(destination);
  } else {
    window.location.href = destination;
  }
}

cards.forEach((card, i) => {
  card.addEventListener("click", () => {
    if (i === activeIndex) enterActive();
    else {
      activeIndex = i;
      update();
    }
  });

  card.addEventListener("keydown", e => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (i === activeIndex) enterActive();
      else {
        activeIndex = i;
        update();
      }
    }
  });
});

prevBtn.addEventListener("click", () => rotate(-1));
nextBtn.addEventListener("click", () => rotate(1));

document.addEventListener("keydown", e => {
  if (e.key === "ArrowLeft") rotate(-1);
  if (e.key === "ArrowRight") rotate(1);
  if (e.key === "Enter" && document.activeElement === document.body) enterActive();
});

carousel.addEventListener("touchstart", e => {
  touchStartX = e.changedTouches[0].clientX;
}, { passive: true });

carousel.addEventListener("touchend", e => {
  if (touchStartX === null) return;
  const dx = e.changedTouches[0].clientX - touchStartX;
  if (Math.abs(dx) > 45) rotate(dx > 0 ? -1 : 1);
  touchStartX = null;
}, { passive: true });

update();
