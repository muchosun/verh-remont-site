document.documentElement.classList.add("has-js");

const TARIFFS = {
  cosmetic: {
    title: "Косметический",
    price: 6000,
    prefix: "от ",
    materialPrice: null,
    workPrice: null,
    image: "../assets/tariffs/finish-cosmetic.webp",
    alt: "Готовая квартира после косметического ремонта",
  },
  standard: {
    title: "Стандарт",
    price: 20000,
    prefix: "",
    materialPrice: 10000,
    workPrice: 10000,
    image: "../assets/tariffs/finish-standard.webp",
    alt: "Готовая квартира после ремонта Стандарт",
  },
  comfort: {
    title: "Комфорт",
    price: 25000,
    prefix: "",
    materialPrice: 15000,
    workPrice: 10000,
    image: "../assets/tariffs/finish-comfort-aircon.webp",
    alt: "Готовая квартира после ремонта Комфорт",
  },
  lux: {
    title: "Люкс",
    price: 29000,
    prefix: "от ",
    materialPrice: 19000,
    workPrice: 10000,
    image: "../assets/tariffs/finish-lux.webp",
    alt: "Готовая квартира после ремонта Люкс",
  },
};

const STEP_NAMES = ["Знакомство", "", "Работы", "Квартира", "Площадь", "Тариф", "Телефон", "Расчёт"];
const QUIZ_STEPS = [3, 4, 5, 6];
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
  sending: false,
};

const steps = [...document.querySelectorAll("[data-step]")];
const flow = document.querySelector(".flow");
const stepsContainer = document.querySelector(".steps");
const progressLabel = document.querySelector("#progress-label");
const progressBar = document.querySelector("#progress-bar");
const backButton = document.querySelector("#back-button");
const welcomeStartButton = document.querySelector("#welcome-start");
const startCalculatorButton = document.querySelector("#start-calculator");
const siteLink = document.querySelector(".flow__site-link");
const areaForm = document.querySelector("#area-form");
const areaInput = document.querySelector("#area-input");
const areaError = document.querySelector("#area-error");
const leadForm = document.querySelector("#lead-form");
const phoneInput = document.querySelector("#phone-input");
const formStatus = document.querySelector("#form-status");
const selectionSummary = document.querySelector("#selection-summary");
const closingOfferImage = document.querySelector("#closing-offer-image");
const estimateLine = document.querySelector("#estimate-line");
const estimateTotal = document.querySelector("#estimate-total");
const estimateBreakdown = document.querySelector("#estimate-breakdown");
const paymentGrid = document.querySelector("#payment-grid");
const estimateNote = document.querySelector("#estimate-note");

function trackGoal(name, params = {}) {
  if (isLocalPreview) return;
  if (typeof window.ym !== "function") return;
  window.ym(110859289, "reachGoal", name, params);
  const shared = {
    calculator_welcome_start:"quiz_open", calculator_apartment_selected:"quiz_apartment_selected",
    calculator_area_selected:"quiz_area_selected", calculator_result_selected:"quiz_tariff_selected",
    calculator_submit_attempt:"quiz_submit_attempt", calculator_lead_failure:"quiz_lead_failure",
  }[name] || (name === "calculator_step_view" && params.step === 6 ? "main_quiz_contact" : "");
  if (shared) window.ym(110859289,"reachGoal",shared,{form:"repair_calculator",flow:"calculator_phone_last_v1"});
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
  const maxStep = 7;
  if (state.step === 6 && nextStep !== 6) window.VerhRepairPhoneAnalytics?.close();
  state.step = Math.max(0, Math.min(maxStep, nextStep));

  steps.forEach((step) => {
    const active = Number(step.dataset.step) === state.step;
    step.hidden = !active;
    step.classList.toggle("is-active", active);
  });

  const isWelcome = state.step === 0;
  const isIntro = state.step === 0 || state.step === 2;
  const isResult = state.step === 7;
  flow.classList.toggle("is-welcome", isWelcome);
  stepsContainer.classList.toggle("is-welcome", isWelcome);
  document.querySelector(".progress").hidden = isIntro || isResult;
  backButton.hidden = isWelcome || isResult;
  if (!isIntro && !isResult) {
    const progressStep = QUIZ_STEPS.indexOf(state.step) + 1;
    progressLabel.textContent = `${progressStep} / 4`;
    progressBar.style.width = `${progressStep * 25}%`;
  }

  if (state.step === 6) {
    renderSummary();
  }
  if (state.step === 6) {
    window.VerhRepairPhoneAnalytics?.view();
    phoneInput.focus({preventScroll:true});
  }

  if (track && !isIntro && !isResult) {
    trackGoal("calculator_step_view", { step: state.step, step_name: STEP_NAMES[state.step] });
  }

  window.scrollTo({ top: 0, behavior: "auto" });
}

function markSelection(selector, value, dataName) {
  document.querySelectorAll(selector).forEach((button) => {
    const selected = button.dataset[dataName] === String(value);
    button.classList.toggle("is-selected", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
}

function renderSummary() {
  const tariff = selectedTariff();
  selectionSummary.innerHTML = `
    <span>${state.apartment}</span>
    <span>${areaText(state.area)}</span>
    <span>${tariff.title}</span>
  `;
  closingOfferImage.src = tariff.image;
  closingOfferImage.alt = tariff.alt;
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
    consent: leadForm.elements.personal_data_consent.checked,
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

  const delivery = await window.VerhLead.send(leadEndpoint, payload);
  if (!["sent", "unverified"].includes(delivery?.status)) throw new Error("Lead delivery was not confirmed");
  return delivery;
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
  button.addEventListener("click", event => {
    if (event.isTrusted === false || state.step !== 3) return;
    state.apartment = button.dataset.apartment;
    markSelection("[data-apartment]", state.apartment, "apartment");
    trackGoal("calculator_apartment_selected", { apartment: state.apartment });
    setStep(4);
  });
});

document.querySelectorAll("[data-area]").forEach((button) => {
  button.addEventListener("click", event => {
    if (event.isTrusted === false || state.step !== 4) return;
    state.area = Number(button.dataset.area);
    state.areaLabel = button.dataset.areaLabel;
    areaInput.value = state.area;
    markSelection("[data-area]", state.area, "area");
    trackGoal("calculator_area_selected", { area: state.area, area_label: state.areaLabel });
    setStep(5);
  });
});

areaInput.addEventListener("input", () => {
  areaError.textContent = "";
});

areaForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (event.isTrusted === false || state.step !== 4) return;
  const value = Number(String(areaInput.value).replace(",", "."));
  if (!Number.isFinite(value) || value < 20 || value > 300) {
    areaError.textContent = "Укажи площадь от 20 до 300 м².";
    trackGoal("main_validation_error",{form:"repair_calculator",field:"area",flow:"calculator_phone_last_v1"});
    areaInput.focus();
    return;
  }
  state.area = Math.round(value * 10) / 10;
  state.areaLabel = "Своя площадь";
  markSelection("[data-area]", state.area, "area");
  trackGoal("calculator_area_selected", { area: state.area, area_label: state.areaLabel });
  setStep(5);
});

document.querySelectorAll("[data-level]").forEach((button) => {
  button.addEventListener("click", event => {
    if (event.isTrusted === false || state.step !== 5) return;
    if (!Object.prototype.hasOwnProperty.call(TARIFFS, button.dataset.level)) return;
    state.level = button.dataset.level;
    markSelection("[data-level]", state.level, "level");
    trackGoal("calculator_result_selected", { tariff: state.level });
    setStep(6);
  });
});

welcomeStartButton.addEventListener("click", () => {
  trackGoal("calculator_welcome_start");
  setStep(3);
});

startCalculatorButton.addEventListener("click", () => {
  trackGoal("calculator_intro_start");
  setStep(3);
});

backButton.addEventListener("click", () => {
  if (!state.sending) setStep(({3:0,4:3,5:4,6:5})[state.step] ?? 0);
});

phoneInput.addEventListener("input", () => {
  formStatus.textContent = "";
  phoneInput.setCustomValidity("");
});

phoneInput.addEventListener("blur", () => {
  if (normalizePhone(phoneInput.value)) phoneInput.value = formatPhoneForDisplay(phoneInput.value);
});

leadForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (event.isTrusted === false || state.step !== 6 || state.sending || !state.apartment || !state.area) return;
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
  state.sending = true;
  backButton.disabled = true;
  const submitButton = leadForm.querySelector("button[type='submit']");
  submitButton.disabled = true;
  submitButton.querySelector("span:first-child").textContent = "Отправляем…";
  trackGoal("calculator_submit_attempt", {
    apartment: state.apartment,
    area: state.area,
    tariff: state.level,
  });

  try {
    const delivery = await sendLead(leadPayload());
    window.VerhRepairPhoneAnalytics?.submitted();
    if (delivery.status !== "unverified" && !delivery.duplicate) trackGoal("calculator_lead_success", {
      apartment: state.apartment,
      area: state.area,
      tariff: state.level,
    });
    renderEstimate();
    setStep(7, { track: false });
  } catch (error) {
    trackGoal("calculator_lead_failure", {
      apartment: state.apartment,
      area: state.area,
      tariff: state.level,
    });
    formStatus.textContent = "Не получилось отправить номер. Проверь интернет и попробуй еще раз.";
    submitButton.disabled = false;
    submitButton.querySelector("span:first-child").textContent = "Повторить отправку";
  } finally {
    state.sending = false;
    backButton.disabled = false;
  }
});

document.querySelector("[data-call-action]")?.addEventListener("click", () => {
  trackGoal("calculator_phone_call", { placement: "result" });
});

document.querySelector("[data-welcome-call]")?.addEventListener("click", () => {
  trackGoal("calculator_phone_call", { placement: "welcome" });
});

document.querySelector("[data-welcome-site]")?.addEventListener("click", () => {
  trackGoal("calculator_site_link", { step: state.step, placement: "welcome" });
});

siteLink.addEventListener("click", () => {
  trackGoal("calculator_site_link", { step: state.step });
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
trackGoal("calculator_welcome_view");
