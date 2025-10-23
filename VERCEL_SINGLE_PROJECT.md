# Deploy to Vercel - Single Project Setup 🚀

Deploy your **entire KPA-Election system** as **ONE Vercel project** with all apps accessible from the **same URL**!

## 📐 Architecture

```
yourdomain.vercel.app
├── /                → Voter Interface (default)
├── /admin           → Admin Dashboard
└── /api/*           → Backend API (serverless)
```

**Benefits:**
- ✅ Single URL for everything
- ✅ One Vercel project to manage
- ✅ Unified deployment
- ✅ Shared environment variables
- ✅ Simple DNS configuration

---

## 🎯 URL Structure

After deployment, you'll have:

```
https://your-project.vercel.app/          → Voter interface
https://your-project.vercel.app/admin     → Admin dashboard
https://your-project.vercel.app/api/*     → API endpoints
```

**Examples:**
```
https://your-project.vercel.app/api/elections
https://your-project.vercel.app/admin
https://your-project.vercel.app/
```

---

## 🚀 Deployment Methods

### Method 1: Vercel Dashboard (Easiest)

1. **Push your code to GitHub**
   ```bash
   git add .
   git commit -m "Prepare for Vercel deployment"
   git push origin main
   ```

2. **Go to Vercel Dashboard**
   - Visit: https://vercel.com/new
   - Click "Import Project"
   - Select your GitHub repository: `KPA-Election`

3. **Configure Project**
   ```
   Project Name: kpa-election
   Framework Preset: Other
   Root Directory: ./ (leave as root)
   Build Command: npm run build:vercel
   Output Directory: dist
   Install Command: npm install
   ```

4. **Add Environment Variables**
   
   Click "Environment Variables" and add:
   
   ```
   DATABASE_URL = postgresql://user:pass@host:5432/db?sslmode=require
   PORT = 5001
   BCRYPT_SALT_ROUNDS = 10
   NODE_ENV = production
   ```
   
   **Important:** You'll need a PostgreSQL database. Recommended options:
   - [Neon](https://neon.tech) - Free tier available
   - [Supabase](https://supabase.com) - Free tier available
   - [Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres) - $0.25/month

5. **Deploy**
   - Click "Deploy"
   - Wait 3-5 minutes for build
   - Done! ✅

---

### Method 2: Vercel CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
vercel --prod

# Follow prompts:
# - Link to existing project? No
# - Project name: kpa-election
# - Directory: ./ (root)

# Set environment variables (one-time)
vercel env add DATABASE_URL production
vercel env add PORT production
vercel env add BCRYPT_SALT_ROUNDS production
vercel env add NODE_ENV production

# Redeploy with env vars
vercel --prod
```

---

## 🗃️ Database Setup

After deployment, initialize your database:

```bash
# Get your DATABASE_URL from Vercel dashboard:
# Project → Settings → Environment Variables

cd apps/api

# 1. Push database schema
DATABASE_URL="your_production_url" npm run db:push

# 2. Create admin user
DATABASE_URL="your_production_url" npm run create-admin

# 3. Add prefilled URL support
DATABASE_URL="your_production_url" node add-prefilled-url-column.js
```

---

## 🧪 Testing Your Deployment

### 1. Check All Routes

```bash
# Test API
curl https://your-project.vercel.app/api/status
# Expected: {"ok": true}

# Test Admin (in browser)
open https://your-project.vercel.app/admin

# Test Voter (in browser)
open https://your-project.vercel.app/
```

### 2. Full Application Test

1. **Admin Login**
   - Visit: `https://your-project.vercel.app/admin`
   - Login with admin credentials
   - Should see dashboard

2. **Create Election**
   - Create new election
   - Add positions and candidates
   - Import voters

3. **Vote**
   - Copy voting URL
   - Open in incognito: `https://your-project.vercel.app/ballot/...`
   - Rank candidates
   - Submit ballot

4. **View Results**
   - Close election
   - View results at admin

---

## ⚙️ Configuration Details

### Vercel Configuration (`vercel.json`)

```json
{
  "version": 2,
  "buildCommand": "npm run build:vercel",
  "installCommand": "npm install",
  "outputDirectory": "dist",
  "rewrites": [
    {
      "source": "/admin",
      "destination": "/admin/index.html"
    },
    {
      "source": "/admin/:path*",
      "destination": "/admin/index.html"
    },
    {
      "source": "/",
      "destination": "/voter/index.html"
    },
    {
      "source": "/:path*",
      "destination": "/voter/index.html"
    }
  ],
  "functions": {
    "api/**/*.js": {
      "runtime": "nodejs18.x"
    }
  }
}
```

### Build Script

The `npm run build:vercel` script:
1. Builds all apps with Turborepo
2. Combines outputs into unified `dist/` directory
3. Sets up API as serverless functions
4. Configures path-based routing

---

## 🌐 Custom Domain Setup

### Add Custom Domain

1. **In Vercel Dashboard:**
   - Go to: Project → Settings → Domains
   - Click "Add"
   - Enter your domain: `yourdomain.com`
   - Follow DNS instructions

2. **Update DNS Records:**
   
   In your domain registrar (Namecheap, GoDaddy, etc.):
   
   ```
   Type: A
   Name: @
   Value: 76.76.21.21
   
   Type: CNAME
   Name: www
   Value: cname.vercel-dns.com
   ```

3. **Wait for DNS Propagation** (5-60 minutes)

### Your URLs Will Be:

```
https://yourdomain.com/           → Voter
https://yourdomain.com/admin      → Admin
https://yourdomain.com/api/*      → API
```

---

## 💰 Costs

### Vercel Pricing

**Hobby (Free):**
- ✅ 100GB bandwidth/month
- ✅ Unlimited projects
- ✅ Automatic HTTPS
- ✅ 100 deployments/day
- ❌ No team features
- **Good for:** Testing, small elections (<1000 voters)

**Pro ($20/month):**
- ✅ 1TB bandwidth
- ✅ Team collaboration
- ✅ Password protection
- ✅ Analytics
- **Good for:** Production elections (5000+ voters)

### Database Costs

**Neon (Recommended):**
- Free: 0.5GB storage, 1 project
- Pro ($19/month): 10GB storage, unlimited projects

**Supabase:**
- Free: 500MB storage, 2 projects
- Pro ($25/month): 8GB storage, unlimited projects

**Vercel Postgres:**
- Starter ($0.25/month): 256MB, 60 hours compute
- Pro ($24/month): 2GB, 400 hours compute

### Total Cost Estimate:

| Tier | Monthly Cost | Suitable For |
|------|-------------|--------------|
| **Free** | $0 | Testing, <500 voters |
| **Basic** | ~$20-25 | Small elections, <2000 voters |
| **Pro** | ~$40-45 | Medium elections, <10000 voters |

---

## 🔧 Troubleshooting

### Build Fails

**Issue: "Command not found: turbo"**
```bash
# Solution: Ensure turbo is in root package.json devDependencies
npm install --save-dev turbo
git push
```

**Issue: "Cannot find module"**
```bash
# Solution: Clear cache and rebuild
vercel --prod --force
```

### API Issues

**Issue: "Database connection failed"**
```
# Check DATABASE_URL format
postgresql://user:pass@host:5432/db?sslmode=require

# Ensure database allows Vercel IPs
# For Neon/Supabase, this is automatic
```

**Issue: "CORS errors"**
```
# API is on same domain, CORS shouldn't be needed
# If issues persist, check browser console for actual error
```

### Routing Issues

**Issue: "404 on /admin"**
```
# Verify vercel.json has correct rewrites
# Check build output includes dist/admin/index.html
```

**Issue: "Blank page on admin"**
```
# Check browser console for errors
# Verify base path is correctly set
# May need to clear browser cache
```

---

## 🔄 Updates & Redeployment

### Automatic Deployments

Vercel automatically deploys when you push to GitHub:

```bash
git add .
git commit -m "Update election system"
git push origin main

# Vercel automatically:
# 1. Detects push
# 2. Runs build
# 3. Deploys to production
# 4. Updates your URL
```

### Manual Deployment

```bash
# Via CLI
vercel --prod

# Via Dashboard
# Project → Deployments → "Redeploy"
```

### Rollback

```bash
# Via Dashboard:
# 1. Go to Deployments
# 2. Find previous successful deployment
# 3. Click "..." → "Promote to Production"

# Via CLI:
vercel rollback
```

---

## 📊 Monitoring

### View Logs

**Via Dashboard:**
1. Project → Deployments → [Select deployment]
2. Click "View Function Logs"
3. See real-time serverless function logs

**Via CLI:**
```bash
vercel logs
vercel logs --follow  # Live tail
```

### Analytics

**Vercel Analytics (Pro):**
- Page views
- Unique visitors
- Performance metrics
- Geographic distribution

Enable in: Project → Settings → Analytics

---

## 🔒 Security

### Environment Variables

**Never commit:**
- ❌ `.env` files
- ❌ Database credentials
- ❌ API keys

**Always use:**
- ✅ Vercel environment variables (dashboard)
- ✅ Different credentials per environment
- ✅ Strong passwords

### Database Security

```env
# Always use SSL for production
DATABASE_URL=postgresql://...?sslmode=require

# Use connection pooling
# Neon and Supabase handle this automatically
```

### Rate Limiting

Consider adding rate limiting to API:
```javascript
// apps/api/src/server.ts
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/api/', limiter);
```

---

## 🚀 Production Checklist

Before going live:

- [ ] Environment variables set in Vercel
- [ ] Database schema pushed
- [ ] Admin user created
- [ ] Test election created and completed
- [ ] Voter flow tested end-to-end
- [ ] Results page verified
- [ ] Custom domain configured (optional)
- [ ] SSL working (automatic)
- [ ] Monitoring enabled
- [ ] Backup strategy planned
- [ ] Team notified of URLs

---

## 📚 Additional Resources

- **Vercel Docs**: https://vercel.com/docs
- **Vercel CLI**: https://vercel.com/docs/cli
- **Vercel Functions**: https://vercel.com/docs/functions
- **Vercel Postgres**: https://vercel.com/docs/storage/vercel-postgres
- **Neon Database**: https://neon.tech/docs
- **Supabase**: https://supabase.com/docs

---

## 🆘 Getting Help

### Check These First:
1. Build logs in Vercel dashboard
2. Function logs for API errors
3. Browser console for frontend errors
4. Environment variables are set correctly

### Common Solutions:
- Clear Vercel cache: `vercel --prod --force`
- Rebuild locally: `npm run build:vercel`
- Check database connectivity
- Verify all env vars are set

### Support:
- Vercel Discord: https://vercel.com/discord
- Vercel Support: support@vercel.com (Pro users)
- GitHub Issues: Create issue in your repo

---

## ✨ Tips & Best Practices

1. **Start with Free Tier** - Test everything before upgrading
2. **Use Preview Deployments** - Test changes before production
3. **Monitor Bandwidth** - Upgrade when approaching limits
4. **Database Backups** - Neon/Supabase handle this automatically
5. **Custom Domain** - Looks more professional for elections
6. **Analytics** - Upgrade to Pro to understand usage
7. **Documentation** - Keep URLs and credentials documented

---

## 🎉 You're Ready!

Your single-project Vercel deployment is configured and ready to go!

**Quick Start:**
1. Push code to GitHub
2. Import to Vercel
3. Add environment variables
4. Deploy!

**Total Time: ~15 minutes**

Good luck with your elections! 🗳️✨

