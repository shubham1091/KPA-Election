# Deploy to Vercel - 3 Separate Projects

Simple guide to deploy your election system as 3 separate Vercel projects.

## 🎯 What You'll Get

```
Project 1: kpa-election-voter
URL: https://kpa-election-voter.vercel.app

Project 2: kpa-election-admin  
URL: https://kpa-election-admin.vercel.app

Project 3: kpa-election-api
URL: https://kpa-election-api.vercel.app
```

---

## 🚀 Deployment Steps

### Step 1: Deploy Voter App

1. Go to **https://vercel.com/new**
2. Import your repository: `KPA-Election`
3. Configure:
   ```
   Project Name: kpa-election-voter
   Framework: Vite
   Root Directory: apps/voter
   ```
4. Environment Variables (optional for now):
   ```
   VITE_API_URL=https://kpa-election-api.vercel.app
   ```
5. Click **Deploy**

---

### Step 2: Deploy Admin App

1. Go to **https://vercel.com/new** again
2. Import **same repository**: `KPA-Election`
3. Configure:
   ```
   Project Name: kpa-election-admin
   Framework: Vite
   Root Directory: apps/admin
   ```
4. Environment Variables (optional for now):
   ```
   VITE_API_URL=https://kpa-election-api.vercel.app
   ```
5. Click **Deploy**

---

### Step 3: Deploy API

1. Go to **https://vercel.com/new** again
2. Import **same repository**: `KPA-Election`
3. Configure:
   ```
   Project Name: kpa-election-api
   Framework: Other
   Root Directory: apps/api
   ```
4. **Environment Variables** (REQUIRED):
   ```
   DATABASE_URL=postgresql://user:pass@host:5432/db?sslmode=require
   PORT=5001
   CLIENT_URL=https://kpa-election-voter.vercel.app,https://kpa-election-admin.vercel.app
   BCRYPT_SALT_ROUNDS=10
   NODE_ENV=production
   ```
5. Click **Deploy**

**Database Options:**
- [Neon](https://neon.tech) - Free tier, copy connection string
- [Supabase](https://supabase.com) - Free tier, copy connection string

---

### Step 4: Update Frontend Environment Variables

After API is deployed, update the frontend apps:

**Voter App:**
1. Vercel Dashboard → kpa-election-voter → Settings → Environment Variables
2. Add/Update: `VITE_API_URL` = `https://kpa-election-api.vercel.app`
3. Click "Redeploy"

**Admin App:**
1. Vercel Dashboard → kpa-election-admin → Settings → Environment Variables
2. Add/Update: `VITE_API_URL` = `https://kpa-election-api.vercel.app`
3. Click "Redeploy"

---

### Step 5: Initialize Database

```bash
cd apps/api

# Push schema
DATABASE_URL="your_production_url" npm run db:push

# Create admin user
DATABASE_URL="your_production_url" npm run create-admin
```

---

## ✅ Test Your Deployment

1. **Voter**: https://kpa-election-voter.vercel.app
2. **Admin**: https://kpa-election-admin.vercel.app (login with admin credentials)
3. **API**: https://kpa-election-api.vercel.app/status (should return `{"ok": true}`)

---

## 💰 Cost

- **Vercel Hobby (Free)**: 3 projects, 100GB bandwidth each
- **Database**: $0-19/month (Neon free tier or Pro)
- **Total**: Free to start!

---

## 🔄 Auto-Deploy

All 3 projects auto-deploy when you push to GitHub!

---

## 🌐 Custom Domains (Optional)

Add custom domains in each project's settings:
- `vote.yourdomain.com` → Voter
- `admin.yourdomain.com` → Admin
- `api.yourdomain.com` → API

Then update `CLIENT_URL` in API and `VITE_API_URL` in frontends.

---

## ⚠️ Important Notes

### API Limitations on Vercel

Vercel serverless functions have:
- 10-second timeout on Hobby plan
- 60-second timeout on Pro plan ($20/month)

For production, consider:
- **Railway** for API (better for Express) - $5-15/month
- Keep frontends on Vercel (excellent for static sites)

### If Using Railway for API:

1. Deploy API to Railway instead of Vercel
2. Get Railway URL (e.g., `https://your-api.railway.app`)
3. Update `VITE_API_URL` in both frontend apps to Railway URL
4. Update `CLIENT_URL` in Railway to include both Vercel frontend URLs

---

## 🆘 Troubleshooting

**Build fails:**
- Check build logs in Vercel dashboard
- Ensure dependencies install correctly

**CORS errors:**
- Verify `CLIENT_URL` in API includes both frontend URLs
- No trailing slashes
- Include `https://` prefix

**Database connection fails:**
- Ensure `?sslmode=require` in DATABASE_URL
- Verify database allows connections from Vercel

---

**That's it! Much simpler than single project deployment.** 🎉

