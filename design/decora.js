(() => {
  'use strict';
  const estimate = document.querySelector('[data-estimate-area]');
  const area = document.querySelector('[data-form-area]');
  const total = document.querySelector('[data-estimate-total]');
  const packages = document.querySelector('select[name="package"]');
  const leadPrice = document.querySelector('[data-lead-price]');
  const leadDeadline = document.querySelector('[data-lead-deadline]');
  const money = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 });
  if (!estimate || !area || !total || !packages) return;
  const sync = (source) => {
    const target = source === estimate ? area : estimate;
    target.value = source.value;
    const value = Number(source.value);
    const valid = Number.isFinite(value) && value >= 30 && value <= 10000;
    total.textContent = valid ? `${money.format(value * 500)} ₽` : 'От 30 м²';
    estimate.setAttribute('aria-invalid', String(!valid));
    area.removeAttribute('aria-invalid');
  };
  estimate.addEventListener('input', () => sync(estimate));
  area.addEventListener('input', () => sync(area));
  const updateMinimum = () => {
    const full = packages.value.startsWith('Полный');
    const gift = packages.value.startsWith('Рабочий проект в подарок');
    const undecided = packages.value === 'Не определился';
    area.min = full ? '50' : '30';
    if (leadPrice) {
      leadPrice.textContent = full
        ? 'Полный проект с 3D · 3 490 ₽/м² · от 50 м²'
        : gift
          ? 'Рабочий проект — 0 ₽ при договоре на ремонт в Краснодаре'
          : undecided
            ? 'Поможем выбрать пакет и уточним стоимость'
            : 'Рабочий проект · 500 ₽/м² · от 30 м²';
    }
    if (leadDeadline) leadDeadline.hidden = full || gift || undecided;
  };
  packages.addEventListener('change', updateMinimum);
  document.querySelectorAll('[data-package]').forEach(button => button.addEventListener('click', updateMinimum));
  updateMinimum();
  // The calculator estimate must not prefill the customer's apartment area.
  if (!document.querySelector('[data-brief-version]')) sync(estimate);
})();
