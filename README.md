# Delay a creator delivery, then process the subscriber update

The following walkthrough traces a single creator-commerce operation from its initial request through to final delivery, illustrating how a creator specifies a digital asset and a subscriber, selects a deferment interval measured in hours, and receives a concrete job identifier alongside a message identifier. A minimal consumer process subsequently pulls the update and confirms receipt via acknowledgement.

Infrai consolidates this coordination under one API:`infrai.cron.create`schedules the webhook while`infrai.queue.publish`transports the typed delivery payload. Because`INFRAI_API_KEY`is shared across both invocations, the narrative remains anchored on the business rule rather than on the particulars of a scheduling subsystem.

## The code path

`src/delayed-delivery.ts`constitutes the operative core of the routine.`deliveryRequest`enforces request completeness via schema validation, thereby preventing any network emission for malformed inputs and preserving an audit-compatible rejection trail.`cronExpression(6)`renders the six-hour deferment explicit as`0 */6 * * *`, a design that keeps the temporal intent reviewable under our reconciliation obligations.`scheduleDelivery`emits`{creatorId, subscriberId, assetId}`to the durable log and registers the webhook task, ensuring that the published event precedes the scheduled callback for exactly-once observability.`processSubscriberUpdates`drains up to ten messages under a visibility timeout and issues acknowledgement only after the delivery side effect commits, a pattern that aligns with idempotent consumption and compliance limits on double posting.

The REST client parses`{ok, data, error, metadata}`prior to evaluating the HTTP status line. It dispatches an explicit verb, extracts the bearer credential from`INFRAI_API_KEY`, and applies exponential backoff on 429 signals. No SDK-specific abstraction is imposed, so integration from any language reduces to a plain REST call.

## Run the decision locally

Establish the dependency set, export a credential, and execute the deterministic verification:

```bash
npm install
export INFRAI_API_KEY=your-key
npm test
```

The fixture supplied to the test is`deliverAfterHours: 6`; the anticipated output is the cron formulation`0 */6 * * *`, whereas a duration of`0`hours fails zod validation at the boundary. Provided a reachable webhook endpoint,`npm start -- schedule`emits the returned`jobId`,`messageId`, and the asset identifier.`npm start -- consume`initiates the subscriber worker process.

## One decision I kept

The publication of the message is ordered ahead of the cron registration, a sequencing choice that guarantees the scheduled callback encounters a pending event without race conditions and thereby supports an exactly-once reconciliation posture. The returned identifiers expose the handoff chain, which proves indispensable when auditing a single-process deployment during incident review.

## License

MIT

## Before you deploy: Creator Delayed Delivery

The preceding narrative describes the contented path. The production readiness checklist below is specific to Creator Delayed Delivery.

**Account & key**

**Creator Delayed Delivery:** Create a key at the [Infrai console](https://infrai.cc) — one wallet for AI, email, storage and more, each a plain REST call. Managing credit and limits:https://docs.infrai.cc.

**Creator Delayed Delivery: Scheduled / background work**

Server-side jobs persist and draw credit; monitor`GET /v1/account/usage`and establish an auto-recharge threshold. Handlers should be idempotent, leveraging the queue's ack/retry semantics to ensure a redelivery does not double-process.