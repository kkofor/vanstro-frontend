import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import test from "node:test";
import { prisma } from "@vanstro/db";
import { createSession, rotateSession, revokeToken } from "./session.js";

test("rotateSession issues a new token and revokes the previous one", async () => {
  const suffix = randomBytes(6).toString("hex");
  const user = await prisma.user.create({
    data: {
      email: `session-rotate-${suffix}@vanstro.test`,
      kind: "customer",
      status: "active"
    }
  });

  try {
    const first = await createSession(user.id, { userAgent: "session-test" });
    assert.ok(first.accessToken);

    const rotated = await rotateSession(first.accessToken, { userAgent: "session-test-rotated" });
    assert.ok(rotated);
    assert.notEqual(rotated.accessToken, first.accessToken);
    assert.equal(rotated.user.id, user.id);

    const replay = await rotateSession(first.accessToken);
    assert.equal(replay, undefined);

    const secondRotate = await rotateSession(rotated.accessToken);
    assert.ok(secondRotate);
    assert.notEqual(secondRotate.accessToken, rotated.accessToken);

    await revokeToken(secondRotate.accessToken);
  } finally {
    await prisma.refreshSession.deleteMany({ where: { userId: user.id } });
    await prisma.user.delete({ where: { id: user.id } });
  }
});

test("rotateSession rejects unknown and expired tokens", async () => {
  assert.equal(await rotateSession("not-a-real-token"), undefined);

  const suffix = randomBytes(6).toString("hex");
  const user = await prisma.user.create({
    data: {
      email: `session-expired-${suffix}@vanstro.test`,
      kind: "customer",
      status: "active"
    }
  });

  try {
    const session = await createSession(user.id);
    await prisma.refreshSession.updateMany({
      where: { userId: user.id, revokedAt: null },
      data: { expiresAt: new Date(Date.now() - 1_000) }
    });
    assert.equal(await rotateSession(session.accessToken), undefined);
  } finally {
    await prisma.refreshSession.deleteMany({ where: { userId: user.id } });
    await prisma.user.delete({ where: { id: user.id } });
  }
});
