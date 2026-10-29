import PhotoSwipeLightbox from "../vendor/photoswipe/photoswipe-lightbox.esm.min.js";

const gallery = document.querySelector("[data-project-gallery]");
const projectItems = Array.isArray(window.VERH_PROJECT_GALLERY_ITEMS) ? window.VERH_PROJECT_GALLERY_ITEMS : [];

function initProjectGallery() {
  const track = gallery.querySelector("[data-project-track]");
  const count = gallery.querySelector("[data-project-count]");
  const position = gallery.querySelector("[data-project-position]");
  const previous = gallery.querySelector("[data-project-prev]");
  const next = gallery.querySelector("[data-project-next]");
  const navigation = gallery.querySelector("[data-project-navigation]");
  const more = gallery.querySelector("[data-project-more]");
  const filters = [...gallery.querySelectorAll("[data-project-filter]")];
  const views = [...gallery.querySelectorAll("[data-project-view]")];
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const prefix = (gallery.dataset.projectAssetsPrefix || "assets/projects").replace(/\/$/, "");
  if (!track || !count) return;

  let category = "all";
  let layout = "slider";
  let visibleCount = 12;
  let cards = [];
  let links = [];
  let frame = 0;

  const offsetFor = index => cards[index].offsetLeft - cards[0].offsetLeft;
  const closestIndex = () => cards.length ? cards.reduce((best, card, index) =>
    Math.abs(offsetFor(index) - track.scrollLeft) < Math.abs(offsetFor(best) - track.scrollLeft) ? index : best, 0) : 0;
  const updateNavigation = () => {
    const index = closestIndex();
    if (position) position.textContent = cards.length ? `${index + 1} / ${cards.length}` : "0 / 0";
    if (previous) previous.disabled = track.scrollLeft <= 2;
    if (next) next.disabled = track.scrollLeft >= track.scrollWidth - track.clientWidth - 2;
    links.forEach((link, i) => { link.tabIndex = layout === "grid" || i === index ? 0 : -1; });
  };
  const updateLayout = () => {
    gallery.dataset.projectLayout = layout;
    views.forEach(button => button.setAttribute("aria-pressed", String(button.dataset.projectView === layout)));
    cards.forEach((card, index) => { card.hidden = layout === "grid" && index >= visibleCount; });
    if (navigation) navigation.hidden = layout === "grid";
    if (more) more.hidden = layout !== "grid" || visibleCount >= cards.length;
    updateNavigation();
  };
  const render = () => {
    const items = projectItems.filter(item => category === "all" || item.category === category);
    const fragment = document.createDocumentFragment();
    cards = [];
    links = [];
    items.forEach(item => {
      const card = document.createElement("article");
      const link = document.createElement("a");
      const image = document.createElement("img");
      const watermark = document.createElement("span");
      const caption = document.createElement("div");
      const tier = document.createElement("span");
      const title = document.createElement("strong");
      const expand = document.createElement("span");
      card.className = "project-gallery__card";
      card.setAttribute("role", "listitem");
      link.className = "project-gallery__link";
      link.href = `${prefix}/${item.path}`;
      link.dataset.projectPhoto = "";
      link.dataset.pswpWidth = String(item.width);
      link.dataset.pswpHeight = String(item.height);
      link.dataset.cropped = "true";
      link.dataset.caption = `ВЕРХ · ${item.tier} · ${item.title}`;
      link.setAttribute("aria-label", `Открыть на весь экран: ${item.tier}, ${item.title}`);
      image.alt = `${item.tier}: ${item.title}. Реальный объект ВЕРХ ремонта`;
      image.width = item.width;
      image.height = item.height;
      image.loading = "lazy";
      image.decoding = "async";
      image.src = link.href;
      image.draggable = false;
      watermark.className = "photo-watermark";
      watermark.setAttribute("aria-hidden", "true");
      watermark.textContent = "ВЕРХ";
      caption.className = "project-gallery__card-caption";
      tier.textContent = item.tier;
      title.textContent = item.title;
      caption.append(tier, title);
      expand.className = "project-gallery__expand";
      expand.setAttribute("aria-hidden", "true");
      link.append(image, watermark, caption, expand);
      card.append(link);
      fragment.append(card);
      cards.push(card);
      links.push(link);
    });
    track.replaceChildren(fragment);
    track.scrollLeft = 0;
    count.textContent = `${items.length} фото`;
    filters.forEach(button => {
      const selected = button.dataset.projectFilter === category;
      button.classList.toggle("is-active", selected);
      button.setAttribute("aria-selected", String(selected));
      button.tabIndex = selected ? 0 : -1;
    });
    updateLayout();
  };

  filters.forEach((button, index) => {
    button.addEventListener("click", () => {
      category = button.dataset.projectFilter || "all";
      visibleCount = 12;
      render();
    });
    button.addEventListener("keydown", event => {
      const shifts = { ArrowLeft: -1, ArrowRight: 1, Home: -index, End: filters.length - 1 - index };
      if (!(event.key in shifts)) return;
      event.preventDefault();
      const target = filters[(index + shifts[event.key] + filters.length) % filters.length];
      target.focus();
      target.click();
    });
  });
  views.forEach(button => button.addEventListener("click", () => {
    layout = button.dataset.projectView === "grid" ? "grid" : "slider";
    updateLayout();
  }));
  more?.addEventListener("click", () => {
    const firstNew = visibleCount;
    visibleCount += 12;
    updateLayout();
    links[firstNew]?.focus({ preventScroll: true });
  });
  previous?.addEventListener("click", () => track.scrollBy({ left: -track.clientWidth * 0.84, behavior: reduceMotion.matches ? "auto" : "smooth" }));
  next?.addEventListener("click", () => track.scrollBy({ left: track.clientWidth * 0.84, behavior: reduceMotion.matches ? "auto" : "smooth" }));
  track.addEventListener("scroll", () => {
    window.cancelAnimationFrame(frame);
    frame = window.requestAnimationFrame(updateNavigation);
  }, { passive: true });
  track.addEventListener("keydown", event => {
    if (layout !== "slider" || !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    const current = links.indexOf(event.target.closest("[data-project-photo]"));
    if (current < 0) return;
    event.preventDefault();
    const index = event.key === "Home" ? 0 : event.key === "End" ? links.length - 1 : Math.max(0, Math.min(links.length - 1, current + (event.key === "ArrowRight" ? 1 : -1)));
    track.scrollTo({ left: offsetFor(index), behavior: "auto" });
    links[index].focus({ preventScroll: true });
  });
  window.addEventListener("resize", updateNavigation);

  const lightbox = new PhotoSwipeLightbox({
    gallery: track,
    children: ".project-gallery__link",
    pswpModule: () => import("../vendor/photoswipe/photoswipe.esm.min.js"),
    mainClass: "pswp--main-projects",
    bgOpacity: 1,
    showHideAnimationType: reduceMotion.matches ? "none" : "zoom",
    zoomAnimationDuration: reduceMotion.matches ? 0 : 200,
    paddingFn: viewport => ({ top: 64, bottom: 80, left: viewport.x > 720 ? 64 : 12, right: viewport.x > 720 ? 64 : 12 }),
    returnFocus: false,
    closeTitle: "Закрыть галерею",
    zoomTitle: "Масштаб фотографии",
    arrowPrevTitle: "Предыдущая фотография",
    arrowNextTitle: "Следующая фотография",
    errorMsg: "Не удалось загрузить фотографию",
    indexIndicatorSep: " / ",
  });
  lightbox.on("uiRegister", () => {
    lightbox.pswp.ui.registerElement({
      name: "project-caption",
      appendTo: "root",
      onInit: (element, pswp) => {
        element.setAttribute("aria-live", "polite");
        const update = () => { element.textContent = pswp.currSlide?.data?.element?.dataset.caption || "Выполненный ремонт ВЕРХ"; };
        pswp.on("change", update);
        update();
      },
    });
  });
  let returnIndex = 0;
  lightbox.on("beforeClose", () => { returnIndex = lightbox.pswp.currIndex; });
  lightbox.on("destroy", () => {
    if (!links[returnIndex]) return;
    if (layout === "grid") visibleCount = Math.max(visibleCount, Math.ceil((returnIndex + 1) / 12) * 12);
    updateLayout();
    if (layout === "slider") track.scrollTo({ left: offsetFor(returnIndex), behavior: "auto" });
    else cards[returnIndex].scrollIntoView({ block: "nearest", behavior: "auto" });
    links[returnIndex].focus({ preventScroll: true });
  });
  lightbox.init();
  render();
}

if (gallery) {
  if (!("IntersectionObserver" in window)) initProjectGallery();
  else {
    const observer = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting)) return;
      observer.disconnect();
      initProjectGallery();
    }, { rootMargin: "1400px 0px" });
    observer.observe(gallery);
  }
}
