# Resend Setup

BoothPilot sends follow-up emails through Resend after a human approves or edits the draft.
The send path is gated on `reviewStatus` being `approved` or `edited`; pending, discarded, or
missing drafts will not send.

## Zero-Setup Sender

When `RESEND_FROM` is unset, the backend sends from:

```text
Acme Analytics <onboarding@resend.dev>
```

This is Resend's shared onboarding sender. It requires no domain verification, so it is the
default for an immediate demo, but it can only deliver to the email address that owns the
Resend account. Use it for quick end-to-end testing, not booth outreach to arbitrary visitors.

`RESEND_API_KEY` is already set in the Convex deployment environment.

## Verified Domain Sender

To send to real recipients, verify a sending domain in the Resend dashboard and point
`RESEND_FROM` at an address on that domain.

1. Open the Resend dashboard and add your sending domain.
2. Add every DNS record Resend provides for that domain, including the TXT, MX, and DKIM
   records.
3. Wait for Resend to mark the domain as verified.
4. From the repo root, set the verified sender:

```bash
npx convex env set RESEND_FROM "Acme Analytics <booth@yourdomain.com>"
```

## One-Shot Manual Test

Use a session that already has a generated draft and a recipient email. If you are still using
`onboarding@resend.dev`, set the session recipient to the Resend account owner's email address.

Approve the session's draft:

```bash
npx convex run email:approve '{"sessionId":"<id>"}'
```

Then send it:

```bash
npx convex run email:send '{"sessionId":"<id>"}'
```

Read the returned object:

```json
{ "ok": true }
```

means Resend accepted the email and the session was marked sent. A failed send returns
`{ "ok": false, "error": "..." }`; Resend API failures include the HTTP status and the first
200 characters of the response body, for example `resend 403: ...`.
