
const TelegramBot = require('node-telegram-bot-api');
const moment = require('moment-timezone');
const token = process.env.tg_bot_token;
const bot = new TelegramBot(token);
const { createClient } =  require('@supabase/supabase-js');
const supabase = createClient(process.env.supabase_url, process.env.supabase_key)
const TAG_USER_TEXT = "tg://user?id=";
const TABLE_NAME = "timezoneRecord";

const throwIfError = (error) => {
  if (error) {
    throw error;
  }
}

const getTaggedUser = (username, taggedUsers) => {
  console.log(taggedUsers.toString());
  for (let i of taggedUsers) {
    if (i.type == "text_mention") return {userId: i.user.id, username: username}
    if (i.type == "mention") return {username: username}
  }
  return null;
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
    const taggedUser = textSplit.length > 1 ? getTaggedUser(textSplit[1].replace("@", ""), taggedUsers): null;
    try {
      switch (command) {
        case '/start': case '/help': 
          await startHandler(chatId);
          break;
        case '/reset':
          await resetHandler(chatId);
          break;
        case '/now':
          await getCurrentTimeHandler(chatId, userId, username);
          break;
        case '/gettime':
          await getTimeHandler(chatId, userId, username, textSplit[textSplit.length-1]);
          break;
        case '/gettimeof':
          await getTimeHandler(
            chatId,
            taggedUser? taggedUser.userId??taggedUser.username : userId,
            taggedUser? taggedUser.username : username,
            textSplit[textSplit.length-1]
          )
        case '/settimezone':
          await setTimezoneHandler(
            chatId, 
            textSplit[textSplit.length-1], 
            taggedUser? taggedUser.userId??taggedUser.username : userId,
            taggedUser? taggedUser.username : username);
          break;
        case '/gettimezones':
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

const getCurrentTimeHandler = async (chatId, userId, username) => {
  const now = moment();
  const { data, error } = await supabase.from(TABLE_NAME)
    .select("*")
    .eq("chatId", chatId)
    .or("userId.eq."+userId+",username.eq."+username)
  throwIfError(error);
  let timeString = now.utc().tz(data[0].timezone).format("HH:mm");
  await getTimeHandler(chatId, userId, username, timeString, data[0])
}

const setTimezoneHandler = async (chatId, timezone, userId, username) => {
  if (moment.tz.zone(timezone) == null) {
    await bot.sendMessage(chatId, "timezone not valid.");
    return;
  }
  const { data, error } = await supabase.from(TABLE_NAME).upsert(constructDbObject(userId, chatId, timezone, username));
  throwIfError(error);
  await bot.sendMessage(chatId, "OK");
}

const getTimezoneHandler = async (chatId, sendToBot = true) => {
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
  let usersGroupedByTimezone = new Map();
  for (let timezone of map.keys()) {
    const taggedUsers = map.get(timezone).map(userInfo => userInfo.username != userInfo.userId? "[@" + userInfo.username + "](" + TAG_USER_TEXT + userInfo.userId + ")": "@" + userInfo.username).join(" ");
    message += timezone.replaceAll("_", "\\_") + ": " + taggedUsers + "\n"
    usersGroupedByTimezone.set(timezone, taggedUsers);
  }

  if (sendToBot) await bot.sendMessage(chatId, message, {parse_mode: "MarkdownV2"});
  return usersGroupedByTimezone;
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

const getTimeHandler = async (chatId, userId, username, time, userData) => {
  if (userData == null) {
    const { data: userTimezone, error } = await supabase.from(TABLE_NAME)
      .select("*")
      .eq("chatId", chatId)
      .or("userId.eq."+userId+",username.eq."+username);
    throwIfError(error);
    userData = userTimezone[0];
  }
  let usersGroupedByTimezone = await getTimezoneHandler(chatId, false);
  let baseTime = moment.tz(time, "HH:mm", userData.timezone).date(15);
  let message = "";
  usersGroupedByTimezone.forEach((taggedUsers, timezone, _) => {
    let theirTime = baseTime.tz(timezone);//.format("HH:mm z")
    let dayOffset = theirTime.date() - 15;
    message += theirTime.format("hh:mm A ") + (dayOffset>=0?"\\(\\+":"\\(") + dayOffset + " day\\)" + ": " + taggedUsers + "\n";
  })
  await bot.sendMessage(chatId, message, {parse_mode: "MarkdownV2"})
}