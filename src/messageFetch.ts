import { TextChannel, DMChannel, Message } from "discord.js";
import { ConversationMessage } from "./types";

// Track message cache with proper typing
interface CacheEntry {
  lastFetchTime: number;
  messages: ConversationMessage[];
}

// In-memory cache for recent message fetches
const channelCache = new Map<string, CacheEntry>();

/**
 * Fetches conversation from Discord channel
 * @param channel - The Discord channel to fetch from
 * @param limit - Number of messages to fetch
 * @returns Array of formatted messages
 */
async function fetchConversationFromDiscord(
  channel: TextChannel | DMChannel,
  limit: number = 30
): Promise<ConversationMessage[]> {
  try {
    // Fetch messages from Discord
    const fetched = await channel.messages.fetch({ limit });

    // Sort messages chronologically (oldest first)
    const sorted = Array.from(fetched.values()).sort(
      (a: Message, b: Message) => a.createdTimestamp - b.createdTimestamp
    );

    // Format messages for AI consumption
    return sorted.map(
      (msg: Message): ConversationMessage => ({
        role: msg.author.bot ? "assistant" : "user",
        user: msg.author.username,
        text: msg.content,
        timestamp: msg.createdAt.toISOString(),
      })
    );
  } catch (error) {
    console.error("Error fetching messages:", error);
    throw new Error("Failed to fetch conversation history");
  }
}

/**
 * Fetches conversation with caching support
 * @param channel - The Discord channel
 * @param limit - Number of messages to fetch
 * @param cacheDurationMs - How long to cache messages
 */
async function ephemeralFetchConversation(
  channel: TextChannel | DMChannel,
  limit: number = 30,
  cacheDurationMs: number = 5000
): Promise<ConversationMessage[]> {
  const now = Date.now();
  const cacheKey = channel.id;
  const cached = channelCache.get(cacheKey);

  // Return cached data if it's fresh
  if (cached && now - cached.lastFetchTime < cacheDurationMs) {
    return cached.messages;
  }

  // Fetch new data
  const messages = await fetchConversationFromDiscord(channel, limit);

  // Update cache
  channelCache.set(cacheKey, {
    lastFetchTime: now,
    messages,
  });

  // Clean old cache entries periodically
  if (channelCache.size > 1000) {
    // Prevent unbounded growth
    const oldestAllowed = now - cacheDurationMs;
    for (const [key, value] of channelCache.entries()) {
      if (value.lastFetchTime < oldestAllowed) {
        channelCache.delete(key);
      }
    }
  }

  return messages;
}

export { fetchConversationFromDiscord, ephemeralFetchConversation };
