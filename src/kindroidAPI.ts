import axios, { AxiosError } from "axios";
import { ConversationMessage, KindroidResponse } from "./types";

/**
 * Calls the Kindroid AI inference endpoint
 * @param sharedAiCode - shared code for API identification
 * @param conversation - array of conversation messages
 * @param enableFilter - whether to enable NSFW filtering
 * @returns The AI's reply text
 * @throws Error if the API call fails
 */
export async function callKindroidAI(
  sharedAiCode: string,
  conversation: ConversationMessage[],
  enableFilter: boolean = false
): Promise<string> {
  try {
    const response = await axios.post<KindroidResponse>(
      process.env.KINDROID_INFER_URL!,
      {
        share_code: sharedAiCode,
        conversation,
        enable_filter: enableFilter,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.KINDROID_API_KEY!}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.data.success) {
      throw new Error(response.data.error || "API request failed");
    }

    return response.data.reply.replace(/@(everyone|here)/g, "");
  } catch (error) {
    console.error("Error calling Kindroid AI:", (error as Error).message);
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<KindroidResponse>;
      if (axiosError.response) {
        console.error("Response data:", axiosError.response.data);
        console.error("Response status:", axiosError.response.status);
        if (axiosError.response.data?.error) {
          throw new Error(axiosError.response.data.error);
        }
      }
    }
    throw new Error("Failed to get response from Kindroid AI");
  }
}
