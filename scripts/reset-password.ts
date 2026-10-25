/**
 * `npm run auth:reset-password [-- <email>]`: sets a new password for the
 * owner account when they are locked out. Run it where the app's
 * `DATABASE_URL` is reachable (on a deployment: inside the app container).
 *
 * The password is read from the `NUTRIA_NEW_PASSWORD` environment variable
 * when set, otherwise typed at a hidden prompt, so it never lands in shell
 * history or the process list.
 */
import nextEnv from "@next/env";
import { Client } from "pg";
import { createInterface } from "node:readline";
import { Writable } from "node:stream";

import { resetPassword } from "../src/lib/auth/reset-password.ts";

/**
 * Reads lines from the terminal, hiding what is typed. One interface serves
 * every prompt: a second interface on the same stdin would drop lines that
 * were already buffered when piped input is used.
 */
function createPrompter() {
  let muted = false;
  const output = new Writable({
    write(chunk, _encoding, done) {
      if (!muted) process.stdout.write(chunk);
      done();
    },
  });
  const rl = createInterface({
    input: process.stdin,
    output,
    terminal: Boolean(process.stdin.isTTY),
  });
  const lines = rl[Symbol.asyncIterator]();

  return {
    /**
     * Asks one question and waits for the answer.
     *
     * @param question Prompt written before reading.
     * @returns The typed line.
     * @throws {Error} When the input ends before an answer.
     */
    async ask(question: string): Promise<string> {
      process.stdout.write(question);
      muted = true;
      const { value, done } = await lines.next();
      muted = false;
      process.stdout.write("\n");

      if (done) throw new Error("No password given.");

      return value;
    },
    close: () => rl.close(),
  };
}

async function main(): Promise<void> {
  nextEnv.loadEnvConfig(process.cwd());

  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set (see .env.example).");

  // An empty variable counts as unset, e.g. a CI secret that was never filled.
  let password = process.env.NUTRIA_NEW_PASSWORD;

  if (!password) {
    const prompter = createPrompter();
    try {
      password = await prompter.ask("New password: ");
      const again = await prompter.ask("Confirm new password: ");
      if (again !== password) throw new Error("Passwords do not match.");
    } finally {
      prompter.close();
    }
  }

  const client = new Client({ connectionString: url });
  await client.connect();

  try {
    const { email, revokedSessions } = await resetPassword(
      client,
      password,
      process.argv[2],
    );
    console.log(
      `Password reset for ${email}. Ended ${revokedSessions} session(s); sign in with the new password.`,
    );
  } finally {
    await client.end();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
