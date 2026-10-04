import assert from "node:assert/strict";
import { cronExpression, deliveryRequest } from "./delayed-delivery.js";

assert.equal(cronExpression(6), "0 */6 * * *");
assert.throws(() => deliveryRequest.parse({ creatorId: "c", subscriberId: "s", assetId: "a", deliverAfterHours: 0 }));
console.log("delayed delivery decision tests passed");
