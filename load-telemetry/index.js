"use strict";

const EVENTS = new Set(["html_started", "dom_ready", "page_loaded", "form_ready", "form_timeout", "script_error", "first_contentful_paint", "captcha_started", "captcha_ready", "captcha_passed", "captcha_error"]);
const KEYS = new Set(["v", "page_id", "page", "event", "ms", "viewport", "channel", "qa", "asset"]);
const ASSETS = new Set(["main", "quiz", "validation", "lead", "metrika", "other"]);
const origin = "https://verhremont.ru";

function validate(body) {
  if (!body || typeof body !== "object" || Array.isArray(body) || Object.keys(body).some(key => !KEYS.has(key))) return null;
  if (body.v !== 1 || !/^[a-f0-9]{32}$/.test(body.page_id || "") || !["repair", "design"].includes(body.page) || !EVENTS.has(body.event)) return null;
  if (!Number.isInteger(body.ms) || body.ms < 0 || body.ms > 120000 || !["mobile", "desktop"].includes(body.viewport) || !["direct_ads", "other"].includes(body.channel) || typeof body.qa !== "boolean") return null;
  if (body.asset !== undefined && (body.event !== "script_error" || !ASSETS.has(body.asset))) return null;
  return {...body};
}

function createHandler(log = value => console.info(JSON.stringify(value))) {
  return async event => {
    const method = String(event.httpMethod || "GET").toUpperCase();
    const headers = event.headers || {};
    const requestOrigin = Object.entries(headers).find(([key]) => key.toLowerCase() === "origin")?.[1];
    const reply = (statusCode, body = "") => ({statusCode, headers:{"Cache-Control":"no-store", "Content-Type":"text/plain; charset=utf-8", "Vary":"Origin", ...(requestOrigin === origin ? {"Access-Control-Allow-Origin":origin,"Access-Control-Allow-Methods":"POST, OPTIONS","Access-Control-Allow-Headers":"Content-Type"} : {})}, body});
    if (method === "GET") return reply(200, "verh-load-telemetry-v1");
    if (requestOrigin !== origin) return reply(403);
    if (method === "OPTIONS") return reply(204);
    if (method !== "POST") return reply(405);
    try {
      if (typeof event.body !== "string" || Buffer.byteLength(event.body) > 1024) return reply(400);
      const raw = event.isBase64Encoded ? Buffer.from(event.body,"base64").toString("utf8") : event.body;
      const value = validate(JSON.parse(raw));
      if (!value) return reply(400);
      log({message:"verh_load_v1",level:"INFO",stream_name:"page_load",...value});
      return reply(204);
    } catch { return reply(400); }
  };
}

module.exports = {handler:createHandler(), createHandler, validate};
