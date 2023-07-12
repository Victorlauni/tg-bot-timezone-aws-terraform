/**
 * Copyright (c) HashiCorp, Inc.
 * SPDX-License-Identifier: MPL-2.0
 */

// Lambda function code
const TelegramBot = require('node-telegram-bot-api');

// replace the value below with the Telegram token you receive from @BotFather
const token = process.env.tg_bot_token;

// Create a bot that uses 'polling' to fetch new updates
const bot = new TelegramBot(token);

module.exports.handler = async (event, context, callback) => {
  const { body } = event;
  const bodyJson = JSON.parse(body);
  console.debug('Event: ', event);
  if (bodyJson.message) {
    // Retrieve the ID for this chat
    // and the text that the user sent
    const { chat: { id }, text } = bodyJson.message;
    
    // Create a message to send back
    // We can use Markdown inside this
    const message = `✅ Thanks for your message: *"${text}"*\nHave a great day! 👋🏻`;

    // Send our new message back in Markdown and
    // wait for the request to finish
    await bot.sendMessage(id, message, {parse_mode: 'Markdown'});
  }

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: "OK",
    }),
  }
}
