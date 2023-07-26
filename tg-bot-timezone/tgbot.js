
const TelegramBot = require('node-telegram-bot-api');
const moment = require('moment-timezone');
const crypto = require('crypto');
const token = process.env.tg_bot_token;
const bot = new TelegramBot(token);
const { createClient } =  require('@supabase/supabase-js')
const supabase = createClient(process.env.supabase_url, process.env.supabase_key)
const TAG_USER_TEXT = "tg://user?id=";
const TABLE_NAME = "timezoneRecord";

const throwIfError = (error) => {
  if (error) {
    throw error;
  }
}

const getTaggedUser = (taggedUsers) => {
  return taggedUsers.length > 0 ? taggedUsers[0].type == "mention" ? taggedUsers[0].user : null : null;
}

const constructDbObject = (userId, chatId, timezone, username) => {
  return {
    userId: userId,
    chatId: chatId,
    timezone: timezone,
    username: username
  }
}

module.exports.handler = async (event, context, callback) => {
  const { body } = event;
  const bodyJson = JSON.parse(body);
  console.debug('Event: ', event);
  if (bodyJson.message) {
    const { chat: { id : chatId }, text, from : { id : userId, username }, entities : taggedUsers } = bodyJson.message;
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
          await setTimezoneHandler(
            chatId, 
            textSplit[textSplit.length-1], 
            getTaggedUser(taggedUsers)?.id ?? userId,
            getTaggedUser(taggedUsers)?.username ?? username);
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

const setTimezoneHandler = async (chatId, timezone, userId, username) => {
  const { data, error } = await supabase.from(TABLE_NAME).upsert(constructDbObject(userId, chatId, timezone, username));
  throwIfError(error);
  await bot.sendMessage(chatId, "OK");
}

const getTimezoneHandler = async (chatId) => {
  const { data, error } = await supabase.from(TABLE_NAME)
    .select("*")
    .eq("chatId", chatId);
  throwIfError(error);
  const map = new Map();
  data.map(record => {
    if (map.has(record.timezone)) map.get(record.timezone).push({userId: record.userId, username: record.username});
    else {
      map.set(record.timezone, [{userId: record.userId, username: record.username}]);
    }
  })
  let message = "";
  for (let timezone of map.keys()) {
    const taggedUsers = map.get(timezone).map(userInfo => "[@" + userInfo.username + "](" + TAG_USER_TEXT + userInfo.userId + ")").join(" ");
    message += timezone + ": " + taggedUsers + "\n"
  }
  await bot.sendMessage(chatId, message, {parse_mode: "MarkdownV2"});
}

const testDbConnection = async (chatId) => {
  const { count, error } = await supabase
    .from("timezoneRecord")
    .select("*", { count: 'exact', head: true });
  throwIfError(error);
  await bot.sendMessage(chatId, "Database is connected.")
}

const resetHandler = async (chatId) => {
  
}