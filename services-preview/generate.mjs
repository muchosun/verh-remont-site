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

function head({ title, description, stylesheet = "../styles.css" }) {
  return `<!doctype html>
<html lang="ru">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="robots" content="noindex, nofollow" />
    <meta name="theme-color" content="#070707" />
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <link rel="icon" href="/favicon.ico" sizes="any" />
    <link rel="stylesheet" href="${stylesheet}" />
    ${metrika}
  </head>`;
}

function header() {
  return `<header class="preview-header">
      <a class="preview-brand" href="/" aria-label="ВЕРХ — на главную">
        <img src="/assets/brand/verh-wordmark-white-on-black.webp" alt="ВЕРХ" width="3360" height="1060" />
      </a>
      <nav class="preview-nav" aria-label="Навигация по шаблонам">
        <a href="/services-preview/">Все услуги</a>
        <a href="#prices">Цены</a>
        <a href="#examples">Примеры</a>
      </nav>
      <button class="button button--outline header-lead" type="button" data-scroll-lead>Рассчитать</button>
    </header>`;
}

function footer() {
  return `<footer class="preview-footer" data-page-footer>
      <a class="preview-footer__brand" href="/">ВЕРХ</a>
      <p>Ремонт и отделочные работы в Краснодаре</p>
      <nav aria-label="Юридическая информация">
        <a href="/privacy.html">Политика</a>
        <a href="/consent.html">Согласие</a>
        <a href="/contract.html">Договор</a>
      </nav>
      <small>Черновые шаблоны. Цены и условия требуют подтверждения.</small>
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

  const gallery = service.gallery.map(([src, width, height, title, text]) => `
          <figure class="service-gallery__item">
            <img src="${escapeHtml(src)}" alt="${escapeHtml(title)}" width="${width}" height="${height}" loading="lazy" decoding="async" />
            ${mediaWatermark()}
            <figcaption><strong>${escapeHtml(title)}</strong><span>${escapeHtml(text)}</span></figcaption>
          </figure>`).join("");

  const scopeOptions = service.scopeOptions.map((option) => `<option value="${escapeHtml(option)}">${escapeHtml(option)}</option>`).join("");

  return `${head({
    title: `${service.title} — ВЕРХ`,
    description: `${service.description} ${service.price}.`,
  })}
  <body data-service="${escapeHtml(service.shortTitle)}" data-service-slug="${escapeHtml(service.slug)}">
    <noscript><div><img src="https://mc.yandex.ru/watch/110859289" class="metrika-pixel" alt="" /></div></noscript>
    ${header()}
    <main>
      <section class="service-hero" id="top">
        <div class="service-hero__media" aria-hidden="true">
          <img src="${escapeHtml(service.heroImage)}" alt="" width="${service.heroWidth}" height="${service.heroHeight}" style="object-position:${escapeHtml(service.heroPosition)}" fetchpriority="high" decoding="async" />
          ${mediaWatermark()}
        </div>
        <div class="service-hero__content">
          <a class="breadcrumb" href="/services-preview/">Услуги / ${escapeHtml(service.shortTitle)}</a>
          <h1>${escapeHtml(service.title)}</h1>
          <p>${escapeHtml(service.description)}</p>
          <div class="service-price" aria-label="Черновой ценовой ориентир">
            <span>Черновой ориентир</span>
            <strong>${escapeHtml(service.price)}</strong>
            <small>${escapeHtml(service.priceNote)}</small>
          </div>
          <div class="service-hero__actions">
            <button class="button button--gold" type="button" data-scroll-lead>Рассчитать объём</button>
            <a class="button button--ghost" href="tel:+79182383059" data-call-link>Позвонить</a>
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
            <span class="section-label">Без мелких выездов</span>
            <h2>Берём работу комплексом</h2>
          </div>
          <div class="fit-copy">
            <p>${escapeHtml(service.result)}</p>
            <p class="fit-copy__limit">${escapeHtml(service.notFor)}</p>
          </div>
        </div>
      </section>

      <section class="section-light" id="scope">
        <div class="section-shell">
          <header class="section-heading">
            <span class="section-label">Что получишь</span>
            <h2>Один исполнитель на весь этап</h2>
            <p>Сначала фиксируем объём, затем называем цену и только после этого выходим на объект.</p>
          </header>
          <div class="deliverables-grid">${includeCards}
          </div>
        </div>
      </section>

      <section class="price-section section-dark" id="prices">
        <div class="section-shell price-section__grid">
          <header class="section-heading section-heading--dark">
            <span class="section-label">Стоимость работ</span>
            <h2>Понятный ориентир до замера</h2>
            <p>Показываем стартовую стоимость сразу. После осмотра фиксируем полный объём и цену в смете.</p>
          </header>
          <div class="price-table-wrap">
            <table class="price-table">
              <thead><tr><th>Работа</th><th>Единица</th><th>Ориентир</th></tr></thead>
              <tbody>${priceRows}
              </tbody>
            </table>
            <p class="price-disclaimer">Материалы, демонтаж и сложная подготовка считаются отдельно после осмотра. Прайс не является публичной офертой.</p>
          </div>
        </div>
      </section>

      <section class="section-light examples-section" id="examples">
        <div class="section-shell">
          <header class="section-heading">
            <span class="section-label">Работы ВЕРХ</span>
            <h2>Посмотри результат в деталях</h2>
            <p>Показываем реальные материалы и объекты, с которыми уже работала команда.</p>
          </header>
          <div class="service-gallery" tabindex="0" aria-label="Примеры работ и материалов">${gallery}
          </div>
        </div>
      </section>

      <section class="process-section section-dark">
        <div class="section-shell">
          <header class="section-heading section-heading--dark">
            <span class="section-label">Порядок работы</span>
            <h2>От заявки до готового этапа</h2>
          </header>
          <ol class="process-list">
            <li><span>01</span><strong>Уточняем объём</strong><p>Смотрим помещение, площадь и состояние основания.</p></li>
            <li><span>02</span><strong>Фиксируем смету</strong><p>Разделяем обязательные работы и возможные допы.</p></li>
            <li><span>03</span><strong>Выполняем этап</strong><p>Работаем по согласованному составу и срокам.</p></li>
            <li><span>04</span><strong>Принимаем результат</strong><p>Проверяем качество и подписываем выполненный этап.</p></li>
          </ol>
        </div>
      </section>

      <section class="lead-section section-light" id="lead">
        <div class="section-shell lead-section__grid">
          <header class="lead-copy">
            <span class="section-label">Без длинного квиза</span>
            <h2>Прикинем объём твоей работы</h2>
            <p>Выбери объём и оставь телефон. Уточним детали и скажем, подходит ли задача под наш минимальный заказ.</p>
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
            <button class="button button--gold service-form__submit" type="submit">Получить предварительный расчёт</button>
            <p class="form-status" data-form-status role="status" aria-live="polite"></p>
          </form>
        </div>
      </section>
    </main>
    ${footer()}
    <div class="mobile-actions" data-mobile-actions>
      <button class="button button--gold" type="button" data-scroll-lead>Рассчитать</button>
      <a class="button button--compact" href="tel:+79182383059" data-call-link aria-label="Позвонить в ВЕРХ">Позвонить</a>
    </div>
    <script src="../script.js" defer></script>
  </body>
</html>`;
}

function hubPage(services) {
  const cards = services.map((service) => `
          <article class="service-card">
            <a class="service-card__media" href="${escapeHtml(service.slug)}/" aria-label="Открыть: ${escapeHtml(service.shortTitle)}">
              <img src="${escapeHtml(service.heroImage)}" alt="${escapeHtml(service.shortTitle)}" width="${service.heroWidth}" height="${service.heroHeight}" loading="lazy" decoding="async" style="object-position:${escapeHtml(service.heroPosition)}" />
              ${mediaWatermark()}
            </a>
            <div class="service-card__body">
              <p>${escapeHtml(service.minimum)}</p>
              <h2><a href="${escapeHtml(service.slug)}/">${escapeHtml(service.shortTitle)}</a></h2>
              <strong>${escapeHtml(service.price)}</strong>
              <span>${escapeHtml(service.priceNote)}</span>
              <a class="service-card__link" href="${escapeHtml(service.slug)}/">Посмотреть шаблон</a>
            </div>
          </article>`).join("");

  return `${head({
    title: "Отделочные работы в Краснодаре — шаблоны ВЕРХ",
    description: "Предварительные шаблоны страниц отделочных услуг ВЕРХ.",
    stylesheet: "styles.css",
  })}
  <body class="hub-page">
    ${header()}
    <main>
      <section class="hub-hero">
        <div class="hub-hero__media" aria-hidden="true">
          <img src="/assets/tariffs/finish-cosmetic.webp" alt="" width="1024" height="1536" fetchpriority="high" decoding="async" />
        </div>
        <div class="hub-hero__content">
          <span class="section-label">Отдельные услуги ВЕРХ</span>
          <h1>Отделочные работы в Краснодаре</h1>
          <p>Берём комнату, санузел или полноценный этап ремонта. Мелкие бытовые выезды и замену отдельных элементов не выполняем.</p>
          <a class="button button--gold" href="#services">Выбрать работу</a>
          <ul class="hero-trust">
            <li><strong>6 направлений</strong><span>от пола до потолка</span></li>
            <li><strong>Один исполнитель</strong><span>на весь этап работ</span></li>
            <li><strong>Цена заранее</strong><span>фиксируем в смете</span></li>
          </ul>
        </div>
      </section>

      <section class="hub-services section-light" id="services">
        <div class="section-shell">
          <header class="section-heading">
            <span class="section-label">Не мастер на час</span>
            <h2>Выбери полноценный этап</h2>
            <p>Берём одну комнату, санузел или полноценный этап. Стоимость зависит от объёма и состояния основания.</p>
          </header>
          <div class="service-card-grid">${cards}
          </div>
        </div>
      </section>

      <section class="hub-note section-dark">
        <div class="section-shell hub-note__grid">
          <div><span class="section-label">Ремонт целиком</span><h2>Нужно больше одной услуги?</h2></div>
          <div><p>Соберём работы в один проект: от подготовки стен и инженерии до чистовой отделки.</p><a href="/" class="button button--outline">Посмотреть ремонт под ключ</a></div>
        </div>
      </section>
    </main>
    ${footer()}
    <script src="script.js" defer></script>
  </body>
</html>`;
}

await writeFile(join(currentDir, "index.html"), hubPage(data.services), "utf8");

for (const service of data.services) {
  const serviceDir = join(currentDir, service.slug);
  await mkdir(serviceDir, { recursive: true });
  await writeFile(join(serviceDir, "index.html"), servicePage(service), "utf8");
}

console.log(`Generated ${data.services.length} service pages in ${currentDir}`);
