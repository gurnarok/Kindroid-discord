import axios, { AxiosError } from "axios";
import { ConversationMessage, KindroidResponse } from "./types";

/**
 * Calls the Kindroid AI inference endpoint
 * @param aiId - identifies which AI to use
 * @param conversation - array of conversation messages
 * @param enableFilter - whether to enable NSFW filtering
 * @returns The AI's reply text
 * @throws Error if the API call fails
 */
export async function callKindroidAI(
  aiId: string,
  conversation: ConversationMessage[],
  enableFilter: boolean = false
): Promise<string> {
  try {
    const response = await axios.post<KindroidResponse>(
      process.env.KINDROID_INFER_URL!,
      {
        aiId,
        conversation,
        enableFilter,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.KINDROID_API_KEY!}`,
          "Content-Type": "application/json",
        },
      }
    );

    return response.data.reply;
  } catch (error) {
    console.error("Error calling Kindroid AI:", (error as Error).message);
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      if (axiosError.response) {
        console.error("Response data:", axiosError.response.data);
        console.error("Response status:", axiosError.response.status);
      }
    }
    throw new Error("Failed to get response from Kindroid AI");
  }
}
