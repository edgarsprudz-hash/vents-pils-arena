# CLAUDE SMM — private PWA

## App
- URL: `/smm` (for example `https://ventspilsarena.lat/smm`)
- Install on iPhone: open in Safari → Share → Add to Home Screen.
- Access is restricted on both the page and API to `profiles.role = 'SUPER_ADMIN'`.
- Separate manifest: `/smm.webmanifest`.

## Supabase
1. Apply `supabase/migrations/202611270001_claude_smm.sql` in Supabase SQL Editor.
2. The table uses RLS with no client policies. SMM server routes authorize the Supabase session and verify `profiles.role = 'SUPER_ADMIN'` before using the server-only service role key.

## Vercel environment variables
Set these in Project → Settings → Environment Variables. Use Production and Preview as needed:
- `ANTHROPIC_API_KEY` — Anthropic API key (required for Claude generation).
- `ANTHROPIC_MODEL` — optional model override; defaults to `claude-sonnet-4-5-20250929`.
- `INSTAGRAM_ACCESS_TOKEN` — Instagram User access token for the VENTSPILS ARENA professional account.
- `INSTAGRAM_USER_ID` — Instagram professional account ID returned by Meta.
- `INSTAGRAM_GRAPH_VERSION` — optional Graph API version, defaults to `v27.0`.
- Existing `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and server-only `SUPABASE_SERVICE_ROLE_KEY` must be configured. Never expose service-role or Meta/Anthropic tokens in a `NEXT_PUBLIC_*` variable.

## Meta setup
1. The Instagram account must be Professional (Business or Creator).
2. Create/configure a Meta developer app and add the Instagram API with Instagram Login product.
3. Grant the relevant Instagram business permissions, including basic account access and insights access. Content publishing permission is needed for publishing later.
4. Complete App Review / Advanced Access and business verification if Meta requires them for the intended production access.
5. Generate an Instagram User access token for the account and obtain its Instagram user ID. Store both only in Vercel environment variables.

Meta documentation:
- Insights overview: https://developers.facebook.com/docs/insights/overview/
- Instagram insights reference: https://developers.facebook.com/docs/graph-api/reference/shadow-ig-user/insights/
- Instagram API changelog / Instagram Login: https://developers.facebook.com/docs/instagram/platform/instagram-api/changelog/

## Current functionality
- SuperAdmin-only PWA dashboard.
- Claude generates Latvian, Russian or English Instagram post / Story / Reel drafts.
- Drafts are stored in Supabase.
- SuperAdmin can approve or reject drafts.
- Instagram connection endpoint can read account profile, account insights and recent media when the Meta token and account ID are configured.

## Publishing is intentionally disabled
Approval records consent but does NOT publish to Instagram. Publishing needs a verified Meta app with the content-publishing permission and publicly reachable media assets. Before enabling it, add an asset upload/storage workflow, media URL validation, container creation + status polling + publish endpoint, idempotency, and an audit log. Never let Claude publish without an explicit SuperAdmin approval.
