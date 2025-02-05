import {
  Client,
  GatewayIntentBits,
  Message,
  TextChannel,
  DMChannel,
  ChannelType,
  BaseGuildTextChannel,
} from "discord.js";
import { ephemeralFetchConversation } from "./messageFetch";
import { callKindroidAI } from "./kindroidAPI";
import { BotConfig, DMConversationCount } from "./types";

// Track active bot instances
const activeBots = new Map<string, Client>();

// Track DM conversation counts with proper typing
const dmConversationCounts = new Map<string, DMConversationCount>();

/**
 * Creates and initializes a Discord client for a specific bot configuration
 * @param botConfig - Configuration for this bot instance
 */
async function createDiscordClientForBot(
  botConfig: BotConfig
): Promise<Client> {
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
    console.log(`Bot [${botConfig.id}] logged in as ${client.user?.tag}`);
  });

  // Handle incoming messages
  client.on("messageCreate", async (message: Message) => {
    // Ignore bot messages
    if (message.author.bot) return;

    // Handle DMs differently from server messages
    if (message.channel.type === ChannelType.DM) {
      await handleDirectMessage(message, botConfig);
      return;
    }

    // Get the bot's user information
    const botUser = client.user;
    if (!botUser) return; // Guard against undefined client.user

    const botUsername = botUser.username.toLowerCase();

    // Check if the message mentions or references the bot
    const isMentioned = message.mentions.users.has(botUser.id);
    const containsBotName = message.content.toLowerCase().includes(botUsername);

    // Ignore if the bot is not mentioned or referenced
    if (!isMentioned && !containsBotName) return;

    try {
      // Show typing indicator
      if (
        message.channel instanceof BaseGuildTextChannel ||
        message.channel instanceof DMChannel
      ) {
        await message.channel.sendTyping();
      }

      // Fetch recent conversation with caching
      const conversationArray = await ephemeralFetchConversation(
        message.channel as TextChannel | DMChannel,
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
      } else if (
        message.channel instanceof BaseGuildTextChannel ||
        message.channel instanceof DMChannel
      ) {
        await message.channel.send(aiReply);
      }
    } catch (error) {
      console.error(`[Bot ${botConfig.id}] Error:`, error);
      const errorMessage =
        "Beep boop, something went wrong. Please contact the Kindroid owner if this keeps up!";
      if (isMentioned) {
        await message.reply(errorMessage);
      } else if (
        message.channel instanceof BaseGuildTextChannel ||
        message.channel instanceof DMChannel
      ) {
        await message.channel.send(errorMessage);
      }
    }
  });

  // Handle errors
  client.on("error", (error: Error) => {
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
 * @param message - The Discord message
 * @param botConfig - The bot's configuration
 */
async function handleDirectMessage(
  message: Message,
  botConfig: BotConfig
): Promise<void> {
  const userId = message.author.id;
  const dmKey = `${botConfig.id}-${userId}`;

  // Initialize or increment DM count
  const currentData = dmConversationCounts.get(dmKey) || {
    count: 0,
    lastMessageTime: 0,
  };
  const newCount = currentData.count + 1;

  dmConversationCounts.set(dmKey, {
    count: newCount,
    lastMessageTime: Date.now(),
  });

  try {
    // Show typing indicator
    if (message.channel instanceof DMChannel) {
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
      if (newCount === 5 && botConfig.appLink) {
        await message.channel.send(
          `💡 Enjoying our conversation? Continue chatting with me on Kindroid: ${botConfig.appLink}\n` +
            "You'll get access to more features and longer conversations there!"
        );
      }
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
 * @param botConfigs - Array of bot configurations
 */
async function initializeAllBots(botConfigs: BotConfig[]): Promise<Client[]> {
  console.log(`Initializing ${botConfigs.length} bots...`);

  const initPromises = botConfigs.map((config) =>
    createDiscordClientForBot(config).catch((error) => {
      console.error(`Failed to initialize bot ${config.id}:`, error);
      return null;
    })
  );

  const results = await Promise.all(initPromises);
  const successfulBots = results.filter(
    (client): client is Client => client !== null
  );

  console.log(
    `Successfully initialized ${successfulBots.length} out of ${botConfigs.length} bots`
  );

  return successfulBots;
}

/**
 * Gracefully shutdown all active bots
 */
async function shutdownAllBots(): Promise<void> {
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

export { initializeAllBots, shutdownAllBots };
