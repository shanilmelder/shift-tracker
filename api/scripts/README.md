# Scripts

## `seed-first-manager.ts`

Run **once**, outside the app and outside the API's own HTTP surface (FR-003). This is the
only way the very first manager account comes into existence — every subsequent account is
created by an existing manager through `POST /v1/admin/users`.

```bash
cd api
SUPABASE_URL=https://YOUR-PROJECT.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key \
npm run seed:first-manager -- \
  --email owner@example.com \
  --name "Alex Owner" \
  --location-name "Downtown Store" \
  --location-address "123 Main St" \
  --location-timezone "America/Chicago"
```

The script is safe to re-run — it checks for an existing manager profile first and exits
without creating a duplicate if one is found.
