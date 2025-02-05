export interface BotConfig {
  id: string;
  discordBotToken: string;
  aiId: string;
  appLink: string | null;
  enableFilter: boolean;
}

export interface ConversationMessage {
  role: "user" | "assistant";
  user: string;
  text: string;
  timestamp: string;
}

export interface KindroidResponse {
  reply: string;
  [key: string]: any; // For any additional fields that might be returned
}

export interface DMConversationCount {
  count: number;
  lastMessageTime: number;
}
