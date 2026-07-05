const tariffs = {
  standard: {
    title: "Стандарт",
    price: 20000,
    prefix: "",
    line: "практичный ремонт с проверенными материалами",
    materialsIntro:
      "Для Стандарта заложены плитка разных форматов, двери шпон, ламинат 33 класса 8-10 мм, моющиеся флизелиновые обои, базовый свет, сантехника и натяжной потолок.",
    materials: [
      ["Плитка", "разные форматы, более 70 вариантов"],
      ["Двери", "шпон, более 50 вариантов"],
      ["Ламинат", "33 класс, 8-10 мм, более 50 вариантов"],
      ["Обои", "флизелиновые моющиеся, более 100 вариантов"],
      ["Свет", "точечное освещение с выбором люстр"],
      ["Сантехника", "инсталляция, ванна, зеркало с подсветкой, тропический душ"],
    ],
  },
  comfort: {
    title: "Комфорт",
    price: 25000,
    prefix: "",
    line: "расширенный выбор материалов, света и сантехники",
    materialsIntro:
      "Для Комфорта заложены крупный формат плитки, двери шпон или скрытого монтажа, ламинат 33 класса 10-12 мм, расширенный свет и сантехника.",
    materials: [
      ["Плитка", "крупный формат, более 100 вариантов"],
      ["Двери", "шпон или скрытый монтаж, более 50 вариантов"],
      ["Ламинат", "33 класс, 10-12 мм, более 70 вариантов"],
      ["Обои", "флизелиновые моющиеся, более 100 вариантов"],
      ["Свет", "люстры, бра, треки, скрытые карнизы и подсветки"],
      ["Сантехника", "накладная раковина, гигиенический душ, душевой поддон или ванна"],
    ],
  },
  lux: {
    title: "Люкс",
    price: 29000,
    prefix: "от ",
    line: "индивидуальный ремонт от дизайн-проекта",
    materialsIntro:
      "Люкс считается от дизайн-проекта: состав материалов, света, сантехники, дверей и декоративных решений фиксируется после согласования проекта.",
    materials: [
      ["Дизайн-проект", "основа комплектации и финальной сметы"],
      ["Плитка", "подбор формата, фактуры и раскладки под концепцию"],
      ["Двери", "скрытый монтаж или премиальные решения по проекту"],
      ["Свет", "сценарии освещения, треки, бра и декоративная подсветка"],
      ["Сантехника", "индивидуальная комплектация после согласования"],
      ["Смета", "финальный состав и цена фиксируются после проекта"],
    ],
  },
};

const state = {
  step: 0,
  maxStep: 0,
  apartment: "Новостройка",
  area: 60,
  level: "comfort",
};

const moneyFormat = new Intl.NumberFormat("ru-RU");

const stepElements = [...document.querySelectorAll(".quiz-step")];
const progressButtons = [...document.querySelectorAll("[data-jump-step]")];
const answerButtons = [...document.querySelectorAll("[data-field]")];
const areaInput = document.querySelector("#area-input");
const areaForm = document.querySelector("#area-form");
const materialRow = document.querySelector("#material-row");
const materialsList = document.querySelector("#materials-list");
const materialsIntro = document.querySelector("#materials-intro");
const leadForm = document.querySelector("#lead-form");
const phoneInput = document.querySelector("#phone-input");
const successMessage = document.querySelector("#success-message");
const photoRail = document.querySelector("#photo-rail");

function formatMoney(value) {
  return `${moneyFormat.format(value)} ₽`;
}

function getTariff() {
  return tariffs[state.level];
}

function getEstimate() {
  return state.area * getTariff().price;
}

function getEstimateText() {
  const tariff = getTariff();
  return `≈ ${tariff.prefix}${formatMoney(getEstimate())}`;
}

function getPriceText() {
  const tariff = getTariff();
  return `${tariff.prefix}${formatMoney(tariff.price)}/м²`;
}

function setStep(nextStep) {
  const clampedStep = Math.max(0, Math.min(stepElements.length - 1, nextStep));
  state.step = clampedStep;
  state.maxStep = Math.max(state.maxStep, clampedStep);

  stepElements.forEach((step, index) => {
    step.classList.toggle("is-active", index === clampedStep);
  });

  progressButtons.forEach((button, index) => {
    const isAvailable = index <= state.maxStep;
    button.disabled = !isAvailable;
    button.classList.toggle("is-active", index === clampedStep);
    button.classList.toggle("is-complete", index < clampedStep);
  });
}

function syncSelectedButtons() {
  document.querySelectorAll("[data-field='apartment']").forEach((button) => {
    button.classList.toggle("is-selected", button.dataset.value === state.apartment);
  });

  document.querySelectorAll("[data-field='level']").forEach((button) => {
    button.classList.toggle("is-selected", button.dataset.value === state.level);
  });

  document.querySelectorAll("[data-area-preset]").forEach((button) => {
    button.classList.toggle("is-selected", Number(button.dataset.areaPreset) === state.area);
  });
}

function renderMaterials() {
  const tariff = getTariff();
  materialsIntro.textContent = tariff.materialsIntro;

  const materialHtml = tariff.materials
    .map(([title, text]) => `
      <article>
        <strong>${title}</strong>
        <span>${text}</span>
      </article>
    `)
    .join("");

  materialsList.innerHTML = materialHtml;
  materialRow.innerHTML = tariff.materials
    .slice(0, 4)
    .map(([title, text]) => `
      <article class="material-tile">
        <strong>${title}</strong>
        <span>${text}</span>
      </article>
    `)
    .join("");
}

function renderSummary() {
  const tariff = getTariff();
  const summaryHtml = `
    <strong>${getEstimateText()}</strong>
    <span>${state.apartment}, ${state.area} м²</span>
    <span>Уровень: ${tariff.title} · ${getPriceText()}</span>
    <span>${tariff.line}</span>
    <small>Материалы входят в выбранный уровень. Точную смету фиксируем после замера.</small>
  `;

  document.querySelector("#state-estimate").textContent = getEstimateText();
  document.querySelector("#state-apartment").textContent = state.apartment;
  document.querySelector("#state-area").textContent = `${state.area} м²`;
  document.querySelector("#state-level").textContent = tariff.title;
  document.querySelector("#state-price").textContent = getPriceText();
  document.querySelector("#step-estimate").textContent = getEstimateText();
  document.querySelector("#final-summary").innerHTML = summaryHtml;
}

function render() {
  syncSelectedButtons();
  renderMaterials();
  renderSummary();
}

function advanceAfterSelection(field, value) {
  if (field === "apartment") {
    state.apartment = value;
    render();
    setStep(1);
    return;
  }

  if (field === "level") {
    state.level = value;
    render();
    setStep(3);
  }
}

function setArea(value, shouldAdvance = false) {
  const area = Math.max(20, Math.min(300, Number(value) || 20));
  state.area = area;
  areaInput.value = area;
  render();
  if (shouldAdvance) setStep(2);
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

answerButtons.forEach((button) => {
  button.addEventListener("click", () => {
    advanceAfterSelection(button.dataset.field, button.dataset.value);
  });
});

document.querySelectorAll("[data-area-preset]").forEach((button) => {
  button.addEventListener("click", () => {
    setArea(button.dataset.areaPreset, true);
  });
});

areaInput.addEventListener("input", () => setArea(areaInput.value));

areaForm.addEventListener("submit", (event) => {
  event.preventDefault();
  setArea(areaInput.value, true);
});

progressButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setStep(Number(button.dataset.jumpStep));
  });
});

document.querySelector("[data-collect-request]").addEventListener("click", () => {
  setStep(4);
  setTimeout(() => phoneInput.focus(), 80);
});

phoneInput.addEventListener("focus", () => {
  if (!phoneInput.value) phoneInput.value = "+7 ";
});

phoneInput.addEventListener("input", () => {
  phoneInput.value = formatPhone(phoneInput.value);
});

leadForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const phone = phoneInput.value.trim();
  successMessage.hidden = false;
  successMessage.innerHTML = `
    <strong>Заявка готова.</strong>
    <span>${state.apartment}, ${state.area} м², ${getTariff().title}, ${getEstimateText()}.</span>
    <span>Телефон: ${phone}. В рабочей версии эти данные уйдут менеджеру.</span>
  `;
});

document.querySelector("[data-gallery-prev]").addEventListener("click", () => {
  photoRail.scrollBy({ left: -280, behavior: "smooth" });
});

document.querySelector("[data-gallery-next]").addEventListener("click", () => {
  photoRail.scrollBy({ left: 280, behavior: "smooth" });
});

render();
setStep(0);
