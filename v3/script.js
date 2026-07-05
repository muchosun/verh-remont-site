const tariffs = {
  standard: { title: "Стандарт", price: 20000 },
  comfort: { title: "Комфорт", price: 25000 },
  lux: { title: "Люкс", price: 29000 },
};

const state = {
  step: 0,
  object: "Новостройка",
  area: 60,
  tariff: "comfort",
  goal: "Для жизни",
  timing: "Ключи уже получены",
  request: "Предварительный расчет",
};

const steps = [
  {
    title: "Какая квартира?",
    hint: "Выберите тип, чтобы мы подобрали оптимальные решения.",
    key: "object",
    options: [
      ["Новостройка", "Отделка с нуля после получения ключей"],
      ["Вторичка", "Обновление квартиры с демонтажом"],
      ["Апартаменты", "Ремонт под проживание или сдачу"],
      ["Дом", "Индивидуальная оценка объема"],
    ],
  },
  { title: "Площадь и уровень", hint: "Расчет обновляется сразу при изменении площади или уровня ремонта.", type: "area" },
  {
    title: "Цель ремонта",
    hint: "Так проще понять, что важнее: срок, бюджет, износостойкость или визуальный уровень.",
    key: "goal",
    options: [
      ["Для жизни", "Комфорт, материалы и надежность"],
      ["Под сдачу", "Практично, износостойко, без лишнего"],
      ["Для продажи", "Аккуратный вид и контроль бюджета"],
      ["Дизайн-проект", "Реализация готового проекта"],
    ],
  },
  {
    title: "Стадия объекта",
    hint: "Это помогает отделить срочный замер от ранней консультации.",
    key: "timing",
    options: [
      ["Ключи уже получены", "Можно обсуждать выезд и смету"],
      ["Ключи скоро", "Считаем бюджет заранее"],
      ["Старт в ближайший месяц", "Нужно планировать график"],
      ["Пока считаю бюджет", "Подойдет расчет и консультация по уровню"],
    ],
  },
  {
    title: "Что подготовить?",
    hint: "Можно запросить расчет, замер или каталог обоев на дом.",
    key: "request",
    options: [
      ["Предварительный расчет", "Получить ориентир по бюджету"],
      ["Выезд на замер", "Назначить встречу на объекте"],
      ["Каталог обоев на дом", "Посмотреть варианты обоев вживую"],
      ["Консультация по уровням", "Понять подходящий класс ремонта"],
      ["График платежей", "Понять стартовый платеж и оплату по этапам"],
    ],
  },
  { title: "Куда отправить расчет?", hint: "Финальный шаг ведет к форме заявки ниже.", type: "final" },
];

const body = document.querySelector("#quiz-body");
const title = document.querySelector("#quiz-title");
const hint = document.querySelector("#quiz-hint");
const counter = document.querySelector("#step-counter");
const progress = document.querySelector("#progress-bar");
const estimate = document.querySelector("#estimate-value");
const prev = document.querySelector("#prev-step");
const next = document.querySelector("#next-step");
const leadSummary = document.querySelector("#lead-summary");
const leadForm = document.querySelector("#lead-form");

function formatMoney(value) {
  return new Intl.NumberFormat("ru-RU").format(value) + " ₽";
}

function updateEstimate() {
  const value = state.area * tariffs[state.tariff].price;
  estimate.textContent = formatMoney(value);
  leadSummary.innerHTML = `
    <strong>Предварительно: ${formatMoney(value)}</strong>
    <span>${state.area} м² × ${formatMoney(tariffs[state.tariff].price)}/м², уровень ${tariffs[state.tariff].title}</span>
    <span>${state.object}, ${state.goal.toLowerCase()}, ${state.timing.toLowerCase()}</span>
    <span>Запрос: ${state.request.toLowerCase()}</span>
  `;

  document.querySelectorAll("[data-tariff-card]").forEach((card) => {
    card.classList.toggle("tariff-panel--active", card.dataset.tariffCard === state.tariff);
  });
}

function renderOptions(step) {
  body.innerHTML = `<div class="option-grid"></div>`;
  const grid = body.querySelector(".option-grid");
  step.options.forEach(([label, text]) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "option" + (state[step.key] === label ? " is-active" : "");
    button.innerHTML = `<strong>${label}</strong><span>${text}</span>`;
    button.addEventListener("click", () => {
      state[step.key] = label;
      render();
    });
    grid.appendChild(button);
  });
}

function renderArea() {
  body.innerHTML = `
    <div class="area-control">
      <div class="area-line">
        <label>
          Площадь квартиры
          <input id="area-range" type="range" min="20" max="200" step="1" value="${state.area}" />
        </label>
        <label class="area-number">
          <input id="area-input" type="number" min="20" max="300" value="${state.area}" />
        </label>
      </div>
      <div class="tariff-options">
        ${Object.entries(tariffs).map(([key, item]) => `
          <button class="tariff-option ${state.tariff === key ? "is-active" : ""}" type="button" data-tariff="${key}">
            <strong>${item.title}</strong>
            <span>${key === "standard" ? "Базовая комплектация" : key === "comfort" ? "Расширенный выбор" : "Материалы по проекту"}</span>
            <strong>${formatMoney(item.price)}/м²</strong>
          </button>
        `).join("")}
      </div>
    </div>
  `;

  const range = document.querySelector("#area-range");
  const input = document.querySelector("#area-input");
  const setArea = (value) => {
    state.area = Math.max(20, Math.min(300, Number(value) || 20));
    range.value = Math.min(200, state.area);
    input.value = state.area;
    updateEstimate();
  };

  range.addEventListener("input", (event) => setArea(event.target.value));
  input.addEventListener("input", (event) => setArea(event.target.value));
  document.querySelectorAll("[data-tariff]").forEach((button) => {
    button.addEventListener("click", () => {
      state.tariff = button.dataset.tariff;
      render();
    });
  });
}

function renderFinal() {
  body.innerHTML = `
    <div class="success-box">
      <strong>Заявка почти собрана.</strong><br />
      Перейдите к форме: расчет, выбранный уровень ремонта и сценарий уже подготовлены.
    </div>
  `;
}

function render() {
  const step = steps[state.step];
  title.textContent = step.title;
  hint.textContent = step.hint;
  counter.textContent = `${state.step + 1}/6`;
  progress.style.width = `${((state.step + 1) / steps.length) * 100}%`;
  prev.disabled = state.step === 0;
  prev.style.visibility = state.step === 0 ? "hidden" : "visible";
  next.textContent = state.step === steps.length - 1 ? "К форме" : "Далее";

  if (step.type === "area") renderArea();
  else if (step.type === "final") renderFinal();
  else renderOptions(step);

  updateEstimate();
}

prev.addEventListener("click", () => {
  state.step = Math.max(0, state.step - 1);
  render();
});

next.addEventListener("click", () => {
  if (state.step === steps.length - 1) {
    document.querySelector("#lead").scrollIntoView({ behavior: "smooth" });
    return;
  }
  state.step = Math.min(steps.length - 1, state.step + 1);
  render();
});

document.querySelectorAll("[data-tariff-card]").forEach((card) => {
  card.addEventListener("click", () => {
    state.tariff = card.dataset.tariffCard;
    state.step = 1;
    render();
    document.querySelector("#quiz").scrollIntoView({ behavior: "smooth" });
  });
});

leadForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(leadForm);
  const name = String(data.get("name") || "").trim() || "Клиент";
  const messenger = data.get("messenger") || "Telegram";
  leadSummary.innerHTML += `
    <div class="success-box">
      <strong>${name}, заявка собрана в прототипе.</strong><br />
      Связь: ${messenger}. В финальной версии эти данные отправятся в рабочий канал заявок.
    </div>
  `;
});

render();
