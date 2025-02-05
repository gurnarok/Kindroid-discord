const { Client, GatewayIntentBits } = require("discord.js");
const { ephemeralFetchConversation } = require("./messageFetch");
const { callKindroidAI } = require("./kindroidAPI");

// Track active bot instances
const activeBots = new Map();

// Track DM conversation counts
const dmConversationCounts = new Map();

/**
 * Creates and initializes a Discord client for a specific bot configuration
 * @param {Object} botConfig - Configuration for this bot instance
 * @param {string} botConfig.id - Unique identifier for this bot
 * @param {string} botConfig.discordBotToken - Discord bot token
 * @param {string} botConfig.aiId - Kindroid AI identifier
 * @param {string} botConfig.appLink - Optional link to the AI's web interface
 * @param {boolean} botConfig.enableFilter - Whether to enable NSFW filtering
 */
async function createDiscordClientForBot(botConfig) {
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.DirectMessages,
    ],
  });

  // Set up event handlers
  client.once("ready", () => {
    console.log(`Bot [${botConfig.id}] logged in as ${client.user.tag}`);
  });

  // Handle incoming messages
  client.on("messageCreate", async (message) => {
    // Ignore bot messages
    if (message.author.bot) return;

    // Handle DMs differently from server messages
    if (message.channel.type === "DM") {
      await handleDirectMessage(message, botConfig);
      return;
    }

    // Get the bot's user information
    const botUser = client.user;
    const botUsername = botUser.username.toLowerCase();

    // Check if the message mentions or references the bot
    const isMentioned = message.mentions.users.has(botUser.id);
    const containsBotName = message.content.toLowerCase().includes(botUsername);

    // Ignore if the bot is not mentioned or referenced
    if (!isMentioned && !containsBotName) return;

    try {
      // Show typing indicator
      await message.channel.sendTyping();

      // Fetch recent conversation with caching
      const conversationArray = await ephemeralFetchConversation(
        message.channel,
        30, // last 30 messages
        5000 // 5 second cache
      );

      // Call Kindroid AI with the conversation context
      const aiReply = await callKindroidAI(
        botConfig.aiId,
        conversationArray,
        botConfig.enableFilter
      );

      // If it was a mention, reply to the message. Otherwise, send as normal message
      if (isMentioned) {
        await message.reply(aiReply);
      } else {
        await message.channel.send(aiReply);
      }
    } catch (error) {
      console.error(`[Bot ${botConfig.id}] Error:`, error);
      const errorMessage =
        "Beep boop, something went wrong. Please contact the Kindroid owner if this keeps up!";
      if (isMentioned) {
        await message.reply(errorMessage);
      } else {
        await message.channel.send(errorMessage);
      }
    }
  });

  // Handle errors
  client.on("error", (error) => {
    console.error(`[Bot ${botConfig.id}] WebSocket error:`, error);
  });

  // Login
  try {
    await client.login(botConfig.discordBotToken);
    activeBots.set(botConfig.id, client);
  } catch (error) {
    console.error(`Failed to login bot ${botConfig.id}:`, error);
    throw error;
  }

  return client;
}

/**
 * Handle direct messages to the bot
 * @param {Message} message - The Discord message
 * @param {Object} botConfig - The bot's configuration
 */
async function handleDirectMessage(message, botConfig) {
  const userId = message.author.id;
  const dmKey = `${botConfig.id}-${userId}`;

  // Initialize or increment DM count
  const currentCount = (dmConversationCounts.get(dmKey) || 0) + 1;
  dmConversationCounts.set(dmKey, currentCount);

  try {
    // Show typing indicator
    await message.channel.sendTyping();

    // Fetch recent conversation
    const conversationArray = await ephemeralFetchConversation(
      message.channel,
      30,
      5000
    );

    // Call Kindroid AI
    const aiReply = await callKindroidAI(
      botConfig.aiId,
      conversationArray,
      botConfig.enableFilter
    );

    // Send the AI's reply
    await message.reply(aiReply);

    // After 5 exchanges, add call-to-action if app link exists
    if (currentCount === 5 && botConfig.appLink) {
      await message.channel.send(
        `💡 Enjoying our conversation? Continue chatting with me on Kindroid: ${botConfig.appLink}\n` +
          "You'll get access to more features and longer conversations there!"
      );
    }
  } catch (error) {
    console.error(`[Bot ${botConfig.id}] DM Error:`, error);
    await message.reply(
      "Beep boop, something went wrong. Please contact the Kindroid owner if this keeps up!"
    );
  }
}

/**
 * Initialize all bots from their configurations
 * @param {Array} botConfigs - Array of bot configurations
 */
async function initializeAllBots(botConfigs) {
  console.log(`Initializing ${botConfigs.length} bots...`);

  const initPromises = botConfigs.map((config) =>
    createDiscordClientForBot(config).catch((error) => {
      console.error(`Failed to initialize bot ${config.id}:`, error);
      return null;
    })
  );

  const results = await Promise.all(initPromises);
  const successfulBots = results.filter(Boolean);

  console.log(
    `Successfully initialized ${successfulBots.length} out of ${botConfigs.length} bots`
  );

  return successfulBots;
}

/**
 * Gracefully shutdown all active bots
 */
async function shutdownAllBots() {
  console.log("Shutting down all bots...");

  const shutdownPromises = Array.from(activeBots.entries()).map(
    async ([id, client]) => {
      try {
        await client.destroy();
        console.log(`Bot ${id} shutdown successfully`);
      } catch (error) {
        console.error(`Error shutting down bot ${id}:`, error);
      }
    }
  );

  await Promise.all(shutdownPromises);
  activeBots.clear();
  dmConversationCounts.clear();
}

module.exports = {
  initializeAllBots,
  shutdownAllBots,
};
