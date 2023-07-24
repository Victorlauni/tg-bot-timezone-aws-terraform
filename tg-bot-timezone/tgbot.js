
const TelegramBot = require('node-telegram-bot-api');
const moment = require('moment-timezone');
const crypto = require('crypto');
const token = process.env.tg_bot_token;
const bot = new TelegramBot(token);
const TAG_USER_TEXT = "tg://user?id=";

const getTaggedUserId = (taggedUsers) => {
  return taggedUsers.length > 0 ? taggedUsers[0].type == "mention" ? taggedUsers[0].user.id : null : null;
}

module.exports.handler = async (event, context, callback) => {
  const { body } = event;
  const bodyJson = JSON.parse(body);
  console.debug('Event: ', event);
  if (bodyJson.message) {
    const { chat: { id : chatId }, text, from : { id : userId}, entities : taggedUsers } = bodyJson.message;
    const textSplit = text.split(" ");
    const command = textSplit[0];
    try {
      switch (command) {
        case '/start': case '/help': 
          await startHandler(chatId);
          break;
        case '/reset':
          await resetHandler(chatId);
          break;
        case '/now':
          await getCurrentTimeHandler(chatId);
          break;
        case '/setTimezone':
          await setTimezoneHandler(chatId, textSplit[textSplit.length-1], getTaggedUserId(taggedUsers) ?? userId);
          break;
        case '/getTimezones':
          await getTimezoneHandler(chatId);
          break;
        case '/db_connection':
          await testDbConnection(chatId);
          break;
        default:
          break;
      }
    } catch (err) {
      console.error(err)
      await bot.sendMessage(chatId, "Error.")
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

const setTimezoneHandler = async (chatId, timezone, userId) => {
  await bot.sendMessage(chatId, "OK");
}

const getTimezoneHandler = async (chatId) => {
  
}

const testDbConnection = async (id) => {
  
}

const resetHandler = async (chatId) => {
  
}