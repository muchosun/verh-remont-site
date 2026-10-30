(() => {
  'use strict';
  const estimate = document.querySelector('[data-estimate-area]');
  const area = document.querySelector('[data-form-area]');
  const total = document.querySelector('[data-estimate-total]');
  const packages = document.querySelector('select[name="package"]');
  const leadPrice = document.querySelector('[data-lead-price]');
  const leadDeadline = document.querySelector('[data-lead-deadline]');
  const summary = document.querySelector('[data-form-estimate]');
  const summaryLabel = document.querySelector('[data-form-estimate-label]');
  const summaryTotal = document.querySelector('[data-form-estimate-total]');
  const proceed = document.querySelector('[data-estimate-continue]');
  const mode = document.querySelector('[name="leadMode"]');
  const money = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 });
  const square = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 });
  if (!estimate || !area || !total || !packages) return;
  const validArea = (value, minimum = 30) => Number.isFinite(value) && value >= minimum && value <= 10000;
  const updateSummary = () => {
    if (!summary || !summaryLabel || !summaryTotal) return;
    summary.hidden = mode?.value === 'callback';
    const full = packages.value.startsWith('Полный');
    const gift = packages.value.startsWith('Рабочий проект в подарок');
    const undecided = packages.value === 'Не определился';
    const minimum = full ? 50 : 30;
    summaryLabel.textContent = full ? 'Полный проект с 3D · 3 490 ₽/м²'
      : gift ? 'Рабочий проект в подарок при договоре на ремонт в Краснодаре'
        : undecided ? 'Поможем выбрать пакет' : 'Рабочий проект · 500 ₽/м²';
    const value = Number(area.value);
    summaryTotal.textContent = undecided ? 'Уточним состав и стоимость'
      : validArea(value, minimum)
        ? `${square.format(value)} м² · ${money.format(value * (gift ? 0 : full ? 3490 : 500))} ₽`
        : area.value ? `Для этого проекта — от ${minimum} м², не более 10 000 м²` : 'Укажите площадь квартиры';
  };
  const updateProceed = () => {
    if (proceed) proceed.disabled = !validArea(Number(estimate.value));
  };
  const sync = (source) => {
    const target = source === estimate ? area : estimate;
    target.value = source.value;
    const value = Number(source.value);
    const valid = validArea(value);
    total.textContent = valid ? `${money.format(value * 500)} ₽` : 'От 30 м²';
    estimate.setAttribute('aria-invalid', String(!valid));
    area.removeAttribute('aria-invalid');
    updateProceed();
    updateSummary();
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
    updateSummary();
  };
  packages.addEventListener('change', updateMinimum);
  document.querySelectorAll('[data-package]').forEach(button => button.addEventListener('click', updateMinimum));
  proceed?.addEventListener('click', () => sync(estimate));
  document.querySelector('[data-quiz-mode]')?.addEventListener('click', updateSummary);
  document.querySelector('[data-quiz-back]')?.addEventListener('click', updateSummary);
  updateMinimum();
  updateProceed();
  // The calculator estimate must not prefill the customer's apartment area.
  if (!document.querySelector('[data-brief-version]')) sync(estimate);
})();
