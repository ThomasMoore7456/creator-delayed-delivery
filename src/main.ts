import { scheduleDelivery, processSubscriberUpdates } from "./delayed-delivery.js";

const webhookUrl = process.env.DELIVERY_WEBHOOK_URL ?? "https://example.com/hooks/creator-delivery";
const command = process.argv[2] ?? "schedule";

if (command === "schedule") {
  const result = await scheduleDelivery({ creatorId: "creator-42", subscriberId: "sub-7", assetId: "video-99", deliverAfterHours: 6 }, webhookUrl);
  console.log(JSON.stringify(result));
} else if (command === "consume") {
  console.log(`processed ${await processSubscriberUpdates()} subscriber updates`);
} else {
  throw new Error("Use 'schedule' or 'consume'");
}
