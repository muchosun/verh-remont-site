"use strict";

const { randomUUID } = require("node:crypto");

const TARIFS = {
  standard: { title: "Стандарт", pricePerMeter: 20000 },
  comfort: { title: "Комфорт", pricePerMeter: 25000 },
  lux: { title: "Люкс", pricePerMeter: 29000 },
};

const APARTMENTS = new Set(["Новостройка", "Вторичка"]);
const SECONDARY_SURCHARGE = 100000;
const MAX_MESSAGE_LIMIT = 4000;

function allowedOrigin() {
  return new URL(process.env.LEAD_ORIGIN || "https://verhremont.ru").origin;
}

function getHeader(headers, name) {
  if (!headers || typeof headers !== "object") return "";
  const target = name.toLowerCase();
  const key = Object.keys(headers).find((candidate) => candidate.toLowerCase() === target);
  const value = key ? headers[key] : "";
  return Array.isArray(value) ? String(value[0] || "") : String(value || "");
}

function getRequest(event) {
  const request = event && typeof event === "object" ? event : {};
  const headers = request.headers || {};
  const method = String(
    request.httpMethod || request.requestContext?.httpMethod || request.requestContext?.http?.method || "POST",
  ).toUpperCase();

  return { headers, method, request };
}

function parseBody(request) {
  if (request.body && typeof request.body === "object") return request.body;
  if (typeof request.body === "string") {
    const body = request.isBase64Encoded
      ? Buffer.from(request.body, "base64").toString("utf8")
      : request.body;
    return JSON.parse(body);
  }

  // This also makes the handler convenient to test with a direct JSON payload.
  if (request && typeof request === "object" && "apartment" in request) return request;
  throw new Error("Request body is missing");
}

function formatPhone(rawPhone) {
  let digits = String(rawPhone || "").replace(/\D/g, "");
  if (digits.length === 10) digits = `7${digits}`;
  if (digits.startsWith("8") && digits.length === 11) digits = `7${digits.slice(1)}`;
  if (!/^7\d{10}$/.test(digits)) return null;

  return `+7 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7, 9)}-${digits.slice(9, 11)}`;
}

function parseArea(rawArea) {
  const area = typeof rawArea === "string"
    ? Number(rawArea.replace(",", "."))
    : Number(rawArea);
  if (!Number.isFinite(area) || area < 20 || area > 300) return null;
  return Math.round(area * 10) / 10;
}

function formatArea(area) {
  return `${String(area).replace(".", ",")} м²`;
}

function formatMoney(value) {
  return `${new Intl.NumberFormat("ru-RU").format(value)} ₽`;
}

function normalizeSource(rawSource, origin) {
  try {
    const url = new URL(String(rawSource || ""));
    if (url.origin === origin) return `${url.pathname}${url.search}`.slice(0, 240);
  } catch {
    // The source is only metadata for the manager; an invalid value is replaced below.
  }
  return "/";
}

function validateLead(payload, origin) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { ok: false, message: "Некорректные данные заявки." };
  }

  if (typeof payload.website === "string" && payload.website.trim()) {
    return { ok: true, honeypot: true };
  }

  const apartment = String(payload.apartment || "").trim();
  const level = String(payload.level || "").trim().toLowerCase();
  const area = parseArea(payload.area);
  const phone = formatPhone(payload.phone);

  if (!APARTMENTS.has(apartment)) return { ok: false, message: "Выбери тип квартиры." };
  if (area === null) return { ok: false, message: "Укажи площадь от 20 до 300 м²." };
  if (!TARIFS[level]) return { ok: false, message: "Выбери уровень ремонта." };
  if (!phone) return { ok: false, message: "Укажи корректный номер телефона." };

  const tariff = TARIFS[level];
  const secondarySurcharge = apartment === "Вторичка" ? SECONDARY_SURCHARGE : 0;
  const preliminaryEstimate = Math.round(area * tariff.pricePerMeter) + secondarySurcharge;

  return {
    ok: true,
    lead: {
      id: randomUUID(),
      apartment,
      area,
      areaLabel: String(payload.areaLabel || "").trim().slice(0, 40),
      level,
      levelTitle: tariff.title,
      pricePerMeter: tariff.pricePerMeter,
      secondarySurcharge,
      preliminaryEstimate,
      phone,
      source: normalizeSource(payload.source, origin),
      receivedAt: new Date().toISOString(),
    },
  };
}

function formatMaxMessage(lead) {
  const lines = [
    "Новая заявка с сайта ВЕРХ ремонт",
    `Заявка: #${lead.id.slice(0, 8)}`,
    `Телефон: ${lead.phone}`,
    `Квартира: ${lead.apartment}`,
    `Площадь: ${formatArea(lead.area)}${lead.areaLabel ? ` (${lead.areaLabel})` : ""}`,
    `Результат: ${lead.levelTitle}`,
    `Ориентир: ${formatMoney(lead.preliminaryEstimate)}`,
  ];

  if (lead.secondarySurcharge) {
    lines.push(`Включён демонтаж для вторички: ${formatMoney(lead.secondarySurcharge)}`);
  }

  lines.push(`Страница: ${lead.source}`);
  return lines.join("\n").slice(0, MAX_MESSAGE_LIMIT);
}

async function sendToMax(lead) {
  const token = String(process.env.MAX_BOT_TOKEN || "").trim();
  const chatId = String(process.env.MAX_CHAT_ID || "").trim();
  const apiBase = String(process.env.MAX_API_BASE || "https://platform-api2.max.ru").replace(/\/$/, "");

  if (!token || !chatId) {
    throw new Error("MAX delivery is not configured");
  }

  const endpoint = new URL(`${apiBase}/messages`);
  endpoint.searchParams.set("chat_id", chatId);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7000);
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: formatMaxMessage(lead),
        format: "markdown",
        notify: true,
        disable_link_preview: true,
      }),
      signal: controller.signal,
    });

    if (!response.ok) throw new Error(`MAX responded with ${response.status}`);
  } finally {
    clearTimeout(timeout);
  }
}

function response(statusCode, body, origin = "") {
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
  };

  if (origin) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Access-Control-Allow-Methods"] = "POST, OPTIONS";
    headers["Access-Control-Allow-Headers"] = "Content-Type";
    headers["Access-Control-Max-Age"] = "600";
    headers.Vary = "Origin";
  }

  return { statusCode, headers, body: JSON.stringify(body) };
}

async function handler(event) {
  const { headers, method, request } = getRequest(event);
  const origin = allowedOrigin();
  const requestOrigin = getHeader(headers, "origin");
  const path = String(request.path || request.rawPath || request.requestContext?.http?.path || "");

  if (method === "GET" && (path === "/health" || path.endsWith("/health"))) {
    return response(200, { status: "ok" });
  }

  if (requestOrigin !== origin) {
    return response(403, { status: "forbidden" });
  }

  if (method === "OPTIONS") return response(204, {}, origin);
  if (method !== "POST") return response(405, { status: "method_not_allowed" }, origin);

  const contentType = getHeader(headers, "content-type");
  if (contentType && !contentType.toLowerCase().startsWith("application/json")) {
    return response(415, { status: "unsupported_media_type" }, origin);
  }

  let payload;
  try {
    payload = parseBody(request);
  } catch {
    return response(400, { status: "invalid_json" }, origin);
  }

  const result = validateLead(payload, origin);
  if (!result.ok) return response(400, { status: "invalid_lead", message: result.message }, origin);
  if (result.honeypot) return response(202, { status: "accepted" }, origin);

  try {
    await sendToMax(result.lead);
  } catch (error) {
    // Do not log the lead or its phone number: Yandex Cloud logs are not a CRM.
    console.error(`[lead] ${result.lead.id} was not delivered: ${error.message}`);
    return response(502, { status: "delivery_failed" }, origin);
  }

  console.info(`[lead] ${result.lead.id} delivered`);
  return response(201, { status: "accepted", leadId: result.lead.id }, origin);
}

module.exports = {
  handler,
  // Exported for isolated tests; the runtime entry point remains index.handler.
  formatMaxMessage,
  validateLead,
};
