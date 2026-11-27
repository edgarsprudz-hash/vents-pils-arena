# CLAUDE SMM — private PWA

## App
- URL: `/smm` (for example `https://ventspilsarena.lat/smm`)
- Install on iPhone: open in Safari → Share → Add to Home Screen.
- Access is restricted on both the page and API to `profiles.role = 'SUPER_ADMIN'`.
- Separate manifest: `/smm.webmanifest`.

## Required setup
1. Apply `supabase/migrations/202611270001_claude_smm.sql` in Supabase SQL Editor.
2. In Vercel Project → Settings → Environment Variables, add `ANTHROPIC_API_KEY` for Production and Preview. Optionally set `ANTHROPIC_MODEL` to an Anthropic model available to your account.
3. Ensure `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and server-only `SUPABASE_SERVICE_ROLE_KEY` are already configured. Never expose the service-role key to the browser.

## Current functionality
- SuperAdmin-only PWA dashboard.
- Claude generates Latvian, Russian or English Instagram post / Story / Reel drafts.
- Drafts are stored in Supabase.
- SuperAdmin can approve or reject drafts.
- Approval is recorded but does NOT publish to Instagram yet.

## Instagram publishing integration (not enabled)
To publish after approval, configure a Meta app and Instagram Professional account, required Instagram Graph API permissions, access token, Instagram business account ID, and token refresh/expiry handling. Implement server-side publish and webhook/status reconciliation before enabling any automatic posting. Do not store Meta tokens in client-visible variables.
