# ⚡ Quick Start - Vercel Single Project

Deploy your entire KPA-Election system as ONE Vercel project in 10 minutes!

---

## 🎯 What You're Deploying

```
ONE Vercel Project:
├── yourproject.vercel.app/         → Voter Interface
├── yourproject.vercel.app/admin    → Admin Dashboard
└── yourproject.vercel.app/api/*    → Backend API
```

---

## ⚡ 4-Step Deployment

### Step 1: Push to GitHub (1 min)

```bash
git add .
git commit -m "Ready for Vercel deployment"
git push origin main
```

---

### Step 2: Deploy to Vercel (3 min)

1. Go to: **https://vercel.com/new**
2. Import your repository: `KPA-Election`
3. Configure:
   ```
   Build Command: npm run build:vercel
   Output Directory: dist
   ```
4. Click **"Deploy"**

---

### Step 3: Add Environment Variables (2 min)

In Vercel Dashboard → Project → Settings → Environment Variables, add:

```env
DATABASE_URL = postgresql://user:pass@host:5432/db?sslmode=require
PORT = 5001
BCRYPT_SALT_ROUNDS = 10
NODE_ENV = production
```

**Need a database?**
- **Neon**: https://neon.tech (Free tier, copy connection string)
- **Supabase**: https://supabase.com (Free tier, copy connection string)

After adding variables, click **"Redeploy"**

---

### Step 4: Initialize Database (2 min)

```bash
cd apps/api

# Push schema
DATABASE_URL="your_production_url" npm run db:push

# Create admin
DATABASE_URL="your_production_url" npm run create-admin
```

---

## ✅ Test Your Deployment

Visit your Vercel URL (shown in dashboard after deployment):

```bash
# Test Voter Interface
open https://your-project.vercel.app/

# Test Admin Dashboard
open https://your-project.vercel.app/admin

# Test API
curl https://your-project.vercel.app/api/status
# Should return: {"ok": true}
```

---

## 🎉 You're Live!

**Your URLs:**
- Voter: `https://your-project.vercel.app/`
- Admin: `https://your-project.vercel.app/admin`
- API: `https://your-project.vercel.app/api/*`

**Next Steps:**
1. Login to admin with created credentials
2. Create your first election
3. Import voters via CSV
4. Share voting URLs with voters
5. Run your election!

---

## 💡 Pro Tips

**Free Tier Limits:**
- 100GB bandwidth/month
- Perfect for elections with <1000 voters
- Upgrade to Pro ($20/month) for larger elections

**Custom Domain:**
1. Vercel Dashboard → Project → Settings → Domains
2. Add your domain
3. Update DNS as instructed
4. All apps accessible on your domain!

**Auto-Deploy:**
- Push to `main` = automatic deployment
- No manual steps needed after setup

---

## 🆘 Troubleshooting

| Issue | Solution |
|-------|----------|
| Build fails | Check build logs, ensure all dependencies installed |
| API 404 | Verify environment variables are set, redeploy |
| Admin blank page | Clear browser cache, check console errors |
| Database error | Verify DATABASE_URL format and SSL mode |

---

## 📚 Full Documentation

Need more details? See:
- **[Complete Guide](./VERCEL_SINGLE_PROJECT.md)** - Full documentation
- **[README](./README.md)** - Project overview

---

## 💰 Costs

| Tier | Vercel | Database | Total/Month |
|------|--------|----------|-------------|
| Free | $0 | $0 (Neon) | **$0** |
| Basic | $0 | $19 (Neon Pro) | **$19** |
| Pro | $20 | $19 | **$39** |

**Start free, upgrade when needed!**

---

**Deployment Time: ~10 minutes**

**Ready? Start with Step 1 above! 🚀**

