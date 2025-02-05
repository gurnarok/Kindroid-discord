require("dotenv").config();
const { initializeAllBots, shutdownAllBots } = require("./discordManager");

/**
 * Load bot configurations from environment variables
 * Looks for pairs of AI_ID_N and BOT_TOKEN_N where N starts from 1
 * @returns {Array} Array of bot configurations
 */
function loadBotConfigs() {
  const configs = [];
  let currentIndex = 1;

  while (true) {
    const aiId = process.env[`AI_ID_${currentIndex}`];
    const botToken = process.env[`BOT_TOKEN_${currentIndex}`];

    // If either required value is missing, we've reached the end of our configs
    if (!aiId || !botToken) {
      break;
    }

    // Get optional settings
    const appLink = process.env[`APP_LINK_${currentIndex}`];
    const enableFilter =
      process.env[`ENABLE_FILTER_${currentIndex}`]?.toLowerCase() === "true";

    configs.push({
      id: `bot${currentIndex}`,
      discordBotToken: botToken,
      aiId: aiId,
      appLink: appLink || null,
      enableFilter: enableFilter,
    });

    currentIndex++;
  }

  return configs;
}

// Validate environment variables
function validateEnv() {
  const requiredVars = [
    "KINDROID_INFER_URL",
    "KINDROID_API_KEY",
    "AI_ID_1", // At least one bot is required
    "BOT_TOKEN_1",
  ];

  const missing = requiredVars.filter((varName) => !process.env[varName]);

  if (missing.length > 0) {
    console.error(
      "Missing required environment variables:",
      missing.join(", ")
    );
    process.exit(1);
  }

  // Validate bot config pairs
  let currentIndex = 1;
  while (true) {
    const hasAiId = !!process.env[`AI_ID_${currentIndex}`];
    const hasBotToken = !!process.env[`BOT_TOKEN_${currentIndex}`];

    // If neither exists, we're done checking
    if (!hasAiId && !hasBotToken) {
      break;
    }

    // If one exists without the other, that's an error
    if (hasAiId !== hasBotToken) {
      console.error(
        `Error: Bot ${currentIndex} must have both AI_ID_${currentIndex} and BOT_TOKEN_${currentIndex} defined`
      );
      process.exit(1);
    }

    currentIndex++;
  }
}

async function main() {
  try {
    // Validate environment
    validateEnv();

    // Load bot configurations
    const botConfigs = loadBotConfigs();

    if (botConfigs.length === 0) {
      console.error(
        "No valid bot configurations found in environment variables"
      );
      process.exit(1);
    }

    console.log(`Found ${botConfigs.length} bot configurations`);

    // Initialize all bots
    await initializeAllBots(botConfigs);
    console.log("All bots initialized successfully!");

    // Handle graceful shutdown
    process.on("SIGINT", async () => {
      console.log("\nReceived SIGINT. Shutting down...");
      await shutdownAllBots();
      process.exit(0);
    });

    process.on("SIGTERM", async () => {
      console.log("\nReceived SIGTERM. Shutting down...");
      await shutdownAllBots();
      process.exit(0);
    });
  } catch (error) {
    console.error("Fatal error during initialization:", error);
    process.exit(1);
  }
}

// Start the application
main().catch((error) => {
  console.error("Unhandled error:", error);
  process.exit(1);
});
