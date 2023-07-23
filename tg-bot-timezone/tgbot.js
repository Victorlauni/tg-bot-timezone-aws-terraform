
const TelegramBot = require('node-telegram-bot-api');
const moment = require('moment-timezone');
const token = process.env.tg_bot_token;
const bot = new TelegramBot(token);
const { DynamoDBClient, ScanCommand } = require("@aws-sdk/client-dynamodb");
const dbClient = new DynamoDBClient();

module.exports.handler = async (event, context, callback) => {
  const { body } = event;
  const bodyJson = JSON.parse(body);
  console.debug('Event: ', event);
  if (bodyJson.message) {
    const { chat: { id : chatId }, text, from : { id : userId}, entities : taggedUsers } = bodyJson.message;
    const command = text;
    switch (command) {
      case '/start': case '/help': 
        await startHandler(chatId);
        break;
      case '/now':
        await getCurrentTimeHandler(chatId);
        break;
      case '/setTimezone':
        break;
      case '/getTimezones':
        break;
      case '/db_connection':
        await testDbConnection(chatId);
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

const testDbConnection = async (id) => {
  const params = {
    TableName: "tg_timezone"
  }
  const command = new ScanCommand(params);
  try {
    const data = await dbClient.send(command);
    console.log(data);
    await bot.sendMessage(id, "db is connected.")
  } catch (err) {
    console.error(err);
    await bot.sendMessage(id, "Error connecting to db.")
  }
}