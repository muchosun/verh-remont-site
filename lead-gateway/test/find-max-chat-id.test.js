"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { extractBotAddedChats } = require("../scripts/find-max-chat-id");

test("keeps only unique bot_added events with a numeric chat id", () => {
  const chats = extractBotAddedChats([
    { update_type: "message_created", chat_id: 10 },
    { update_type: "bot_added", chat_id: 22, timestamp: 1, is_channel: false },
    { update_type: "bot_added", chat_id: 22, timestamp: 2, is_channel: false },
    { update_type: "bot_added", chat_id: "33" },
    { update_type: "bot_added", chat_id: 44, timestamp: 3, is_channel: true },
  ]);

  assert.deepEqual(chats, [
    { chatId: 22, timestamp: "1970-01-01T00:00:01.000Z", isChannel: false },
    { chatId: 44, timestamp: "1970-01-01T00:00:03.000Z", isChannel: true },
  ]);
});
