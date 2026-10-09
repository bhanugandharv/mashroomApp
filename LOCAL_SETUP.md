# CG Mushroom — Local Setup

Run the full storefront + admin dashboard on your own computer with a **local MongoDB database**
and **local image storage** (uploaded product photos are saved to a folder on your machine).

## Prerequisites
- Node.js 18+ and Yarn (`npm install -g yarn`)
- Python 3.11
- MongoDB Community Server (running locally on `mongodb://localhost:27017`)

## 1. Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate            # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env                 # then edit values (set a real JWT_SECRET)
uvicorn server:app --host 0.0.0.0 --port 8001
```
- The admin account is seeded automatically on startup from `ADMIN_EMAIL` / `ADMIN_PASSWORD`.
- Uploaded images are stored in `backend/uploads/` by default. Set `UPLOAD_DIR` in `.env`
  to use any other folder on your laptop.

## 2. Frontend
```bash
cd frontend
yarn install
cp .env.example .env                 # REACT_APP_BACKEND_URL=http://localhost:8001
yarn start                           # opens http://localhost:3000
```

## 3. Log in as admin
- URL: http://localhost:3000/login
- Email: `admin@cgmushroom.in`
- Password: `CGMadmin@2026`

## What works locally
- Storefront (catalog, cart, COD checkout, order tracking) ✅
- Admin dashboard (inventory, orders, purchases, analytics, content CMS, change password) ✅
- Product image upload → saved to local disk (`backend/uploads/`) ✅
- Local MongoDB database ✅
- English / Hindi toggle ✅

## Optional integrations (need your own keys)
- **Razorpay** online payments: set `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET`. Without them,
  checkout uses Cash on Delivery only.
- **Order emails**: set `EMERGENT_EMAIL_KEY` (or swap `backend/notifications.py` to your own
  SMTP/provider). Without it, emails stay queued/logged.
- **Order SMS (Twilio)**: set `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`.
  There is no SMS OTP/login code — SMS is only for order-status updates.
- **Google login**: relies on Emergent's hosted OAuth and a public URL, so it is unreliable on
  localhost. Use email/password login locally.
