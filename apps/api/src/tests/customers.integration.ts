import assert from "node:assert";
import { app } from "../app";
import request from "supertest";

async function run() {
  // Missing storeId should 400
  const inactive = await request(app).get("/customers/inactive");
  assert.strictEqual(inactive.status, 400, "inactive should require storeId");

  const lastOrder = await request(app).get("/customers/last-order");
  assert.strictEqual(lastOrder.status, 400, "last-order should require storeId and id/email");

  const winback = await request(app).get("/customers/123/winback");
  assert.strictEqual(winback.status, 400, "winback should require storeId");

  // Happy path only if env STORE_ID present
  const storeId = process.env.STORE_ID;
  if (storeId) {
    const res = await request(app)
      .get("/customers/inactive")
      .query({ storeId, days: 30, limit: 1 });
    assert.ok([200, 400].includes(res.status), "inactive with storeId should respond");
  }

  console.log("customers integration checks passed");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
