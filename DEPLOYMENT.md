# Bharathi Medicals - Deployment Guide

## Architecture Overview

```
                    ┌─────────────────────────────────────┐
                    │         Custom Domains              │
                    ├─────────────────────────────────────┤
                    │  shop.bharathimedicals.in   (/shop) │
                    │  pos.bharathimedicals.in    (/pos)  │
                    │  admin.bharathimedicals.in  (/login)│
                    └────────────────┬────────────────────┘
                                     │
                    ┌────────────────▼────────────────────┐
                    │           Vercel Frontend            │
                    │      (React + Vite + Tailwind)      │
                    └────────────────┬────────────────────┘
                                     │
                    ┌────────────────▼────────────────────┐
                    │          Railway/Render Backend     │
                    │      (Node.js + Express API)        │
                    └────────────────┬────────────────────┘
                                     │
                    ┌────────────────▼────────────────────┐
                    │           Supabase Database          │
                    │         (PostgreSQL + Auth)          │
                    └──────────────────────────────────────┘
```

---

## Step 1: Set Up Supabase Database

### 1.1 Create Supabase Project
1. Go to [supabase.com](https://supabase.com) and sign up
2. Create a new project (select region closest to India - Singapore/Mumbai)
3. Note down:
   - Project URL: `https://xxxxx.supabase.co`
   - Anon Key: `eyJxxxx...`
   - Service Role Key: `eyJxxxx...` (keep secret!)

### 1.2 Run Schema Migration
1. Go to **SQL Editor** in Supabase dashboard
2. Copy contents of `backend/supabase/schema.sql`
3. Run the SQL to create all tables

### 1.3 Seed Initial Data
Run this SQL in Supabase SQL Editor:

```sql
-- Insert Categories
INSERT INTO categories (name, gst_rate, icon, color) VALUES
('Dog Food', 5, '🐕', '#8B4513'),
('Cat Food', 5, '🐱', '#FF6B35'),
('Pet Medicines', 12, '💊', '#EF4444'),
('Pet Accessories', 18, '🎀', '#8B5CF6'),
('Grooming Products', 18, '✨', '#EC4899'),
('Aquarium & Fish', 5, '🐟', '#3B82F6'),
('Bird Supplies', 5, '🐦', '#10B981'),
('Small Pets', 5, '🐹', '#F59E0B');

-- Insert Branches
INSERT INTO branches (name, code, address, phone, manager_name, manager_phone, opening_hours) VALUES
('Vaniyambadi Main', 'VNB-001', '45, Main Road, Vaniyambadi, Tamil Nadu 635751', '04174-252525', 'Rajesh Kumar', '9876543210', '8:00 AM - 9:00 PM'),
('Alangayam Branch', 'ALN-001', '12, Market Street, Alangayam, Tamil Nadu 635701', '04174-262626', 'Suresh M', '9876543211', '8:30 AM - 8:30 PM');

-- Insert Admin User (password: admin123)
INSERT INTO users (username, email, password_hash, full_name, role, branch_id) VALUES
('admin', 'admin@bharathimedicals.in', '$2a$10$rQPqQxQxQxQxQxQxQxQxQeQxQxQxQxQxQxQxQxQxQxQxQxQxQxQxQxQx', 'Administrator', 'admin', 1);
```

---

## Step 2: Deploy Backend (Railway/Render)

### Option A: Railway (Recommended)
1. Go to [railway.app](https://railway.app)
2. Connect GitHub repository
3. Select `backend` folder as root
4. Add environment variables:
   ```
   PORT=5000
   NODE_ENV=production
   DATABASE_TYPE=supabase
   SUPABASE_URL=https://xxxxx.supabase.co
   SUPABASE_ANON_KEY=eyJxxxx...
   SUPABASE_SERVICE_KEY=eyJxxxx...
   JWT_SECRET=your-secure-secret-key
   RAZORPAY_KEY_ID=rzp_live_xxxxx
   RAZORPAY_KEY_SECRET=xxxxx
   FRONTEND_URL=https://bharathimedicals.in
   ```
5. Deploy and note the URL (e.g., `api.bharathimedicals.in`)

### Option B: Render
1. Go to [render.com](https://render.com)
2. Create new Web Service
3. Connect repository, select `backend` folder
4. Set environment variables (same as above)
5. Deploy

---

## Step 3: Deploy Frontend (Vercel)

### 3.1 Deploy to Vercel
1. Go to [vercel.com](https://vercel.com)
2. Import GitHub repository
3. Set root directory to `frontend`
4. Add environment variable:
   ```
   VITE_API_URL=https://api.bharathimedicals.in/api
   ```
5. Deploy

### 3.2 Update Frontend API URL
Create `frontend/.env.production`:
```
VITE_API_URL=https://api.bharathimedicals.in/api
```

Update `frontend/src/utils/api.js`:
```javascript
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
```

---

## Step 4: Configure Custom Domains

### 4.1 Domain DNS Setup
Add these DNS records at your domain registrar:

| Type  | Name   | Value                        |
|-------|--------|------------------------------|
| CNAME | shop   | cname.vercel-dns.com         |
| CNAME | pos    | cname.vercel-dns.com         |
| CNAME | admin  | cname.vercel-dns.com         |
| CNAME | api    | your-railway-domain.railway.app |
| A     | @      | 76.76.21.21 (Vercel)         |

### 4.2 Vercel Domain Configuration
1. Go to Vercel project settings > Domains
2. Add domains:
   - `shop.bharathimedicals.in`
   - `pos.bharathimedicals.in`
   - `admin.bharathimedicals.in`
   - `bharathimedicals.in` (main)

### 4.3 Configure Redirects
Create `frontend/vercel.json`:
```json
{
  "rewrites": [
    { "source": "/api/:path*", "destination": "https://api.bharathimedicals.in/api/:path*" }
  ],
  "redirects": [
    {
      "source": "/",
      "destination": "/shop",
      "permanent": false,
      "has": [{ "type": "host", "value": "shop.bharathimedicals.in" }]
    },
    {
      "source": "/",
      "destination": "/pos",
      "permanent": false,
      "has": [{ "type": "host", "value": "pos.bharathimedicals.in" }]
    },
    {
      "source": "/",
      "destination": "/login",
      "permanent": false,
      "has": [{ "type": "host", "value": "admin.bharathimedicals.in" }]
    }
  ]
}
```

---

## Step 5: Set Up Razorpay (Production)

### 5.1 Create Razorpay Account
1. Go to [razorpay.com](https://razorpay.com)
2. Sign up and complete KYC
3. Get Live API keys from Dashboard > Settings > API Keys

### 5.2 Configure Webhook
1. Go to Dashboard > Settings > Webhooks
2. Add webhook URL: `https://api.bharathimedicals.in/api/payments/webhook`
3. Select events:
   - `payment.captured`
   - `payment.failed`
   - `refund.created`
4. Copy webhook secret to backend environment

### 5.3 Update Environment
```
RAZORPAY_KEY_ID=rzp_live_xxxxx
RAZORPAY_KEY_SECRET=xxxxx
RAZORPAY_WEBHOOK_SECRET=xxxxx
```

---

## Cost Estimation

| Service          | Free Tier          | Paid (if needed)      |
|------------------|--------------------|-----------------------|
| Supabase         | 500MB, 50k rows    | $25/mo (Pro)          |
| Vercel           | Unlimited deploys  | $20/mo (Pro)          |
| Railway          | 500 hours/mo       | ~$5-10/mo             |
| Razorpay         | 2% per transaction | No monthly fee        |
| Domain           | -                  | ~$10-15/year          |
| **Total**        | **$0/mo**          | **~$35-50/mo**        |

---

## Testing Checklist

- [ ] All 3 apps accessible via custom domains
- [ ] Customer registration & login works
- [ ] Product browsing works
- [ ] Cart & checkout works
- [ ] Online payment (Razorpay) works
- [ ] Admin login works
- [ ] POS login works
- [ ] Reports & exports work
- [ ] Multi-branch switching works

---

## Monitoring & Maintenance

### Logs
- **Vercel**: Dashboard > Deployments > Logs
- **Railway**: Dashboard > Project > Logs
- **Supabase**: Dashboard > Logs

### Backups
- Supabase auto-backs up daily (Pro plan)
- Download manual backup: Dashboard > Settings > Database

### Updates
```bash
# Local development
git pull origin main
npm install
npm run dev

# Deploy
git push origin main  # Auto-deploys on Vercel & Railway
```

---

## Support

For issues:
1. Check logs in respective dashboards
2. Test API endpoints with Postman
3. Verify environment variables
4. Check database connections

Contact: tech@bharathimedicals.in
