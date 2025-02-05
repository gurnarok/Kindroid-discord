const axios = require("axios");

/**
 * callKindroidAI - calls the Kindroid AI inference endpoint
 *
 * @param {string} aiId - identifies which AI to use
 * @param {Array} conversation - an array of {role, user, text, timestamp}
 * @returns {Promise<string>} aiReply - the text the AI returns
 */
async function callKindroidAI(aiId, conversation) {
  try {
    const response = await axios.post(
      process.env.KINDROID_INFER_URL,
      {
        aiId,
        conversation,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.KINDROID_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    // Return the AI's reply text
    return response.data.reply;
  } catch (error) {
    console.error("Error calling Kindroid AI:", error.message);
    if (error.response) {
      console.error("Response data:", error.response.data);
      console.error("Response status:", error.response.status);
    }
    throw new Error("Failed to get response from Kindroid AI");
  }
}

module.exports = { callKindroidAI };
