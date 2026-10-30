(() => {
"use strict";

// Keep tracking and quiz controls private, without changing file/preview support.
const mainAnalytics = (() => {
  const preview = Boolean(window.VERH_PREVIEW) || location.protocol === "file:" || ["localhost", "127.0.0.1"].includes(location.hostname);
  const names = new Set(["main_landing_view", "main_section_view", "main_interaction", "main_messenger_click", "main_service_click", "main_quiz_contact", "main_quiz_close", "main_validation_error", "quiz_open", "quiz_apartment_selected", "quiz_area_selected", "quiz_tariff_selected", "quiz_submit_attempt", "quiz_lead_success", "quiz_lead_failure", "quiz_calculation_viewed", "tariff_selected", "phone_reveal", "phone_call", "callback_prompt_shown", "callback_prompt_dismissed", "callback_submit_attempt", "callback_requested", "callback_lead_success", "callback_lead_failure", "theme_switch", "hero_headline_exposure"]);
  const enums = {
    action:["navigation", "legal", "project_filter", "project_scroll", "project_photo", "project_view", "step_back", "theme", "callback_dismiss"],
    placement:["header", "hero", "top", "tariffs", "design-gift", "materials", "payments", "services", "reviews", "contacts", "footer", "mobile_sticky", "tariff", "general", "page", "quiz", "callback"],
    tariff:["cosmetic", "standard", "comfort", "lux"],
    field:["phone", "consent", "area", "form"],
    channel:["max", "telegram"],
    service:["dizayn-proekt", "priemka-kvartiry", "ukladka-laminata", "pokleyka-oboev", "shpaklevka-sten", "ukladka-plitki", "razvodka-santehniki", "natyazhnoy-potolok", "all"],
    section:["top", "projects", "tariffs", "design-gift", "materials", "payments", "services", "reviews", "contacts"],
    control:["all", "standard", "comfort", "lux", "details", "slider", "grid", "contract", "privacy", "consent", "company", "top", "projects", "tariffs", "payments", "services", "contacts"],
    outcome:["delivered", "not_delivered"], theme:["light", "dark"], variant:["control", "trust"], experiment:["hero-headline-v1"],
  };
  const pending = [];
  let retryTimer = null;
  let retryCount = 0;
  function flush() {
    retryTimer = null;
    if (typeof window.ym !== "function") {
      if (pending.length && retryCount++ < 60) retryTimer = window.setTimeout(flush, 1000);
      else pending.length = 0;
      return;
    }
    retryCount = 0;
    while (pending.length) {
      const event = pending.shift();
      try { window.ym(110859289,"reachGoal",event.name,event.params); } catch { /* Do not retry ambiguous sends or interfere with the form. */ }
    }
  }
  function track(name, params = {}) {
    if (preview || !names.has(name)) return;
    if (name === "theme_switch") { name = "main_interaction"; params = {...params,action:"theme"}; }
    if (name === "callback_prompt_dismissed") { name = "main_interaction"; params = {...params,action:"callback_dismiss",placement:"callback"}; }
    const safe = {landing:"repair_main"};
    for (const [key,value] of Object.entries(params)) {
      if (enums[key]?.includes(value)) safe[key] = value;
      else if (key === "step" && Number.isInteger(value) && value >= 1 && value <= 4) safe.step = value;
      else if (key === "apartment" && ["Новостройка", "Вторичка"].includes(value)) safe.apartment_type = value === "Новостройка" ? "new" : "resale";
    }
    if (pending.length < 100) pending.push({name,params:safe});
    if (retryTimer === null) flush();
  }
  const placement = element => element?.closest(".mobile-sticky-cta") ? "mobile_sticky" : element?.closest(".site-header") ? "header" : element?.closest("footer") ? "footer" : element?.closest("section[id]")?.id || "page";
  track("main_landing_view");
  const attempted = new WeakSet();
  function trackAttempt(form) {
    if (form?.id !== "lead-form" || !isQuizStep(3) || state.maxStep < 3 || form.dataset?.sending === "true" || attempted.has(form)) return;
    attempted.add(form);
    window.setTimeout(() => attempted.delete(form), 0);
    track("quiz_submit_attempt",{placement:"quiz",step:4});
  }
  document.addEventListener("click", event => {
    if (event.isTrusted === false) return;
    const photo = event.target.closest("[data-project-photo]");
    if (photo?.dataset?.projectPhoto !== undefined) track("main_interaction",{action:"project_photo",placement:"page"});
    const view = event.target.closest("[data-project-view]");
    if (view?.dataset?.projectView) track("main_interaction",{action:"project_view",control:view.dataset.projectView,placement:"page"});
    const button = event.target.closest('button[type="submit"], input[type="submit"]');
    if (button && !button.disabled) trackAttempt(button.form);
  },true);
  document.addEventListener("submit", event => {
    if (event.isTrusted !== false) trackAttempt(event.target);
  },true);
  document.addEventListener("invalid", event => {
    if (event.isTrusted === false) return;
    const form = event.target.closest("form");
    if (!["lead-form", "callback-form", "area-form"].includes(form?.id)) return;
    if (form.id === "lead-form" && !isQuizStep(3) || form.id === "area-form" && !isQuizStep(1)) return;
    trackAttempt(form);
    const field = event.target.name === "personal_data_consent" ? "consent" : ["phone", "area"].includes(event.target.name) ? event.target.name : "form";
    track("main_validation_error", {field,placement:form.id === "callback-form" ? "callback" : "quiz",step:form.id === "area-form" ? 2 : 4});
  },true);
  document.querySelectorAll("a[href]").forEach(link => link.addEventListener("click", event => {
    if (event.isTrusted === false) return;
    const raw = link.getAttribute("href") || "";
    const at = placement(link);
    if (raw.startsWith("tel:")) return;
    let url;
    try { url = new URL(raw,location.href); } catch { return; }
    if (["max.ru", "t.me"].includes(url.hostname)) track("main_messenger_click",{channel:url.hostname === "max.ru" ? "max" : "telegram",placement:at});
    else if (url.origin === location.origin && (url.pathname.startsWith("/uslugi/") || url.pathname === "/design/" || url.pathname === "/design")) {
      const service = url.pathname === "/design/" || url.pathname === "/design" ? "dizayn-proekt" : url.pathname.split("/").filter(Boolean)[1] || "all";
      track("main_service_click",{service,placement:at});
    } else if (raw.startsWith("#")) track("main_interaction",{action:"navigation",control:raw.slice(1),placement:at});
    else {
      const control = url.pathname.endsWith("contract.html") ? "contract" : url.pathname.endsWith("privacy.html") ? "privacy" : url.pathname.endsWith("consent.html") ? "consent" : url.hostname === "www.rusprofile.ru" ? "company" : null;
      if (control) track("main_interaction",{action:"legal",control,placement:at});
    }
  }));
  document.querySelectorAll("[data-project-filter]").forEach(button => button.addEventListener("click", event => {
    if (event.isTrusted !== false) track("main_interaction",{action:"project_filter",control:button.dataset.projectFilter,placement:"page"});
  }));
  const gallery = document.querySelector("[data-project-track]");
  let galleryScrollTracked = false;
  gallery?.addEventListener("scroll", () => {
    if (galleryScrollTracked || gallery.scrollLeft < 40) return;
    galleryScrollTracked = true;
    track("main_interaction",{action:"project_scroll",placement:"page"});
  },{passive:true});
  if (typeof IntersectionObserver === "function") {
    const seen = new Set();
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (!entry.isIntersecting || seen.has(entry.target.id)) return;
      seen.add(entry.target.id);
      track("main_section_view",{section:entry.target.id});
      observer.unobserve(entry.target);
    }),{threshold:0.1});
    document.querySelectorAll("main section[id]").forEach(section => observer.observe(section));
  }
  return Object.freeze({track,placement});
})();

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

  if (track) trackMetricGoal("theme_switch", { theme });
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

function trackMetricGoal(goal, params = {}) {
  if (window.VERH_PREVIEW || location.protocol === "file:" || ["localhost", "127.0.0.1"].includes(location.hostname)) return;
  const heroVariant = window.VERH_HERO_VARIANT;
  const experimentParams = heroVariant === "control" || heroVariant === "trust"
    ? { experiment: "hero-headline-v1", variant: heroVariant }
    : {};
  try {
    mainAnalytics.track(goal, { ...params, ...experimentParams });
  } catch { /* A delivered lead must never become a retry because analytics failed. */ }
}

trackMetricGoal("hero_headline_exposure");

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
  if (timerElement) {
    timerElement.textContent = "02:00";
    timerElement.classList.remove("is-ready");
  }
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
  leadPanel.classList.remove("is-error");
  leadForm.querySelector('[type="submit"]').textContent = "Получить предварительный расчёт";
  leadTitle.textContent = "Оставь телефон";
  leadDescription.textContent = "После отправки покажем ориентир стоимости. Точную смету закрепим после замера.";
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
  slides.forEach((slide) => { slide.inert = !slide.classList.contains("is-active"); });
  callbackSuppressed = true;
  hideCallbackPrompt(true);
  lastQuizTrigger = trigger || document.activeElement;
  trackMetricGoal("quiz_open", {
    placement: mainAnalytics.placement(trigger) || (trigger?.dataset?.tariffOpen ? "tariff" : "general"),
    tariff: trigger?.dataset?.tariffOpen || state.level,
  });
  prepareQuizMedia();
  quizModal.classList.add("is-open");
  quizModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
  updateStickyCta();
  setTimeout(() => {
    if (!quizModal.classList.contains("is-open")) return;
    const activeChoice = document.querySelector(".slide.is-active button:not([disabled])");
    if (activeChoice) activeChoice.focus();
  }, 120);
}

function closeQuiz() {
  if (quizModal.classList.contains("is-open")) trackMetricGoal("main_quiz_close", {step:state.step+1,outcome:state.leadSubmitted ? "delivered" : "not_delivered"});
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

function isQuizStep(step) {
  return quizModal.classList.contains("is-open") && state.step === step;
}

function setStep(nextStep) {
  const previousStep = state.step;
  const step = Math.max(0, Math.min(slides.length - 1, nextStep));
  state.step = step;
  state.maxStep = Math.max(state.maxStep, step);
  if (step !== previousStep && quizModal.classList.contains("is-open")) {
    if (step === 3) trackMetricGoal("main_quiz_contact", {step:4});
    if (step < previousStep) trackMetricGoal("main_interaction", {action:"step_back",step:step+1,placement:"quiz"});
  }

  slides.forEach((slide, index) => {
    slide.classList.toggle("is-active", index === step);
    slide.classList.toggle("is-before", index < step);
    slide.inert = index !== step;
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
      setTimeout(() => {
        if (quizModal.classList.contains("is-open") && state.step === 3 && !leadForm.hidden) phoneInput.focus();
      }, 120);
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
  const designGift = document.querySelector('[data-design-gift]');
  if (designGift) designGift.hidden = !["comfort", "lux"].includes(state.level);
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
    emergencyTimeoutFallback: 'repair-main-timeout-v1',
    source: window.VerhLead.source().href,
    submittedAt: new Date().toISOString(),
  };
}

async function sendLeadToMax(payload) {
  return window.VerhLead.send(leadEndpoint, payload);
}

function waitFor(milliseconds) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

function startTimer() {
  if (!timerElement) return;
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
      timerElement.classList.add("is-ready");
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
  button.addEventListener("click", event => {
    if (event.isTrusted === false) return;
    resetLeadResult();
    state.maxStep = 0;
    setStep(0);
    openQuiz(button);
  });
});

document.querySelectorAll("[data-tariff-open]").forEach((button) => {
  button.addEventListener("click", event => {
    if (event.isTrusted === false) return;
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
  button.addEventListener("click", event => {
    if (event.isTrusted !== false) closeQuiz();
  });
});

document.addEventListener("keydown", (event) => {
  if (event.isTrusted === false) return;
  if (event.key === "Escape" && quizModal.classList.contains("is-open")) {
    closeQuiz();
  }
  if (event.key === "Tab" && quizModal.classList.contains("is-open")) {
    const items = [...quizModal.querySelectorAll('button, a[href], input, select, textarea, [tabindex]')]
      .filter((element) => !element.disabled && element.tabIndex >= 0 && !element.closest('[inert]') && element.getClientRects().length && getComputedStyle(element).visibility !== "hidden");
    const first = items[0];
    const last = items[items.length - 1];
    if (first && ((!event.shiftKey && document.activeElement === last) || (event.shiftKey && document.activeElement === first) || !quizModal.contains(document.activeElement))) {
      event.preventDefault();
      (event.shiftKey ? last : first).focus();
    }
  }
});

window.addEventListener("scroll", updateStickyCta, { passive: true });
window.addEventListener("resize", updateStickyCta);

document.querySelectorAll("[data-apartment]").forEach((button) => {
  button.addEventListener("click", event => {
    if (event.isTrusted === false || !isQuizStep(0)) return;
    if (!["Новостройка", "Вторичка"].includes(button.dataset.apartment)) return;
    state.apartment = button.dataset.apartment;
    trackMetricGoal("quiz_apartment_selected", { apartment: state.apartment });
    resetLeadResult();
    render();
    setStep(1);
  });
});

document.querySelectorAll("[data-area]").forEach((button) => {
  button.addEventListener("click", event => {
    if (event.isTrusted === false || !isQuizStep(1)) return;
    if (validateAreaDraft(button.dataset.area) === null) return;
    setArea(button.dataset.area, button.dataset.areaLabel);
    trackMetricGoal("quiz_area_selected", { area: state.area, area_label: state.areaLabel });
    setStep(2);
  });
});

document.querySelector("#area-form").addEventListener("submit", (event) => {
  event.preventDefault();
  if (event.isTrusted === false || !isQuizStep(1)) return;
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
  button.addEventListener("click", event => {
    if (event.isTrusted === false || !isQuizStep(2)) return;
    if (!Object.prototype.hasOwnProperty.call(tariffs, button.dataset.level)) return;
    state.level = button.dataset.level;
    trackMetricGoal("quiz_tariff_selected", { tariff: state.level });
    resetLeadResult();
    render();
    setStep(3);
  });
});

progressButtons.forEach((button) => {
  button.addEventListener("click", event => {
    const step = Number(button.dataset.stepNav);
    if (event.isTrusted === false || !quizModal.classList.contains("is-open") || !Number.isInteger(step) || step < 0 || step > state.maxStep) return;
    setStep(step);
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
    const delivery = await sendLeadToMax({
      kind: "callback",
      phone: callbackPhone.value.trim(),
      source: window.VerhLead.source().href,
      submittedAt: new Date().toISOString(),
    });
    callbackForm.hidden = true;
    callbackStatus.textContent = "Готово. Перезвоним по этому номеру.";
    callbackStatus.classList.add("is-success");
    callbackSuppressed = true;
    rememberCallbackDismissal();
    if (delivery.status !== "unverified") {
      trackMetricGoal("callback_requested");
      trackMetricGoal("callback_lead_success");
    }
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
  if (event.isTrusted === false || !isQuizStep(3) || state.maxStep < 3) return;
  if (leadForm.dataset.sending === "true") return;
  phoneInput.setCustomValidity("");
  const digits = phoneInput.value.replace(/\D/g, "");
  if (digits.length < 11) {
    phoneInput.setCustomValidity("Нужен телефон, чтобы показать расчет.");
    phoneInput.reportValidity();
    return;
  }
  if (!leadForm.reportValidity()) return;
  leadForm.dataset.sending = "true";
  leadPanel.classList.remove("is-error");
  state.leadPhone = phoneInput.value.trim();
  const leadMetricParams = {
    apartment: state.apartment,
    area: state.area,
    tariff: state.level,
  };
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
      : delivery.status === "unverified"
      ? "<span>Заявка передана в рабочую группу для проверки. Игорь свяжется с тобой по указанному номеру.</span>"
      : "<span class=\"delivery-note\">Тестовая версия: доставка заявок в MAX подключается отдельно. Расчёт работает, но номер пока не отправляется в рабочую группу.</span>";
    successMessage.innerHTML = `
      <strong>Предварительный расчёт: ${getEstimateText()}.</strong>
      <span>${getEstimateBreakdownText()}</span>
      <span>${state.apartment}, ${formatArea(state.area)}, ${getTariff().title}. Это предварительный расчет, точную смету закрепим после замера.</span>
      ${secondaryNote}
      ${deliveryNote}
      ${getPaymentPlanHtml()}
    `;
    if (delivery.status !== "unverified") trackMetricGoal(delivery.status === "sent" ? "quiz_lead_success" : "quiz_calculation_viewed", leadMetricParams);
    render();
  } catch (error) {
    trackMetricGoal("quiz_lead_failure", leadMetricParams);
    state.leadSubmitted = false;
    leadPanel.classList.remove("is-success");
    leadPanel.classList.add("is-error");
    leadTitle.textContent = "Отправка не подтверждена";
    leadDescription.textContent = "Не получили подтверждение доставки. Номер и ответы сохранены: можно повторить отправку или позвонить.";
    leadForm.hidden = false;
    leadForm.querySelector('[type="submit"]').textContent = "Повторить отправку";
    leadLoading.hidden = true;
    successMessage.hidden = false;
    successMessage.innerHTML = `
      <strong>Предварительный расчёт: ${getEstimateText()}.</strong>
      <span>${getEstimateBreakdownText()}</span>
      <span>${state.apartment}, ${formatArea(state.area)}, ${getTariff().title}. Точную смету закрепим после замера.</span>
      <a href="tel:+79182383059">Позвонить: +7 (918) 238-30-59</a>
    `;
    render();
    leadTitle.tabIndex = -1;
    if (quizModal.classList.contains("is-open")) leadTitle.focus();
  } finally {
    delete leadForm.dataset.sending;
  }
});

render();
initCallActions();
initMobileCallAction();
initYandexReviews();
setStep(0);
updateStickyCta();
preloadQuizMediaWhenIdle();
scheduleCallbackPrompt(callbackPromptDelay);
function markLoadFormReady() {
  if (typeof window.VerhLead?.send === "function") {
    try { window.VerhLoad?.mark("form_ready"); } catch {}
  }
}
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded",markLoadFormReady,{once:true});
else markLoadFormReady();
})();
