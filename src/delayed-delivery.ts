import { z } from "zod";
import { infrai } from "./infrai.js";

const deliveryQueue = "creator-deliveries";

export const deliveryRequest = z.object({
  creatorId: z.string().min(1),
  subscriberId: z.string().min(1),
  assetId: z.string().min(1),
  deliverAfterHours: z.number().int().min(1).max(72)
});
export type DeliveryRequest = z.infer<typeof deliveryRequest>;

export function cronExpression(hours: number): string {
  if (!Number.isInteger(hours) || hours < 1 || hours > 72) throw new Error("deliverAfterHours must be an integer from 1 to 72");
  return `0 */${hours} * * *`;
}

export async function scheduleDelivery(input: unknown, webhookUrl: string) {
  const request = deliveryRequest.parse(input);
  const payload = JSON.stringify({ creatorId: request.creatorId, subscriberId: request.subscriberId, assetId: request.assetId });
  const published = await infrai.queue.publish({ queue: deliveryQueue, payload });
  const scheduled = await infrai.cron.create({ cron_expr: cronExpression(request.deliverAfterHours), task: webhookUrl });
  return { jobId: scheduled.job_id, messageId: published.message_id, assetId: request.assetId };
}

export async function processSubscriberUpdates() {
  const batch = await infrai.queue.consume({ queue: deliveryQueue, max_messages: 10, visibility_timeout: 60 });
  for (const message of batch.messages ?? []) {
    const update = JSON.parse(message.payload) as { subscriberId: string; assetId: string };
    console.log(`delivered ${update.assetId} to subscriber ${update.subscriberId}`);
    await infrai.queue.ack({ queue: deliveryQueue, message_id: message.message_id });
  }
  return batch.messages?.length ?? 0;
}
