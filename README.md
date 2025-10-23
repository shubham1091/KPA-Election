# KPA Election - Next.js App

Single Next.js application with admin, voter, and API functionality all in one.

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Setup Environment
```bash
cp .env.example .env.local
# Edit .env.local with your Neon database URL and JWT secret
```

### 3. Setup Database
```bash
npm run db:push
```

### 4. Create Admin User
```bash
npm run create-admin
```

### 5. Run Development Server
```bash
npm run dev
```

Visit:
- Admin: http://localhost:3000/admin
- Voter: http://localhost:3000
- API: http://localhost:3000/api/*

## 📦 Deploy to Vercel

### One-Click Deploy

1. Push to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Import your repository
4. Add environment variables:
   - `DATABASE_URL` - Your Neon connection string (required)
   - `JWT_SECRET` - Random secret key (32+ characters, required)
   - `NEXT_PUBLIC_APP_URL` - Your full site URL like `https://your-site.vercel.app` (recommended)
5. Deploy!

### Environment Variables

Set these in Vercel dashboard:

```
DATABASE_URL=postgresql://user:password@ep-xxxxx.us-east-2.aws.neon.tech/neondb?sslmode=require
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters
NEXT_PUBLIC_APP_URL=https://your-site.vercel.app
NODE_ENV=production
```

**Important for Voter Links:**
- `NEXT_PUBLIC_APP_URL` is **highly recommended** for production deployments
- Without it, voter invitation URLs might default to localhost
- Set it to your full production URL (e.g., `https://your-site.vercel.app`)
- The app will fall back to request headers or `VERCEL_URL` if not set, but explicit configuration is more reliable

### Function Duration Limits

The app is configured with `maxDuration = 300` (5 minutes) for vote counting. This works with all Vercel plans when **Fluid Compute** is enabled (default):

| Plan       | Default Duration | Max Duration with Fluid Compute |
|------------|------------------|---------------------------------|
| Hobby      | 300s (5 min)     | 300s (5 min)                    |
| Pro        | 300s (5 min)     | 800s (13.3 min)                 |
| Enterprise | 300s (5 min)     | 800s (13.3 min)                 |

**For larger elections on Pro/Enterprise**, you can increase the limit in your deployment settings.

**Learn more:**
- [Vercel Function Duration](https://vercel.com/docs/functions/configuring-functions/duration)
- [Fluid Compute Guide](https://vercel.com/guides/what-can-i-do-about-vercel-serverless-functions-timing-out)

## 🏗️ Project Structure

```
kpa-election-nextjs/
├── app/
│   ├── admin/              # Admin dashboard pages
│   ├── voter/              # Voter interface pages  
│   ├── api/                # API routes
│   ├── layout.tsx          # Root layout
│   └── page.tsx            # Home page
├── lib/
│   ├── db.ts               # Database configuration
│   ├── schema.ts           # Database schema
│   └── stv.ts              # STV algorithm
├── components/             # Shared components
└── public/                 # Static assets
```

## 📝 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run db:push` - Push database schema
- `npm run db:studio` - Open database GUI
- `npm run create-admin` - Create admin user

## 🎯 Features

- ✅ Admin dashboard for election management
- ✅ Voter interface for casting ballots
- ✅ STV vote counting algorithm
- ✅ Real-time results
- ✅ Neon database integration
- ✅ TypeScript + Tailwind CSS
- ✅ API routes built-in
- ✅ Easy Vercel deployment

## 💰 Cost

- **Vercel**: Free (Hobby) or $20/month (Pro)
- **Neon DB**: Free or $19/month (Pro)
- **Total**: $0-39/month

## 🆘 Troubleshooting

### Database Connection Error
- Check `DATABASE_URL` in `.env.local`
- Ensure `?sslmode=require` is at the end of the URL
- Try using Neon's pooled connection string

### Build Errors
- Run `npm install` to ensure all dependencies are installed
- Check TypeScript errors with `npm run check-types`
- Clear `.next` folder and rebuild

### API Routes Not Working
- Ensure you're accessing routes at `/api/*`
- Check the browser console for errors
- Verify environment variables are set

## 📚 Documentation

- [Next.js Docs](https://nextjs.org/docs)
- [Vercel Deployment](https://vercel.com/docs)
- [Neon Database](https://neon.tech/docs)
- [Drizzle ORM](https://orm.drizzle.team)

## 🎉 Deploy Now!

```bash
# 1. Push to GitHub
git add .
git commit -m "Initial commit"
git push origin main

# 2. Deploy to Vercel
# Visit: https://vercel.com/new
# Import your repository
# Add environment variables
# Deploy!
```

Your app will be live in 2-3 minutes! 🚀
