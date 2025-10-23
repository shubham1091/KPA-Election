# Netlify Deployment Guide for KPA Election API

Quick guide to deploy your API to Netlify with Neon Database.

## 🎯 Setup Steps

### 1. Install Dependencies

```bash
cd apps/api
npm install serverless-http
```

### 2. Push to GitHub

Make sure your code is pushed to GitHub:

```bash
git add .
git commit -m "Add Netlify configuration"
git push origin main
```

### 3. Deploy on Netlify

#### Via Netlify Website (Easiest):

1. Go to https://app.netlify.com/
2. Click **"Add new site"** → **"Import an existing project"**
3. Connect to GitHub and select your repository
4. Configure build settings:
   - **Base directory:** `apps/api`
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
   - **Functions directory:** `netlify/functions`

5. Add Environment Variables:
   - Click **"Add environment variables"**
   - Add these:
     ```
     DATABASE_URL=your-neon-connection-string
     NODE_ENV=production
     JWT_SECRET=your-secret-key
     ```

6. Click **"Deploy site"**

### 4. Get Your API URL

After deployment:
- Your API URL will be: `https://your-site-name.netlify.app`
- All endpoints will be: `https://your-site-name.netlify.app/api/...`

## 📋 Environment Variables

Add these in Netlify Dashboard → Site settings → Environment variables:

```bash
DATABASE_URL=postgresql://user:password@ep-xxxxx.us-east-2.aws.neon.tech/neondb?sslmode=require
NODE_ENV=production
PORT=5001
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters
CORS_ORIGIN=*
```

## 🧪 Test Your Deployment

```bash
# Health check
curl https://your-site-name.netlify.app/status

# Test API endpoint
curl https://your-site-name.netlify.app/api/elections
```

## ⚠️ Important Limitations

### Netlify Function Timeouts

- **Free tier:** 10 seconds maximum
- **Pro tier ($19/mo):** 26 seconds maximum

**This may be an issue for:**
- Long-running STV vote counts
- Large data exports
- Complex operations

**Solutions:**
1. **Background Functions (Pro plan):** Up to 15 minutes
2. **Split operations:** Break long tasks into smaller chunks
3. **Consider Digital Ocean:** For operations > 26 seconds

### Cold Starts

- Functions sleep after inactivity
- First request after sleep is slower (1-3 seconds)
- Subsequent requests are fast

### File Uploads

- 6 MB request size limit on Free
- Use external storage for large files

## 💰 Cost

| Plan | Cost | Function Timeout | Bandwidth |
|------|------|------------------|-----------|
| **Free** | $0 | 10 seconds | 100 GB |
| **Pro** | $19/mo | 26 seconds | 1 TB |
| **Business** | $99/mo | 26 seconds | 1.5 TB |

**Plus:** Neon Database ($0-19/mo)

**Total:** $0-38/month (Free + Neon) or $19-38/month (Pro + Neon)

## 🚀 Update Deployment

Netlify auto-deploys on every push to main:

```bash
# Make changes
git add .
git commit -m "Update API"
git push origin main

# Netlify automatically deploys!
```

## 🔧 Local Development

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login
netlify login

# Test locally
netlify dev

# Your API runs at: http://localhost:8888
```

## 📊 Your Architecture

```
┌──────────────────────┐
│   Frontend Apps      │  (Netlify - Free)
│   (Admin + Voter)    │
└──────────┬───────────┘
           │
           │ HTTPS
           │
           ▼
┌──────────────────────┐
│  Netlify Functions   │  ($0-19/mo)
│  (Your API)          │  Serverless
└──────────┬───────────┘
           │
           │ SSL
           │
           ▼
┌──────────────────────┐
│   Neon Database      │  ($0-19/mo)
│   PostgreSQL         │  You have this!
└──────────────────────┘
```

**Total Cost:** $0-38/month

## ✨ Benefits

✅ **Easy deployment** - Git push to deploy
✅ **Free tier available** - Good for testing
✅ **Automatic SSL** - HTTPS included
✅ **Global CDN** - Fast worldwide
✅ **Auto-scaling** - Handles traffic spikes
✅ **Great for simple APIs** - Quick responses work well

## ⚠️ Potential Issues

### STV Vote Counting

Your STV counting algorithm (`runCount.ts`) might take longer than 10-26 seconds for large elections.

**Solutions:**

1. **Use Background Functions (Pro plan):**
   Create a separate background function for counting:
   ```typescript
   // netlify/functions/count-votes.ts
   export async function handler(event) {
     // Up to 15 minutes execution time
   }
   ```

2. **Move counting to a scheduled job:**
   - Trigger counting manually
   - Run as background task
   - Store results in database

3. **Consider hybrid approach:**
   - API on Netlify for quick operations
   - Long tasks on Digital Ocean or background worker

## 🆘 Troubleshooting

### Function Timeout

**Error:** Function exceeded timeout

**Fix:**
- Upgrade to Pro for 26 seconds
- Use Background Functions
- Optimize your code
- Consider Digital Ocean for long operations

### Cold Start Slow

**Issue:** First request after inactivity is slow

**Fix:**
- This is normal for serverless
- Consider keeping functions warm with periodic pings
- Or use Digital Ocean for always-on server

### Database Connection Issues

**Error:** Too many database connections

**Fix:**
- Use Neon's pooled connection string
- Add `-pooler` to hostname in connection string
- Example: `ep-xxxxx-pooler.us-east-2.aws.neon.tech`

## 📚 Resources

- [Netlify Functions Docs](https://docs.netlify.com/functions/overview/)
- [Netlify CLI](https://docs.netlify.com/cli/get-started/)
- [Background Functions](https://docs.netlify.com/functions/background-functions/)

## 🎯 Recommendation

### Use Netlify if:
- ✅ Your API endpoints are quick (< 10 seconds)
- ✅ You want easy deployment
- ✅ You don't mind cold starts
- ✅ Your budget is tight ($0-19/mo)

### Consider Digital Ocean if:
- ❌ STV counting takes > 26 seconds
- ❌ You need consistent performance (no cold starts)
- ❌ You want full control
- ❌ Budget allows ($18-38/mo)

## ⏭️ Next Steps

1. **Install serverless-http:**
   ```bash
   cd apps/api
   npm install serverless-http
   ```

2. **Push to GitHub:**
   ```bash
   git add .
   git commit -m "Add Netlify deployment"
   git push origin main
   ```

3. **Deploy on Netlify:**
   - Go to https://app.netlify.com/
   - Import your repository
   - Add environment variables
   - Deploy!

4. **Test your API:**
   ```bash
   curl https://your-site.netlify.app/status
   ```

5. **Update frontend:**
   - Change API URL to your Netlify URL
   - Redeploy frontend

## 🎉 You're Done!

Your API is now on Netlify with:
- ✅ Automatic deployments
- ✅ Free SSL/HTTPS
- ✅ Global CDN
- ✅ Connected to Neon DB

**Happy deploying! 🚀**

