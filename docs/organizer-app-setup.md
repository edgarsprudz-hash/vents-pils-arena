# VENTSPILS ARENA Organizer App

## Access
The private app is available at `/organizer` (for example, `https://ventspilsarena.lat/organizer`).
Only accounts whose `profiles.role` is `SUPER_ADMIN` or `ORGANIZER` can use it. The API checks the authenticated Supabase user and role on every request. Do not expose the Supabase service-role key to the browser.

To grant organizer access, run this in the Supabase SQL Editor after replacing the email address:

```sql
update public.profiles
set role = 'ORGANIZER'
where id = (
  select id from auth.users
  where lower(email) = lower('organizer@example.com')
);
```

To revoke organizer access, set the profile role back to the appropriate player role (normally `PLAYER`). Keep at least one trusted SUPER_ADMIN account.

## iPhone installation
1. Open the organizer URL in Safari (not an in-app browser).
2. Tap Share.
3. Choose Add to Home Screen.
4. Name it “VA Organizer” and tap Add.

The app opens in standalone mode. It requires an internet connection; it is not an offline scoring app.

## Scope
The app can list existing tournaments and matches, set a match to LIVE or SCHEDULED, and save scores / mark a match COMPLETED. It does not create tournaments, generate groups or brackets, or create matches. Those operations remain on the main website.

The API uses `SUPABASE_SERVICE_ROLE_KEY` server-side, which must already be configured in Vercel. Never add it to a `NEXT_PUBLIC_*` variable.
