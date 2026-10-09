from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env")

import os
import asyncio
import logging
from collections import defaultdict
from datetime import timedelta, datetime
from typing import List, Literal, Optional

import httpx
import razorpay
from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from pymongo import ReturnDocument
from starlette.middleware.cors import CORSMiddleware

from core import (db, client, hash_password, verify_password, decode_token, set_auth_cookies, clear_auth_cookies,
                  get_current_user, require_admin, new_id, now, now_iso, USER_PROJ, COOKIE_OPTS, as_aware,
                  create_access_token)
from seed import seed_admin, seed_catalog, create_indexes
import notifications as ntf

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

app = FastAPI()
api = APIRouter(prefix="/api")
ALLOWED_ORIGINS = [o.strip() for o in os.environ["CORS_ORIGINS"].split(",") if o.strip()]

ORDER_STATUSES = ["placed", "confirmed", "packed", "shipped", "delivered", "cancelled"]
FREE_DELIVERY_ABOVE = 499
DELIVERY_FEE = 40


# ---------- Models ----------
class RegisterIn(BaseModel):
    name: str = Field(min_length=1)
    email: str
    password: str = Field(min_length=6)


class LoginIn(BaseModel):
    email: str
    password: str


class GoogleSessionIn(BaseModel):
    session_id: str


class ProfileIn(BaseModel):
    name: str = Field(min_length=1)
    phone: str = ""


class ProductIn(BaseModel):
    name: str = Field(min_length=1)
    name_hi: str = ""
    category: Literal["fresh", "dried", "spawn", "value_added"]
    description: str = ""
    description_hi: str = ""
    price: float = Field(gt=0)
    unit: str = Field(min_length=1)
    stock: float = Field(ge=0)
    low_stock_threshold: float = Field(default=15, ge=0)
    image: str = ""
    featured: bool = False
    is_active: bool = True


class StockAdjustIn(BaseModel):
    delta: float
    reason: str = "Manual adjustment"


class OrderItemIn(BaseModel):
    product_id: str
    quantity: int = Field(ge=1)


class AddressIn(BaseModel):
    full_name: str = Field(min_length=1)
    phone: str = Field(min_length=10)
    line1: str = Field(min_length=1)
    line2: str = ""
    city: str = Field(min_length=1)
    state: str = "Chhattisgarh"
    pincode: str = Field(min_length=6, max_length=6)


class OrderCreateIn(BaseModel):
    items: List[OrderItemIn] = Field(min_length=1)
    address: AddressIn
    payment_method: Literal["cod", "razorpay"]


class RazorpayVerifyIn(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str


class StatusIn(BaseModel):
    status: Literal["placed", "confirmed", "packed", "shipped", "delivered", "cancelled"]


class SupplyIn(BaseModel):
    name: str = Field(min_length=1)
    category: Literal["spawn", "substrate", "packaging", "other"]
    unit: str = Field(min_length=1)
    quantity: float = Field(default=0, ge=0)
    low_stock_threshold: float = Field(default=15, ge=0)


class ContentIn(BaseModel):
    texts: dict = Field(default_factory=dict)
    contact: dict = Field(default_factory=dict)
    announcement_enabled: bool = False
    about_enabled: bool = True


class PurchaseIn(BaseModel):
    supplier: str = Field(min_length=1)
    target_type: Literal["product", "supply"]
    target_id: str
    quantity: float = Field(gt=0)
    unit_cost: float = Field(ge=0)
    purchase_date: str
    invoice_no: str = ""
    notes: str = ""


# ---------- Helpers ----------
def razorpay_client():
    key_id, secret = os.environ.get("RAZORPAY_KEY_ID", ""), os.environ.get("RAZORPAY_KEY_SECRET", "")
    return razorpay.Client(auth=(key_id, secret)) if key_id and secret else None


async def log_movement(kind: str, ref_id: str, name: str, delta: float, reason: str, ref: str = ""):
    await db.stock_movements.insert_one({
        "movement_id": new_id("mov"), "kind": kind, "ref_id": ref_id, "name": name,
        "delta": delta, "reason": reason, "ref": ref, "created_at": now_iso(),
    })


async def restore_order_stock(order: dict, reason: str):
    for it in order["items"]:
        await db.products.update_one({"product_id": it["product_id"]}, {"$inc": {"stock": it["quantity"]}})
        await log_movement("product", it["product_id"], it["name"], it["quantity"], reason, order["order_number"])


async def next_order_number() -> str:
    counter = await db.counters.find_one_and_update(
        {"_id": "order"}, {"$inc": {"seq": 1}}, upsert=True, return_document=ReturnDocument.AFTER)
    return f"CGM-{1000 + counter['seq']}"


def normalize_email(email: str) -> str:
    email = email.strip().lower()
    if "@" not in email or "." not in email.split("@")[-1]:
        raise HTTPException(status_code=422, detail="Please enter a valid email address")
    return email


# ---------- Auth ----------
@api.post("/auth/register")
async def register(body: RegisterIn, response: Response):
    email = normalize_email(body.email)
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="An account with this email already exists")
    user = {"user_id": new_id("user"), "email": email, "name": body.name.strip(), "role": "customer",
            "phone": "", "picture": "", "password_hash": hash_password(body.password), "created_at": now_iso()}
    await db.users.insert_one(user)
    set_auth_cookies(response, user["user_id"], email)
    return await db.users.find_one({"user_id": user["user_id"]}, USER_PROJ)


@api.post("/auth/login")
async def login(body: LoginIn, request: Request, response: Response):
    email = body.email.strip().lower()
    identifier = f"{request.client.host if request.client else 'na'}:{email}"
    attempt = await db.login_attempts.find_one({"identifier": identifier})
    if attempt and attempt.get("locked_until") and as_aware(attempt["locked_until"]) > now():
        raise HTTPException(status_code=429, detail="Too many failed attempts. Try again in 15 minutes.")
    user = await db.users.find_one({"email": email})
    if not user or not user.get("password_hash") or not verify_password(body.password, user["password_hash"]):
        count = (attempt or {}).get("count", 0) + 1
        update = {"count": count}
        if count >= 5:
            update = {"count": 0, "locked_until": (now() + timedelta(minutes=15)).isoformat()}
        await db.login_attempts.update_one({"identifier": identifier}, {"$set": update}, upsert=True)
        raise HTTPException(status_code=401, detail="Invalid email or password")
    await db.login_attempts.delete_many({"identifier": identifier})
    set_auth_cookies(response, user["user_id"], email)
    return await db.users.find_one({"user_id": user["user_id"]}, USER_PROJ)


@api.post("/auth/google/session")
async def google_session(body: GoogleSessionIn, response: Response):
    async with httpx.AsyncClient(timeout=15) as http:
        r = await http.get("https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                           headers={"X-Session-ID": body.session_id})
    if r.status_code != 200:
        raise HTTPException(status_code=401, detail="Google sign-in failed")
    data = r.json()
    email = data["email"].lower()
    existing = await db.users.find_one({"email": email}, {"_id": 0})
    if existing:
        user_id = existing["user_id"]
        await db.users.update_one({"user_id": user_id}, {"$set": {"picture": data.get("picture", "")}})
    else:
        user_id = new_id("user")
        await db.users.insert_one({"user_id": user_id, "email": email, "name": data.get("name") or email,
                                   "picture": data.get("picture", ""), "role": "customer", "phone": "",
                                   "created_at": now_iso()})
    await db.user_sessions.insert_one({"user_id": user_id, "session_token": data["session_token"],
                                       "expires_at": (now() + timedelta(days=7)).isoformat(),
                                       "created_at": now_iso()})
    response.set_cookie("session_token", data["session_token"], max_age=604800, **COOKIE_OPTS)
    return await db.users.find_one({"user_id": user_id}, USER_PROJ)


@api.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return user


@api.post("/auth/refresh")
async def refresh(request: Request, response: Response):
    payload = decode_token(request.cookies.get("refresh_token", ""), "refresh")
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    user = await db.users.find_one({"user_id": payload["sub"]}, USER_PROJ)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    response.set_cookie("access_token", create_access_token(user["user_id"], user["email"]), max_age=900, **COOKIE_OPTS)
    return {"ok": True}


@api.post("/auth/logout")
async def logout(request: Request, response: Response):
    token = request.cookies.get("session_token")
    if token:
        await db.user_sessions.delete_many({"session_token": token})
    clear_auth_cookies(response)
    return {"ok": True}


@api.put("/auth/profile")
async def update_profile(body: ProfileIn, user: dict = Depends(get_current_user)):
    await db.users.update_one({"user_id": user["user_id"]}, {"$set": {"name": body.name.strip(), "phone": body.phone.strip()}})
    return await db.users.find_one({"user_id": user["user_id"]}, USER_PROJ)


# ---------- Storefront ----------
@api.get("/")
async def root():
    return {"message": "CG Mushroom API"}


@api.get("/products")
async def list_products(category: Optional[str] = None, q: Optional[str] = None, featured: Optional[bool] = None):
    query = {"is_active": True}
    if category and category != "all":
        query["category"] = category
    if q:
        query["$or"] = [{"name": {"$regex": q, "$options": "i"}}, {"name_hi": {"$regex": q, "$options": "i"}}]
    if featured:
        query["featured"] = True
    return await db.products.find(query, {"_id": 0}).sort("created_at", 1).to_list(500)


@api.get("/products/{product_id}")
async def get_product(product_id: str):
    product = await db.products.find_one({"product_id": product_id, "is_active": True}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product


@api.get("/payments/config")
async def payments_config():
    return {"razorpay_enabled": razorpay_client() is not None, "razorpay_key_id": os.environ.get("RAZORPAY_KEY_ID", ""),
            "free_delivery_above": FREE_DELIVERY_ABOVE, "delivery_fee": DELIVERY_FEE}


CONTENT_DEFAULT = {"texts": {}, "contact": {}, "announcement_enabled": False, "about_enabled": True}


@api.get("/content")
async def get_content():
    doc = await db.site_content.find_one({"key": "site"}, {"_id": 0, "key": 0})
    return doc or CONTENT_DEFAULT


@api.put("/admin/content")
async def admin_update_content(body: ContentIn, _: dict = Depends(require_admin)):
    texts = {k: {"en": str(v.get("en", "")), "hi": str(v.get("hi", ""))} for k, v in body.texts.items() if isinstance(v, dict)}
    contact = {k: str(v) for k, v in body.contact.items()}
    doc = {"texts": texts, "contact": contact, "announcement_enabled": body.announcement_enabled,
           "about_enabled": body.about_enabled, "updated_at": now_iso()}
    await db.site_content.update_one({"key": "site"}, {"$set": doc}, upsert=True)
    return doc


# ---------- Orders ----------
@api.post("/orders")
async def create_order(body: OrderCreateIn, user: dict = Depends(get_current_user)):
    rz = razorpay_client()
    if body.payment_method == "razorpay" and rz is None:
        raise HTTPException(status_code=400, detail="Online payment is not configured yet. Please choose Cash on Delivery.")
    merged = defaultdict(int)
    for it in body.items:
        merged[it.product_id] += it.quantity

    reserved = []
    for pid, qty in merged.items():
        product = await db.products.find_one_and_update(
            {"product_id": pid, "is_active": True, "stock": {"$gte": qty}}, {"$inc": {"stock": -qty}},
            projection={"_id": 0}, return_document=ReturnDocument.AFTER)
        if not product:
            for r in reserved:
                await db.products.update_one({"product_id": r["product_id"]}, {"$inc": {"stock": r["quantity"]}})
            existing = await db.products.find_one({"product_id": pid}, {"_id": 0, "name": 1})
            name = existing["name"] if existing else "an item"
            raise HTTPException(status_code=400, detail=f"Not enough stock for {name}")
        reserved.append({"product_id": pid, "name": product["name"], "name_hi": product.get("name_hi", ""),
                         "price": product["price"], "unit": product["unit"], "image": product.get("image", ""),
                         "quantity": qty, "line_total": round(product["price"] * qty, 2)})

    subtotal = round(sum(r["line_total"] for r in reserved), 2)
    delivery = 0 if subtotal >= FREE_DELIVERY_ABOVE else DELIVERY_FEE
    order = {
        "order_id": new_id("ord"), "order_number": await next_order_number(), "user_id": user["user_id"],
        "customer_name": user.get("name", ""), "customer_email": user["email"], "items": reserved,
        "subtotal": subtotal, "delivery_fee": delivery, "total": round(subtotal + delivery, 2),
        "address": body.address.model_dump(), "payment_method": body.payment_method, "payment_status": "pending",
        "status": "placed", "status_history": [{"status": "placed", "at": now_iso()}], "razorpay_order_id": "",
        "created_at": now_iso(),
    }
    if body.payment_method == "razorpay":
        try:
            rz_order = await asyncio.to_thread(rz.order.create, {
                "amount": int(round(order["total"] * 100)), "currency": "INR",
                "receipt": order["order_number"], "payment_capture": 1})
            order["razorpay_order_id"] = rz_order["id"]
        except Exception as exc:
            logger.error("Razorpay order failed: %s", exc)
            for r in reserved:
                await db.products.update_one({"product_id": r["product_id"]}, {"$inc": {"stock": r["quantity"]}})
            raise HTTPException(status_code=502, detail="Could not start online payment. Please try again or use COD.")
    await db.orders.insert_one(order)
    for r in reserved:
        await log_movement("product", r["product_id"], r["name"], -r["quantity"], "Customer order", order["order_number"])
    saved = await db.orders.find_one({"order_id": order["order_id"]}, {"_id": 0})
    if body.payment_method == "cod":
        ntf.notify_order_bg(saved, "placed")
    return saved


@api.post("/orders/{order_id}/razorpay/verify")
async def verify_razorpay(order_id: str, body: RazorpayVerifyIn, user: dict = Depends(get_current_user)):
    order = await db.orders.find_one({"order_id": order_id, "user_id": user["user_id"]}, {"_id": 0})
    rz = razorpay_client()
    if not order or not rz or order["razorpay_order_id"] != body.razorpay_order_id:
        raise HTTPException(status_code=400, detail="Invalid payment details")
    try:
        rz.utility.verify_payment_signature(body.model_dump())
    except Exception:
        await db.orders.update_one({"order_id": order_id}, {"$set": {"payment_status": "failed"}})
        raise HTTPException(status_code=400, detail="Payment verification failed")
    await db.orders.update_one({"order_id": order_id}, {"$set": {
        "payment_status": "paid", "razorpay_payment_id": body.razorpay_payment_id}})
    saved = await db.orders.find_one({"order_id": order_id}, {"_id": 0})
    ntf.notify_order_bg(saved, "placed")
    return saved


@api.get("/orders/my")
async def my_orders(user: dict = Depends(get_current_user)):
    return await db.orders.find({"user_id": user["user_id"]}, {"_id": 0}).sort("created_at", -1).to_list(200)


@api.get("/orders/{order_id}")
async def get_order(order_id: str, user: dict = Depends(get_current_user)):
    order = await db.orders.find_one({"order_id": order_id}, {"_id": 0})
    if not order or (order["user_id"] != user["user_id"] and user.get("role") != "admin"):
        raise HTTPException(status_code=404, detail="Order not found")
    return order


@api.post("/orders/{order_id}/cancel")
async def cancel_my_order(order_id: str, user: dict = Depends(get_current_user)):
    order = await db.orders.find_one_and_update(
        {"order_id": order_id, "user_id": user["user_id"], "status": {"$in": ["placed", "confirmed"]}},
        {"$set": {"status": "cancelled"}, "$push": {"status_history": {"status": "cancelled", "at": now_iso()}}},
        projection={"_id": 0}, return_document=ReturnDocument.AFTER)
    if not order:
        raise HTTPException(status_code=400, detail="This order can no longer be cancelled")
    await restore_order_stock(order, "Order cancelled by customer")
    return order


# ---------- Admin: products ----------
@api.get("/admin/products")
async def admin_products(_: dict = Depends(require_admin)):
    return await db.products.find({}, {"_id": 0}).sort("created_at", 1).to_list(1000)


@api.post("/admin/products")
async def admin_create_product(body: ProductIn, _: dict = Depends(require_admin)):
    doc = {"product_id": new_id("prod"), **body.model_dump(), "created_at": now_iso()}
    await db.products.insert_one(doc)
    if body.stock:
        await log_movement("product", doc["product_id"], doc["name"], body.stock, "Opening stock")
    return await db.products.find_one({"product_id": doc["product_id"]}, {"_id": 0})


@api.put("/admin/products/{product_id}")
async def admin_update_product(product_id: str, body: ProductIn, _: dict = Depends(require_admin)):
    before = await db.products.find_one({"product_id": product_id}, {"_id": 0})
    if not before:
        raise HTTPException(status_code=404, detail="Product not found")
    await db.products.update_one({"product_id": product_id}, {"$set": body.model_dump()})
    if body.stock != before["stock"]:
        await log_movement("product", product_id, body.name, body.stock - before["stock"], "Edited in catalogue")
    return await db.products.find_one({"product_id": product_id}, {"_id": 0})


@api.delete("/admin/products/{product_id}")
async def admin_delete_product(product_id: str, _: dict = Depends(require_admin)):
    result = await db.products.delete_one({"product_id": product_id})
    if not result.deleted_count:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"ok": True}


@api.patch("/admin/products/{product_id}/stock")
async def admin_adjust_product_stock(product_id: str, body: StockAdjustIn, _: dict = Depends(require_admin)):
    product = await db.products.find_one_and_update(
        {"product_id": product_id, "stock": {"$gte": -body.delta}}, {"$inc": {"stock": body.delta}},
        projection={"_id": 0}, return_document=ReturnDocument.AFTER)
    if not product:
        raise HTTPException(status_code=400, detail="Stock cannot go below zero")
    await log_movement("product", product_id, product["name"], body.delta, body.reason or "Manual adjustment")
    return product


# ---------- Admin: supplies & inventory ----------
@api.get("/admin/supplies")
async def admin_supplies(_: dict = Depends(require_admin)):
    return await db.supplies.find({}, {"_id": 0}).sort("created_at", 1).to_list(1000)


@api.post("/admin/supplies")
async def admin_create_supply(body: SupplyIn, _: dict = Depends(require_admin)):
    doc = {"supply_id": new_id("sup"), **body.model_dump(), "created_at": now_iso()}
    await db.supplies.insert_one(doc)
    return await db.supplies.find_one({"supply_id": doc["supply_id"]}, {"_id": 0})


@api.patch("/admin/supplies/{supply_id}/stock")
async def admin_adjust_supply(supply_id: str, body: StockAdjustIn, _: dict = Depends(require_admin)):
    supply = await db.supplies.find_one_and_update(
        {"supply_id": supply_id, "quantity": {"$gte": -body.delta}}, {"$inc": {"quantity": body.delta}},
        projection={"_id": 0}, return_document=ReturnDocument.AFTER)
    if not supply:
        raise HTTPException(status_code=400, detail="Quantity cannot go below zero")
    await log_movement("supply", supply_id, supply["name"], body.delta, body.reason or "Manual adjustment")
    return supply


@api.delete("/admin/supplies/{supply_id}")
async def admin_delete_supply(supply_id: str, _: dict = Depends(require_admin)):
    result = await db.supplies.delete_one({"supply_id": supply_id})
    if not result.deleted_count:
        raise HTTPException(status_code=404, detail="Supply not found")
    return {"ok": True}


@api.get("/admin/stock-movements")
async def admin_movements(limit: int = 30, _: dict = Depends(require_admin)):
    return await db.stock_movements.find({}, {"_id": 0}).sort("created_at", -1).to_list(min(limit, 200))


# ---------- Admin: orders ----------
@api.get("/admin/orders")
async def admin_orders(status: Optional[str] = None, _: dict = Depends(require_admin)):
    query = {"status": status} if status and status != "all" else {}
    return await db.orders.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)


@api.patch("/admin/orders/{order_id}/status")
async def admin_update_order_status(order_id: str, body: StatusIn, _: dict = Depends(require_admin)):
    order = await db.orders.find_one({"order_id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order["status"] == "cancelled":
        raise HTTPException(status_code=400, detail="Cancelled orders cannot be updated")
    if order["status"] == body.status:
        return order
    update = {"status": body.status}
    if body.status == "delivered" and order["payment_method"] == "cod":
        update["payment_status"] = "paid"
    await db.orders.update_one({"order_id": order_id}, {
        "$set": update, "$push": {"status_history": {"status": body.status, "at": now_iso()}}})
    if body.status == "cancelled":
        await restore_order_stock(order, "Order cancelled by admin")
    saved = await db.orders.find_one({"order_id": order_id}, {"_id": 0})
    ntf.notify_order_bg(saved, body.status)
    return saved


# ---------- Admin: notifications ----------
@api.get("/admin/notifications/config")
async def admin_notifications_config(_: dict = Depends(require_admin)):
    cfg = ntf.twilio_config()
    return {"email_enabled": ntf.email_enabled(), "sms_enabled": cfg is not None,
            "from_name": ntf.EMAIL_FROM_NAME, "sms_from": cfg[2] if cfg else ""}


@api.get("/admin/notifications")
async def admin_notifications(limit: int = 200, _: dict = Depends(require_admin)):
    return await db.notifications.find({}, {"_id": 0, "html": 0}).sort("updated_at", -1).to_list(min(limit, 500))


@api.post("/admin/notifications/retry")
async def admin_notifications_retry(_: dict = Depends(require_admin)):
    return {"retried": await ntf.retry_pending()}


# ---------- Admin: purchases ----------
@api.get("/admin/purchases")
async def admin_purchases(_: dict = Depends(require_admin)):
    return await db.purchases.find({}, {"_id": 0}).sort([("purchase_date", -1), ("created_at", -1)]).to_list(1000)


@api.post("/admin/purchases")
async def admin_create_purchase(body: PurchaseIn, _: dict = Depends(require_admin)):
    if body.target_type == "product":
        target = await db.products.find_one_and_update(
            {"product_id": body.target_id}, {"$inc": {"stock": body.quantity}},
            projection={"_id": 0}, return_document=ReturnDocument.AFTER)
        unit, category = (target or {}).get("unit", ""), (target or {}).get("category", "")
    else:
        target = await db.supplies.find_one_and_update(
            {"supply_id": body.target_id}, {"$inc": {"quantity": body.quantity}},
            projection={"_id": 0}, return_document=ReturnDocument.AFTER)
        unit, category = (target or {}).get("unit", ""), (target or {}).get("category", "")
    if not target:
        raise HTTPException(status_code=404, detail="Item to restock was not found")
    doc = {"purchase_id": new_id("pur"), **body.model_dump(), "item_name": target["name"], "unit": unit,
           "category": category, "total_cost": round(body.quantity * body.unit_cost, 2), "created_at": now_iso()}
    await db.purchases.insert_one(doc)
    await log_movement(body.target_type, body.target_id, target["name"], body.quantity,
                       f"Purchase from {body.supplier}", body.invoice_no)
    return await db.purchases.find_one({"purchase_id": doc["purchase_id"]}, {"_id": 0})


# ---------- Admin: analytics ----------
@api.get("/admin/analytics")
async def admin_analytics(days: int = 30, _: dict = Depends(require_admin)):
    days = max(1, min(days, 365))
    start = (now() - timedelta(days=days - 1)).replace(hour=0, minute=0, second=0, microsecond=0)
    start_iso, start_date = start.isoformat(), start.date().isoformat()
    orders = await db.orders.find({"created_at": {"$gte": start_iso}}, {"_id": 0}).to_list(10000)
    purchases = await db.purchases.find({"purchase_date": {"$gte": start_date}}, {"_id": 0}).to_list(10000)
    valid = [o for o in orders if o["status"] != "cancelled"]

    daily = {(start + timedelta(days=i)).date().isoformat(): {"revenue": 0, "orders": 0, "cost": 0} for i in range(days)}
    top = defaultdict(lambda: {"quantity": 0, "revenue": 0})
    for o in valid:
        d = o["created_at"][:10]
        if d in daily:
            daily[d]["revenue"] += o["total"]
            daily[d]["orders"] += 1
        for it in o["items"]:
            top[it["name"]]["quantity"] += it["quantity"]
            top[it["name"]]["revenue"] += it["line_total"]
    for p in purchases:
        if p["purchase_date"] in daily:
            daily[p["purchase_date"]]["cost"] += p["total_cost"]

    revenue = round(sum(o["total"] for o in valid), 2)
    cost = round(sum(p["total_cost"] for p in purchases), 2)
    status_counts = defaultdict(int)
    for o in orders:
        status_counts[o["status"]] += 1
    products = await db.products.find({}, {"_id": 0}).to_list(1000)
    supplies = await db.supplies.find({}, {"_id": 0}).to_list(1000)
    low_stock = [{"name": p["name"], "kind": "product", "id": p["product_id"], "level": p["stock"], "unit": p["unit"]}
                 for p in products if p["stock"] <= p.get("low_stock_threshold", 15)]
    low_stock += [{"name": s["name"], "kind": "supply", "id": s["supply_id"], "level": s["quantity"], "unit": s["unit"]}
                  for s in supplies if s["quantity"] <= s.get("low_stock_threshold", 15)]
    return {
        "days": days, "revenue": revenue, "orders": len(valid), "purchase_cost": cost,
        "gross_margin": round(revenue - cost, 2),
        "avg_order_value": round(revenue / len(valid), 2) if valid else 0,
        "customers": len({o["user_id"] for o in valid}),
        "pending_orders": sum(1 for o in orders if o["status"] in ("placed", "confirmed", "packed")),
        "daily": [{"date": k, **v} for k, v in daily.items()],
        "top_products": sorted([{"name": k, **v} for k, v in top.items()], key=lambda x: -x["revenue"])[:6],
        "status_breakdown": [{"status": s, "count": status_counts.get(s, 0)} for s in ORDER_STATUSES],
        "low_stock": low_stock,
        "recent_orders": sorted(orders, key=lambda o: o["created_at"], reverse=True)[:6],
    }


app.include_router(api)


@app.middleware("http")
async def origin_guard(request: Request, call_next):
    origin = request.headers.get("origin")
    if request.method in ("POST", "PUT", "PATCH", "DELETE") and origin and origin not in ALLOWED_ORIGINS:
        return JSONResponse(status_code=403, content={"detail": "Origin not allowed"})
    return await call_next(request)


app.add_middleware(CORSMiddleware, allow_credentials=True, allow_origins=ALLOWED_ORIGINS,
                   allow_methods=["*"], allow_headers=["*"])


@app.on_event("startup")
async def startup():
    await create_indexes()
    await seed_admin()
    await seed_catalog()
    asyncio.create_task(ntf.retry_pending())


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
