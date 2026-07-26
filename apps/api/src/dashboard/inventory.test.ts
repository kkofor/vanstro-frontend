import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import test from "node:test";
import { prisma } from "@vanstro/db";
import { createApp } from "../app.js";

const app = createApp();

async function adminToken() {
  const login = await app.request("/api/v1/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      email: process.env.SUPER_ADMIN_EMAIL ?? "admin@vanstro.local",
      password: process.env.SUPER_ADMIN_PASSWORD
    })
  });
  assert.equal(login.status, 200);
  const body = (await login.json()) as { data: { accessToken: string } };
  return body.data.accessToken;
}

test("PATCH /dashboard/inventory/snapshots/:id requires inventory.write", async () => {
  const snapshot = await prisma.inventorySnapshot.findFirst();
  assert.ok(snapshot);
  const response = await app.request(`/api/v1/dashboard/inventory/snapshots/${snapshot.id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ quantityOnHand: snapshot.quantityOnHand })
  });
  assert.equal(response.status, 401);
});

test("dashboard inventory snapshot can be adjusted", async () => {
  const token = await adminToken();
  const snapshot = await prisma.inventorySnapshot.findFirstOrThrow();
  const nextOnHand = snapshot.quantityReserved + 10;

  const response = await app.request(`/api/v1/dashboard/inventory/snapshots/${snapshot.id}`, {
    method: "PATCH",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ quantityOnHand: nextOnHand })
  });
  assert.equal(response.status, 200);

  const refreshed = await prisma.inventorySnapshot.findUniqueOrThrow({ where: { id: snapshot.id } });
  assert.equal(refreshed.quantityOnHand, nextOnHand);
});
