import os
from core import db, hash_password, verify_password, new_id, now_iso

IMG = {
    "oyster": "https://images.unsplash.com/photo-1683543124242-3a29ea479949?crop=entropy&cs=srgb&fm=jpg&q=85&w=900",
    "button": "https://images.unsplash.com/photo-1552825898-07e419204683?crop=entropy&cs=srgb&fm=jpg&q=85&w=900",
    "shiitake": "https://images.unsplash.com/photo-1755108906864-fdaadb8ab5f1?crop=entropy&cs=srgb&fm=jpg&q=85&w=900",
    "king": "https://images.unsplash.com/photo-1760108273033-0d789ef53d70?crop=entropy&cs=srgb&fm=jpg&q=85&w=900",
    "dried": "https://images.unsplash.com/photo-1620582708067-9f6ba1e2fc1c?crop=entropy&cs=srgb&fm=jpg&q=85&w=900",
    "spawn": "https://images.unsplash.com/photo-1623491208688-82a9b3f4e5c9?crop=entropy&cs=srgb&fm=jpg&q=85&w=900",
    "milky": "https://images.unsplash.com/photo-1540221389915-9d98f2fd7733?crop=entropy&cs=srgb&fm=jpg&q=85&w=900",
}

PRODUCTS = [
    ("Fresh Oyster Mushroom", "ताज़ा ऑयस्टर मशरूम", "fresh", 60, "200 g pack", 80, "oyster", True,
     "Tender, delicately flavoured oyster mushrooms harvested fresh.", "ताज़ा तोड़े गए कोमल और स्वादिष्ट ऑयस्टर मशरूम।"),
    ("Button Mushroom", "बटन मशरूम", "fresh", 55, "200 g pack", 120, "button", True,
     "Classic white button mushrooms, perfect for curries and stir-fries.", "सब्ज़ी और करी के लिए उत्तम सफ़ेद बटन मशरूम।"),
    ("Milky Mushroom", "मिल्की मशरूम", "fresh", 70, "250 g pack", 40, "milky", True,
     "Firm, meaty milky mushrooms that hold their shape while cooking.", "पकाने पर भी आकार बनाए रखने वाले मज़बूत मिल्की मशरूम।"),
    ("Shiitake Mushroom", "शिटाके मशरूम", "fresh", 180, "200 g pack", 12, "shiitake", False,
     "Rich, earthy shiitake with a deep umami flavour.", "गहरे स्वाद वाले शिटाके मशरूम।"),
    ("King Oyster Mushroom", "किंग ऑयस्टर मशरूम", "fresh", 150, "250 g pack", 25, "king", False,
     "Thick-stemmed king oysters, great for grilling.", "मोटे तने वाले किंग ऑयस्टर, ग्रिल करने के लिए बढ़िया।"),
    ("Dried Oyster Mushroom", "सूखे ऑयस्टर मशरूम", "dried", 220, "100 g pack", 30, "dried", True,
     "Sun-dried oyster mushrooms with a long shelf life.", "लंबे समय तक चलने वाले धूप में सुखाए ऑयस्टर मशरूम।"),
    ("Oyster Mushroom Spawn", "ऑयस्टर मशरूम बीज (स्पॉन)", "spawn", 120, "1 kg bag", 50, "spawn", False,
     "Grain spawn for growing oyster mushrooms at home or on your farm.", "घर या खेत में ऑयस्टर मशरूम उगाने के लिए बीज।"),
]

SUPPLIES = [
    ("Wheat Straw Substrate", "substrate", "kg", 200),
    ("Oyster Grain Spawn (raw)", "spawn", "kg", 25),
    ("Polypropylene Grow Bags", "packaging", "pcs", 500),
    ("Retail Punnets 200 g", "packaging", "pcs", 10),
]


async def seed_admin():
    email = os.environ["ADMIN_EMAIL"].lower()
    password = os.environ["ADMIN_PASSWORD"]
    existing = await db.users.find_one({"email": email})
    if existing is None:
        await db.users.insert_one({
            "user_id": new_id("user"), "email": email, "name": "CG Mushroom Admin", "role": "admin",
            "password_hash": hash_password(password), "phone": "", "created_at": now_iso(),
        })
    elif not existing.get("password_hash") or not verify_password(password, existing["password_hash"]):
        await db.users.update_one({"email": email}, {"$set": {"password_hash": hash_password(password), "role": "admin"}})


async def seed_catalog():
    if await db.products.count_documents({}) == 0:
        docs = []
        for name, name_hi, cat, price, unit, stock, img, featured, desc, desc_hi in PRODUCTS:
            docs.append({
                "product_id": new_id("prod"), "name": name, "name_hi": name_hi, "category": cat,
                "price": price, "unit": unit, "stock": stock, "low_stock_threshold": 15,
                "image": IMG[img], "featured": featured, "is_active": True,
                "description": desc, "description_hi": desc_hi, "created_at": now_iso(),
            })
        await db.products.insert_many(docs)
    if await db.supplies.count_documents({}) == 0:
        await db.supplies.insert_many([
            {"supply_id": new_id("sup"), "name": n, "category": c, "unit": u, "quantity": q,
             "low_stock_threshold": 15 if u == "kg" else 50, "created_at": now_iso()}
            for n, c, u, q in SUPPLIES
        ])


async def create_indexes():
    await db.users.create_index("email", unique=True)
    await db.users.create_index("user_id", unique=True)
    await db.user_sessions.create_index("session_token")
    await db.login_attempts.create_index("identifier")
    await db.products.create_index("product_id", unique=True)
    await db.orders.create_index("order_id", unique=True)
    await db.orders.create_index("user_id")
    await db.supplies.create_index("supply_id", unique=True)
    await db.purchases.create_index("purchase_id", unique=True)
