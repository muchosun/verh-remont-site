(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.VerhQuizValidation = api;
})(typeof window === "object" ? window : this, function () {
  "use strict";
  const packages = ["Рабочий проект — 500 ₽/м², от 30 м², договор до 31 октября 2026", "Полный — 3 490 ₽/м², для квартир от 50 м²", "Рабочий проект в подарок + ремонт, любой тариф"];
  const starts = ["В течение месяца", "Через 1–3 месяца", "Позже трёх месяцев"];
  const times = ["10:00–13:00", "13:00–16:00", "16:00–19:00", "19:00–21:00"];
  const text = value => typeof value === "string" ? value.trim() : "";
  function phone(value) {
    let digits = text(value).replace(/\D/g, "");
    if (digits.length === 10) digits = "7" + digits;
    if (digits.length === 11 && digits[0] === "8") digits = "7" + digits.slice(1);
    return /^79\d{9}$/.test(digits) && !/(\d)\1{6}/.test(digits) ? "+" + digits : "";
  }
  function validate(data, step) {
    const fail = (field, message) => ({ok:false, field, message});
    if (!data || !["brief", "callback"].includes(data.mode)) return fail("leadMode", "Выберите формат обращения.");
    const values = {mode:data.mode};
    if (data.mode === "brief") {
      values.city = text(data.city);
      if (values.city.length < 2 || values.city.length > 80 || !/^[\p{L}\p{M} .()\-]+$/u.test(values.city)) return fail("city", "Укажите город квартиры.");
      values.area = Number(data.area);
      const minimum = text(data.package).startsWith("Полный") ? 50 : 30;
      if (!Number.isFinite(values.area) || values.area < minimum || values.area > 10000) return fail("area", `Укажите площадь от ${minimum} до 10 000 м².`);
      if (step === 0) return {ok:true,values};
      values.package = text(data.package);
      if (!packages.includes(values.package)) return fail("package", "Выберите пакет проекта.");
      values.projectStart = text(data.projectStart);
      if (!starts.includes(values.projectStart)) return fail("projectStart", "Выберите срок начала проекта.");
      values.projectTask = text(data.projectTask);
      if (values.projectTask.length < 20 || values.projectTask.length > 600 || !/\p{L}/u.test(values.projectTask) || /(.)\1{9}/u.test(values.projectTask)) return fail("projectTask", "Коротко опишите задачу: от 20 до 600 символов.");
      if (step === 1) return {ok:true,values};
    }
    values.phone = phone(data.phone);
    if (!values.phone) return fail("phone", "Проверьте мобильный номер: +7 9XX XXX-XX-XX.");
    if (data.consent !== true) return fail("consent", "Нужно согласие на обработку данных.");
    values.consent = true;
    values.customerName = text(data.customerName);
    if (values.customerName && (values.customerName.length > 80 || !/^[\p{L}\p{M} .'-]+$/u.test(values.customerName))) return fail("customerName", "Проверьте имя или оставьте поле пустым.");
    values.callbackTime = text(data.callbackTime);
    if (values.callbackTime && !times.includes(values.callbackTime)) return fail("callbackTime", "Выберите время из списка или оставьте «В рабочее время».");
    return {ok:true,values};
  }
  return {validate,phone};
});
