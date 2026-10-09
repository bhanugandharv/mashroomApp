"""Backend regression tests for CG Mushroom e-commerce app."""
import os
import time
import uuid

import pytest
import requests

from datetime import date, timedelta
TODAY = date.today().isoformat()

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://cgmushroom-shop.preview.emergentagent.com").rstrip("/")

API = f"{BASE_URL}/api"
ORIGIN = BASE_URL
ADMIN_EMAIL = "admin@cgmushroom.in"
ADMIN_PASSWORD = "CGMadmin@2026"


def _session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json", "Origin": ORIGIN})
    return s


@pytest.fixture(scope="session")
def admin():
    s = _session()
    r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, f"Admin login failed: {r.status_code} {r.text}"
    assert r.json()["role"] == "admin"
    return s


@pytest.fixture(scope="session")
def customer():
    s = _session()
    email = f"TEST_cust_{uuid.uuid4().hex[:8]}@example.com"
    r = s.post(f"{API}/auth/register", json={"name": "TEST Customer", "email": email, "password": "pass1234"})
    assert r.status_code == 200, f"Register failed: {r.status_code} {r.text}"
    s.email = email
    return s


# ---------- Health & payments config ----------
def test_root():
    r = requests.get(f"{API}/")
    assert r.status_code == 200
    assert "CG Mushroom" in r.json()["message"]


def test_payments_config_razorpay_disabled():
    r = requests.get(f"{API}/payments/config")
    assert r.status_code == 200
    d = r.json()
    assert d["razorpay_enabled"] is False
    assert d["delivery_fee"] == 40
    assert d["free_delivery_above"] == 499


# ---------- Products catalog ----------
def test_list_products_seeded():
    r = requests.get(f"{API}/products")
    assert r.status_code == 200
    products = r.json()
    assert len(products) >= 3, "Expected seeded catalog"
    for p in products:
        assert "_id" not in p
        assert "product_id" in p


def test_products_filter_and_search():
    r = requests.get(f"{API}/products", params={"featured": "true"})
    assert r.status_code == 200
    assert all(p.get("featured") for p in r.json())
    r2 = requests.get(f"{API}/products", params={"category": "fresh"})
    assert r2.status_code == 200
    assert all(p["category"] == "fresh" for p in r2.json())


def test_get_product_404():
    r = requests.get(f"{API}/products/does-not-exist")
    assert r.status_code == 404


# ---------- Auth ----------
def test_register_duplicate_rejected(customer):
    r = customer.post(f"{API}/auth/register", json={"name": "x", "email": customer.email, "password": "pass1234"})
    assert r.status_code == 400


def test_auth_me_requires_login():
    r = requests.get(f"{API}/auth/me")
    assert r.status_code == 401


def test_login_bad_password():
    s = _session()
    r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": "wrongwrong"})
    assert r.status_code == 401


def test_auth_me_after_login(admin):
    r = admin.get(f"{API}/auth/me")
    assert r.status_code == 200
    assert r.json()["email"] == ADMIN_EMAIL


# ---------- Admin authorization ----------
def test_admin_guard_guest_401():
    r = requests.get(f"{API}/admin/products")
    assert r.status_code == 401


def test_admin_guard_customer_403(customer):
    r = customer.get(f"{API}/admin/products")
    assert r.status_code == 403


# ---------- Origin guard ----------
def test_origin_guard_rejects_other_origin():
    r = requests.post(f"{API}/auth/login",
                      json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
                      headers={"Origin": "https://evil.example.com"})
    assert r.status_code == 403


# ---------- Admin products CRUD ----------
@pytest.fixture(scope="session")
def test_product(admin):
    payload = {
        "name": "TEST_Shiitake", "name_hi": "टेस्ट", "category": "fresh",
        "description": "test", "price": 199.0, "unit": "250g", "stock": 10,
        "low_stock_threshold": 2, "image": "", "featured": False, "is_active": True
    }
    r = admin.post(f"{API}/admin/products", json=payload)
    assert r.status_code == 200, r.text
    p = r.json()
    assert p["name"] == "TEST_Shiitake"
    assert p["stock"] == 10
    yield p
    admin.delete(f"{API}/admin/products/{p['product_id']}")


def test_product_update(admin, test_product):
    payload = {**test_product, "price": 249.0, "stock": 15}
    # Strip extra fields that aren't in ProductIn
    payload = {k: payload[k] for k in ["name", "name_hi", "category", "description", "description_hi",
                                       "price", "unit", "stock", "low_stock_threshold", "image",
                                       "featured", "is_active"] if k in payload}
    payload.setdefault("description_hi", "")
    r = admin.put(f"{API}/admin/products/{test_product['product_id']}", json=payload)
    assert r.status_code == 200
    assert r.json()["price"] == 249.0


def test_stock_adjust_positive(admin, test_product):
    r = admin.patch(f"{API}/admin/products/{test_product['product_id']}/stock",
                    json={"delta": 5, "reason": "TEST add"})
    assert r.status_code == 200
    new_stock = r.json()["stock"]
    # bring it back
    admin.patch(f"{API}/admin/products/{test_product['product_id']}/stock",
                json={"delta": -5, "reason": "TEST revert"})
    assert new_stock >= 5


def test_stock_adjust_negative_below_zero_rejected(admin, test_product):
    r = admin.patch(f"{API}/admin/products/{test_product['product_id']}/stock",
                    json={"delta": -99999, "reason": "TEST overdraw"})
    assert r.status_code == 400


# ---------- Supplies ----------
@pytest.fixture(scope="session")
def test_supply(admin):
    r = admin.post(f"{API}/admin/supplies", json={
        "name": "TEST_Substrate", "category": "substrate", "unit": "kg",
        "quantity": 20, "low_stock_threshold": 5
    })
    assert r.status_code == 200, r.text
    s = r.json()
    yield s
    admin.delete(f"{API}/admin/supplies/{s['supply_id']}")


def test_supply_adjust(admin, test_supply):
    r = admin.patch(f"{API}/admin/supplies/{test_supply['supply_id']}/stock",
                    json={"delta": -5, "reason": "TEST use"})
    assert r.status_code == 200
    assert r.json()["quantity"] == 15


# ---------- Purchases ----------
def test_purchase_product_increments_stock(admin, test_product):
    before = admin.get(f"{API}/products/{test_product['product_id']}").json()["stock"]
    r = admin.post(f"{API}/admin/purchases", json={
        "supplier": "TEST_Supplier", "target_type": "product",
        "target_id": test_product["product_id"], "quantity": 3, "unit_cost": 50,
        "purchase_date": TODAY, "invoice_no": "TEST001", "notes": ""
    })
    assert r.status_code == 200, r.text
    assert r.json()["total_cost"] == 150.0
    after = admin.get(f"{API}/products/{test_product['product_id']}").json()["stock"]
    assert after == before + 3


def test_purchase_supply_increments(admin, test_supply):
    r = admin.post(f"{API}/admin/purchases", json={
        "supplier": "TEST_Supplier", "target_type": "supply",
        "target_id": test_supply["supply_id"], "quantity": 10, "unit_cost": 25,
        "purchase_date": TODAY, "invoice_no": "", "notes": ""
    })
    assert r.status_code == 200
    assert r.json()["total_cost"] == 250.0


# ---------- Orders flow ----------
def _address():
    return {"full_name": "TEST Buyer", "phone": "9876543210", "line1": "123 Lane",
            "line2": "", "city": "Raipur", "state": "Chhattisgarh", "pincode": "492001"}


def test_order_requires_login():
    r = requests.post(f"{API}/orders", json={
        "items": [{"product_id": "x", "quantity": 1}],
        "address": _address(), "payment_method": "cod"})
    assert r.status_code == 401


def test_order_razorpay_rejected_when_not_configured(customer, test_product):
    r = customer.post(f"{API}/orders", json={
        "items": [{"product_id": test_product["product_id"], "quantity": 1}],
        "address": _address(), "payment_method": "razorpay"})
    assert r.status_code == 400
    assert "not configured" in r.json()["detail"].lower()


def test_order_cod_full_flow(customer, admin, test_product):
    # fetch current stock
    current = admin.get(f"{API}/products/{test_product['product_id']}").json()
    stock_before = current["stock"]
    price = current["price"]
    qty = 2
    r = customer.post(f"{API}/orders", json={
        "items": [{"product_id": test_product["product_id"], "quantity": qty}],
        "address": _address(), "payment_method": "cod"})
    assert r.status_code == 200, r.text
    order = r.json()
    assert order["status"] == "placed"
    assert order["payment_status"] == "pending"
    expected_sub = round(price * qty, 2)
    assert order["subtotal"] == expected_sub
    expected_delivery = 0 if expected_sub >= 499 else 40
    assert order["delivery_fee"] == expected_delivery
    assert order["total"] == round(expected_sub + expected_delivery, 2)
    assert order["order_number"].startswith("CGM-")
    # stock decremented
    stock_after = admin.get(f"{API}/products/{test_product['product_id']}").json()["stock"]
    assert stock_after == stock_before - qty

    # cancel order -> restores stock
    cr = customer.post(f"{API}/orders/{order['order_id']}/cancel")
    assert cr.status_code == 200
    assert cr.json()["status"] == "cancelled"
    stock_restored = admin.get(f"{API}/products/{test_product['product_id']}").json()["stock"]
    assert stock_restored == stock_before


def test_order_insufficient_stock(customer, test_product):
    r = customer.post(f"{API}/orders", json={
        "items": [{"product_id": test_product["product_id"], "quantity": 99999}],
        "address": _address(), "payment_method": "cod"})
    assert r.status_code == 400
    assert "stock" in r.json()["detail"].lower()


def test_my_orders_lists(customer, test_product):
    customer.post(f"{API}/orders", json={
        "items": [{"product_id": test_product["product_id"], "quantity": 1}],
        "address": _address(), "payment_method": "cod"})
    r = customer.get(f"{API}/orders/my")
    assert r.status_code == 200
    assert len(r.json()) >= 1


def test_admin_order_status_delivery_marks_paid(admin, customer, test_product):
    r = customer.post(f"{API}/orders", json={
        "items": [{"product_id": test_product["product_id"], "quantity": 1}],
        "address": _address(), "payment_method": "cod"})
    assert r.status_code == 200
    order_id = r.json()["order_id"]
    for status in ["confirmed", "packed", "shipped", "delivered"]:
        s = admin.patch(f"{API}/admin/orders/{order_id}/status", json={"status": status})
        assert s.status_code == 200, s.text
    final = admin.get(f"{API}/orders/{order_id}").json()
    assert final["status"] == "delivered"
    assert final["payment_status"] == "paid"


def test_admin_order_cancel_restores(admin, customer, test_product):
    stock_before = admin.get(f"{API}/products/{test_product['product_id']}").json()["stock"]
    r = customer.post(f"{API}/orders", json={
        "items": [{"product_id": test_product["product_id"], "quantity": 1}],
        "address": _address(), "payment_method": "cod"})
    oid = r.json()["order_id"]
    s = admin.patch(f"{API}/admin/orders/{oid}/status", json={"status": "cancelled"})
    assert s.status_code == 200
    stock_after = admin.get(f"{API}/products/{test_product['product_id']}").json()["stock"]
    assert stock_after == stock_before


# ---------- Analytics ----------
def test_admin_analytics(admin):
    r = admin.get(f"{API}/admin/analytics", params={"days": 30})
    assert r.status_code == 200
    d = r.json()
    for key in ["revenue", "orders", "purchase_cost", "daily", "top_products",
                "status_breakdown", "low_stock", "recent_orders"]:
        assert key in d
    assert d["purchase_cost"] > 0  # purchases above created cost


def test_stock_movements(admin):
    r = admin.get(f"{API}/admin/stock-movements", params={"limit": 10})
    assert r.status_code == 200
    assert isinstance(r.json(), list)


# ---------- Site Content ----------
def test_content_public_get_defaults():
    r = requests.get(f"{API}/content")
    assert r.status_code == 200
    d = r.json()
    for key in ["texts", "contact", "announcement_enabled", "about_enabled"]:
        assert key in d, f"Missing {key}"


def test_content_put_requires_admin():
    r = requests.put(f"{API}/admin/content",
                     json={"texts": {}, "contact": {}, "announcement_enabled": False, "about_enabled": True},
                     headers={"Origin": ORIGIN, "Content-Type": "application/json"})
    assert r.status_code in (401, 403)


def test_content_put_customer_forbidden(customer):
    r = customer.put(f"{API}/admin/content",
                     json={"texts": {}, "contact": {}, "announcement_enabled": False, "about_enabled": True})
    assert r.status_code == 403


def test_content_admin_update_and_persist(admin):
    payload = {
        "texts": {
            "hero_title": {"en": "Test Headline EN", "hi": "टेस्ट शीर्षक"},
            "announcement": {"en": "Fresh harvest every Tuesday", "hi": "हर मंगलवार ताज़ा फ़सल"},
        },
        "contact": {
            "phone": "9876543210", "whatsapp": "9876543210",
            "email": "hello@example.com", "address": "Raipur farm"
        },
        "announcement_enabled": True,
        "about_enabled": True,
    }
    r = admin.put(f"{API}/admin/content", json=payload)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["announcement_enabled"] is True
    assert body["texts"]["hero_title"]["en"] == "Test Headline EN"
    assert body["contact"]["phone"] == "9876543210"
    # Public GET reflects
    r2 = requests.get(f"{API}/content")
    assert r2.status_code == 200
    d = r2.json()
    assert d["texts"]["hero_title"]["hi"] == "टेस्ट शीर्षक"
    assert d["texts"]["announcement"]["en"] == "Fresh harvest every Tuesday"
    assert d["contact"]["email"] == "hello@example.com"
    assert d["announcement_enabled"] is True
    assert d["about_enabled"] is True


# ---------- Change password + image upload (new features) ----------
def test_change_password_wrong_current(admin):
    r = admin.post(f"{API}/auth/change-password",
                   json={"current_password": "WRONG_PASS", "new_password": "whatever123"})
    assert r.status_code == 400
    assert "incorrect" in r.json()["detail"].lower()


def test_change_password_min_length(admin):
    r = admin.post(f"{API}/auth/change-password",
                   json={"current_password": ADMIN_PASSWORD, "new_password": "abc"})
    assert r.status_code == 422  # pydantic min_length=6


def test_change_password_roundtrip(admin):
    """Flip password to a temp, verify login, flip back. Restores seed credential."""
    tmp = "TempPass@999"
    r = admin.post(f"{API}/auth/change-password",
                   json={"current_password": ADMIN_PASSWORD, "new_password": tmp})
    assert r.status_code == 200, r.text
    # Verify login with the new password
    s2 = _session()
    r2 = s2.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": tmp})
    assert r2.status_code == 200, r2.text
    # Flip back using the authenticated session (admin cookies refreshed after change)
    r3 = admin.post(f"{API}/auth/change-password",
                    json={"current_password": tmp, "new_password": ADMIN_PASSWORD})
    assert r3.status_code == 200, r3.text
    # Verify original password works again
    s3 = _session()
    r4 = s3.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r4.status_code == 200, r4.text


# 1x1 transparent PNG
_PNG_1X1 = (
    b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
    b"\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\rIDATx\x9cc\xf8\xcf"
    b"\xc0\x00\x00\x00\x03\x00\x01\x5b\x7a\x8c\x1f\x00\x00\x00\x00IEND\xaeB`\x82"
)


def test_upload_image_requires_admin():
    r = requests.post(f"{API}/admin/upload-image",
                      files={"file": ("x.png", _PNG_1X1, "image/png")},
                      headers={"Origin": ORIGIN})
    assert r.status_code in (401, 403)


def test_upload_image_rejects_bad_ext(admin):
    r = admin.post(f"{API}/admin/upload-image",
                   files={"file": ("x.txt", b"hello", "text/plain")},
                   headers={"Content-Type": None, "Origin": ORIGIN})
    # requests will set a proper multipart Content-Type automatically when headers.Content-Type stripped
    assert r.status_code == 400


def test_upload_image_success_and_fetch(admin):
    # Need to drop the json Content-Type for multipart
    headers = {k: v for k, v in admin.headers.items() if k.lower() != "content-type"}
    r = requests.post(f"{API}/admin/upload-image",
                     files={"file": ("tiny.png", _PNG_1X1, "image/png")},
                     cookies=admin.cookies, headers=headers)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["url"].startswith("http") and "/api/files/" in body["url"]
    assert body["path"].startswith("cgmushroom/products/")
    # Fetch the file back
    g = requests.get(body["url"], headers={"Origin": ORIGIN})
    assert g.status_code == 200
    assert g.headers["content-type"] == "image/png"
    assert g.content == _PNG_1X1

