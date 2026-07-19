document.documentElement.classList.add("has-js");

const tariffs = {
  standard: {
    title: "Стандарт",
    price: 20000,
    prefix: "",
    included: [
      "работа по ремонту квартиры под ключ",
      "черновые материалы и подготовка основания",
      "плитка, пол, стены, двери и потолки уровня Стандарт",
      "базовая сантехника и свет",
      "смета, договор и график этапов",
    ],
  },
  comfort: {
    title: "Комфорт",
    price: 25000,
    prefix: "",
    included: [
      "работа по ремонту квартиры под ключ",
      "черновые материалы и подготовка основания",
      "расширенный выбор плитки, пола и покрытий стен",
      "сантехника, свет, двери, ниши и дополнительная электрика",
      "смета, договор и график этапов",
    ],
  },
  lux: {
    title: "Люкс",
    price: 29000,
    prefix: "от ",
    included: [
      "работа по ремонту квартиры под ключ",
      "материалы и комплектация под проект",
      "сложные узлы, световые сценарии и комплектация",
      "смета, договор и график этапов",
    ],
  },
};

const SECONDARY_PRELIMINARY_SURCHARGE = 100000;
const leadEndpoint = typeof window.VERH_LEAD_ENDPOINT === "string" ? window.VERH_LEAD_ENDPOINT.trim() : "";

const stepLabels = [
  "Старт",
  "Площадь",
  "Отделка",
  "Что входит",
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
const includedList = document.querySelector("#included-list");
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

let lastQuizTrigger = null;
let timerId = null;

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

const projectGalleryItems = [
  ["standard", "Стандарт", "Кухня-гостиная", "standard/standard_01_msg184.webp"],
  ["standard", "Стандарт", "Коридор", "standard/standard_02_msg185.webp"],
  ["standard", "Стандарт", "Санузел", "standard/standard_03_msg186.webp"],
  ["standard", "Стандарт", "Комната", "standard/standard_04_msg187.webp"],
  ["standard", "Стандарт", "Ванная", "standard/standard_05_msg188.webp"],
  ["standard", "Стандарт", "Пол", "standard/standard_06_msg189.webp"],
  ["standard", "Стандарт", "Комната", "standard/standard_07_msg221.webp"],
  ["standard", "Стандарт", "Спальня", "standard/standard_08_msg222.webp"],
  ["standard", "Стандарт", "Комната", "standard/standard_09_msg223.webp"],
  ["standard", "Стандарт", "Комната", "standard/standard_10_msg224.webp"],
  ["standard", "Стандарт", "Санузел", "standard/standard_11_msg225.webp"],
  ["standard", "Стандарт", "Балкон", "standard/standard_12_msg226.webp"],
  ["comfort", "Комфорт", "Кухня-гостиная", "comfort/comfort_01_msg170.webp"],
  ["comfort", "Комфорт", "Зеркала", "comfort/comfort_02_msg171.webp"],
  ["comfort", "Комфорт", "Душевая", "comfort/comfort_03_msg172.webp"],
  ["comfort", "Комфорт", "Кухня", "comfort/comfort_04_msg173.webp"],
  ["comfort", "Комфорт", "Комната", "comfort/comfort_05_msg174.webp"],
  ["comfort", "Комфорт", "Санузел", "comfort/comfort_06_msg175.webp"],
  ["comfort", "Комфорт", "Ванная", "comfort/comfort_07_msg176.webp"],
  ["comfort", "Комфорт", "Санузел", "comfort/comfort_08_msg214.webp"],
  ["comfort", "Комфорт", "Ванная", "comfort/comfort_09_msg215.webp"],
  ["comfort", "Комфорт", "Санузел", "comfort/comfort_10_msg216.webp"],
  ["comfort", "Комфорт", "Кухня", "comfort/comfort_11_msg217.webp"],
  ["comfort", "Комфорт", "Спальня", "comfort/comfort_12_msg218.webp"],
  ["comfort", "Комфорт", "Спальня", "comfort/comfort_13_msg219.webp"],
  ["comfort", "Комфорт", "Комната", "comfort/comfort_14_msg220.webp"],
  ["lux", "Люкс", "Спальня", "lux/lux_01_msg178.webp"],
  ["lux", "Люкс", "Панорамные окна", "lux/lux_02_msg179.webp"],
  ["lux", "Люкс", "Гостиная", "lux/lux_03_msg180.webp"],
  ["lux", "Люкс", "Кухня-гостиная", "lux/lux_04_msg181.webp"],
  ["lux", "Люкс", "Санузел", "lux/lux_05_msg182.webp"],
  ["lux", "Люкс", "Ванная", "lux/lux_06_msg183.webp"],
  ...Array.from({ length: 24 }, (_, index) => [
    "details",
    "Свет и детали",
    `Свет и потолок · ${String(index + 1).padStart(2, "0")}`,
    `details/unclassified_${String(index + 1).padStart(2, "0")}_msg${190 + index}.webp`,
  ]),
].map(([category, tier, title, path]) => ({ category, tier, title, path }));

function initProjectGallery() {
  const gallery = document.querySelector("[data-project-gallery]");
  if (!gallery) return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const assetsPrefix = (gallery.dataset.projectAssetsPrefix || "assets/projects").replace(/\/$/, "");
  const image = gallery.querySelector("[data-project-image]");
  const meta = gallery.querySelector("[data-project-meta]");
  const title = gallery.querySelector("[data-project-title]");
  const count = gallery.querySelector("[data-project-count]");
  const thumbs = gallery.querySelector("[data-project-thumbs]");
  const media = gallery.querySelector("[data-project-swipe]");
  const prevButton = gallery.querySelector("[data-project-prev]");
  const nextButton = gallery.querySelector("[data-project-next]");
  const filters = [...gallery.querySelectorAll("[data-project-filter]")];

  if (!image || !meta || !title || !count || !thumbs || !media) return;

  let activeCategory = "all";
  let activeIndex = 0;
  let swipeStartX = null;

  const getItems = () => projectGalleryItems.filter((item) => activeCategory === "all" || item.category === activeCategory);
  const sourceFor = (item) => `${assetsPrefix}/${item.path}`;

  const updateFilters = () => {
    filters.forEach((filter) => {
      const isActive = filter.dataset.projectFilter === activeCategory;
      filter.classList.toggle("is-active", isActive);
      filter.setAttribute("aria-selected", String(isActive));
    });
  };

  const renderThumbs = () => {
    thumbs.innerHTML = getItems()
      .map((item, index) => `
        <button class="project-gallery__thumb${index === activeIndex ? " is-active" : ""}" type="button" data-project-thumb="${index}" aria-label="Открыть: ${item.tier}, ${item.title}"${index === activeIndex ? " aria-current=\"true\"" : ""}>
          <img src="${sourceFor(item)}" alt="" loading="lazy" decoding="async" />
        </button>
      `)
      .join("");
  };

  const preloadNeighbours = () => {
    const items = getItems();
    if (items.length < 2) return;
    [1, -1].forEach((offset) => {
      const nextItem = items[(activeIndex + offset + items.length) % items.length];
      const preload = new Image();
      preload.src = sourceFor(nextItem);
    });
  };

  const setSlide = (nextIndex, { scrollThumb = true } = {}) => {
    const items = getItems();
    if (!items.length) return;

    activeIndex = (nextIndex + items.length) % items.length;
    const item = items[activeIndex];
    const applySlide = () => {
      image.classList.add("is-changing");
      image.src = sourceFor(item);
      image.alt = `${item.tier}: ${item.title}. Реальный объект ВЕРХ ремонта`;
      image.dataset.projectPath = item.path;
      meta.textContent = `${item.tier} · реальный объект`;
      title.textContent = item.title;
      count.textContent = `${activeIndex + 1} / ${items.length}`;
      renderThumbs();
      const activeThumb = thumbs.querySelector(".project-gallery__thumb.is-active");
      if (scrollThumb) {
        activeThumb?.scrollIntoView({
          behavior: reduceMotion.matches ? "auto" : "smooth",
          block: "nearest",
          inline: "nearest",
        });
      }
      window.setTimeout(() => image.classList.remove("is-changing"), reduceMotion.matches ? 0 : 180);
      preloadNeighbours();
    };

    if (image.dataset.projectPath === item.path) {
      applySlide();
      return;
    }

    const preload = new Image();
    preload.onload = applySlide;
    preload.onerror = applySlide;
    preload.src = sourceFor(item);
  };

  const switchCategory = (category) => {
    activeCategory = category;
    activeIndex = 0;
    updateFilters();
    setSlide(0, { scrollThumb: false });
  };

  filters.forEach((filter) => {
    filter.addEventListener("click", () => switchCategory(filter.dataset.projectFilter || "all"));
  });

  thumbs.addEventListener("click", (event) => {
    const thumb = event.target.closest("[data-project-thumb]");
    if (!thumb) return;
    setSlide(Number(thumb.dataset.projectThumb));
  });

  prevButton?.addEventListener("click", () => setSlide(activeIndex - 1));
  nextButton?.addEventListener("click", () => setSlide(activeIndex + 1));

  media.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      setSlide(activeIndex - 1);
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      setSlide(activeIndex + 1);
    }
  });

  media.addEventListener("pointerdown", (event) => {
    swipeStartX = event.clientX;
  });

  media.addEventListener("pointerup", (event) => {
    if (swipeStartX === null) return;
    const distance = event.clientX - swipeStartX;
    swipeStartX = null;
    if (Math.abs(distance) < 44) return;
    setSlide(activeIndex + (distance < 0 ? 1 : -1));
  });

  media.addEventListener("pointercancel", () => {
    swipeStartX = null;
  });

  updateFilters();
  setSlide(0, { scrollThumb: false });
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
  return state.apartment === "Вторичка" ? SECONDARY_PRELIMINARY_SURCHARGE : 0;
}

function getEstimate() {
  return state.area * getTariff().price + getSecondarySurcharge();
}

function getEstimateText() {
  const tariff = getTariff();
  return tariff.prefix ? `${tariff.prefix}${formatMoney(getEstimate())}` : `≈ ${formatMoney(getEstimate())}`;
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

function openQuiz(trigger) {
  lastQuizTrigger = trigger || document.activeElement;
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

  if (step === 4) {
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
  summaryEstimate.textContent = state.step === 4 ? "после номера" : "после телефона";
}

function renderIncluded() {
  includedList.innerHTML = getTariff().included
    .map((item) => `
      <li>
        <span aria-hidden="true">✓</span>
        <strong>${item}</strong>
      </li>
    `)
    .join("");
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
  renderIncluded();
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

quizOpenButtons.forEach((button) => {
  button.addEventListener("click", () => openQuiz(button));
});

document.querySelectorAll("[data-tariff-open]").forEach((button) => {
  button.addEventListener("click", () => {
    state.level = button.dataset.tariffOpen;
    resetLeadResult();
    render();
    setStep(1);
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
    resetLeadResult();
    render();
    setStep(1);
  });
});

document.querySelectorAll("[data-area]").forEach((button) => {
  button.addEventListener("click", () => {
    setArea(button.dataset.area, button.dataset.areaLabel);
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
    resetLeadResult();
    render();
    setStep(3);
  });
});

document.querySelector("[data-to-lead]").addEventListener("click", () => {
  setStep(4);
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
});

leadForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const digits = phoneInput.value.replace(/\D/g, "");
  if (digits.length < 11) {
    phoneInput.setCustomValidity("Нужен телефон, чтобы показать расчет.");
    phoneInput.reportValidity();
    return;
  }
  phoneInput.setCustomValidity("");
  state.leadPhone = phoneInput.value.trim();
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
      <span>${state.apartment}, ${formatArea(state.area)}, ${getTariff().title}. Это предварительный расчет, точную смету закрепим после замера.</span>
      ${secondaryNote}
      ${deliveryNote}
      ${getPaymentPlanHtml()}
    `;
    render();
  } catch (error) {
    state.leadSubmitted = true;
    leadPanel.classList.add("is-success");
    leadTitle.textContent = "Предварительный расчёт готов";
    leadDescription.textContent = "Показываем ориентир и график платежей ниже.";
    leadLoading.hidden = true;
    successMessage.hidden = false;
    successMessage.innerHTML = `
      <strong>Предварительный расчёт: ${getEstimateText()}.</strong>
      <span>${state.apartment}, ${formatArea(state.area)}, ${getTariff().title}. Точную смету закрепим после замера.</span>
      <span class="delivery-note">Не удалось передать заявку в рабочую группу. Позвони нам по номеру на сайте, чтобы согласовать замер.</span>
      ${getPaymentPlanHtml()}
    `;
    render();
  }
});

render();
initProjectGallery();
setStep(0);
updateStickyCta();
