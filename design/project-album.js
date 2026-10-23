(() => {
  const root = document.querySelector('[data-project-album]');
  if (!root) return;
  const titles = [
    'Исходный план', 'Демонтаж', 'Перегородки', 'Сводный план', 'Помещения',
    'Радиаторы', 'Мебель', 'Сантехника', 'Водоснабжение', 'Розетки',
    'Освещение', 'Выключатели', 'Тёплые полы', 'Кондиционеры', 'Безопасность',
    'Вентиляция', 'Напольные покрытия', 'Отделка стен', 'Потолки', 'Штукатурка',
    'Стяжка', 'Схема развёрток стен', 'Кухня-гостиная: привязки',
    'Кухня-гостиная: отделка', 'Комната: привязки', 'Комната: отделка',
    'Коридор: развёртки', 'Балкон: развёртки', 'Санузел: развёртки',
  ];
  const select = root.querySelector('[data-album-select]');
  const image = root.querySelector('[data-album-image]');
  const large = root.querySelector('[data-album-large]');
  const dialog = root.querySelector('[data-album-dialog]');
  const pan = root.querySelector('[data-album-pan]');
  const status = root.querySelector('[data-album-status]');
  const zoom = root.querySelector('[data-album-zoom]');
  const thumbnails = root.querySelector('[data-album-thumbnails]');
  const path = (index, prefix = 'page') => `/design/assets/design/project-example/${prefix}-${String(index + 1).padStart(2, '0')}.webp`;
  let current = 0;
  let opener;
  // Icons in the matching HTML use Lucide's MIT-licensed arrow/expand/zoom/x paths.
  titles.forEach((title, index) => {
    select.add(new Option(`${index + 1}. ${title}`, String(index)));
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'album-thumbnail';
    button.title = `${index + 1}. ${title}`;
    button.setAttribute('aria-label', `Лист ${index + 1}. ${title}`);
    const thumbnail = document.createElement('img');
    thumbnail.src = path(index, 'thumb');
    thumbnail.alt = '';
    thumbnail.loading = 'lazy';
    thumbnail.width = 106;
    thumbnail.height = 75;
    const label = document.createElement('span');
    label.textContent = `${index + 1}. ${title}`;
    button.append(thumbnail, label);
    button.addEventListener('click', () => show(index));
    thumbnails.append(button);
  });
  const resetZoom = () => {
    pan.classList.remove('is-zoomed');
    zoom.setAttribute('aria-pressed', 'false');
    zoom.setAttribute('aria-label', 'Увеличить масштаб');
    zoom.title = 'Увеличить масштаб';
    pan.scrollTo(0, 0);
  };
  function show(index) {
    current = Math.max(0, Math.min(titles.length - 1, index));
    const alt = `Лист ${current + 1}. ${titles[current]}`;
    status.textContent = '';
    image.src = path(current);
    image.alt = alt;
    if (dialog.open) large.src = path(current);
    large.alt = alt;
    root.querySelector('[data-album-title]').textContent = titles[current];
    select.value = String(current);
    root.querySelectorAll('[data-album-counter]').forEach(el => { el.textContent = `${current + 1} / ${titles.length}`; });
    root.querySelectorAll('[data-album-prev]').forEach(el => { el.disabled = current === 0; });
    root.querySelectorAll('[data-album-next]').forEach(el => { el.disabled = current === titles.length - 1; });
    [...thumbnails.children].forEach((el, i) => el.setAttribute('aria-pressed', String(i === current)));
    const active = thumbnails.children[current];
    thumbnails.scrollTo({ left: active.offsetLeft - thumbnails.offsetLeft - (thumbnails.clientWidth - active.clientWidth) / 2 });
    resetZoom();
  }
  select.addEventListener('change', () => show(Number(select.value)));
  root.querySelectorAll('[data-album-prev]').forEach(el => el.addEventListener('click', () => show(current - 1)));
  root.querySelectorAll('[data-album-next]').forEach(el => el.addEventListener('click', () => show(current + 1)));
  root.querySelectorAll('[data-album-open]').forEach(el => el.addEventListener('click', () => {
    opener = el;
    large.src = path(current);
    dialog.showModal();
    document.documentElement.classList.add('album-modal-open');
  }));
  root.querySelector('[data-album-close]').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => {
    document.documentElement.classList.remove('album-modal-open');
    resetZoom();
    opener?.focus({ preventScroll: true });
  });
  zoom.addEventListener('click', () => {
    const enlarged = pan.classList.toggle('is-zoomed');
    zoom.setAttribute('aria-pressed', String(enlarged));
    zoom.setAttribute('aria-label', enlarged ? 'Уменьшить масштаб' : 'Увеличить масштаб');
    zoom.title = enlarged ? 'Уменьшить масштаб' : 'Увеличить масштаб';
  });
  root.addEventListener('keydown', event => {
    if (event.target === select || pan.classList.contains('is-zoomed')) return;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      show(current + (event.key === 'ArrowLeft' ? -1 : 1));
    }
  });
  [image, large].forEach(el => el.addEventListener('error', () => {
    status.textContent = 'Не удалось загрузить лист. Откройте весь альбом в PDF по ссылке ниже.';
  }));
  show(0);
})();
