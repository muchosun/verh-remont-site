(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.VerhBriefValidation = api;
})(typeof window === "object" ? window : this, function () {
  "use strict";
  const stages = ["Ключи получены", "Ключи получу в течение 3 месяцев", "Ключи получу позже", "В квартире уже живу"];
  const times = ["10:00–13:00", "13:00–16:00", "16:00–19:00", "19:00–21:00"];
  const starts = ["В течение месяца", "Через 1–3 месяца", "Позже трёх месяцев"];
  const packages = ["Рабочий проект — 500 ₽/м², от 30 м², договор до 31 октября 2026", "Полный — 3 490 ₽/м², для квартир от 50 м²", "Рабочий проект в подарок + ремонт, любой тариф"];
  const text = value => typeof value === "string" ? value.trim() : "";
  function phone(value) {
    let digits = text(value).replace(/\D/g, "");
    if (digits.length === 10) digits = "7" + digits;
    if (digits.length === 11 && digits[0] === "8") digits = "7" + digits.slice(1);
    if (!/^79\d{9}$/.test(digits) || /(\d)\1{6}/.test(digits)) return "";
    return "+" + digits;
  }
  function validate(data) {
    const fail = (field, message) => ({ok:false, field, message});
    if (!data || !["brief", "callback"].includes(data.mode)) return fail("leadMode", "Выберите формат обращения.");
    const name = text(data.customerName);
    if (name.length < 2 || name.length > 80 || !/^[\p{L}\p{M} .'-]+$/u.test(name)) return fail("customerName", "Укажите ваше имя: от 2 до 80 символов.");
    const mobile = phone(data.phone);
    if (!mobile) return fail("phone", "Укажите российский мобильный номер +7 9XX XXX-XX-XX.");
    if (!times.includes(data.callbackTime)) return fail("callbackTime", "Выберите удобное время звонка.");
    if (data.ownsPhone !== true) return fail("ownsPhone", "Подтвердите, что это ваш номер и вы ждёте звонка.");
    if (data.consent !== true) return fail("consent", "Нужно согласие на обработку данных.");
    const values = {mode:data.mode,customerName:name,phone:mobile,callbackTime:data.callbackTime,ownsPhone:true,consent:true};
    if (data.mode === "callback") return {ok:true, values};
    const city = text(data.city);
    if (city.length < 2 || city.length > 80 || !/^[\p{L}\p{M} .()\-]+$/u.test(city)) return fail("city", "Укажите город квартиры.");
    const pack = text(data.package);
    if (!packages.includes(pack)) return fail("package", "Выберите пакет проекта.");
    const area = Number(data.area);
    const minimum = pack.startsWith("Полный") ? 50 : 30;
    if (!Number.isFinite(area) || area < minimum || area > 10000) return fail("area", `Укажите площадь от ${minimum} до 10 000 м².`);
    if (!stages.includes(data.propertyStage)) return fail("propertyStage", "Укажите, на каком этапе квартира.");
    if (!starts.includes(data.projectStart)) return fail("projectStart", "Выберите срок начала проекта.");
    const task = text(data.projectTask);
    const words = task.match(/[\p{L}\p{M}]{2,}/gu) || [];
    const distinct = new Set(words.map(word => word.toLowerCase()));
    if (task.length < 30 || task.length > 600 || distinct.size < 4 || /(.)\1{9}/u.test(task)) return fail("projectTask", "Опишите квартиру и задачу: 30–600 символов, хотя бы четыре разных слова.");
    return {ok:true,values:{...values,city,area,package:pack,propertyStage:data.propertyStage,projectStart:data.projectStart,projectTask:task}};
  }
  return {validate, phone};
});
