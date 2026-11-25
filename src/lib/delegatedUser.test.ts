import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { delegatedUserId, isDelegatedUserId } from "./delegatedUser";

describe("delegatedUserId", () => {
  it("hashes the login option and the Keycloak id", async () => {
    const expected = createHash("sha256").update("agent:abc-123").digest("hex").slice(0, 32);
    await expect(delegatedUserId(" abc-123 ", "agent")).resolves.toBe(`${expected}@iam.internal`);
  });

  it("keeps a value that already is a delegated id", async () => {
    await expect(delegatedUserId("ABC@iam.internal", "agent")).resolves.toBe("abc@iam.internal");
    expect(isDelegatedUserId("user@example.org")).toBe(false);
  });
});
