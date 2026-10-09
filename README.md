# CG Mushroom

Full-stack e-commerce + business management app for a mushroom farm in Chhattisgarh, India.
Customer storefront (catalog, cart, COD checkout, order tracking) + admin dashboard
(inventory, orders, purchases, analytics, content CMS, change password). English / Hindi toggle.

Stack: **React** (frontend) · **FastAPI** (backend) · **MongoDB** (database) · local disk for uploads.

This project is configured to run **entirely on your local machine** — local database, local
image storage, and SMS/email that print to your terminal when no provider keys are set.

---

## Prerequisites
- **Node.js 18+** and **Yarn** → `npm install -g yarn`
- **Python 3.11**
- **MongoDB Community Server** running locally (`mongodb://localhost:27017`)
  - macOS: `brew install mongodb-community && brew services start mongodb-community`
  - Ubuntu: install MongoDB, then `sudo systemctl start mongod`
  - Windows: install MongoDB Community, it runs as a service automatically

---

## 1. Backend setup
```bash
cd backend
python -m venv venv
source venv/bin/activate            # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env                 # then edit .env (set a real JWT_SECRET)
uvicorn server:app --host 0.0.0.0 --port 8001
```
Backend runs at **http://localhost:8001**. On first start it automatically:
- seeds the admin account (from `ADMIN_EMAIL` / `ADMIN_PASSWORD`)
- seeds the product catalogue
- creates the local upload folder `backend/uploads/`

### backend/.env
```
MONGO_URL="mongodb://localhost:27017"
DB_NAME="cgmushroom"
CORS_ORIGINS="http://localhost:3000"
JWT_SECRET="replace-with-a-long-random-hex-string"
ADMIN_EMAIL="admin@cgmushroom.in"
ADMIN_PASSWORD="CGMadmin@2026"
APP_URL="http://localhost:8001"
UPLOAD_DIR=""                        # optional: absolute path to store uploads elsewhere
RAZORPAY_KEY_ID=""
RAZORPAY_KEY_SECRET=""
EMERGENT_EMAIL_KEY=""                # leave empty → order emails print to terminal
EMAIL_FROM_NAME="CG Mushroom"
ADMIN_NOTIFY_EMAIL=""
TWILIO_ACCOUNT_SID=""                # leave empty → order SMS prints to terminal
TWILIO_AUTH_TOKEN=""
TWILIO_FROM_NUMBER=""
```

---

## 2. Frontend setup
```bash
cd frontend
yarn install
cp .env.example .env                 # REACT_APP_BACKEND_URL=http://localhost:8001
yarn start                           # opens http://localhost:3000
```

---

## 3. Admin login
- **URL:** http://localhost:3000/login
- **Email:** `admin@cgmushroom.in`
- **Password:** `CGMadmin@2026`

(Change it anytime from the admin dashboard → **Account** → Change password.)

---

## How the local setup works

| Area | Behaviour |
|------|-----------|
| **Database** | Local MongoDB at `mongodb://localhost:27017`, database name `cgmushroom`. No cloud DB. |
| **Image uploads** | Saved to `backend/uploads/products/` on disk. Served via `GET /api/files/...`. No cloud storage (no S3/Cloudinary). Set `UPLOAD_DIR` to change the folder. |
| **Order emails** | If `EMERGENT_EMAIL_KEY` is empty, the full email is **printed to the backend terminal** (status `logged`) instead of failing. Add a key to send for real. |
| **Order SMS** | If Twilio keys are empty, the SMS text is **printed to the backend terminal** (status `logged`). Add Twilio keys to send for real. This app has **no SMS OTP/login codes** — SMS is only order-status updates. |
| **Payments** | Cash on Delivery works out of the box. Add `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` to enable online payments. |
| **Login** | Email/password login works fully offline. Google login depends on a hosted OAuth service and is not reliable on localhost. |

Watch the backend terminal after placing an order — you'll see the email/SMS content printed there.

---

## Project structure
```
backend/
  server.py          FastAPI routes
  core.py            db connection + auth helpers
  seed.py            admin + catalogue seeding
  notifications.py   order email/SMS (console fallback when no keys)
  storage.py         local-disk image storage
  uploads/           uploaded images (created at runtime)
frontend/
  src/pages/         storefront pages
  src/pages/admin/   admin dashboard pages
  src/context/       Auth, Cart, Content, Lang providers
```
