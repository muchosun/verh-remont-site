document.documentElement.classList.add("has-js");

const TARIFFS = {
  cosmetic: {
    title: "Косметический",
    price: 6000,
    prefix: "от ",
    materialPrice: null,
    workPrice: null,
  },
  standard: {
    title: "Стандарт",
    price: 20000,
    prefix: "",
    materialPrice: 10000,
    workPrice: 10000,
  },
  comfort: {
    title: "Комфорт",
    price: 25000,
    prefix: "",
    materialPrice: 15000,
    workPrice: 10000,
  },
  lux: {
    title: "Люкс",
    price: 29000,
    prefix: "от ",
    materialPrice: 19000,
    workPrice: 10000,
  },
};

const STEP_NAMES = ["Квартира", "Площадь", "Результат", "Телефон"];
const SECONDARY_SURCHARGE = 100000;
const leadEndpoint = String(window.VERH_LEAD_ENDPOINT || "").trim();
const isLocalPreview = ["localhost", "127.0.0.1", ""].includes(window.location.hostname);
const numberFormat = new Intl.NumberFormat("ru-RU");

const state = {
  step: 0,
  apartment: "",
  area: null,
  areaLabel: "",
  level: "comfort",
  phone: "",
};

const steps = [...document.querySelectorAll("[data-step]")];
const progressLabel = document.querySelector("#progress-label");
const progressBar = document.querySelector("#progress-bar");
const backButton = document.querySelector("#back-button");
const areaForm = document.querySelector("#area-form");
const areaInput = document.querySelector("#area-input");
const areaError = document.querySelector("#area-error");
const leadForm = document.querySelector("#lead-form");
const phoneInput = document.querySelector("#phone-input");
const formStatus = document.querySelector("#form-status");
const selectionSummary = document.querySelector("#selection-summary");
const estimateLine = document.querySelector("#estimate-line");
const estimateTotal = document.querySelector("#estimate-total");
const estimateBreakdown = document.querySelector("#estimate-breakdown");
const paymentGrid = document.querySelector("#payment-grid");
const estimateNote = document.querySelector("#estimate-note");

function trackGoal(name, params = {}) {
  if (typeof window.ym !== "function") return;
  window.ym(110859289, "reachGoal", name, params);
}

function money(value) {
  return `${numberFormat.format(Math.round(value))} ₽`;
}

function areaText(value) {
  return `${String(value).replace(".", ",")} м²`;
}

function selectedTariff() {
  return TARIFFS[state.level];
}

function secondarySurcharge() {
  return state.apartment === "Вторичка" && state.level !== "cosmetic" ? SECONDARY_SURCHARGE : 0;
}

function estimate() {
  return state.area * selectedTariff().price + secondarySurcharge();
}

function setStep(nextStep, { track = true } = {}) {
  const maxStep = steps.length - 1;
  state.step = Math.max(0, Math.min(maxStep, nextStep));

  steps.forEach((step, index) => {
    const active = index === state.step;
    step.hidden = !active;
    step.classList.toggle("is-active", active);
  });

  const isResult = state.step === 4;
  document.querySelector(".progress").hidden = isResult;
  backButton.hidden = state.step === 0 || isResult;
  if (!isResult) {
    progressLabel.textContent = `${state.step + 1} / 4`;
    progressBar.style.width = `${(state.step + 1) * 25}%`;
  }

  if (state.step === 3) {
    renderSummary();
    window.setTimeout(() => phoneInput.focus({ preventScroll: true }), 180);
  }

  if (track && !isResult) {
    trackGoal("calculator_step_view", { step: state.step + 1, step_name: STEP_NAMES[state.step] });
  }

  window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
}

function markSelection(selector, value, dataName) {
  document.querySelectorAll(selector).forEach((button) => {
    const selected = button.dataset[dataName] === String(value);
    button.classList.toggle("is-selected", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
}

function renderSummary() {
  selectionSummary.innerHTML = `
    <span>${state.apartment}</span>
    <span>${areaText(state.area)}</span>
    <span>${selectedTariff().title}</span>
  `;
}

function normalizePhone(rawValue) {
  let digits = String(rawValue || "").replace(/\D/g, "");
  if (digits.length === 10) digits = `7${digits}`;
  if (digits.length === 11 && digits.startsWith("8")) digits = `7${digits.slice(1)}`;
  return /^7\d{10}$/.test(digits) ? `+${digits}` : "";
}

function formatPhoneForDisplay(value) {
  const digits = normalizePhone(value).replace(/\D/g, "");
  if (!digits) return value.trim();
  return `+7 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7, 9)}-${digits.slice(9, 11)}`;
}

function leadPayload() {
  const tariff = selectedTariff();
  return {
    apartment: state.apartment,
    area: state.area,
    areaLabel: state.areaLabel,
    level: state.level,
    levelTitle: tariff.title,
    pricePerMeter: tariff.price,
    materialPricePerMeter: tariff.materialPrice,
    workPricePerMeter: tariff.workPrice,
    secondarySurcharge: secondarySurcharge(),
    preliminaryEstimate: estimate(),
    phone: state.phone,
    source: window.location.href,
    submittedAt: new Date().toISOString(),
    website: leadForm.elements.website.value,
  };
}

async function sendLead(payload) {
  if (isLocalPreview) {
    await new Promise((resolve) => window.setTimeout(resolve, 450));
    return { status: "preview" };
  }
  if (!leadEndpoint) throw new Error("Lead endpoint is not configured");

  const response = await fetch(leadEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(`Lead endpoint responded with ${response.status}`);
  return response.json().catch(() => ({ status: "accepted" }));
}

function renderEstimate() {
  const tariff = selectedTariff();
  const total = estimate();
  const prefix = tariff.prefix || "≈ ";
  estimateLine.textContent = `${state.apartment} · ${areaText(state.area)} · ${tariff.title}`;
  estimateTotal.textContent = `${prefix}${money(total)}`;

  if (tariff.materialPrice && tariff.workPrice) {
    estimateBreakdown.textContent = `Материалы: ${money(state.area * tariff.materialPrice)} · работы: ${money(state.area * tariff.workPrice)}.`;
  } else {
    estimateBreakdown.textContent = "Работы и материалы уже включены в предварительный расчет.";
  }

  const payments = [30, 30, 20, 20];
  const names = ["Старт", "Черновой этап", "Чистовая отделка", "Приемка"];
  paymentGrid.innerHTML = payments.map((percent, index) => `
    <div><span>${percent}%</span><strong>${names[index]}<br>${money(total * percent / 100)}</strong></div>
  `).join("");

  estimateNote.textContent = secondarySurcharge()
    ? "Для вторички добавили предварительный резерв на демонтаж. Точную смету и график платежей закрепим после бесплатного замера."
    : "Это предварительный ориентир. Точную смету и график платежей закрепим после бесплатного замера.";
}

document.querySelectorAll("[data-apartment]").forEach((button) => {
  button.addEventListener("click", () => {
    state.apartment = button.dataset.apartment;
    markSelection("[data-apartment]", state.apartment, "apartment");
    trackGoal("calculator_apartment_selected", { apartment: state.apartment });
    window.setTimeout(() => setStep(1), 130);
  });
});

document.querySelectorAll("[data-area]").forEach((button) => {
  button.addEventListener("click", () => {
    state.area = Number(button.dataset.area);
    state.areaLabel = button.dataset.areaLabel;
    areaInput.value = state.area;
    markSelection("[data-area]", state.area, "area");
    trackGoal("calculator_area_selected", { area: state.area, area_label: state.areaLabel });
    window.setTimeout(() => setStep(2), 130);
  });
});

areaInput.addEventListener("input", () => {
  areaError.textContent = "";
});

areaForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const value = Number(String(areaInput.value).replace(",", "."));
  if (!Number.isFinite(value) || value < 20 || value > 300) {
    areaError.textContent = "Укажи площадь от 20 до 300 м².";
    areaInput.focus();
    return;
  }
  state.area = Math.round(value * 10) / 10;
  state.areaLabel = "Своя площадь";
  markSelection("[data-area]", state.area, "area");
  trackGoal("calculator_area_selected", { area: state.area, area_label: state.areaLabel });
  setStep(2);
});

document.querySelectorAll("[data-level]").forEach((button) => {
  button.addEventListener("click", () => {
    state.level = button.dataset.level;
    markSelection("[data-level]", state.level, "level");
    trackGoal("calculator_result_selected", { tariff: state.level });
    window.setTimeout(() => setStep(3), 150);
  });
});

backButton.addEventListener("click", () => setStep(state.step - 1));

phoneInput.addEventListener("input", () => {
  formStatus.textContent = "";
  phoneInput.setCustomValidity("");
});

phoneInput.addEventListener("blur", () => {
  if (normalizePhone(phoneInput.value)) phoneInput.value = formatPhoneForDisplay(phoneInput.value);
});

leadForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  formStatus.textContent = "";
  const normalizedPhone = normalizePhone(phoneInput.value);
  if (!normalizedPhone) {
    phoneInput.setCustomValidity("Укажи номер из 10 цифр после +7.");
    phoneInput.reportValidity();
    return;
  }
  phoneInput.setCustomValidity("");
  if (!leadForm.reportValidity()) return;

  state.phone = formatPhoneForDisplay(normalizedPhone);
  const submitButton = leadForm.querySelector("button[type='submit']");
  submitButton.disabled = true;
  submitButton.querySelector("span:first-child").textContent = "Отправляем…";
  trackGoal("calculator_submit_attempt", {
    apartment: state.apartment,
    area: state.area,
    tariff: state.level,
  });

  try {
    await sendLead(leadPayload());
    trackGoal("calculator_lead_success", {
      apartment: state.apartment,
      area: state.area,
      tariff: state.level,
    });
    renderEstimate();
    setStep(4, { track: false });
  } catch (error) {
    trackGoal("calculator_lead_failure", {
      apartment: state.apartment,
      area: state.area,
      tariff: state.level,
    });
    formStatus.textContent = "Не получилось отправить номер. Проверь интернет и попробуй еще раз.";
    submitButton.disabled = false;
    submitButton.querySelector("span:first-child").textContent = "Показать мой расчет";
  }
});

document.querySelector("[data-call-action]")?.addEventListener("click", () => {
  trackGoal("calculator_phone_call", { placement: "result" });
});

function applyQueryDefaults() {
  const params = new URLSearchParams(window.location.search);
  const level = String(params.get("level") || "").toLowerCase();
  if (TARIFFS[level]) state.level = level;
}

applyQueryDefaults();
setStep(0, { track: false });
trackGoal("calculator_page_view", {
  initial_tariff: state.level,
  theme: "dark",
});
