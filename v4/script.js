const tariffs = {
  standard: {
    title: "Стандарт",
    price: 20000,
    short: "Практичный ремонт с материалами в стоимости",
  },
  comfort: {
    title: "Комфорт",
    price: 25000,
    short: "Основной уровень для жизни и расширенного выбора",
  },
  lux: {
    title: "Люкс",
    price: 29000,
    short: "Индивидуальный ремонт от дизайн-проекта",
    prefix: "от ",
  },
};

const materialSets = {
  standard: [
    ["Плитка", "разные форматы, более 70 вариантов"],
    ["Двери", "шпон, более 50 вариантов"],
    ["Ламинат", "33 класс, 8-10 мм, более 50 вариантов"],
    ["Обои", "флизелиновые моющиеся, более 100 вариантов"],
    ["Свет", "точечное освещение с выбором люстр"],
    ["Сантехника", "инсталляция, ванна, зеркало с подсветкой, тропический душ"],
  ],
  comfort: [
    ["Плитка", "крупный формат, более 100 вариантов"],
    ["Двери", "шпон или скрытый монтаж, более 50 вариантов"],
    ["Ламинат", "33 класс, 10-12 мм, более 70 вариантов"],
    ["Свет", "люстры, бра, треки, скрытые карнизы и подсветки"],
    ["Сантехника", "накладная раковина, гигиенический душ, душевой поддон или ванна"],
    ["Электрика", "дополнение точек и аккуратная подготовка под сценарии света"],
  ],
  lux: [
    ["Дизайн-проект", "состав материалов строится от проекта"],
    ["Плитка", "подбор формата, фактуры и раскладки под визуальную концепцию"],
    ["Свет", "сценарии освещения, треки, бра и декоративная подсветка"],
    ["Сантехника", "индивидуальная комплектация после согласования проекта"],
    ["Двери", "скрытый монтаж или премиальные решения по проекту"],
    ["Смета", "финальный состав и цена фиксируются после проекта"],
  ],
};

const state = {
  level: "comfort",
  area: 60,
  request: "Замер",
};

const areaRange = document.querySelector("#area-range");
const areaInput = document.querySelector("#area-input");
const estimateLabel = document.querySelector("#estimate-label");
const estimateValue = document.querySelector("#estimate-value");
const leadSummary = document.querySelector("#lead-summary");
const leadForm = document.querySelector("#lead-form");
const materialGrid = document.querySelector("#material-grid");

function formatMoney(value) {
  return new Intl.NumberFormat("ru-RU").format(value) + " ₽";
}

function getEstimate() {
  return state.area * tariffs[state.level].price;
}

function updateEstimate() {
  const tariff = tariffs[state.level];
  const pricePrefix = tariff.prefix || "";
  estimateLabel.textContent = `${tariff.title}, ${state.area} м²`;
  estimateValue.textContent = `${pricePrefix}${formatMoney(getEstimate())}`;

  leadSummary.innerHTML = `
    <strong>${pricePrefix}${formatMoney(getEstimate())}</strong>
    <span>${state.area} м² × ${formatMoney(tariff.price)}/м², уровень ${tariff.title}</span>
    <span>${tariff.short}</span>
    <span>Запрос: ${state.request.toLowerCase()}</span>
  `;

  document.querySelectorAll("[data-level], [data-level-card]").forEach((element) => {
    const level = element.dataset.level || element.dataset.levelCard;
    element.classList.toggle("is-active", level === state.level);
  });
}

function renderMaterials() {
  materialGrid.innerHTML = materialSets[state.level]
    .map(([title, text]) => `
      <article class="material-item">
        <strong>${title}</strong>
        <span>${text}</span>
      </article>
    `)
    .join("");

  document.querySelectorAll("[data-material-level]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.materialLevel === state.level);
  });
}

function setLevel(level, { scrollToCalculator = false } = {}) {
  if (!tariffs[level]) return;
  state.level = level;
  updateEstimate();
  renderMaterials();
  if (scrollToCalculator) {
    document.querySelector("#calculator").scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function setArea(value) {
  state.area = Math.max(20, Math.min(300, Number(value) || 20));
  areaRange.value = Math.min(200, state.area);
  areaInput.value = state.area;
  updateEstimate();
}

document.querySelectorAll("[data-level]").forEach((button) => {
  button.addEventListener("click", () => setLevel(button.dataset.level));
});

document.querySelectorAll(".level-submit").forEach((button) => {
  button.addEventListener("click", () => setLevel(button.dataset.level, { scrollToCalculator: true }));
});

document.querySelectorAll("[data-material-level]").forEach((button) => {
  button.addEventListener("click", () => setLevel(button.dataset.materialLevel));
});

document.querySelectorAll("input[name='request']").forEach((input) => {
  input.addEventListener("change", () => {
    state.request = input.value;
    updateEstimate();
  });
});

areaRange.addEventListener("input", (event) => setArea(event.target.value));
areaInput.addEventListener("input", (event) => setArea(event.target.value));

leadForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(leadForm);
  const name = String(data.get("name") || "").trim() || "Клиент";
  const messenger = data.get("messenger") || "Telegram";
  leadSummary.innerHTML += `
    <div class="success-box">
      <strong>${name}, заявка собрана.</strong><br />
      Канал связи: ${messenger}. В рабочей версии расчет уйдет менеджеру.
    </div>
  `;
});

updateEstimate();
renderMaterials();
