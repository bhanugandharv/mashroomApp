import os
import re
import asyncio
import ipaddress
import logging
from html import escape
from html.parser import HTMLParser
from urllib.parse import urlparse

import httpx

from core import db, new_id, now_iso

logger = logging.getLogger(__name__)

EMAIL_BASE_URL = "https://integrations.emergentagent.com"
EMAIL_KEY = os.environ.get("EMERGENT_EMAIL_KEY", "")
EMAIL_FROM_NAME = os.environ.get("EMAIL_FROM_NAME", "CG Mushroom")
EMAIL_REPLY_TO = os.environ.get("EMAIL_REPLY_TO")
APP_URL = os.environ.get("APP_URL", "")

EVENTS = {
    "placed": ("Order received", "We've received your order and will confirm it shortly."),
    "confirmed": ("Order confirmed", "Your order is confirmed and is being prepared fresh at our farm."),
    "shipped": ("Order shipped", "Your order is on its way to you."),
    "delivered": ("Order delivered", "Your order has been delivered. Enjoy your mushrooms!"),
}

# ---------- Email guardrail gate (from playbook) ----------
_SHORTENERS = ("bit.ly", "tinyurl.com", "t.co", "is.gd", "cutt.ly", "goo.gl", "rebrand.ly")
_CRED_ASK = ("reply with your password", "reply with the code", "send your password", "cvv",
             "send us your password", "enter your password below", "confirm your card number",
             "your full card number", "seed phrase", "recovery phrase", "verify your card",
             "social security number", "confirm your bank details")
_HOSTISH = re.compile(r"\b(?:https?://)?((?:[a-z0-9-]+\.)+[a-z]{2,})", re.I)


def _host_ok(host: str) -> bool:
    if not host or "xn--" in host:
        return False
    try:
        ipaddress.ip_address(host)
        return False
    except ValueError:
        pass
    return not any(host == s or host.endswith("." + s) for s in _SHORTENERS)


def _same_site(shown: str, real: str) -> bool:
    return shown == real or real.endswith("." + shown) or shown.endswith("." + real)


class _EmailScan(HTMLParser):
    def __init__(self):
        super().__init__()
        self.tags, self.urls, self.anchors = set(), [], []
        self._href, self._text = None, []

    def handle_starttag(self, tag, attrs):
        self.tags.add(tag.lower())
        self.urls += [v for k, v in attrs if k.lower() in ("href", "src") and v]
        if tag.lower() == "a":
            self._href = dict((k.lower(), v) for k, v in attrs).get("href")
            self._text = []

    def handle_data(self, data):
        if self._href is not None:
            self._text.append(data)

    def handle_endtag(self, tag):
        if tag.lower() == "a" and self._href is not None:
            self.anchors.append((self._href, "".join(self._text)))
            self._href, self._text = None, []


def _assert_safe_email(subject: str, html: str) -> None:
    scan = _EmailScan()
    scan.feed(html)
    if scan.tags & {"form", "input", "textarea", "select"}:
        raise ValueError("No forms or input fields in email (G2)")
    body = f"{subject}\n{html}".lower()
    for p in _CRED_ASK:
        if p in body:
            raise ValueError(f"Email asks the recipient for credentials: {p!r} (G2)")
    for url in scan.urls:
        low = url.strip().lower()
        if low.startswith(("mailto:", "tel:", "cid:", "#")):
            continue
        if not low.startswith("https://"):
            raise ValueError(f"Email links/assets must be absolute https: {url!r} (G3)")
        host = urlparse(low).hostname or ""
        if not _host_ok(host) or urlparse(low).username is not None:
            raise ValueError(f"Shortened, numeric-host or credential-bearing URL: {url!r} (G3)")
    for href, text in scan.anchors:
        real = urlparse(href.strip().lower()).hostname or ""
        if not real:
            continue
        for m in _HOSTISH.finditer(text):
            if not _same_site(m.group(1).lower(), real):
                raise ValueError(f"Anchor text {m.group(1)!r} != real link host {real!r} (G3)")


# ---------- Providers ----------
def email_enabled() -> bool:
    return bool(EMAIL_KEY)


def twilio_config():
    sid, token, frm = (os.environ.get("TWILIO_ACCOUNT_SID", ""), os.environ.get("TWILIO_AUTH_TOKEN", ""),
                       os.environ.get("TWILIO_FROM_NUMBER", ""))
    return (sid, token, frm) if sid and token and frm else None


def sms_enabled() -> bool:
    return twilio_config() is not None


async def send_email(to: str, subject: str, html: str) -> str:
    _assert_safe_email(subject, html)
    payload = {"to": [to], "subject": subject, "html": html, "from_name": EMAIL_FROM_NAME}
    if EMAIL_REPLY_TO:
        payload["contact_email"] = EMAIL_REPLY_TO
    async with httpx.AsyncClient(timeout=30) as http:
        resp = await http.post(f"{EMAIL_BASE_URL}/api/v1/email/send", headers={"X-Email-Key": EMAIL_KEY}, json=payload)
    if resp.status_code >= 400:
        try:
            msg = resp.json().get("message") or resp.json().get("error") or resp.text
        except ValueError:
            msg = resp.text
        raise RuntimeError(f"{resp.status_code}: {msg}")
    return resp.json().get("id", "")


def to_e164(phone: str) -> str:
    digits = re.sub(r"\D", "", phone or "")
    if len(digits) == 10:
        return f"+91{digits}"
    if len(digits) == 12 and digits.startswith("91"):
        return f"+{digits}"
    return f"+{digits}" if digits else ""


async def send_sms(to: str, body: str) -> str:
    from twilio.rest import Client
    sid, token, frm = twilio_config()
    client = Client(sid, token)
    msg = await asyncio.to_thread(client.messages.create, to=to, from_=frm, body=body)
    return msg.sid


# ---------- Templates ----------
def _order_link(order: dict) -> str:
    return f"{APP_URL}/orders/{order['order_id']}" if APP_URL.startswith("https://") else ""


def email_template(order: dict, event: str) -> tuple:
    title, line = EVENTS[event]
    rows = "".join(
        f'<tr><td style="padding:6px 0;border-bottom:1px solid #EEE9E1">{escape(it["name"])} x {it["quantity"]}</td>'
        f'<td align="right" style="padding:6px 0;border-bottom:1px solid #EEE9E1">&#8377;{it["line_total"]:.2f}</td></tr>'
        for it in order["items"])
    link = _order_link(order)
    track = (f'<p style="margin:20px 0"><a href="{link}" style="background:#1B4D3E;color:#fff;padding:10px 18px;'
             f'border-radius:8px;text-decoration:none;font-weight:bold">Track your order</a></p>') if link else \
        '<p style="margin:20px 0">Sign in to your CG Mushroom account to track this order.</p>'
    pay = "Cash on Delivery" if order["payment_method"] == "cod" else "Paid online"
    a = order["address"]
    html = (
        f'<table role="presentation" width="100%" style="max-width:560px;margin:0 auto;font-family:Arial,sans-serif;color:#1C2526">'
        f'<tr><td style="background:#1B4D3E;color:#fff;padding:18px 24px;border-radius:12px 12px 0 0">'
        f'<strong style="font-size:18px">{escape(EMAIL_FROM_NAME)}</strong></td></tr>'
        f'<tr><td style="padding:24px;background:#FDFBF7;border:1px solid #E5E0D8">'
        f'<h2 style="margin:0 0 8px">{title}</h2>'
        f'<p>Hi {escape(order.get("customer_name") or "there")}, {line}</p>'
        f'<p style="color:#5A6567">Order <strong>{escape(order["order_number"])}</strong> &middot; {pay}</p>'
        f'<table width="100%" style="border-collapse:collapse;font-size:14px">{rows}'
        f'<tr><td style="padding:8px 0">Delivery</td><td align="right" style="padding:8px 0">&#8377;{order["delivery_fee"]:.2f}</td></tr>'
        f'<tr><td style="padding:8px 0;font-weight:bold">Total</td><td align="right" style="padding:8px 0;font-weight:bold">&#8377;{order["total"]:.2f}</td></tr></table>'
        f'{track}'
        f'<p style="font-size:13px;color:#5A6567">Delivering to: {escape(a["full_name"])}, {escape(a["line1"])}, {escape(a["city"])} - {escape(a["pincode"])}</p>'
        f'<p style="font-size:12px;color:#888;margin-top:24px">Sent by {escape(EMAIL_FROM_NAME)}, Chhattisgarh. We never ask for your password or card details by email.</p>'
        f'</td></tr></table>')
    return f"{title} - {order['order_number']} | {EMAIL_FROM_NAME}", html


def sms_template(order: dict, event: str) -> str:
    title, line = EVENTS[event]
    return f"{EMAIL_FROM_NAME}: {title} ({order['order_number']}). {line} Total Rs {order['total']:.0f}."


def admin_email_template(order: dict) -> tuple:
    items = "".join(f'<li>{escape(it["name"])} x {it["quantity"]}</li>' for it in order["items"])
    a = order["address"]
    html = (f'<table role="presentation" width="100%"><tr><td style="padding:24px;font-family:Arial,sans-serif">'
            f'<h2>New order {escape(order["order_number"])}</h2>'
            f'<p>{escape(order.get("customer_name") or "")} ({escape(order["customer_email"])}) &middot; {escape(a["phone"])}</p>'
            f'<ul>{items}</ul><p><strong>Total: &#8377;{order["total"]:.2f}</strong> &middot; {escape(order["payment_method"].upper())}</p>'
            f'<p>{escape(a["line1"])}, {escape(a["city"])} - {escape(a["pincode"])}</p>'
            f'<p style="font-size:12px;color:#888">Sent by {escape(EMAIL_FROM_NAME)} admin alerts.</p></td></tr></table>')
    return f"New order {order['order_number']} - Rs {order['total']:.0f}", html


# ---------- Dispatch & log ----------
def _strip_html(html: str) -> str:
    text = re.sub(r"<[^>]+>", " ", html or "")
    return re.sub(r"\s+", " ", text).strip()


def _console_notice(kind: str, to: str, subject: str, body: str):
    bar = "=" * 64
    head = f"Subject: {subject}\n" if subject else ""
    logger.info("\n%s\n[%s NOTIFICATION — no provider key set, printed to console]\nTo: %s\n%s%s\n%s",
                bar, kind, to, head, body, bar)


async def _log(doc: dict):
    doc.setdefault("notification_id", new_id("ntf"))
    doc.setdefault("created_at", now_iso())
    doc["updated_at"] = now_iso()
    await db.notifications.update_one({"notification_id": doc["notification_id"]}, {"$set": doc}, upsert=True)
    return doc


async def deliver(doc: dict):
    try:
        if doc["channel"] == "email":
            if not email_enabled():
                _console_notice("EMAIL", doc["to"], doc.get("subject", ""), _strip_html(doc.get("html", "")))
                doc.update(status="logged", error="")
            else:
                doc.update(status="sent", provider_id=await send_email(doc["to"], doc["subject"], doc["html"]), error="")
        else:
            if not sms_enabled():
                _console_notice("SMS", doc["to"], "", doc.get("body", ""))
                doc.update(status="logged", error="")
            else:
                doc.update(status="sent", provider_id=await send_sms(doc["to"], doc["body"]), error="")
    except Exception as exc:
        logger.error("Notification %s failed: %s", doc.get("notification_id"), exc)
        doc.update(status="failed", error=str(exc)[:500])
    if doc["status"] in ("sent", "logged"):
        doc["sent_at"] = now_iso()
    await _log(doc)


async def notify_order(order: dict, event: str):
    if event not in EVENTS:
        return
    base = {"order_id": order["order_id"], "order_number": order["order_number"], "event": event, "recipient": "customer"}
    subject, html = email_template(order, event)
    jobs = [{**base, "channel": "email", "to": order["customer_email"], "subject": subject, "html": html}]
    phone = to_e164(order["address"].get("phone", ""))
    if phone:
        jobs.append({**base, "channel": "sms", "to": phone, "body": sms_template(order, event)})
    admin_email = os.environ.get("ADMIN_NOTIFY_EMAIL") or os.environ.get("ADMIN_EMAIL", "")
    if event == "placed" and admin_email:
        s, h = admin_email_template(order)
        jobs.append({**base, "recipient": "admin", "channel": "email", "to": admin_email, "subject": s, "html": h})
    await asyncio.gather(*(deliver(j) for j in jobs))


def notify_order_bg(order: dict, event: str):
    asyncio.create_task(notify_order(order, event))


async def retry_pending() -> int:
    pending = await db.notifications.find({"status": {"$in": ["queued", "failed"]}}, {"_id": 0}).to_list(500)
    for doc in pending:
        if (doc["channel"] == "email" and email_enabled()) or (doc["channel"] == "sms" and sms_enabled()):
            await deliver(doc)
    return len(pending)
