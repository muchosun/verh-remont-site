(() => {
  "use strict";
  if (new URLSearchParams(location.search).get("intent") !== "design_commercial") return;
  document.documentElement.dataset.designIntent = "commercial";
  const setText = (selector, text) => {
    const node = document.querySelector(selector);
    if (node) node.textContent = text;
  };
  document.title = "Дизайн кафе, офисов и магазинов — ВЕРХ";
  const description = "Дизайн коммерческих помещений: кафе, офисов и магазинов. Обсудим задачи бизнеса, состав проекта и стоимость до начала работ.";
  for (const selector of ['meta[name="description"]', 'meta[property="og:description"]']) {
    document.querySelector(selector)?.setAttribute("content", description);
  }
  document.querySelector('meta[property="og:title"]')?.setAttribute("content", document.title);
  document.querySelector('meta[property="og:image"]')?.setAttribute("content", "https://verhremont.ru/design/assets/design/commercial-consultation.jpg");
  setText(".service-hero h1", "Дизайн кафе и офисов");
  setText(".service-hero__content > h1 + p", "Спроектируем пространство для вашего бизнеса: кафе, офис или магазин. Обсудим планировку, работу персонала и удобство посетителей.");
  setText(".hero-offer", "Состав проекта и стоимость определим под ваше помещение и задачи. Сначала — консультация.");
  const image = document.querySelector(".service-hero__media > img:not(.media-watermark)");
  if (image) {
    image.src = "/design/assets/design/commercial-consultation.jpg";
    image.width = 1254;
    image.height = 1254;
  }
  const links = [...document.querySelectorAll(".preview-nav a")];
  [["#process", "Порядок работы"], ["#lead", "Обсудить проект"], ["#contacts", "Контакты"]].forEach(([href, text], index) => {
    if (!links[index]) return;
    links[index].setAttribute("href", href);
    links[index].textContent = text;
  });
  if (links[3]) links[3].hidden = true;
  // Reuse the existing consultation route; do not create a second delivery path.
  document.querySelectorAll("[data-scroll-lead]").forEach(button => {
    button.dataset.leadMode = "callback";
    button.removeAttribute("data-package");
  });
  setText(".service-hero__actions [data-scroll-lead]", "Обсудить задачу");
  setText("#process h2", "От задачи бизнеса до проекта");
  const process = [
    ["Обсуждаем задачу", "Уточняем формат бизнеса, особенности помещения, бюджет и пожелания к пространству."],
    ["Согласуем исходные данные", "Определяем, какие замеры и сведения о помещении нужны для начала работы."],
    ["Фиксируем состав проекта", "Согласуем необходимые решения, чертежи, стоимость и порядок работы в договоре."],
    ["Готовим и согласуем решения", "Обсуждаем проект по этапам и передаём материалы в согласованном составе."],
  ];
  document.querySelectorAll("#process .process-list li").forEach((item, index) => {
    if (!process[index]) return;
    item.querySelector("strong").textContent = process[index][0];
    item.querySelector("p").textContent = process[index][1];
  });
  const lead = document.querySelector("#lead");
  if (lead) {
    lead.dataset.consultationTitle = "Обсудим ваше помещение";
    lead.dataset.consultationDescription = "Оставьте номер. Уточним задачи бизнеса и пожелания, обсудим состав проекта и стоимость. Площадь можно назвать при разговоре.";
  }
  const form = document.querySelector('[data-service-form][data-brief-version="3"]');
  if (form) form.elements.leadMode.value = "callback";
})();
