document.documentElement.classList.add("has-js");

const themeToggle = document.querySelector("[data-theme-toggle]");
const lightThemeStylesheet = document.querySelector("#site-theme-stylesheet");
const darkThemeStylesheet = document.querySelector("#site-theme-dark-stylesheet");
const themeColorMeta = document.querySelector('meta[name="theme-color"]');

function setTheme(theme, { persist = false, track = false } = {}) {
  if (theme !== "light" && theme !== "dark") return;

  const isDark = theme === "dark";
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.dataset.themeSource = persist ? "manual" : root.dataset.themeSource || "default";
  root.style.colorScheme = theme;
  window.VERH_THEME = theme;

  const nextLightMedia = isDark ? "not all" : "all";
  const nextDarkMedia = isDark ? "all" : "not all";
  if (
    lightThemeStylesheet &&
    darkThemeStylesheet &&
    (lightThemeStylesheet.media !== nextLightMedia || darkThemeStylesheet.media !== nextDarkMedia)
  ) {
    const scrollPosition = { x: window.scrollX, y: window.scrollY };
    root.classList.add("is-theme-switching");
    themeToggle?.blur();
    lightThemeStylesheet.media = nextLightMedia;
    darkThemeStylesheet.media = nextDarkMedia;
    requestAnimationFrame(() => {
      window.scrollTo(scrollPosition.x, scrollPosition.y);
      requestAnimationFrame(() => {
        window.scrollTo(scrollPosition.x, scrollPosition.y);
        root.classList.remove("is-theme-switching");
      });
    });
  }
  if (themeColorMeta) themeColorMeta.content = isDark ? "#070707" : "#f7f2ea";

  if (themeToggle) {
    const actionLabel = isDark ? "Включить светлую тему" : "Включить тёмную тему";
    themeToggle.setAttribute("aria-label", actionLabel);
    themeToggle.setAttribute("title", actionLabel);
    themeToggle.setAttribute("aria-pressed", String(isDark));
  }

  if (persist) {
    try {
      sessionStorage.setItem("verh-theme", theme);
    } catch (error) {
      // The selected theme still applies when storage is unavailable.
    }
  }

  if (track && typeof window.ym === "function") {
    window.ym(110859289, "reachGoal", "theme_switch", { theme });
  }
}

setTheme(window.VERH_THEME === "dark" ? "dark" : "light");
themeToggle?.addEventListener("click", () => {
  const nextTheme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  setTheme(nextTheme, { persist: true, track: true });
});

const tariffs = {
  cosmetic: {
    title: "Косметический ремонт",
    price: 6000,
    materialPrice: null,
    workPrice: null,
    prefix: "от ",
    included: [
      "снятие старых покрытий и подготовка поверхностей там, где это нужно",
      "обновление стен, потолка и пола в согласованном объёме",
      "работы и материалы, включённые в стоимость ремонта",
      "точный состав работ и смета после осмотра квартиры",
    ],
  },
  standard: {
    title: "Стандарт",
    price: 20000,
    materialPrice: 10000,
    workPrice: 10000,
    prefix: "",
    included: [
      "план работ, материалы и работы отдельными строками в смете",
      "подготовка стен, пола и потолка",
      "плитка и чистовая отделка по согласованному перечню",
      "межкомнатные двери, сантехника и свет, предусмотренные тарифом",
      "смета, договор и график этапов",
    ],
  },
  comfort: {
    title: "Комфорт",
    price: 25000,
    materialPrice: 15000,
    workPrice: 10000,
    prefix: "",
    included: [
      "план работ и материалы из расширенной комплектации отдельной строкой в смете",
      "подготовка поверхностей и чистовая отделка",
      "плиточные, малярные и напольные работы",
      "двери, сантехника, свет, дополнительные розетки и выводы",
      "смета, договор и график этапов",
    ],
  },
  lux: {
    title: "Люкс",
    price: 29000,
    materialPrice: 19000,
    workPrice: 10000,
    prefix: "",
    included: [
      "дизайн-проект, согласование материалов и света до начала работ",
      "работы и комплектация по утверждённому проекту",
      "сложные узлы, сценарии освещения и нестандартные решения",
      "смета, договор и график этапов",
    ],
  },
};

const SECONDARY_PRELIMINARY_SURCHARGE = 100000;
const leadEndpoint = typeof window.VERH_LEAD_ENDPOINT === "string" ? window.VERH_LEAD_ENDPOINT.trim() : "";
const callbackPromptDelay = ["127.0.0.1", "localhost"].includes(window.location.hostname)
  && new URLSearchParams(window.location.search).has("callback-test")
  ? 800
  : 24000;

const stepLabels = [
  "Старт",
  "Площадь",
  "Отделка",
  "Телефон",
];

const state = {
  step: 0,
  maxStep: 0,
  apartment: "Новостройка",
  area: 58,
  areaLabel: "2-комн.",
  level: "comfort",
  timerStarted: false,
  timerLeft: 120,
  leadSubmitted: false,
  leadPhone: "",
  leadLoadingId: null,
};

const moneyFormat = new Intl.NumberFormat("ru-RU");
const quizModal = document.querySelector("#quiz-modal");
const quizOpenButtons = [...document.querySelectorAll("[data-quiz-open]")];
const quizCloseButtons = [...document.querySelectorAll("[data-quiz-close]")];
const slides = [...document.querySelectorAll(".slide")];
const progressButtons = [...document.querySelectorAll("[data-step-nav]")];
const stepCount = document.querySelector("#step-count");
const stepLabel = document.querySelector("#step-label");
const summaryLine = document.querySelector("#summary-line");
const summaryEstimateLabel = document.querySelector("#summary-estimate-label");
const summaryEstimate = document.querySelector("#summary-estimate");
const areaInput = document.querySelector("#area-input");
const phoneInput = document.querySelector("#phone-input");
const leadPanel = document.querySelector(".lead-panel");
const leadTitle = document.querySelector("#lead-title");
const leadDescription = document.querySelector("#lead-description");
const leadForm = document.querySelector("#lead-form");
const leadOffer = document.querySelector(".lead-offer");
const leadLoading = document.querySelector("#lead-loading");
const successMessage = document.querySelector("#success-message");
const timerElement = document.querySelector("#timer");
const stickyBreakpoint = window.matchMedia("(max-width: 720px)");
const tariffGalleries = [...document.querySelectorAll("[data-tariff-gallery]")];
const contactsSection = document.querySelector("#contacts");
const callButtons = [...document.querySelectorAll("[data-call-button]")];
const mobileCallButton = document.querySelector("[data-mobile-call]");
const yandexReviewsSection = document.querySelector("[data-yandex-reviews]");
const yandexReviewsFrame = document.querySelector("[data-yandex-reviews-frame]");
const callbackPrompt = document.querySelector("#callback-prompt");
const callbackForm = document.querySelector("#callback-form");
const callbackPhone = document.querySelector("#callback-phone");
const callbackStatus = document.querySelector("#callback-status");
const callbackCloseButton = document.querySelector("[data-callback-close]");

let lastQuizTrigger = null;
let timerId = null;
let quizMediaPreloaded = false;
let callbackTimerId = null;
let callbackSuppressed = false;

function initTariffGalleries() {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  tariffGalleries.forEach((gallery) => {
    const track = gallery.querySelector(".tariff-gallery__track");
    const viewport = gallery.querySelector(".tariff-gallery__viewport");
    const slides = [...gallery.querySelectorAll("[data-gallery-slide]")];
    const dots = [...gallery.querySelectorAll("[data-gallery-dot]")];
    const prevButton = gallery.querySelector("[data-gallery-prev]");
    const nextButton = gallery.querySelector("[data-gallery-next]");

    if (!track || slides.length < 2) return;

    let currentIndex = 0;
    let intervalId = null;
    let isVisible = false;
    let isPaused = false;
    let swipeStartX = null;

    const loadSlideImage = (index) => {
      const image = slides[index]?.querySelector("img[data-src]");
      if (!image || !image.dataset.src) return;
      image.src = image.dataset.src;
      image.removeAttribute("data-src");
    };

    const preloadFollowingImage = () => {
      if (!isVisible) return;
      const nextIndex = (currentIndex + 1) % slides.length;
      const preload = () => loadSlideImage(nextIndex);
      if ("requestIdleCallback" in window) {
        window.requestIdleCallback(preload, { timeout: 1200 });
      } else {
        window.setTimeout(preload, 240);
      }
    };

    const setIndex = (nextIndex) => {
      currentIndex = (nextIndex + slides.length) % slides.length;
      loadSlideImage(currentIndex);
      track.style.transform = `translateX(${-currentIndex * 100}%)`;
      slides.forEach((slide, index) => {
        slide.classList.toggle("is-active", index === currentIndex);
        slide.setAttribute("aria-hidden", String(index !== currentIndex));
      });
      dots.forEach((dot, index) => {
        const isActive = index === currentIndex;
        dot.classList.toggle("is-active", isActive);
        dot.setAttribute("aria-current", isActive ? "true" : "false");
      });
      preloadFollowingImage();
    };

    const stopAutoplay = () => {
      if (!intervalId) return;
      window.clearInterval(intervalId);
      intervalId = null;
    };

    const startAutoplay = () => {
      stopAutoplay();
      if (!isVisible || isPaused || reduceMotion.matches) return;
      intervalId = window.setInterval(() => setIndex(currentIndex + 1), 4200);
    };

    prevButton?.addEventListener("click", () => {
      isPaused = true;
      setIndex(currentIndex - 1);
      stopAutoplay();
    });

    nextButton?.addEventListener("click", () => {
      isPaused = true;
      setIndex(currentIndex + 1);
      stopAutoplay();
    });

    dots.forEach((dot, index) => {
      dot.addEventListener("click", () => {
        isPaused = true;
        setIndex(index);
        stopAutoplay();
      });
    });

    viewport?.addEventListener("pointerdown", (event) => {
      swipeStartX = event.clientX;
      isPaused = true;
      stopAutoplay();
    });

    viewport?.addEventListener("pointerup", (event) => {
      if (swipeStartX === null) return;
      const deltaX = event.clientX - swipeStartX;
      swipeStartX = null;
      if (Math.abs(deltaX) < 36) return;
      setIndex(currentIndex + (deltaX < 0 ? 1 : -1));
    });

    viewport?.addEventListener("pointercancel", () => {
      swipeStartX = null;
    });

    gallery.addEventListener("pointerenter", () => {
      isPaused = true;
      stopAutoplay();
    });

    gallery.addEventListener("pointerleave", () => {
      isPaused = false;
      startAutoplay();
    });

    gallery.addEventListener("touchstart", () => {
      isPaused = true;
      stopAutoplay();
    }, { passive: true });

    reduceMotion.addEventListener?.("change", startAutoplay);
    setIndex(0);

    if ("IntersectionObserver" in window) {
      const observer = new IntersectionObserver((entries) => {
        isVisible = entries.some((entry) => entry.isIntersecting);
        if (isVisible) {
          loadSlideImage(currentIndex);
          preloadFollowingImage();
        }
        startAutoplay();
      }, { threshold: 0.45 });
      observer.observe(gallery);
    } else {
      isVisible = true;
      startAutoplay();
    }
  });
}

const projectGalleryItems = Array.isArray(window.VERH_PROJECT_GALLERY_ITEMS)
  ? window.VERH_PROJECT_GALLERY_ITEMS
  : [];

function initProjectGallery() {
  const gallery = document.querySelector("[data-project-gallery]");
  if (!gallery) return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const assetsPrefix = (gallery.dataset.projectAssetsPrefix || "assets/projects").replace(/\/$/, "");
  const count = gallery.querySelector("[data-project-count]");
  const track = gallery.querySelector("[data-project-track]");
  const filters = [...gallery.querySelectorAll("[data-project-filter]")];

  if (!count || !track) return;

  let activeCategory = "all";

  const getItems = () => projectGalleryItems.filter((item) => activeCategory === "all" || item.category === activeCategory);
  const sourceFor = (item) => `${assetsPrefix}/${item.path}`;

  const updateFilters = () => {
    filters.forEach((filter) => {
      const isActive = filter.dataset.projectFilter === activeCategory;
      filter.classList.toggle("is-active", isActive);
      filter.setAttribute("aria-selected", String(isActive));
    });
  };

  const renderCards = () => {
    const items = getItems();
    count.textContent = `${items.length} фото`;
    track.innerHTML = items
      .map((item, index) => `
        <article class="project-gallery__card" role="listitem">
          <img src="${sourceFor(item)}" alt="${item.tier}: ${item.title}. Реальный объект ВЕРХ ремонта" loading="lazy" decoding="async" draggable="false" />
          <span class="photo-watermark" aria-hidden="true">ВЕРХ</span>
          <div class="project-gallery__card-caption">
            <span>${item.tier}</span>
            <strong>${item.title}</strong>
          </div>
        </article>
      `)
      .join("");
    track.scrollLeft = 0;
  };

  const switchCategory = (category) => {
    activeCategory = category;
    updateFilters();
    renderCards();
  };

  filters.forEach((filter) => {
    filter.addEventListener("click", () => switchCategory(filter.dataset.projectFilter || "all"));
  });

  track.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      track.scrollBy({ left: -track.clientWidth * 0.84, behavior: reduceMotion.matches ? "auto" : "smooth" });
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      track.scrollBy({ left: track.clientWidth * 0.84, behavior: reduceMotion.matches ? "auto" : "smooth" });
    }
  });

  updateFilters();
  renderCards();
}

function initDeferredProjectGallery() {
  const gallery = document.querySelector("[data-project-gallery]");
  if (!gallery) return;

  const start = () => initProjectGallery();
  if (!("IntersectionObserver" in window)) {
    start();
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    if (!entries.some((entry) => entry.isIntersecting)) return;
    start();
    observer.disconnect();
  }, { rootMargin: "1400px 0px" });

  observer.observe(gallery);
}

function trackMetricGoal(goal, params = {}) {
  if (typeof window.ym === "function") window.ym(110859289, "reachGoal", goal, params);
}

function initYandexReviews() {
  if (!yandexReviewsSection) return;
  if (window.VERH_REVIEWS_WIDGET_ENABLED === false) {
    yandexReviewsSection.remove();
    return;
  }

  if (!yandexReviewsFrame?.dataset.src) return;

  const loadReviewsWidget = () => {
    if (!yandexReviewsFrame.src) yandexReviewsFrame.src = yandexReviewsFrame.dataset.src;
  };

  if (!("IntersectionObserver" in window)) {
    loadReviewsWidget();
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    if (!entries.some((entry) => entry.isIntersecting)) return;
    loadReviewsWidget();
    observer.disconnect();
  }, { rootMargin: "400px 0px" });

  observer.observe(yandexReviewsSection);
}

function initCallActions() {
  callButtons.forEach((button) => {
    button.addEventListener("click", (event) => {
      const placement = button.closest(".site-header")
        ? "header"
        : button.closest(".sticky-cta")
          ? "sticky"
          : "page";
      if (!stickyBreakpoint.matches && !button.classList.contains("is-phone-revealed")) {
        event.preventDefault();
        const phoneLabel = button.dataset.phoneLabel || button.textContent.trim();
        button.classList.add("is-phone-revealed");
        button.textContent = phoneLabel;
        button.setAttribute("aria-label", `Позвонить по номеру ${phoneLabel}`);
        trackMetricGoal("phone_reveal", { placement });
        return;
      }

      trackMetricGoal("phone_call", { placement });
    });
  });
}

function initMobileCallAction() {
  mobileCallButton?.addEventListener("click", () => trackMetricGoal("phone_call", { placement: "mobile_sticky" }));
}

function formatMoney(value) {
  return `${moneyFormat.format(Math.round(value))} ₽`;
}

function formatArea(value) {
  return Number.isInteger(value) ? `${value} м²` : `${String(value).replace(".", ",")} м²`;
}

function formatAreaValue(value) {
  return Number.isInteger(value) ? String(value) : String(value).replace(".", ",");
}

function getTariff() {
  return tariffs[state.level];
}

function getSecondarySurcharge() {
  return state.apartment === "Вторичка" && state.level !== "cosmetic" ? SECONDARY_PRELIMINARY_SURCHARGE : 0;
}

function getEstimate() {
  return state.area * getTariff().price + getSecondarySurcharge();
}

function getEstimateText() {
  const tariff = getTariff();
  return tariff.prefix ? `${tariff.prefix}${formatMoney(getEstimate())}` : `≈ ${formatMoney(getEstimate())}`;
}

function getEstimateBreakdownText() {
  const tariff = getTariff();
  if (!tariff.workPrice) {
    return `Работы и материалы: ${formatMoney(state.area * tariff.price)}.`;
  }
  return `Материалы: ${formatMoney(state.area * tariff.materialPrice)} · работы: ${formatMoney(state.area * tariff.workPrice)}.`;
}

function getPaymentPlan() {
  const estimate = getEstimate();
  return {
    items: [
      {
        percent: 30,
        title: "Старт",
        amount: estimate * 0.3,
        note: "после замера и договора",
      },
      {
        percent: 30,
        title: "Черновой этап",
        amount: estimate * 0.3,
        note: "после согласования черновых работ",
      },
      {
        percent: 20,
        title: "Чистовая отделка",
        amount: estimate * 0.2,
        note: "перед чистовыми работами и монтажом",
      },
      {
        percent: 20,
        title: "Приемка",
        amount: estimate * 0.2,
        note: "после приемки квартиры",
      },
    ],
  };
}

function getPaymentPlanHtml() {
  const plan = getPaymentPlan();
  return `
    <div class="payment-plan">
      <div class="payment-plan__head">
        <span>График платежей 30/30/20/20</span>
        <strong>Срок работ закрепим после замера</strong>
      </div>
      <ol class="payment-plan__list">
        ${plan.items
          .map((item) => `
            <li>
              <span class="payment-plan__percent">${item.percent}%</span>
              <div>
                <strong>${item.title}</strong>
                <small>${formatMoney(item.amount)}</small>
                <em>${item.note}</em>
              </div>
            </li>
          `)
          .join("")}
      </ol>
      <p>Это предварительная разбивка. Даты, платежи и срок работ закрепим в договоре после замера.</p>
    </div>
  `;
}

function resetTimer() {
  if (timerId) {
    window.clearInterval(timerId);
    timerId = null;
  }
  state.timerStarted = false;
  state.timerLeft = 120;
  if (timerElement) timerElement.textContent = "02:00";
}

function resetLeadResult() {
  state.leadSubmitted = false;
  state.leadPhone = "";
  if (state.leadLoadingId) {
    window.clearTimeout(state.leadLoadingId);
    state.leadLoadingId = null;
  }
  resetTimer();
  leadPanel.classList.remove("is-success");
  leadTitle.textContent = "Оставь телефон";
  leadDescription.textContent = "После отправки покажу предварительную стоимость и график платежей.";
  leadForm.hidden = false;
  leadOffer.hidden = false;
  leadLoading.hidden = true;
  successMessage.hidden = true;
}

function prepareQuizMedia() {
  if (quizMediaPreloaded) return;
  document.querySelectorAll("img[data-quiz-media][data-src]").forEach((image) => {
    image.src = image.dataset.src;
    image.removeAttribute("data-src");
  });
  quizMediaPreloaded = true;
}

function preloadQuizMediaWhenIdle() {
  if (navigator.connection?.saveData) return;
  const preload = () => prepareQuizMedia();
  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(preload, { timeout: 1800 });
    return;
  }
  window.setTimeout(preload, 900);
}

function openQuiz(trigger) {
  callbackSuppressed = true;
  hideCallbackPrompt(true);
  lastQuizTrigger = trigger || document.activeElement;
  trackMetricGoal("quiz_open", {
    placement: trigger?.dataset?.tariffOpen ? "tariff" : "general",
    tariff: trigger?.dataset?.tariffOpen || state.level,
  });
  prepareQuizMedia();
  quizModal.classList.add("is-open");
  quizModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
  updateStickyCta();
  setTimeout(() => {
    const activeChoice = document.querySelector(".slide.is-active button:not([disabled])");
    if (activeChoice) activeChoice.focus();
  }, 120);
}

function closeQuiz() {
  quizModal.classList.remove("is-open");
  quizModal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
  updateStickyCta();
  if (lastQuizTrigger && typeof lastQuizTrigger.focus === "function") {
    lastQuizTrigger.focus();
  }
}

function updateStickyCta() {
  const showAfter = Math.max(420, window.innerHeight * 0.62);
  const footerTop = contactsSection?.getBoundingClientRect().top ?? Number.POSITIVE_INFINITY;
  const isBeforeFooter = footerTop > window.innerHeight + 180;
  const shouldShow = stickyBreakpoint.matches && window.scrollY > showAfter && isBeforeFooter;
  document.body.classList.toggle("show-sticky-cta", shouldShow);
}

function setStep(nextStep) {
  const step = Math.max(0, Math.min(slides.length - 1, nextStep));
  state.step = step;
  state.maxStep = Math.max(state.maxStep, step);

  slides.forEach((slide, index) => {
    slide.classList.toggle("is-active", index === step);
    slide.classList.toggle("is-before", index < step);
  });

  progressButtons.forEach((button, index) => {
    button.disabled = index > state.maxStep;
    button.classList.toggle("is-active", index === step);
    button.classList.toggle("is-done", index < step);
  });

  stepCount.textContent = `${step + 1} / ${slides.length}`;
  stepLabel.textContent = stepLabels[step];

  if (step === 3) {
    startTimer();
    if (!state.leadSubmitted) {
      setTimeout(() => phoneInput.focus(), 120);
    }
  }
}

function renderSummary() {
  if (!summaryLine || !summaryEstimateLabel || !summaryEstimate) return;
  const tariff = getTariff();
  summaryLine.textContent = `${state.apartment} · ${formatArea(state.area)} · ${tariff.title}`;
  if (state.leadSubmitted) {
    summaryEstimateLabel.textContent = "Предварительный расчёт";
    summaryEstimate.textContent = getEstimateText();
    return;
  }
  summaryEstimateLabel.textContent = "Предварительный расчёт";
  summaryEstimate.textContent = state.step === 3 ? "после номера" : "после телефона";
}

function renderSelections() {
  document.querySelectorAll("[data-apartment]").forEach((button) => {
    button.classList.toggle("is-selected", button.dataset.apartment === state.apartment);
  });

  document.querySelectorAll("[data-area]").forEach((button) => {
    button.classList.toggle("is-selected", Number(button.dataset.area) === state.area);
  });

  document.querySelectorAll("[data-level]").forEach((button) => {
    button.classList.toggle("is-selected", button.dataset.level === state.level);
  });
}

function render() {
  renderSelections();
  renderSummary();
}

function normalizeArea(value) {
  const parsed = Number(String(value).trim().replace(",", "."));
  if (!Number.isFinite(parsed)) return null;
  return Math.max(20, Math.min(300, Math.round(parsed * 10) / 10));
}

function setArea(value, label = "Своя площадь", shouldSyncInput = true) {
  const normalizedArea = normalizeArea(value);
  if (normalizedArea === null) return false;
  state.area = normalizedArea;
  state.areaLabel = label;
  if (shouldSyncInput) {
    areaInput.value = formatAreaValue(state.area);
  }
  resetLeadResult();
  render();
  return true;
}

function validateAreaDraft(value) {
  const draft = String(value).trim();
  if (!draft) return null;
  const parsed = Number(draft.replace(",", "."));
  if (!Number.isFinite(parsed) || parsed < 20 || parsed > 300) return null;
  return Math.round(parsed * 10) / 10;
}

function formatPhone(value) {
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("8")) digits = `7${digits.slice(1)}`;
  if (digits.startsWith("77") && digits.length > 11) digits = digits.slice(1);
  const normalized = (digits.startsWith("7") ? digits : `7${digits}`).slice(0, 11);
  const rest = normalized.slice(1);
  const parts = [
    rest.slice(0, 3),
    rest.slice(3, 6),
    rest.slice(6, 8),
    rest.slice(8, 10),
  ].filter(Boolean);

  if (!parts.length) return "+7 ";
  if (parts.length === 1) return `+7 (${parts[0]}`;
  if (parts.length === 2) return `+7 (${parts[0]}) ${parts[1]}`;
  if (parts.length === 3) return `+7 (${parts[0]}) ${parts[1]}-${parts[2]}`;
  return `+7 (${parts[0]}) ${parts[1]}-${parts[2]}-${parts[3]}`;
}

function createLeadPayload() {
  return {
    apartment: state.apartment,
    area: state.area,
    areaLabel: state.areaLabel,
    level: state.level,
    levelTitle: getTariff().title,
    pricePerMeter: getTariff().price,
    materialPricePerMeter: getTariff().materialPrice,
    workPricePerMeter: getTariff().workPrice,
    secondarySurcharge: getSecondarySurcharge(),
    preliminaryEstimate: getEstimate(),
    phone: state.leadPhone,
    source: window.location.href,
    submittedAt: new Date().toISOString(),
  };
}

async function sendLeadToMax(payload) {
  if (!leadEndpoint) return { status: "not-configured" };

  const response = await fetch(leadEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) throw new Error(`Lead endpoint responded with ${response.status}`);
  return { status: "sent" };
}

function waitFor(milliseconds) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

function startTimer() {
  if (state.timerStarted) return;
  state.timerStarted = true;
  timerId = window.setInterval(() => {
    state.timerLeft = Math.max(0, state.timerLeft - 1);
    const minutes = String(Math.floor(state.timerLeft / 60)).padStart(2, "0");
    const seconds = String(state.timerLeft % 60).padStart(2, "0");
    timerElement.textContent = `${minutes}:${seconds}`;
    if (state.timerLeft === 0 && timerId) {
      window.clearInterval(timerId);
      timerId = null;
      timerElement.textContent = "можно отправить";
    }
  }, 1000);
}

function hasDismissedCallback() {
  try {
    return window.sessionStorage.getItem("verh-callback-dismissed") === "1";
  } catch {
    return false;
  }
}

function rememberCallbackDismissal() {
  try {
    window.sessionStorage.setItem("verh-callback-dismissed", "1");
  } catch {
    // The prompt still closes when storage is unavailable.
  }
}

function hideCallbackPrompt(remember = false) {
  if (!callbackPrompt) return;
  callbackPrompt.classList.remove("is-visible");
  callbackPrompt.setAttribute("aria-hidden", "true");
  if (remember) rememberCallbackDismissal();
}

function showCallbackPrompt() {
  if (!callbackPrompt || callbackSuppressed || hasDismissedCallback()) return;
  callbackPrompt.classList.add("is-visible");
  callbackPrompt.setAttribute("aria-hidden", "false");
  trackMetricGoal("callback_prompt_shown");
}

function scheduleCallbackPrompt(delay = 24000) {
  if (!callbackPrompt || callbackSuppressed || hasDismissedCallback()) return;
  if (callbackTimerId) window.clearTimeout(callbackTimerId);
  callbackTimerId = window.setTimeout(() => {
    callbackTimerId = null;
    if (document.visibilityState !== "visible" || quizModal.classList.contains("is-open")) {
      scheduleCallbackPrompt(15000);
      return;
    }
    showCallbackPrompt();
  }, delay);
}

quizOpenButtons.forEach((button) => {
  button.addEventListener("pointerenter", prepareQuizMedia, { once: true });
  button.addEventListener("focus", prepareQuizMedia, { once: true });
  button.addEventListener("touchstart", prepareQuizMedia, { once: true, passive: true });
  button.addEventListener("click", () => {
    resetLeadResult();
    state.maxStep = 0;
    setStep(0);
    openQuiz(button);
  });
});

document.querySelectorAll("[data-tariff-open]").forEach((button) => {
  button.addEventListener("click", () => {
    state.level = button.dataset.tariffOpen;
    trackMetricGoal("tariff_selected", { tariff: state.level });
    resetLeadResult();
    render();
    state.maxStep = 0;
    setStep(0);
    openQuiz(button);
  });
});

quizCloseButtons.forEach((button) => {
  button.addEventListener("click", closeQuiz);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && quizModal.classList.contains("is-open")) {
    closeQuiz();
  }
});

window.addEventListener("scroll", updateStickyCta, { passive: true });
window.addEventListener("resize", updateStickyCta);

document.querySelectorAll("[data-apartment]").forEach((button) => {
  button.addEventListener("click", () => {
    state.apartment = button.dataset.apartment;
    trackMetricGoal("quiz_apartment_selected", { apartment: state.apartment });
    resetLeadResult();
    render();
    setStep(1);
  });
});

document.querySelectorAll("[data-area]").forEach((button) => {
  button.addEventListener("click", () => {
    setArea(button.dataset.area, button.dataset.areaLabel);
    trackMetricGoal("quiz_area_selected", { area: state.area, area_label: state.areaLabel });
    setStep(2);
  });
});

document.querySelector("#area-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const area = validateAreaDraft(areaInput.value);
  if (area === null) {
    areaInput.setCustomValidity("Введи площадь от 20 до 300 м².");
    areaInput.reportValidity();
    return;
  }
  areaInput.setCustomValidity("");
  setArea(area);
  trackMetricGoal("quiz_area_selected", { area: state.area, area_label: state.areaLabel });
  setStep(2);
});

areaInput.addEventListener("focus", () => {
  setTimeout(() => areaInput.select(), 0);
});

areaInput.addEventListener("input", () => {
  areaInput.setCustomValidity("");
  const area = validateAreaDraft(areaInput.value);
  if (area === null) return;
  setArea(area, "Своя площадь", false);
});

document.querySelectorAll("[data-level]").forEach((button) => {
  button.addEventListener("click", () => {
    state.level = button.dataset.level;
    trackMetricGoal("quiz_tariff_selected", { tariff: state.level });
    resetLeadResult();
    render();
    setStep(3);
  });
});

progressButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setStep(Number(button.dataset.stepNav));
  });
});

phoneInput.addEventListener("focus", () => {
  if (!phoneInput.value) phoneInput.value = "+7 ";
});

phoneInput.addEventListener("input", () => {
  phoneInput.value = formatPhone(phoneInput.value);
  phoneInput.setCustomValidity("");
});

callbackCloseButton?.addEventListener("click", () => {
  hideCallbackPrompt(true);
  trackMetricGoal("callback_prompt_dismissed");
});

callbackPhone?.addEventListener("focus", () => {
  if (!callbackPhone.value) callbackPhone.value = "+7 ";
});

callbackPhone?.addEventListener("input", () => {
  callbackPhone.value = formatPhone(callbackPhone.value);
  callbackPhone.setCustomValidity("");
});

callbackForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  callbackPhone.setCustomValidity("");
  const digits = callbackPhone.value.replace(/\D/g, "");
  if (digits.length < 11) {
    callbackPhone.setCustomValidity("Укажи номер, чтобы мы могли перезвонить.");
    callbackPhone.reportValidity();
    return;
  }

  if (!callbackForm.reportValidity()) return;
  const submitButton = callbackForm.querySelector("button[type='submit']");
  submitButton.disabled = true;
  submitButton.textContent = "Отправляю…";
  callbackStatus.textContent = "";
  trackMetricGoal("callback_submit_attempt");

  try {
    await sendLeadToMax({
      kind: "callback",
      phone: callbackPhone.value.trim(),
      source: window.location.href,
      submittedAt: new Date().toISOString(),
    });
    callbackForm.hidden = true;
    callbackStatus.textContent = "Готово. Перезвоним по этому номеру.";
    callbackStatus.classList.add("is-success");
    callbackSuppressed = true;
    rememberCallbackDismissal();
    trackMetricGoal("callback_requested");
    trackMetricGoal("callback_lead_success");
  } catch {
    trackMetricGoal("callback_lead_failure");
    callbackStatus.textContent = "Не получилось отправить номер. Попробуй ещё раз или позвони нам с сайта.";
    callbackStatus.classList.remove("is-success");
    submitButton.disabled = false;
    submitButton.textContent = "Перезвони мне";
  }
});

leadForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  phoneInput.setCustomValidity("");
  const digits = phoneInput.value.replace(/\D/g, "");
  if (digits.length < 11) {
    phoneInput.setCustomValidity("Нужен телефон, чтобы показать расчет.");
    phoneInput.reportValidity();
    return;
  }
  if (!leadForm.reportValidity()) return;
  state.leadPhone = phoneInput.value.trim();
  const leadMetricParams = {
    apartment: state.apartment,
    area: state.area,
    tariff: state.level,
  };
  trackMetricGoal("quiz_submit_attempt", leadMetricParams);
  state.leadSubmitted = false;
  leadForm.hidden = true;
  leadOffer.hidden = true;
  leadLoading.hidden = false;
  successMessage.hidden = true;
  if (timerId) {
    window.clearInterval(timerId);
    timerId = null;
  }
  render();

  try {
    const [delivery] = await Promise.all([
      sendLeadToMax(createLeadPayload()),
      waitFor(1200),
    ]);

    state.leadSubmitted = true;
    leadPanel.classList.add("is-success");
    leadTitle.textContent = "Предварительный расчёт готов";
    leadDescription.textContent = "Ниже ориентир стоимости и график платежей 30/30/20/20.";
    leadLoading.hidden = true;
    successMessage.hidden = false;
    const secondaryNote = getSecondarySurcharge()
      ? `<span>В расчёт включены ${formatMoney(getSecondarySurcharge())} на демонтаж для вторички. Итоговую смету уточним после осмотра квартиры.</span>`
      : "";
    const deliveryNote = delivery.status === "sent"
      ? "<span>Заявка отправлена в рабочую группу. Игорь свяжется с тобой, чтобы согласовать замер.</span>"
      : "<span class=\"delivery-note\">Тестовая версия: доставка заявок в MAX подключается отдельно. Расчёт работает, но номер пока не отправляется в рабочую группу.</span>";
    successMessage.innerHTML = `
      <strong>Предварительный расчёт: ${getEstimateText()}.</strong>
      <span>${getEstimateBreakdownText()}</span>
      <span>${state.apartment}, ${formatArea(state.area)}, ${getTariff().title}. Это предварительный расчет, точную смету закрепим после замера.</span>
      ${secondaryNote}
      ${deliveryNote}
      ${getPaymentPlanHtml()}
    `;
    trackMetricGoal(delivery.status === "sent" ? "quiz_lead_success" : "quiz_calculation_viewed", leadMetricParams);
    render();
  } catch (error) {
    trackMetricGoal("quiz_lead_failure", leadMetricParams);
    state.leadSubmitted = true;
    leadPanel.classList.add("is-success");
    leadTitle.textContent = "Предварительный расчёт готов";
    leadDescription.textContent = "Показываем ориентир и график платежей ниже.";
    leadLoading.hidden = true;
    successMessage.hidden = false;
    successMessage.innerHTML = `
      <strong>Предварительный расчёт: ${getEstimateText()}.</strong>
      <span>${getEstimateBreakdownText()}</span>
      <span>${state.apartment}, ${formatArea(state.area)}, ${getTariff().title}. Точную смету закрепим после замера.</span>
      <span class="delivery-note">Не удалось передать заявку в рабочую группу. Позвони нам по номеру на сайте, чтобы согласовать замер.</span>
      ${getPaymentPlanHtml()}
    `;
    render();
  }
});

render();
initDeferredProjectGallery();
initCallActions();
initMobileCallAction();
initYandexReviews();
setStep(0);
updateStickyCta();
preloadQuizMediaWhenIdle();
scheduleCallbackPrompt(callbackPromptDelay);
