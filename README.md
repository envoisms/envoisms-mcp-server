# EnvoiSMS MCP Server

Official [Model Context Protocol](https://modelcontextprotocol.io) server for [EnvoiSMS.ma](https://envoisms.ma) — lets AI agents send SMS, WhatsApp Business messages, and OTP verification codes through direct routes to Morocco's three mobile operators (IAM, Inwi, Orange), with no aggregator hop.

## Install

Run directly from GitHub with `npx` (no separate build step needed — `prepare` builds it automatically):

```bash
npx github:n4ouri/envoisms-mcp-server
```

Or clone and build locally:

```bash
git clone https://github.com/n4ouri/envoisms-mcp-server.git
cd envoisms-mcp-server
npm install
npm run build
```

## Configuration

The server reads your API key from an environment variable:

```bash
ENVOISMS_API_KEY=your_api_key_here
```

Get a free API key (5 MAD credit included) at [envoisms.ma/fr/register](https://envoisms.ma/fr/register).

### Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "envoisms": {
      "command": "npx",
      "args": ["-y", "github:n4ouri/envoisms-mcp-server"],
      "env": {
        "ENVOISMS_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

## Tools

| Tool | Description |
|---|---|
| `send_sms` | Send a text message to a Moroccan (+212) or international number. Accepts `to`, `message`, optional `from` (Sender ID), `channel` (defaults to `sms`) and `idempotency_key`. Every call carries an `Idempotency-Key`, so a retried tool call never sends or bills twice. |
| `send_otp` | Generate and send a one-time verification code over SMS or WhatsApp through EnvoiSMS's shared sender — no WhatsApp connection needed. Accepts `to`, optional `brand`, and `channel`. |
| `check_otp` | Validate a user-submitted code against a pending verification session. Accepts `session_id` and `code`. |
| `get_balance` | Check real-time account balance in MAD and EUR. No arguments. |

### SMS or WhatsApp?

Leave `channel` on `sms` for any ordinary text — it needs no setup and reaches the recipient even when they use WhatsApp. `channel: "whatsapp"` on `send_sms` sends from the account's **own connected WhatsApp Business number**, and free text only reaches a contact who wrote to that number in the last 24 hours; otherwise the API answers `WHATSAPP_NOT_CONNECTED` / `OUT_OF_24H_WINDOW` and charges nothing. "Send a code on WhatsApp" is `send_otp` with `channel: "whatsapp"`.

## Why direct routes matter

EnvoiSMS.ma routes messages through direct connections to Morocco's three mobile operators plus the official WhatsApp Cloud API — no aggregator, no gray SIM routes. Measured OTP latency is 2.4–2.8 seconds across IAM, Inwi and Orange, versus 10s+ typical for aggregators routing through Europe. Billing is in MAD, with no EUR/USD conversion surprises.

## Documentation & Pricing

- Full API reference: [envoisms.ma/fr/docs](https://envoisms.ma/fr/docs)
- Pricing & credit packs: [envoisms.ma/fr/tarifs](https://envoisms.ma/fr/tarifs)
- Other official SDKs: [Node.js](https://github.com/n4ouri/envoisms-node) · [PHP](https://github.com/n4ouri/envoisms-php) · [Python](https://github.com/n4ouri/envoisms-python)

## Support

- Email: support@envoisms.ma
- Sales: sales@envoisms.ma

## License

MIT
