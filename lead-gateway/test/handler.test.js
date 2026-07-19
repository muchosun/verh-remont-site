"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { handler } = require("../index");

const originalFetch = global.fetch;
const originalEnvironment = {
  LEAD_ORIGIN: process.env.LEAD_ORIGIN,
  MAX_BOT_TOKEN: process.env.MAX_BOT_TOKEN,
  MAX_CHAT_ID: process.env.MAX_CHAT_ID,
  MAX_API_BASE: process.env.MAX_API_BASE,
};

function restoreEnvironment() {
  for (const [key, value] of Object.entries(originalEnvironment)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

function leadEvent(payload, overrides = {}) {
  return {
    httpMethod: "POST",
    path: "/v1/leads",
    headers: {
      Origin: "https://verhremont.ru",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    ...overrides,
  };
}

function validLead() {
  return {
    apartment: "Новостройка",
    area: 41.5,
    areaLabel: "Своя площадь",
    level: "comfort",
    phone: "8 (999) 123-45-67",
    source: "https://verhremont.ru/#quiz",
  };
}

test.afterEach(() => {
  global.fetch = originalFetch;
  restoreEnvironment();
});

test("health check does not require an Origin header", async () => {
  const result = await handler({ httpMethod: "GET", path: "/health" });

  assert.equal(result.statusCode, 200);
  assert.deepEqual(JSON.parse(result.body), { status: "ok" });
});

test("rejects a request from a different origin", async () => {
  const result = await handler(leadEvent(validLead(), {
    headers: { Origin: "https://example.com", "Content-Type": "application/json" },
  }));

  assert.equal(result.statusCode, 403);
  assert.deepEqual(JSON.parse(result.body), { status: "forbidden" });
});

test("validates the lead before attempting delivery", async () => {
  process.env.MAX_BOT_TOKEN = "token";
  process.env.MAX_CHAT_ID = "123";
  global.fetch = async () => assert.fail("MAX must not be called for invalid data");

  const result = await handler(leadEvent({ ...validLead(), area: 12 }));

  assert.equal(result.statusCode, 400);
  assert.equal(JSON.parse(result.body).status, "invalid_lead");
});

test("normalizes, recalculates and sends a lead to MAX", async () => {
  process.env.MAX_BOT_TOKEN = "test-token";
  process.env.MAX_CHAT_ID = "987654";
  const calls = [];
  global.fetch = async (url, options) => {
    calls.push({ url: String(url), options });
    return { ok: true, status: 200 };
  };

  const result = await handler(leadEvent(validLead()));
  const response = JSON.parse(result.body);
  const message = JSON.parse(calls[0].options.body).text;

  assert.equal(result.statusCode, 201);
  assert.equal(response.status, "accepted");
  assert.match(response.leadId, /^[0-9a-f-]{36}$/);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "https://platform-api2.max.ru/messages?chat_id=987654");
  assert.equal(calls[0].options.headers.Authorization, "test-token");
  assert.match(message, /\+7 \(999\) 123-45-67/);
  assert.match(message, /1\s?037\s?500 ₽/);
});

test("returns a neutral error when MAX does not accept the lead", async () => {
  process.env.MAX_BOT_TOKEN = "test-token";
  process.env.MAX_CHAT_ID = "987654";
  global.fetch = async () => ({ ok: false, status: 401 });

  const result = await handler(leadEvent(validLead()));

  assert.equal(result.statusCode, 502);
  assert.deepEqual(JSON.parse(result.body), { status: "delivery_failed" });
});
