# Netlify Quick Start - KPA Election API

Deploy your API to Netlify in 5 minutes!

## ⚡ Quick Steps

### 1. Install Dependency
```bash
cd apps/api
npm install serverless-http
```

### 2. Commit and Push
```bash
git add .
git commit -m "Add Netlify configuration"
git push origin main
```

### 3. Deploy on Netlify

1. Go to https://app.netlify.com/
2. Click **"Add new site"** → **"Import an existing project"**
3. Connect GitHub and select your repo
4. Configure:
   - Base directory: `apps/api`
   - Build command: `npm run build`
   - Publish directory: `dist`
5. Add environment variables:
   - `DATABASE_URL` = your Neon connection string
   - `NODE_ENV` = `production`
   - `JWT_SECRET` = your secret key
6. Click **"Deploy"**

### 4. Test
```bash
curl https://your-site.netlify.app/status
```

## 💰 Cost
- **Free:** $0/month (10 second timeout)
- **Pro:** $19/month (26 second timeout)
- **+ Neon DB:** $0-19/month

**Total:** $0-38/month

## ⚠️ Warning

**Timeout limits:**
- Free: 10 seconds max
- Pro: 26 seconds max

**Your STV vote counting may exceed this!**

If vote counting takes longer:
1. Upgrade to Pro + use Background Functions (15 min max)
2. Or use Digital Ocean instead (no timeout)

## 📚 Full Guide

See [apps/api/NETLIFY_DEPLOYMENT.md](apps/api/NETLIFY_DEPLOYMENT.md) for complete instructions.

## 🆚 Netlify vs Digital Ocean

| Feature | Netlify | Digital Ocean |
|---------|---------|---------------|
| Cost | $0-19/mo | $18-38/mo |
| Timeout | 10-26 sec | None |
| Cold Starts | Yes | No |
| Deployment | Auto (git push) | Manual or CI/CD |
| Best For | Quick APIs | Long operations |

**Recommendation:** Try Netlify first (it's free!). If STV counting times out, switch to Digital Ocean.

## ⏭️ After Deployment

1. Get your Netlify URL
2. Update frontend API URL
3. Test all endpoints
4. Test vote counting with real data
5. Monitor function execution times

**If counting times out → Consider Digital Ocean**

🚀 **Ready? Go to:** [apps/api/NETLIFY_DEPLOYMENT.md](apps/api/NETLIFY_DEPLOYMENT.md)

