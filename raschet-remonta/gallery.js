import PhotoSwipeLightbox from "../assets/vendor/photoswipe/photoswipe-lightbox.esm.min.js";

const gallery = document.querySelector("[data-intro-track]");
const galleryPrev = document.querySelector("[data-gallery-prev]");
const galleryNext = document.querySelector("[data-gallery-next]");
const galleryCount = document.querySelector("[data-gallery-count]");
const projectItems = Array.isArray(window.VERH_PROJECT_GALLERY_ITEMS)
  ? window.VERH_PROJECT_GALLERY_ITEMS
  : [];

const featuredPaths = [
  "comfort/comfort_01_msg170.webp",
  "lux/lux_04_msg181.webp",
  "lux/lux_01_msg178.webp",
  "comfort/comfort_03_msg172.webp",
  "comfort/comfort_12_msg218.webp",
  "lux/lux_03_msg180.webp",
  "lux/lux_06_msg183.webp",
  "comfort/comfort_04_msg173.webp",
];

const featuredItems = featuredPaths
  .map((path) => projectItems.find((item) => item.path === path))
  .filter(Boolean);
const featuredSet = new Set(featuredPaths);
const orderedItems = [...featuredItems, ...projectItems.filter((item) => !featuredSet.has(item.path))];

if (gallery && orderedItems.length) {
  const fragment = document.createDocumentFragment();

  orderedItems.forEach((item, index) => {
    const source = `../assets/projects/${item.path}`;
    const link = document.createElement("a");
    const image = document.createElement("img");
    const caption = document.createElement("span");

    link.className = "intro-carousel__slide";
    link.href = source;
    link.tabIndex = index === 0 ? 0 : -1;
    link.dataset.galleryIndex = String(index);
    link.dataset.pswpWidth = String(item.width);
    link.dataset.pswpHeight = String(item.height);
    link.dataset.cropped = "true";
    link.dataset.caption = `${item.tier} · ${item.title}`;
    link.setAttribute("aria-label", `Открыть на весь экран: ${item.tier}, ${item.title}`);

    image.src = source;
    image.alt = `${item.tier}: ${item.title}. Реальный объект ВЕРХ`;
    image.width = item.width;
    image.height = item.height;
    image.loading = index < 3 ? "eager" : "lazy";
    image.decoding = "async";
    image.draggable = false;
    if (index === 0) image.fetchPriority = "high";

    caption.textContent = item.title;
    link.append(image, caption);
    fragment.append(link);
  });

  gallery.replaceChildren(fragment);
  gallery.setAttribute("aria-busy", "false");

  const slides = [...gallery.querySelectorAll(".intro-carousel__slide")];
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let activeIndex = 0;
  let scrollFrame = 0;

  const updateCarouselState = () => {
    const currentLeft = gallery.scrollLeft;
    activeIndex = slides.reduce((closestIndex, slide, index) => {
      const closestDistance = Math.abs(slides[closestIndex].offsetLeft - currentLeft);
      const distance = Math.abs(slide.offsetLeft - currentLeft);
      return distance < closestDistance ? index : closestIndex;
    }, 0);

    slides.forEach((slide, index) => {
      slide.tabIndex = index === activeIndex ? 0 : -1;
    });
    if (galleryCount) galleryCount.textContent = `${activeIndex + 1} / ${slides.length}`;
    if (galleryPrev) galleryPrev.disabled = activeIndex === 0;
    if (galleryNext) galleryNext.disabled = activeIndex === slides.length - 1;
  };

  const scrollToSlide = (index, focus = false) => {
    const safeIndex = Math.max(0, Math.min(slides.length - 1, index));
    gallery.scrollTo({
      left: slides[safeIndex].offsetLeft,
      behavior: reduceMotion.matches ? "auto" : "smooth",
    });
    if (focus) slides[safeIndex].focus({ preventScroll: true });
  };

  galleryPrev?.addEventListener("click", () => scrollToSlide(activeIndex - 1));
  galleryNext?.addEventListener("click", () => scrollToSlide(activeIndex + 1));

  gallery.addEventListener("scroll", () => {
    window.cancelAnimationFrame(scrollFrame);
    scrollFrame = window.requestAnimationFrame(updateCarouselState);
  }, { passive: true });

  gallery.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    scrollToSlide(activeIndex + (event.key === "ArrowRight" ? 1 : -1), true);
  });

  const lightbox = new PhotoSwipeLightbox({
    gallery,
    children: ".intro-carousel__slide",
    pswpModule: () => import("../assets/vendor/photoswipe/photoswipe.esm.min.js"),
    bgOpacity: 0.97,
    showHideAnimationType: "zoom",
    wheelToZoom: true,
    closeTitle: "Закрыть галерею",
    zoomTitle: "Увеличить фотографию",
    arrowPrevTitle: "Предыдущая фотография",
    arrowNextTitle: "Следующая фотография",
    errorMsg: "Не удалось загрузить фотографию",
  });

  lightbox.on("uiRegister", () => {
    lightbox.pswp.ui.registerElement({
      name: "custom-caption",
      order: 9,
      isButton: false,
      appendTo: "root",
      html: "",
      onInit: (element, pswp) => {
        const updateCaption = () => {
          const slideElement = pswp.currSlide?.data?.element;
          element.textContent = slideElement?.dataset.caption || "Выполненный ремонт ВЕРХ";
        };

        pswp.on("change", updateCaption);
        updateCaption();
      },
    });
  });

  lightbox.on("afterInit", () => {
    const slideElement = lightbox.pswp?.currSlide?.data?.element;
    if (typeof window.ym === "function") {
      window.ym(110859289, "reachGoal", "calculator_gallery_open", {
        image: Number(slideElement?.dataset.galleryIndex || 0) + 1,
        caption: slideElement?.dataset.caption || "",
      });
    }
  });

  lightbox.on("beforeClose", () => {
    const currentIndex = lightbox.pswp?.currIndex;
    if (Number.isInteger(currentIndex)) scrollToSlide(currentIndex);
  });

  lightbox.init();
  updateCarouselState();
} else if (gallery) {
  gallery.setAttribute("aria-busy", "false");
  if (galleryCount) galleryCount.textContent = "0 фото";
}
