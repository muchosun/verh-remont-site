(() => {
  const dialog = document.querySelector('dialog');
  const form = dialog.querySelector('form');
  const first = form.querySelector('[data-step="1"]');
  const second = form.querySelector('[data-step="2"]');
  const error = form.querySelector('.error');
  const preview = ['localhost', '127.0.0.1'].includes(location.hostname) || location.protocol === 'file:';
  const track = event => { try { window.ym?.(110859289, 'params', {arenda_17000:{event}}); } catch {} };
  let trigger;
  document.querySelectorAll('[data-open]').forEach(button => button.addEventListener('click', () => { trigger = button; dialog.showModal(); track('form_open'); }));
  const close = () => dialog.close();
  dialog.querySelector('.close').addEventListener('click', close);
  dialog.querySelector('[data-close]').addEventListener('click', close);
  dialog.addEventListener('close', () => trigger?.focus());
  const gallery = document.querySelector('.gallery-dialog');
  const galleryImage = gallery.querySelector('img');
  let galleryTrigger;
  document.querySelectorAll('[data-gallery-open]').forEach(link => link.addEventListener('click', event => {
    event.preventDefault();
    galleryTrigger = link;
    galleryImage.src = link.href;
    galleryImage.alt = link.querySelector('img').alt;
    gallery.showModal();
  }));
  gallery.querySelector('.gallery-close').addEventListener('click', () => gallery.close());
  gallery.addEventListener('close', () => galleryTrigger?.focus());
  form.querySelector('[data-next]').addEventListener('click', () => { first.hidden = true; second.hidden = false; form.elements.phone.focus(); });
  form.querySelector('[data-back]').addEventListener('click', () => { second.hidden = true; first.hidden = false; form.querySelector('[data-next]').focus(); });
  form.addEventListener('submit', async event => {
    event.preventDefault();
    let digits = form.elements.phone.value.replace(/\D/g, '');
    if (digits.length === 10) digits = '7' + digits;
    if (digits.length === 11 && digits[0] === '8') digits = '7' + digits.slice(1);
    if (!/^7\d{10}$/.test(digits) || !form.elements.consent.checked) { error.textContent = 'Укажите номер телефона и согласитесь на обработку данных.'; error.hidden = false; return; }
    const source = window.VerhLead.source();
    source.searchParams.set('offer', 'arenda_17000');
    source.searchParams.set('property', form.elements.property.value);
    const area = form.elements.area.value.trim();
    if (/^\d{1,4}([.,]\d)?$/.test(area)) source.searchParams.set('area', area.replace(',', '.'));
    const button = form.querySelector('[type="submit"]');
    button.disabled = true; error.hidden = true;
    track('submit_attempt');
    try {
      const result = preview ? {status:'preview'} : await window.VerhLead.send(window.VERH_LEAD_ENDPOINT, {kind:'callback',phone:'+' + digits,consent:true,website:form.elements.website.value,source:source.href,submittedAt:new Date().toISOString()});
      if (!['sent','unverified','preview'].includes(result.status)) throw new Error('Delivery not confirmed');
      if (!preview) track('delivery_received');
      second.hidden = true; form.querySelector('[data-success]').hidden = false;
      if (preview) {
        form.querySelector('[data-success] h2').textContent = 'Предпросмотр: заявка не отправлена';
        form.querySelector('[data-success] p').textContent = 'Это локальная проверка формы. Звонка не будет.';
      }
    } catch { track('delivery_error'); error.textContent = 'Не удалось подтвердить доставку. Попробуйте ещё раз или позвоните нам.'; error.hidden = false; button.disabled = false; }
  });
})();
