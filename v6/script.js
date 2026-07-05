const tariffs = {
  standard: {
    title: "Стандарт",
    price: 20000,
    prefix: "",
    included: [
      "работы по ремонту квартиры",
      "черновые материалы",
      "чистовые материалы уровня Стандарт",
      "сантехника, свет, двери и потолки",
      "смета, договор и график этапов",
    ],
  },
  comfort: {
    title: "Комфорт",
    price: 25000,
    prefix: "",
    included: [
      "работы по ремонту квартиры",
      "черновые материалы",
      "расширенный выбор чистовых материалов",
      "сантехника, свет, двери, потолки и карнизы",
      "смета, договор и график этапов",
    ],
  },
  lux: {
    title: "Люкс",
    price: 29000,
    prefix: "от ",
    included: [
      "работы по индивидуальному дизайн-проекту",
      "черновые материалы",
      "чистовые материалы по проекту",
      "сантехника, свет, двери и сложные узлы",
      "смета, договор и график этапов",
    ],
  },
};

const stepLabels = [
  "Что ремонтируем?",
  "Площадь квартиры",
  "Уровень ремонта",
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
  timerLeft: 60,
};

const moneyFormat = new Intl.NumberFormat("ru-RU");
const slides = [...document.querySelectorAll(".slide")];
const progressButtons = [...document.querySelectorAll("[data-step-nav]")];
const stepCount = document.querySelector("#step-count");
const stepLabel = document.querySelector("#step-label");
const summaryLine = document.querySelector("#summary-line");
const summaryEstimate = document.querySelector("#summary-estimate");
const areaInput = document.querySelector("#area-input");
const includedList = document.querySelector("#included-list");
const phoneInput = document.querySelector("#phone-input");
const leadForm = document.querySelector("#lead-form");
const successMessage = document.querySelector("#success-message");
const timerElement = document.querySelector("#timer");

function formatMoney(value) {
  return `${moneyFormat.format(Math.round(value))} ₽`;
}

function formatArea(value) {
  return Number.isInteger(value) ? `${value} м²` : `${String(value).replace(".", ",")} м²`;
}

function getTariff() {
  return tariffs[state.level];
}

function getEstimate() {
  return state.area * getTariff().price;
}

function getEstimateText() {
  const tariff = getTariff();
  return tariff.prefix ? `${tariff.prefix}${formatMoney(getEstimate())}` : `≈ ${formatMoney(getEstimate())}`;
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
    setTimeout(() => phoneInput.focus(), 120);
  }
}

function renderSummary() {
  const tariff = getTariff();
  summaryLine.textContent = `${state.apartment} · ${formatArea(state.area)} · ${tariff.title}`;
  summaryEstimate.textContent = getEstimateText();
}

function renderIncluded() {
  includedList.innerHTML = getTariff().included
    .map((item, index) => `
      <li>
        <span>${index + 1}</span>
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
  const parsed = Number(String(value).replace(",", "."));
  if (!Number.isFinite(parsed)) return state.area;
  return Math.max(20, Math.min(300, Math.round(parsed * 10) / 10));
}

function setArea(value, label = "Своя площадь") {
  state.area = normalizeArea(value);
  state.areaLabel = label;
  areaInput.value = state.area;
  render();
}

function formatPhone(value) {
  const digits = value.replace(/\D/g, "").replace(/^8/, "7").slice(0, 11);
  const normalized = digits.startsWith("7") ? digits : `7${digits}`;
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

function startTimer() {
  if (state.timerStarted) return;
  state.timerStarted = true;
  window.setInterval(() => {
    state.timerLeft = Math.max(0, state.timerLeft - 1);
    const minutes = String(Math.floor(state.timerLeft / 60)).padStart(2, "0");
    const seconds = String(state.timerLeft % 60).padStart(2, "0");
    timerElement.textContent = `${minutes}:${seconds}`;
  }, 1000);
}

document.querySelectorAll("[data-apartment]").forEach((button) => {
  button.addEventListener("click", () => {
    state.apartment = button.dataset.apartment;
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
  setArea(areaInput.value);
  setStep(2);
});

areaInput.addEventListener("input", () => {
  setArea(areaInput.value);
});

document.querySelectorAll("[data-level]").forEach((button) => {
  button.addEventListener("click", () => {
    state.level = button.dataset.level;
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

leadForm.addEventListener("submit", (event) => {
  event.preventDefault();
  successMessage.hidden = false;
  successMessage.innerHTML = `
    <strong>Заявка собрана.</strong>
    <span>${state.apartment}, ${formatArea(state.area)}, ${getTariff().title}, ${getEstimateText()}.</span>
    <span>Телефон: ${phoneInput.value.trim()}.</span>
  `;
});

render();
setStep(0);
