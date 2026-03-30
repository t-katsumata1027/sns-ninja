import { env } from "@/lib/env";

/**
 * Send an error notification to Discord via Webhook.
 * Requires DISCORD_WEBHOOK_URL to be set in environment variables.
 */
export async function sendDiscordAlert(title: string, message: string, details?: any) {
  const webhookUrl = env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) {
    return; // Webhook URL is not configured, skip silently
  }

  const payload = {
    embeds: [
      {
        title: `🚨 ${title}`,
        description: message,
        color: 16711680, // Red
        timestamp: new Date().toISOString(),
        fields: details
          ? [
              {
                name: "Details",
                value: `\`\`\`json\n${JSON.stringify(details, null, 2).substring(0, 1000)}\n\`\`\``,
              },
            ]
          : [],
      },
    ],
  };

  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    console.error("Failed to send Discord alert:", error);
  }
}
