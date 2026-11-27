# Instagram SMM integration

This branch adds server-side Instagram OAuth endpoints. It does not change the production site until merged/deployed.

## Vercel environment variables

Set for Production and Preview:

- `META_APP_ID` — Meta app ID.
- `META_APP_SECRET` — Meta app secret (server-only).
- `META_REDIRECT_URI` — exactly `https://ventspilsarena.lat/api/instagram/callback`.
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase service-role key (server-only; never expose with a `NEXT_PUBLIC_` prefix).
- `SMM_ADMIN_SECRET` — a long random secret used to protect the connect/status endpoints.
- Supabase URL: existing `NEXT_PUBLIC_SUPABASE_URL` is supported; alternatively set `SUPABASE_URL`.

Redeploy after setting environment variables.

## Meta app configuration

Add this exact OAuth redirect URI to the Instagram API configuration:
`https://ventspilsarena.lat/api/instagram/callback`

The app requests only:
- `instagram_business_basic`
- `instagram_business_manage_insights`

## Endpoints

- `POST /api/instagram/connect` with `Authorization: Bearer <SMM_ADMIN_SECRET>` returns an `authorization_url`. Open that URL in a browser to authorize the Instagram professional account.
- `GET /api/instagram/callback` validates the OAuth state, exchanges the code for a long-lived token, reads the profile, and stores the token in `public.instagram_accounts`.
- `GET /api/instagram/status` with the same Authorization header returns connected account metadata (never the token).

The callback relies on the table created in Supabase:
`public.instagram_accounts`.

## Important

This is the OAuth and secure token-storage foundation only. It does not yet implement media/Insights synchronization or Gemini analysis. Those are the next development steps after the Meta callback is successfully tested.
