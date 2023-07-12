
const TelegramBot = require('node-telegram-bot-api');
const moment = require('moment-timezone');
const token = process.env.tg_bot_token;
const bot = new TelegramBot(token);

module.exports.handler = async (event, context, callback) => {
  const { body } = event;
  const bodyJson = JSON.parse(body);
  console.debug('Event: ', event);
  if (bodyJson.message) {
    const { chat: { id }, text } = bodyJson.message;
    const command = text;
    switch (command) {
      case '/start': 
        await startHandler(id);
        break;
      case '/now':
        await getCurrentTimeHandler(id);
        break;
      default:
        break;
    }
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

const startHandler = async (id) => {

  const message = `✅ Thanks for your message\nHave a great day! 👋🏻`;

  // Send our new message back in Markdown and
  // wait for the request to finish
  await bot.sendMessage(id, message, {parse_mode: 'Markdown'});
}

const getCurrentTimeHandler = async (id) => {
  const now = moment();
  await bot.sendMessage(id, now.tz("Asia/Tokyo").format("MMM DD, HH:mm z"));
}