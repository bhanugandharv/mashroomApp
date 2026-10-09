# CG Mushroom — PRD

## Original problem statement
"Create a full-fledged e-commerce and business management web app named 'CG Mushroom' for a local mushroom farming business based in Chhattisgarh, India.
Core Features Required:
1. Customer Storefront: A clean, visually appealing product catalog displaying different mushroom varieties, a shopping cart, secure checkout process, and user profiles for order tracking.
2. Admin/Business Dashboard: A robust backend system for comprehensive inventory management (real-time stock tracking), order processing, purchase management, and basic sales analytics.
Design & UI/UX Guidelines:
* Color Theme: Fresh, lush greenery and earthy brown tones that reflect agriculture, nature, and farming.
* Cultural Touch (Optional but preferred): Subtly integrate minimalist elements of Chhattisgarh's rich culture (such as subtle Bastar tribal art motifs or localized patterns) in the borders, footers, or subtle background textures. Ensure these elements blend seamlessly without compromising a modern, professional, and clean e-commerce look."

User choices: JWT email/password + Emergent Google login (one seeded admin); Razorpay + Cash on Delivery (build without Razorpay keys for now); English + Hindi toggle; purchases = supplier purchases (spawn, substrate, packaging) that add to stock, costs feed analytics.

## Architecture
- Backend: FastAPI (`server.py` routes, `core.py` db/auth helpers, `seed.py` admin + catalogue seed), MongoDB, custom string ids (`user_id`, `product_id`, ...), `_id` never exposed.
- Auth: httpOnly cookies — access_token (15m) + refresh_token (7d) for JWT; session_token (7d) for Google. Role: admin/customer. Origin guard on mutating requests.
- Payments: COD (live); Razorpay order create + signature verify (enabled only when RAZORPAY_KEY_ID/SECRET set in backend/.env).
- Frontend: React + Tailwind + shadcn, contexts for Auth, Cart (localStorage per browser), Lang (EN/HI). Bastar-inspired SVG motifs in CSS.

## User personas
- Customer in Chhattisgarh buying fresh/dried mushrooms or spawn.
- Farm owner/admin managing stock, orders, supplier purchases and sales.

## Implemented (2026-10-09 — admin account + image upload)
- Change Password: admin page `/admin/account` (nav "Account"), `POST /api/auth/change-password` (bcrypt verifies current password, min 6 chars, blocks reuse). AdminAccount.js. Tested round-trip + restore.
- Local-first setup (self-hosting): image uploads switched to LOCAL DISK (`backend/storage.py` → `backend/uploads/products/`, override via `UPLOAD_DIR`); no cloud storage dependency. SMS/Email now fall back to CONSOLE printing (`notifications.deliver` → status `logged`) when provider keys are absent, instead of failing. DB already local MongoDB. Added `backend/.env.example`, `frontend/.env.example`, `README.md` (+`LOCAL_SETUP.md`), and `.gitignore` keeps `*.env.example` and ignores `backend/uploads/`. No SMS OTP feature exists (SMS = order-status only).
- Product Image Upload: `POST /api/admin/upload-image` (admin only, jpg/jpeg/png/webp/gif, ≤5MB) stores to Emergent object storage via `backend/storage.py` (EMERGENT_LLM_KEY), records in `db.uploads`; public `GET /api/files/{path}` serves bytes. ProductForm has "Upload photo" button (phone camera/gallery) + preview; URL field still works. Tested 37/37 backend + frontend 100%.


## Implemented (2026-10-09)
- Site Content admin page `/admin/content` (collection `site_content`, GET `/api/content`, PUT `/api/admin/content`): EN/HI overrides for announcement banner, hero, feature cards, About the farm, footer blurb; contact details (address, phone, WhatsApp, email, Instagram, Facebook). Storefront reads via `ContentContext`, empty = default i18n text. Tested 31/31 backend + frontend.
- Storefront: home (hero bento, featured), shop (category/search/sort), product detail (live stock), cart drawer, checkout (address, COD, Razorpay disabled until keys), order detail with tracking timeline + cancel, account (profile + orders).
- Auth: register/login/logout/refresh, Google login, brute-force lockout, seeded admin.
- Admin: dashboard analytics (revenue, orders, purchase cost, margin, daily chart, top products, pipeline, low stock, recent orders), orders processing (status updates, stock restore on cancel, COD paid on delivery), product CRUD, inventory (products + farm supplies, adjustments, movements log, 10s live refresh, reorder links), purchases (supplier purchases add stock, spend summary).
- EN/HI toggle across storefront and admin nav.
- Order notifications (2026-10-09): email via Emergent managed email (live, `EMERGENT_EMAIL_KEY`, `EMAIL_FROM_NAME`) + SMS via Twilio (queued until `TWILIO_ACCOUNT_SID/AUTH_TOKEN/FROM_NUMBER` set; auto-retried on startup and via admin "Retry pending"). Customer notified on placed/confirmed/shipped/delivered; admin alert on new order to `ADMIN_NOTIFY_EMAIL` (fallback ADMIN_EMAIL). `backend/notifications.py`, admin page `/admin/notifications` with log + channel status. Collection `notifications`.
- Tested: 27/27 backend tests, frontend critical flows pass.

## Backlog
- P0: Add Razorpay keys (RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET) to enable online payment.
- P1: invoice PDF; image upload for products (object storage). Set ADMIN_NOTIFY_EMAIL to a real inbox; add Twilio keys for SMS.
- P2: Coupons, customer list in admin, CSV export of sales/purchases, Razorpay webhooks.

## Next tasks
- Replace placeholder catalogue prices/stock and footer contact placeholders with real business details.
