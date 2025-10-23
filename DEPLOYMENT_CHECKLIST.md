# Post-Deployment Checklist

## ✅ Apps Are Live - Now Let's Make Them Work!

### 1. Check API Environment Variables

Go to Vercel Dashboard → API Project → Settings → Environment Variables

**Required Variables:**
```
DATABASE_URL = postgresql://user:pass@host:5432/db?sslmode=require
PORT = 5001
BCRYPT_SALT_ROUNDS = 10
NODE_ENV = production
CLIENT_URL = https://your-voter.vercel.app,https://your-admin.vercel.app
```

**After adding/updating, click "Redeploy"**

---

### 2. Initialize Database

```bash
cd apps/api

# Get DATABASE_URL from Vercel:
# Dashboard → API Project → Settings → Environment Variables → Copy DATABASE_URL

# Push database schema
DATABASE_URL="your_production_url" npm run db:push

# Create admin user (IMPORTANT!)
DATABASE_URL="your_production_url" npm run create-admin
```

**Save the admin credentials that are displayed!**

---

### 3. Update Frontend API URLs

#### Update Voter App:
1. Vercel Dashboard → Voter Project → Settings → Environment Variables
2. Add:
   ```
   VITE_API_URL = https://your-api-project.vercel.app
   ```
3. Click "Redeploy"

#### Update Admin App:
1. Vercel Dashboard → Admin Project → Settings → Environment Variables
2. Add:
   ```
   VITE_API_URL = https://your-api-project.vercel.app
   ```
3. Click "Redeploy"

---

### 4. Update API CORS

After frontends are redeployed:

1. Vercel Dashboard → API Project → Settings → Environment Variables
2. Update `CLIENT_URL` with actual frontend URLs:
   ```
   CLIENT_URL = https://kpa-election-voter.vercel.app,https://kpa-election-admin.vercel.app
   ```
3. Click "Redeploy"

---

### 5. Test Everything

#### Test API:
```bash
curl https://your-api.vercel.app/status
# Should return: {"ok": true}
```

#### Test Admin Login:
1. Go to: `https://your-admin.vercel.app`
2. Login with credentials from `create-admin` command
3. Should see dashboard

**If login fails, check:**
- Browser console (F12) for errors
- API logs in Vercel Dashboard
- Database was initialized
- Admin user was created
- CORS is configured correctly

---

## Common Issues & Solutions

### Issue: "Network Error" or "Failed to fetch"

**Solution:**
- Check `VITE_API_URL` is set in admin app
- Verify API URL is correct (no trailing slash)
- Check API is actually running (visit `/status`)

### Issue: "Invalid credentials"

**Solution:**
- Ensure you ran `npm run create-admin`
- Check database connection works
- Try creating another admin user

### Issue: "CORS Error"

**Solution:**
- Update `CLIENT_URL` in API to include admin URL
- Format: `https://admin-url.vercel.app,https://voter-url.vercel.app`
- No spaces, no trailing slashes
- Redeploy API after updating

### Issue: "Database connection failed"

**Solution:**
- Verify `DATABASE_URL` has `?sslmode=require`
- Check database is running (Neon/Supabase)
- Ensure database allows connections from Vercel

---

## Verify Setup

Run these checks:

```bash
# 1. API is live
curl https://your-api.vercel.app/status

# 2. Database connection works
# Check API logs in Vercel - should have no DB errors

# 3. Admin exists
# Try logging in at https://your-admin.vercel.app

# 4. CORS is working
# Login should not show CORS errors in browser console
```

---

## Quick Commands Reference

```bash
# Push schema
DATABASE_URL="prod_url" npm run db:push

# Create admin
DATABASE_URL="prod_url" npm run create-admin

# Test DB connection (local)
DATABASE_URL="prod_url" npm run test-db

# Check migration status
DATABASE_URL="prod_url" npx drizzle-kit check
```

---

## Need More Help?

1. **Check API logs:**
   - Vercel Dashboard → API Project → Deployments → Latest → View Function Logs

2. **Check browser console:**
   - Open admin site
   - Press F12
   - Go to Console tab
   - Try logging in
   - Look for error messages

3. **Test API directly:**
   ```bash
   curl -X POST https://your-api.vercel.app/api/admin/login \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@example.com","password":"your_password"}'
   ```

---

## What's Your Admin URL?

Share your URLs and error messages for specific help:
- Admin URL: ?
- API URL: ?
- Error in console: ?

