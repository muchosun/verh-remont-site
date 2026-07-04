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
    hint: "Выберите тип объекта, чтобы точнее собрать заявку.",
    key: "object",
    options: [
      ["Новостройка", "Отделка с нуля после получения ключей"],
      ["Вторичка", "Обновление квартиры с демонтажом"],
      ["Апартаменты", "Ремонт под проживание или сдачу"],
      ["Дом", "Индивидуальная оценка объема"],
    ],
  },
  {
    title: "Площадь и тариф",
    hint: "Предварительный расчет обновляется сразу при изменении площади или тарифа.",
    type: "area",
  },
  {
    title: "Цель ремонта",
    hint: "Так проще понять, что важнее: срок, бюджет, износостойкость или визуальный уровень.",
    key: "goal",
    options: [
      ["Для жизни", "Комфорт, материалы и надежность"],
      ["Под сдачу", "Практично, износостойко, без лишнего"],
      ["Для продажи", "Аккуратный вид и контроль бюджета"],
      ["Дизайн-проект", "Нужна реализация готового проекта"],
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
      ["Пока считаю бюджет", "Подойдет расчет и каталоги"],
    ],
  },
  {
    title: "Что подготовить?",
    hint: "Можно выбрать мягкий сценарий через каталоги или сразу запросить замер.",
    key: "request",
    options: [
      ["Предварительный расчет", "Получить ориентир по бюджету"],
      ["Выезд на замер", "Назначить встречу на объекте"],
      ["Каталоги на дом", "Подобрать материалы вживую"],
      ["Консультация по тарифам", "Понять, какой уровень подойдет"],
    ],
  },
  {
    title: "Куда отправить расчет?",
    hint: "Финальный шаг ведет к форме заявки ниже.",
    type: "final",
  },
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
  estimate.textContent = "от " + formatMoney(value);
  leadSummary.innerHTML = `
    <strong>Текущий расчет: от ${formatMoney(value)}</strong>
    <span>${state.area} м² × ${formatMoney(tariffs[state.tariff].price)}/м², тариф ${tariffs[state.tariff].title}</span>
    <span>${state.object}, ${state.goal.toLowerCase()}, ${state.timing.toLowerCase()}</span>
    <span>Запрос: ${state.request.toLowerCase()}</span>
  `;
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
          <span>м²</span>
        </label>
      </div>
      <div class="tariff-options">
        ${Object.entries(tariffs)
          .map(([key, item]) => `
            <button class="tariff-option ${state.tariff === key ? "is-active" : ""}" type="button" data-tariff="${key}">
              <strong>${item.title}</strong>
              <span>${key === "standard" ? "Практично" : key === "comfort" ? "Оптимально" : "Индивидуально"}</span>
              <strong>${formatMoney(item.price)}/м²</strong>
            </button>
          `)
          .join("")}
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
      Нажмите “К форме”, проверьте расчет и оставьте контакты. Можно запросить замер, каталоги или предварительный расчет.
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

  if (step.type === "area") {
    renderArea();
  } else if (step.type === "final") {
    renderFinal();
  } else {
    renderOptions(step);
  }

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

document.querySelectorAll("[data-pick-tariff]").forEach((button) => {
  button.addEventListener("click", () => {
    state.tariff = button.dataset.pickTariff;
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
      Связь: ${messenger}. Следующий шаг в реальном сайте: отправить эти данные в Telegram-группу или CRM.
    </div>
  `;
});

render();
