# Spectrum iMessage gallery

Stray City can save photos sent to its Spectrum iMessage agent and can also accept hosted image URLs through a protected Express endpoint.

The configured Stray City iMessage number is **+1 (415) 605-5508**. The web gallery exposes this as a one-tap `sms:` link and refreshes every 15 seconds while open.

## Configuration

Set these values in `apps/server/.env` (never commit the real values):

```dotenv
SPECTRUM_PROJECT_ID=
SPECTRUM_PROJECT_SECRET=
SPECTRUM_WEBHOOK_SECRET=
```

Set `VITE_IMESSAGE_AGENT_PHONE=+14156055508` in the web environment if the agent number changes.

The Spectrum agent starts with the server only when the project ID, project secret, and Supabase admin credentials are configured. Inbound image attachments are limited to 10 MB and are uploaded to the private `imessage-gallery` bucket.

## HTTP endpoint

`POST /api/user/gallery/add`

Required header:

```text
x-spectrum-webhook-secret: <SPECTRUM_WEBHOOK_SECRET>
```

Example body:

```json
{
  "sender": "+12125550199",
  "imageUrl": "https://images.example.com/manhattan.jpg",
  "caption": "Manhattan at sunset",
  "timestamp": "2026-09-27T18:30:00.000Z",
  "messageId": "optional-provider-message-id"
}
```

`sender` is normalized to E.164. A matching registered account is linked through the private phone table. If no account exists yet, an iMessage-only profile is created and is linked automatically after the person registers with the same phone number.

`messageId` makes retries idempotent. The response never returns the sender's phone number.

## Database setup

Apply `supabase/migrations/202609270001_private_account_phones.sql` to create the private phone mapping, iMessage profiles, gallery items, and private storage bucket.
