const fontPresets = {
  manrope: "Manrope: спокойная премиальная подача, близкая к текущему UI kit.",
  vk: "VK Sans: целевой ориентир VK-коммуникаций. Если VK Sans не установлен или не подключен, будет показан ближайший fallback.",
  montserrat: "Montserrat: более рекламный, плотный и уверенный характер для баннеров и цен.",
  inter: "Inter: нейтральная интерфейсная подача, высокая читаемость без лишнего характера.",
  onest: "Onest: современный русский UI-шрифт, мягче и дружелюбнее Inter.",
  geologica: "Geologica: более архитектурный и конструктивный характер, сильнее ощущение стройки."
};

const fontButtons = [...document.querySelectorAll("[data-font-option]")];
const fontStatus = document.querySelector("#font-status");

const isFontAvailable = (family) => {
  const sample = "ВЕРХ ремонт 20 000 ₽";
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  const bases = ["monospace", "serif", "sans-serif"];

  return bases.some((base) => {
    context.font = `700 72px ${base}`;
    const baseWidth = context.measureText(sample).width;
    context.font = `700 72px "${family}", ${base}`;
    return context.measureText(sample).width !== baseWidth;
  });
};

const updateFontStatus = async (preset) => {
  if (!fontStatus) return;

  if (preset !== "vk" || !document.fonts) {
    fontStatus.textContent = fontPresets[preset] || fontPresets.manrope;
    return;
  }

  await document.fonts.ready;
  if (document.body.dataset.fontPreset !== preset) return;

  const hasDisplay = isFontAvailable("VK Sans Display");
  const hasText = isFontAvailable("VK Sans Text");
  const suffix = hasDisplay || hasText
    ? " Найден настоящий VK Sans в браузере."
    : " Настоящий VK Sans не найден: сейчас показан fallback через Manrope/Inter.";
  fontStatus.textContent = `${fontPresets.vk}${suffix}`;
};

const applyFontPreset = (preset) => {
  const safePreset = fontPresets[preset] ? preset : "manrope";
  document.body.dataset.fontPreset = safePreset;
  fontButtons.forEach((button) => {
    const isActive = button.dataset.fontOption === safePreset;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
  localStorage.setItem("verh-ui-font-preset", safePreset);
  updateFontStatus(safePreset);
};

fontButtons.forEach((button) => {
  button.addEventListener("click", () => applyFontPreset(button.dataset.fontOption));
});

applyFontPreset(document.body.dataset.fontPreset || "onest");

const galleries = [...document.querySelectorAll("[data-gallery]")];

galleries.forEach((gallery, galleryIndex) => {
  const images = [...gallery.querySelectorAll("img")];
  const button = gallery.querySelector("button");
  let activeIndex = 0;

  const showImage = (nextIndex) => {
    images[activeIndex].classList.remove("is-active");
    activeIndex = nextIndex % images.length;
    images[activeIndex].classList.add("is-active");
  };

  button?.addEventListener("click", () => showImage(activeIndex + 1));

  window.setInterval(() => {
    if (document.hidden) return;
    showImage(activeIndex + 1);
  }, 3600 + galleryIndex * 500);
});

document.querySelectorAll(".quiz-option").forEach((option) => {
  option.addEventListener("click", () => {
    const group = option.closest(".quiz-sheet");
    group?.querySelectorAll(".quiz-option").forEach((item) => item.classList.remove("is-selected"));
    option.classList.add("is-selected");
  });
});
