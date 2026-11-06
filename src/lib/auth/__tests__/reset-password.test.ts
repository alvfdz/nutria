import { verifyPassword } from "better-auth/crypto";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { resetPassword, type ResetDb } from "@/lib/auth/reset-password";

const password = "a long enough passphrase";
const owner = { id: "user-1", email: "owner@example.com" };

const query = vi.fn<ResetDb["query"]>();
const db: ResetDb = { query };

/** Answers the user lookup with `rows`, and every write with a row count. */
function stubDb(
  rows: object[],
  {
    updated = 1,
    revoked = 2,
  }: { updated?: number; revoked?: number | null } = {},
) {
  query.mockImplementation(async (sql) => {
    if (sql.startsWith("SELECT")) {
      return { rows: rows as Record<string, unknown>[], rowCount: rows.length };
    }
    if (sql.startsWith("UPDATE")) return { rows: [], rowCount: updated };
    if (sql.startsWith("DELETE")) return { rows: [], rowCount: revoked };
    return { rows: [], rowCount: null };
  });
}

/** SQL statements issued so far, first word only. */
function verbs() {
  return query.mock.calls.map(([sql]) => sql.split(/\s/)[0]);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("resetPassword", () => {
  test("hashes the password, replaces it and ends the sessions", async () => {
    stubDb([owner]);

    const result = await resetPassword(db, password);

    expect(result).toEqual({ email: owner.email, revokedSessions: 2 });
    expect(verbs()).toEqual(["SELECT", "BEGIN", "UPDATE", "DELETE", "COMMIT"]);

    const update = query.mock.calls.find(([sql]) => sql.startsWith("UPDATE"))!;
    const [hash, userId] = update[1] as [string, string];
    expect(userId).toBe(owner.id);
    expect(hash).not.toBe(password);
    await expect(verifyPassword({ hash, password })).resolves.toBe(true);
  });

  test("counts no revoked sessions when the driver reports no row count", async () => {
    stubDb([owner], { revoked: null });

    const result = await resetPassword(db, password);

    expect(result).toEqual({ email: owner.email, revokedSessions: 0 });
  });

  test("looks the account up by trimmed, lower-cased email", async () => {
    stubDb([owner]);

    await resetPassword(db, password, "  Owner@Example.com ");

    expect(query).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("WHERE email"),
      ["owner@example.com"],
    );
  });

  test.each([
    ["too short", "short", /at least 12/],
    ["too long", "x".repeat(129), /at most 128/],
  ])(
    "rejects a password that is %s before touching the database",
    async (_, value, message) => {
      await expect(resetPassword(db, value)).rejects.toThrow(message);
      expect(query).not.toHaveBeenCalled();
    },
  );

  test("fails when no account matches the email", async () => {
    stubDb([]);

    await expect(
      resetPassword(db, password, "nobody@example.com"),
    ).rejects.toThrow("No account with email nobody@example.com.");
    expect(verbs()).toEqual(["SELECT"]);
  });

  test("fails on an install with no account", async () => {
    stubDb([]);

    await expect(resetPassword(db, password)).rejects.toThrow(
      "No account exists yet.",
    );
  });

  test("asks for an email when several accounts exist", async () => {
    stubDb([owner, { id: "user-2", email: "other@example.com" }]);

    await expect(resetPassword(db, password)).rejects.toThrow("pass the email");
    expect(verbs()).toEqual(["SELECT"]);
  });

  test("rolls back when the account has no password credential", async () => {
    stubDb([owner], { updated: 0 });

    await expect(resetPassword(db, password)).rejects.toThrow(
      "has no password to reset",
    );
    expect(verbs()).toEqual(["SELECT", "BEGIN", "UPDATE", "ROLLBACK"]);
  });

  test("rolls back when deleting the sessions fails", async () => {
    stubDb([owner]);
    const base = query.getMockImplementation()!;
    query.mockImplementation(async (sql, params) => {
      if (sql.startsWith("DELETE")) throw new Error("connection lost");
      return base(sql, params);
    });

    await expect(resetPassword(db, password)).rejects.toThrow(
      "connection lost",
    );
    expect(verbs().at(-1)).toBe("ROLLBACK");
  });

  test("reports the original failure when the rollback fails too", async () => {
    stubDb([owner]);
    const base = query.getMockImplementation()!;
    query.mockImplementation(async (sql, params) => {
      if (sql.startsWith("DELETE")) throw new Error("connection lost");
      if (sql === "ROLLBACK") throw new Error("Client was closed");
      return base(sql, params);
    });

    await expect(resetPassword(db, password)).rejects.toThrow(
      "connection lost",
    );
  });
});
