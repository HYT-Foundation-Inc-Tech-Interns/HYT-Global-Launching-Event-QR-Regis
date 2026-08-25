import test from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import { isCorrectAdminCredentials } from "./admin-auth";

test("always validates admin login against the Google Sheet credentials", async () => {
  process.env.ADMIN_USERNAME = "should-not-use-env";
  process.env.ADMIN_PASSWORD = "should-not-use-env";
  process.env.GOOGLE_SHEET_ID = "sheet-id-123";
  process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL = "service@example.com";

  const { privateKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });
  process.env.GOOGLE_PRIVATE_KEY = privateKey.replace(/\n/g, "\\n");

  const originalFetch = global.fetch;
  global.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);

    if (url.includes("oauth2.googleapis.com/token")) {
      return new Response(JSON.stringify({ access_token: "token-123", expires_in: 3600 }));
    }

    if (url.includes("sheets.googleapis.com")) {
      return new Response(JSON.stringify({ values: [["A1", "b1", "2026-08-25"]] }));
    }

    throw new Error(`Unexpected fetch: ${url}`);
  }) as typeof fetch;

  try {
    assert.equal(await isCorrectAdminCredentials("A1", "b1"), true);
    assert.equal(await isCorrectAdminCredentials("A1", "wrongpass"), false);
  } finally {
    global.fetch = originalFetch;
    delete process.env.ADMIN_USERNAME;
    delete process.env.ADMIN_PASSWORD;
    delete process.env.GOOGLE_SHEET_ID;
    delete process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    delete process.env.GOOGLE_PRIVATE_KEY;
  }
});
