import { readFile, mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const currentDir = dirname(fileURLToPath(import.meta.url));
const data = JSON.parse(await readFile(join(currentDir, "service-data.json"), "utf8"));

const escapeHtml = (value) => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

const mediaWatermark = () => `<img class="media-watermark" src="/assets/brand/verh-wordmark-white-transparent.webp" alt="" width="3360" height="1060" aria-hidden="true" />`;

const forbiddenClientCopy = [
  "посмотреть шаблон",
  "черновой ориентир",
  "черновые шаблоны",
  "для теста спроса",
  "preview /",
  "полноценный объём",
  "без мелких выездов",
  "берём работу комплексом",
  "закроем весь этап",
  "узнай стоимость своей работы",
];

function validateClientCopy(html, pageName) {
  const normalized = html.toLowerCase();
  const invalidPhrase = forbiddenClientCopy.find((phrase) => normalized.includes(phrase));
  if (invalidPhrase) {
    throw new Error(`Internal copy "${invalidPhrase}" found in ${pageName}`);
  }
}

const metrika = `
    <script>
      (function(m,e,t,r,i,k,a){
        m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
        m[i].l=1*new Date();
        for (var j=0;j<document.scripts.length;j+=1){if(document.scripts[j].src===r){return;}}
        k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a);
      })(window,document,'script','https://mc.yandex.ru/metrika/tag.js?id=110859289','ym');
      ym(110859289,'init',{ssr:true,webvisor:true,clickmap:true,referrer:document.referrer,url:location.href,accurateTrackBounce:true,trackLinks:true});
      window.VERH_LEAD_ENDPOINT = "https://functions.yandexcloud.net/d4e8j84veok7kjc043kk";
    </script>`;

function head({ title, description, canonical, stylesheet = "../styles.css" }) {
  return `<!doctype html>
<html lang="ru">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="robots" content="index, follow, max-image-preview:large" />
    <meta name="theme-color" content="#070707" />
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <link rel="canonical" href="${escapeHtml(canonical)}" />
    <meta property="og:type" content="website" />
    <meta property="og:locale" content="ru_RU" />
    <meta property="og:site_name" content="ВЕРХ" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:url" content="${escapeHtml(canonical)}" />
    <link rel="icon" href="/favicon.ico" sizes="any" />
    <link rel="stylesheet" href="${stylesheet}" />
    ${metrika}
  </head>`;
}

function header(isHub = false) {
  const navigation = isHub
    ? `<a href="#services">Услуги</a>
        <a href="/">Ремонт под ключ</a>
        <a href="tel:+79182383059" data-call-link>Позвонить</a>`
    : `<a href="/uslugi/">Все услуги</a>
        <a href="#prices">Цены</a>
        <a href="#examples">Примеры</a>`;
  const action = isHub
    ? `<a class="button button--outline header-lead" href="#services">Выбрать услугу</a>`
    : `<button class="button button--outline header-lead" type="button" data-scroll-lead>Рассчитать</button>`;

  return `<header class="preview-header">
      <a class="preview-brand" href="/" aria-label="ВЕРХ — на главную">
        <img src="/assets/brand/verh-wordmark-white-on-black.webp" alt="ВЕРХ" width="3360" height="1060" />
      </a>
      <nav class="preview-nav" aria-label="Основная навигация">
        ${navigation}
      </nav>
      ${action}
    </header>`;
}

function footer() {
  return `<footer class="preview-footer" id="contacts" data-page-footer>
      <div class="preview-footer__inner">
        <div class="preview-footer__brand">
          <a href="/" aria-label="ВЕРХ — на главную">
            <img src="/assets/brand/verh-wordmark-white-transparent.webp" alt="ВЕРХ" width="3360" height="1060" loading="lazy" decoding="async" />
          </a>
          <strong>Работаем официально</strong>
          <p>Заключаем договор до начала работ и фиксируем в нём стоимость, объём и сроки.</p>
        </div>
        <div class="preview-footer__facts">
          <div><span>Исполнитель</span><strong>ИП Пономаренко Игорь Владимирович</strong></div>
          <div><span>ИНН</span><strong>234207648329</strong></div>
          <div><span>ОГРНИП</span><strong>324237500512814</strong></div>
        </div>
        <ul class="preview-footer__assurances">
          <li>Стоимость и состав работ закрепляем в договоре.</li>
          <li>Дополнительные работы заранее согласуем.</li>
          <li>Результат принимаем по акту.</li>
        </ul>
      </div>
      <div class="preview-footer__bottom">
        <span>© 2026 ВЕРХ ремонт</span>
        <nav aria-label="Правовые документы">
          <a href="/contract.html">Как оформляем договор</a>
          <a href="/privacy.html">Политика обработки данных</a>
          <a href="/consent.html">Согласие на обработку данных</a>
          <a href="https://www.rusprofile.ru/ip/324237500512814" target="_blank" rel="noreferrer noopener">Проверить ИП</a>
        </nav>
      </div>
    </footer>`;
}

function servicePage(service) {
  const includeCards = service.includes.map(([title, text], index) => `
          <article class="deliverable">
            <span>${String(index + 1).padStart(2, "0")}</span>
            <h3>${escapeHtml(title)}</h3>
            <p>${escapeHtml(text)}</p>
          </article>`).join("");

  const priceRows = service.prices.map(([name, unit, price]) => `
              <tr>
                <th scope="row">${escapeHtml(name)}</th>
                <td>${escapeHtml(unit)}</td>
                <td>${escapeHtml(price)}</td>
              </tr>`).join("");

  const gallery = service.gallery.map(([src, width, height, title, text, position = "center center"]) => `
          <figure class="service-gallery__item">
            <img src="${escapeHtml(src)}" alt="${escapeHtml(title)}" width="${width}" height="${height}" loading="lazy" decoding="async" style="object-position:${escapeHtml(position)}" />
            ${mediaWatermark()}
            <figcaption><strong>${escapeHtml(title)}</strong><span>${escapeHtml(text)}</span></figcaption>
          </figure>`).join("");

  const scopeOptions = service.scopeOptions.map((option) => `<option value="${escapeHtml(option)}">${escapeHtml(option)}</option>`).join("");

  return `${head({
    title: `${service.title} — ВЕРХ`,
    description: `${service.description} ${service.price}.`,
    canonical: `https://verhremont.ru/uslugi/${service.slug}/`,
  })}
  <body data-service="${escapeHtml(service.shortTitle)}" data-service-slug="${escapeHtml(service.slug)}">
    <noscript><div><img src="https://mc.yandex.ru/watch/110859289" class="metrika-pixel" alt="" /></div></noscript>
    ${header()}
    <main>
      <section class="service-hero" id="top">
        <div class="service-hero__media" aria-hidden="true">
          <img src="${escapeHtml(service.heroImage)}" alt="" width="${service.heroWidth}" height="${service.heroHeight}" style="--hero-position:${escapeHtml(service.heroPosition)};--hero-mobile-position:${escapeHtml(service.heroMobilePosition || service.heroPosition)}" fetchpriority="high" decoding="async" />
          ${mediaWatermark()}
        </div>
        <div class="service-hero__content">
          <a class="breadcrumb" href="/uslugi/">Услуги / ${escapeHtml(service.shortTitle)}</a>
          <h1>${escapeHtml(service.title)}</h1>
          <p>${escapeHtml(service.description)}</p>
          <div class="service-price" aria-label="Стоимость работы">
            <span>Стоимость работы</span>
            <strong>${escapeHtml(service.price)}</strong>
            <small>${escapeHtml(service.priceNote)}</small>
          </div>
          <div class="service-hero__actions">
            <button class="button button--gold" type="button" data-scroll-lead>Рассчитать стоимость</button>
            <a class="button button--ghost" href="tel:+79182383059" data-call-link aria-label="Позвонить в ВЕРХ">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2A19.79 19.79 0 0 1 11.19 18.85a19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.9.33 1.78.62 2.63a2 2 0 0 1-.45 2.11L8.01 9.73a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.85.29 1.73.5 2.63.62A2 2 0 0 1 22 16.92Z" /></svg>
              <span>Позвонить</span>
            </a>
          </div>
          <ul class="hero-trust" aria-label="Условия">
            <li><strong>${escapeHtml(service.minimum)}</strong><span>минимальный объём</span></li>
            <li><strong>3 года</strong><span>гарантия на ремонт</span></li>
            <li><strong>По договору</strong><span>состав и сроки</span></li>
          </ul>
        </div>
      </section>

      <section class="fit-section section-dark">
        <div class="section-shell fit-section__grid">
          <div>
            <span class="section-label">Готовый результат</span>
            <h2>${escapeHtml(service.resultTitle)}</h2>
          </div>
          <div class="fit-copy">
            <p>${escapeHtml(service.result)}</p>
            <p class="fit-copy__limit">${escapeHtml(service.minimumNote)}</p>
          </div>
        </div>
      </section>

      <section class="section-light" id="scope">
        <div class="section-shell">
          <header class="section-heading">
            <span class="section-label">Что входит</span>
            <h2>${escapeHtml(service.scopeTitle)}</h2>
            <p>До начала работ перечислим все этапы в смете. Дополнительные работы выполняем только после согласования.</p>
          </header>
          <div class="deliverables-grid">${includeCards}
          </div>
        </div>
      </section>

      <section class="price-section section-dark" id="prices">
        <div class="section-shell price-section__grid">
          <header class="section-heading section-heading--dark">
            <span class="section-label">Стоимость работ</span>
            <h2>Сколько стоит работа</h2>
            <p>Показываем базовые цены. После осмотра назовём итоговую сумму и зафиксируем её в смете.</p>
          </header>
          <div class="price-table-wrap">
            <table class="price-table">
              <thead><tr><th>Работа</th><th>Единица</th><th>Цена от</th></tr></thead>
              <tbody>${priceRows}
              </tbody>
            </table>
            <p class="price-disclaimer">Материалы, демонтаж и подготовка основания считаются отдельно, если они нужны. Всё согласуем до начала работ.</p>
          </div>
        </div>
      </section>

      <section class="section-light examples-section" id="examples">
        <div class="section-shell">
          <header class="section-heading">
            <span class="section-label">Наши работы</span>
            <h2>Примеры выполненных работ</h2>
            <p>Фотографии с объектов ВЕРХ.</p>
          </header>
          <div class="service-gallery" tabindex="0" aria-label="Примеры работ и материалов">${gallery}
          </div>
        </div>
      </section>

      <section class="process-section section-dark">
        <div class="section-shell">
          <header class="section-heading section-heading--dark">
            <span class="section-label">Порядок работы</span>
            <h2>Как проходит работа</h2>
          </header>
          <ol class="process-list">
            <li><span>01</span><strong>Осматриваем объект</strong><p>Смотрим площадь, состояние основания и условия работы.</p></li>
            <li><span>02</span><strong>Составляем смету</strong><p>Перечисляем работы, материалы, сроки и итоговую стоимость.</p></li>
            <li><span>03</span><strong>Выполняем работу</strong><p>Работаем по смете и сообщаем о ходе ремонта.</p></li>
            <li><span>04</span><strong>Сдаём результат</strong><p>Вместе проверяем качество и подписываем акт.</p></li>
          </ol>
        </div>
      </section>

      <section class="lead-section section-light" id="lead">
        <div class="section-shell lead-section__grid">
          <header class="lead-copy">
            <span class="section-label">Расчёт стоимости</span>
            <h2>Рассчитаем стоимость для твоей квартиры</h2>
            <p>Выбери объём и оставь номер. Позвоним, зададим несколько вопросов и договоримся об осмотре.</p>
            <strong>${escapeHtml(service.minimum)}</strong>
          </header>
          <form class="service-form" data-service-form novalidate>
            <label>Объём работы
              <select name="scope" required>
                <option value="">Выбери объём</option>
                ${scopeOptions}
              </select>
            </label>
            <label>Что за объект
              <select name="property" required>
                <option value="">Выбери вариант</option>
                <option value="Новостройка">Новостройка</option>
                <option value="Вторичка">Вторичка</option>
                <option value="Коммерческое помещение">Коммерческое помещение</option>
              </select>
            </label>
            <label>Телефон
              <input name="phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="+7 (___) ___-__-__" required />
            </label>
            <label class="honeypot" aria-hidden="true">Сайт<input name="website" tabindex="-1" autocomplete="off" /></label>
            <label class="consent-row">
              <input name="consent" type="checkbox" checked required />
              <span>Даю <a href="/consent.html" target="_blank" rel="noopener">согласие на обработку данных</a>.</span>
            </label>
            <button class="button button--gold service-form__submit" type="submit">Рассчитать стоимость</button>
            <p class="form-status" data-form-status role="status" aria-live="polite"></p>
          </form>
        </div>
      </section>
    </main>
    ${footer()}
    <div class="mobile-actions" data-mobile-actions>
      <button class="button button--gold" type="button" data-scroll-lead>Рассчитать стоимость</button>
      <a class="button button--compact" href="tel:+79182383059" data-call-link aria-label="Позвонить в ВЕРХ">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2A19.79 19.79 0 0 1 11.19 18.85a19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.9.33 1.78.62 2.63a2 2 0 0 1-.45 2.11L8.01 9.73a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.85.29 1.73.5 2.63.62A2 2 0 0 1 22 16.92Z" /></svg>
        <span>Позвонить</span>
      </a>
    </div>
    <script src="../script.js" defer></script>
  </body>
</html>`;
}

function hubPage(services) {
  const cards = services.map((service) => `
          <article class="service-card">
            <a class="service-card__media" href="${escapeHtml(service.slug)}/" aria-label="Открыть: ${escapeHtml(service.shortTitle)}">
              <img src="${escapeHtml(service.heroImage)}" alt="${escapeHtml(service.shortTitle)}" width="${service.heroWidth}" height="${service.heroHeight}" loading="lazy" decoding="async" style="--hero-position:${escapeHtml(service.heroPosition)};--hero-mobile-position:${escapeHtml(service.heroMobilePosition || service.heroPosition)}" />
              ${mediaWatermark()}
            </a>
            <div class="service-card__body">
              <p>${escapeHtml(service.minimum)}</p>
              <h2><a href="${escapeHtml(service.slug)}/">${escapeHtml(service.shortTitle)}</a></h2>
              <strong>${escapeHtml(service.price)}</strong>
              <span>${escapeHtml(service.priceNote)}</span>
              <a class="service-card__link" href="${escapeHtml(service.slug)}/">Узнать стоимость</a>
            </div>
          </article>`).join("");

  return `${head({
    title: "Отделочные работы в Краснодаре — ВЕРХ",
    description: "Отделочные работы в Краснодаре: полы, стены, плитка, сантехника и потолки.",
    canonical: "https://verhremont.ru/uslugi/",
    stylesheet: "styles.css",
  })}
  <body class="hub-page">
    ${header(true)}
    <main>
      <section class="hub-hero">
        <div class="hub-hero__media" aria-hidden="true">
          <img src="/assets/tariffs/finish-cosmetic.webp" alt="" width="1024" height="1536" fetchpriority="high" decoding="async" />
        </div>
        <div class="hub-hero__content">
          <span class="section-label">Ремонт отдельных помещений</span>
          <h1>Отделочные работы в Краснодаре</h1>
          <p>Сделаем отдельный этап ремонта в комнате или квартире: уложим пол и плитку, подготовим стены, разведём сантехнику или установим потолок.</p>
          <a class="button button--gold" href="#services">Выбрать услугу</a>
          <ul class="hero-trust">
            <li><strong>Гарантия 3 года</strong><span>на выполненные работы</span></li>
            <li><strong>Цена в смете</strong><span>до начала работ</span></li>
            <li><strong>Работа по договору</strong><span>официально</span></li>
          </ul>
        </div>
      </section>

      <section class="hub-services section-light" id="services">
        <div class="section-shell">
          <header class="section-heading">
            <span class="section-label">Выбери, что нужно сделать</span>
            <h2>Отделочные работы для квартиры</h2>
            <p>Можно заказать одну услугу или собрать несколько работ в один ремонт. Перед началом осмотрим объект и согласуем смету.</p>
          </header>
          <div class="service-card-grid">${cards}
          </div>
        </div>
      </section>

      <section class="hub-note section-dark">
        <div class="section-shell hub-note__grid">
          <div><span class="section-label">Ремонт под ключ</span><h2>Нужно сделать всю квартиру?</h2></div>
          <div><p>Возьмём на себя весь ремонт: от подготовки стен и коммуникаций до чистовой отделки.</p><a href="/" class="button button--outline">Рассчитать ремонт квартиры</a></div>
        </div>
      </section>
    </main>
    ${footer()}
    <script src="script.js" defer></script>
  </body>
</html>`;
}

const hubHtml = hubPage(data.services);
validateClientCopy(hubHtml, "services index");
await writeFile(join(currentDir, "index.html"), hubHtml, "utf8");

for (const service of data.services) {
  const serviceDir = join(currentDir, service.slug);
  const serviceHtml = servicePage(service);
  validateClientCopy(serviceHtml, service.slug);
  await mkdir(serviceDir, { recursive: true });
  await writeFile(join(serviceDir, "index.html"), serviceHtml, "utf8");
}

console.log(`Generated ${data.services.length} service pages in ${currentDir}`);
