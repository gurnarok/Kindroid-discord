const { Client, GatewayIntentBits } = require("discord.js");
const { ephemeralFetchConversation } = require("./messageFetch");
const { callKindroidAI } = require("./kindroidAPI");

// Track active bot instances
const activeBots = new Map();

/**
 * Creates and initializes a Discord client for a specific bot configuration
 * @param {Object} botConfig - Configuration for this bot instance
 * @param {string} botConfig.id - Unique identifier for this bot
 * @param {string} botConfig.discordBotToken - Discord bot token
 * @param {string} botConfig.aiId - Kindroid AI identifier
 */
async function createDiscordClientForBot(botConfig) {
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
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

    // Check for command trigger
    if (!message.content.startsWith("!kindroid")) return;

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
      const aiReply = await callKindroidAI(botConfig.aiId, conversationArray);

      // Send the response
      await message.channel.send(aiReply);
    } catch (error) {
      console.error(`[Bot ${botConfig.id}] Error:`, error);
      await message.channel.send(
        "I encountered an error processing your request. Please try again later."
      );
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
}

module.exports = {
  initializeAllBots,
  shutdownAllBots,
};
