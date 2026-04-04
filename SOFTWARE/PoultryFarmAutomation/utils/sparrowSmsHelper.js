import axios from "axios";

/**
 * Sends an SMS message using Sparrow SMS API
 * @param {string} phone - Recipient phone number (e.g., 9841000000)
 * @param {string} message - Message content
 */
export async function sendMessage(phone, message) {
  const token = process.env.SPARROW_SMS_TOKEN;
  const from = process.env.SPARROW_FROM_IDENTITY || "TheAlert";

  if (!token) {
    console.error("SMS Error: SPARROW_SMS_TOKEN not found in .env");
    return { success: false, error: "Missing Token" };
  }

  const params = {
    token,
    from,
    to: phone,
    text: message,
  };

  console.log(`[SMS Simulation] To: ${phone}, Msg: ${message}`);

  try {
    // In non-production environments, we simulate sending unless explicitly desired
    // However, for this project, I'll allow it if token is present and NOT in test mode
    if (
      process.env.NODE_ENV === "production" ||
      process.env.ENABLE_SMS === "true"
    ) {
      const response = await axios.get("http://api.sparrowsms.com/v2/sms/", {
        params,
      });
      console.log("SMS sent successfully:", response.data);
      return { success: true, data: response.data };
    }

    return { success: true, simulated: true };
  } catch (error) {
    console.error("Error sending SMS:", error.response?.data || error.message);
    return {
      success: false,
      message: "Failed to send SMS",
      error: error.response ? error.response.data : error.message,
    };
  }
}
