#!/usr/bin/env node
"use strict";

const DEFAULT_API_BASE = "https://platform-api2.max.ru";

function extractBotAddedChats(updates) {
  const knownIds = new Set();

  return (Array.isArray(updates) ? updates : [])
    .filter((update) => update && update.update_type === "bot_added" && Number.isInteger(update.chat_id))
    .filter((update) => {
      if (knownIds.has(update.chat_id)) return false;
      knownIds.add(update.chat_id);
      return true;
    })
    .map((update) => ({
      chatId: update.chat_id,
      timestamp: Number.isFinite(update.timestamp) ? new Date(update.timestamp * 1000).toISOString() : null,
      isChannel: Boolean(update.is_channel),
    }));
}

async function main() {
  const token = String(process.env.MAX_BOT_TOKEN || "").trim();
  const apiBase = String(process.env.MAX_API_BASE || DEFAULT_API_BASE).replace(/\/$/, "");

  if (!token) {
    throw new Error("Не задана временная переменная MAX_BOT_TOKEN.");
  }

  const endpoint = new URL(`${apiBase}/updates`);
  endpoint.searchParams.set("types", "bot_added");
  endpoint.searchParams.set("limit", "100");

  const response = await fetch(endpoint, {
    headers: { Authorization: token },
  });

  if (!response.ok) {
    throw new Error(`MAX вернул HTTP ${response.status}. Проверь токен и отсутствие активного webhook.`);
  }

  const payload = await response.json();
  const chats = extractBotAddedChats(payload.updates);

  if (!chats.length) {
    console.error("События bot_added не найдены. Удали и добавь бота в нужный чат, затем запусти скрипт ещё раз.");
    process.exitCode = 2;
    return;
  }

  for (const chat of chats) {
    const kind = chat.isChannel ? "канал" : "чат";
    const time = chat.timestamp ? `, событие ${chat.timestamp}` : "";
    console.log(`${kind}: ${chat.chatId}${time}`);
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}

module.exports = { extractBotAddedChats };
