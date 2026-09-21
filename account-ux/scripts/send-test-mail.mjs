#!/usr/bin/env node
/**
 * One-shot ACS Email smoke test.
 * Usage: node scripts/send-test-mail.mjs alex.cici@gmail.com
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { EmailClient } from '@azure/communication-email';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const envPath = resolve(root, '.env.local');
for (const line of readFileSync(envPath, 'utf8').split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

const to = process.argv[2];
if (!to) {
  console.error('Usage: node scripts/send-test-mail.mjs <email>');
  process.exit(1);
}

const connectionString = process.env.AZURE_COMMUNICATION_CONNECTION_STRING;
const from = process.env.EMAIL_FROM || 'Vanstro <no-reply@mail.vanstro.ca>';
const replyTo = process.env.EMAIL_REPLY_TO || 'support@vanstro.ca';
if (!connectionString) {
  console.error('Missing AZURE_COMMUNICATION_CONNECTION_STRING in .env.local');
  process.exit(1);
}

const client = new EmailClient(connectionString);
const message = {
  senderAddress: from.includes('<') ? from.match(/<([^>]+)>/)[1] : from,
  replyTo: [{ address: replyTo }],
  recipients: { to: [{ address: to }] },
  content: {
    subject: 'Vanstro · Azure email smoke test',
    plainText:
      'This is a test from Azure Communication Services (Canada).\n' +
      'From: no-reply@mail.vanstro.ca\n' +
      'Reply-To: support@vanstro.ca\n' +
      'If you received this, DNS + ACS are working.\n',
    html: `
      <div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#0f1a19">
        <p style="margin:0 0 8px;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#004744">Vanstro Global Supply</p>
        <h1 style="margin:0 0 12px;font-size:22px">Azure email smoke test</h1>
        <p style="margin:0 0 12px;line-height:1.5">This message was sent via Azure Communication Services with data location <strong>Canada</strong>.</p>
        <ul style="margin:0 0 16px;padding-left:18px;line-height:1.6;color:#3a4a48">
          <li>From: <code>no-reply@mail.vanstro.ca</code></li>
          <li>Reply-To: <code>support@vanstro.ca</code></li>
        </ul>
        <p style="margin:0;font-size:13px;color:#6b7a78">If you got this, DNS verification and ACS are working. You can reply to confirm Reply-To routing.</p>
      </div>`,
  },
};

console.log(`Sending to ${to} from ${message.senderAddress} …`);
const poller = await client.beginSend(message);
const result = await poller.pollUntilDone();
console.log('status:', result.status);
console.log('messageId:', result.id);
if (result.error) {
  console.error('error:', result.error);
  process.exit(1);
}
