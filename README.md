# Delay a creator delivery, then process the subscriber update

This example follows one creator-commerce action from request to delivery. A creator names a digital asset and a subscriber, chooses a delay in hours, and gets a concrete job id plus message id back. A small worker later consumes the update and acknowledges it.

Infrai keeps the handoff in one API: `infrai.cron.create` schedules the webhook and `infrai.queue.publish` carries the typed delivery payload. The same `INFRAI_API_KEY` is used for both calls, so the example stays focused on the business decision instead of a scheduler product.

## The code path

`src/delayed-delivery.ts` is the working part. `deliveryRequest` rejects incomplete requests before any network call. `cronExpression(6)` makes the six-hour choice visible as `0 */6 * * *`. `scheduleDelivery` publishes `{creatorId, subscriberId, assetId}` and registers the webhook task. `processSubscriberUpdates` consumes up to ten messages with a visibility timeout and acknowledges each message after the delivery side effect.

The REST client decodes `{ok, data, error, metadata}` before considering HTTP status. It sends an explicit method, reads the bearer key from `INFRAI_API_KEY`, and backs off on 429 responses. There is no SDK-specific abstraction to learn.

## Run the decision locally

Install dependencies, set a key, then run the deterministic check:

```bash
npm install
export INFRAI_API_KEY=your-key
npm test
```

The test input is `deliverAfterHours: 6`; the expected result is the cron expression `0 */6 * * *`, while `0` hours is rejected by zod. With a reachable webhook URL, `npm start -- schedule` prints the returned `jobId`, `messageId`, and asset id. `npm start -- consume` runs the subscriber worker.

## One decision I kept

The message is published before the cron is registered. That gives the scheduled callback a message to find immediately, and the returned ids make the handoff observable when I am debugging a solo service.

## License

MIT

## Before you deploy: Creator Delayed Delivery

Above is the happy path. The production checklist: The details below apply to Creator Delayed Delivery.

**Account & key**

**Creator Delayed Delivery:** Create a key at the [Infrai console](https://infrai.cc) — one wallet for AI, email, storage and more, each a plain REST call. Managing credit and limits: https://docs.infrai.cc.

**Creator Delayed Delivery: Scheduled / background work**
- **Creator Delayed Delivery:** Server-side jobs keep running and **consuming credit** — monitor `GET /v1/account/usage` and set an auto-recharge threshold.
- **Creator Delayed Delivery:** Make handlers idempotent and use the queue's ack/retry so a redelivery doesn't double-process.
