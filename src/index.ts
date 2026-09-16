#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { randomUUID } from 'node:crypto';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

const API_KEY = process.env.ENVOISMS_API_KEY;
const BASE_URL = process.env.ENVOISMS_BASE_URL || 'https://api.envoisms.ma';

if (!API_KEY) {
  console.error('Error: ENVOISMS_API_KEY environment variable is required.');
  process.exit(1);
}

const server = new Server(
  {
    name: 'envoisms-mcp-server',
    version: '1.1.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'send_sms',
        description: 'Send a text message to a Moroccan (+212) or international mobile. Use the default channel "sms" for any ordinary text — it needs no setup and works even when the recipient uses WhatsApp. Channel "whatsapp" only works from the account\'s OWN connected WhatsApp Business number and, for free text, only to a contact who wrote to that number in the last 24 hours; otherwise the API refuses (WHATSAPP_NOT_CONNECTED / OUT_OF_24H_WINDOW) and charges nothing. For a one-time code, use send_otp instead.',
        inputSchema: {
          type: 'object',
          properties: {
            to: { type: 'string', description: 'Destination phone number in E.164 (e.g. +212612345678)' },
            message: { type: 'string', description: 'Message text' },
            from: { type: 'string', description: 'Optional Sender ID (a validated custom sender, else the account default)' },
            channel: { type: 'string', enum: ['sms', 'whatsapp'], default: 'sms', description: 'Leave as "sms" unless the account has a connected WhatsApp Business number AND the recipient wrote to it in the last 24 hours.' },
            idempotency_key: { type: 'string', description: 'Optional. Same key = same message: a repeated call never sends or bills twice (24 h).' },
          },
          required: ['to', 'message'],
        },
      },
      {
        name: 'send_otp',
        description: 'Generate and send a one-time verification code (OTP) over SMS or WhatsApp through EnvoiSMS\'s shared sender — no WhatsApp connection needed. This is the right tool for "send a code on WhatsApp".',
        inputSchema: {
          type: 'object',
          properties: {
            to: { type: 'string', description: 'Recipient phone number (e.g. +212612345678)' },
            brand: { type: 'string', description: 'Brand name displayed in the OTP message' },
            channel: { type: 'string', enum: ['sms', 'whatsapp'], default: 'sms' },
          },
          required: ['to'],
        },
      },
      {
        name: 'check_otp',
        description: 'Validate an OTP code against a pending verification session.',
        inputSchema: {
          type: 'object',
          properties: {
            session_id: { type: 'string', description: 'Session ID returned from send_otp' },
            code: { type: 'string', description: 'The user-submitted verification code' },
          },
          required: ['session_id', 'code'],
        },
      },
      {
        name: 'get_balance',
        description: 'Check real-time account balance in MAD and EUR.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case 'send_sms': {
      const { idempotency_key, ...body } = (args || {}) as Record<string, unknown>;
      const res = await fetch(`${BASE_URL}/v1/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${API_KEY}`,
          // A model that retries a tool call must not send (and pay for) the
          // message twice: one key per logical send, honoured for 24 h.
          'Idempotency-Key': typeof idempotency_key === 'string' && idempotency_key ? idempotency_key : randomUUID(),
        },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: !res.ok };
    }
    case 'send_otp': {
      const res = await fetch(`${BASE_URL}/v1/verify/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${API_KEY}`,
        },
        body: JSON.stringify(args),
      });
      const data = await res.json();
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: !res.ok };
    }
    case 'check_otp': {
      const res = await fetch(`${BASE_URL}/v1/verify/check`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${API_KEY}`,
        },
        body: JSON.stringify(args),
      });
      const data = await res.json();
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: !res.ok };
    }
    case 'get_balance': {
      const res = await fetch(`${BASE_URL}/v1/billing/balance`, {
        headers: {
          Authorization: `Bearer ${API_KEY}`,
        },
      });
      const data = await res.json();
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
