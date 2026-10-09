import { createContext, useContext, useState, useCallback } from "react";

const dict = {
  en: {
    tagline: "Fresh from Chhattisgarh's farms",
    nav_shop: "Shop", nav_home: "Home", nav_account: "My Account", nav_admin: "Admin", nav_login: "Login", nav_logout: "Logout",
    hero_eyebrow: "Grown in Chhattisgarh",
    hero_title: "Farm-fresh mushrooms, harvested for your kitchen",
    hero_sub: "Oyster, button, milky and more — grown by our farm, packed fresh and delivered to your door.",
    hero_cta: "Shop mushrooms", hero_cta2: "View varieties",
    feat_fresh: "Harvested fresh", feat_fresh_d: "Picked and packed close to dispatch.",
    feat_spawn: "Spawn for growers", feat_spawn_d: "Start your own mushroom bed with our spawn.",
    feat_cod: "Cash on Delivery", feat_cod_d: "Pay when your order arrives.",
    featured: "Our varieties", featured_sub: "This week's harvest from the farm", view_all: "View all",
    cat_all: "All", cat_fresh: "Fresh", cat_dried: "Dried", cat_spawn: "Spawn", cat_value_added: "Value-added",
    search: "Search mushrooms...", sort: "Sort", sort_default: "Featured", sort_low: "Price: low to high", sort_high: "Price: high to low",
    add_to_cart: "Add to cart", added: "Added to cart", out_of_stock: "Out of stock", in_stock: "In stock", low_stock: "Only {n} left",
    qty: "Quantity", per: "per", no_products: "No mushrooms match your search.",
    cart: "Your cart", cart_empty: "Your cart is empty", subtotal: "Subtotal", delivery: "Delivery", free: "Free", total: "Total",
    checkout: "Checkout", continue_shopping: "Continue shopping", free_delivery_note: "Free delivery on orders above {n}",
    shipping_address: "Delivery address", full_name: "Full name", phone: "Phone", line1: "House / street", line2: "Area / landmark",
    city: "City", state: "State", pincode: "Pincode", payment: "Payment method", cod: "Cash on Delivery", cod_d: "Pay in cash or UPI when your order arrives",
    online: "Pay online (Razorpay)", online_d: "UPI, cards, net banking", online_off: "Online payment is not configured yet",
    place_order: "Place order", placing: "Placing order...", order_summary: "Order summary",
    login_title: "Welcome back", login_sub: "Sign in to track your orders", email: "Email", password: "Password",
    sign_in: "Sign in", google: "Continue with Google", no_account: "New here?", create_account: "Create an account",
    register_title: "Create your account", register_sub: "Order fresh mushrooms in a few taps", have_account: "Already have an account?", or: "or",
    my_orders: "My orders", profile: "Profile", save: "Save", no_orders: "You haven't placed any orders yet.",
    order: "Order", placed_on: "Placed on", items: "Items", track: "Track order", cancel_order: "Cancel order", payment_status: "Payment",
    st_placed: "Placed", st_confirmed: "Confirmed", st_packed: "Packed", st_shipped: "Shipped", st_delivered: "Delivered", st_cancelled: "Cancelled",
    pay_pending: "Pending", pay_paid: "Paid", pay_failed: "Failed",
    about_title: "About our farm", about_body: "CG Mushroom is a family-run mushroom farm in Chhattisgarh. We grow oyster, button and milky mushrooms in clean, climate-controlled sheds and harvest every morning so your order reaches you at peak freshness. We also supply quality spawn and guidance to new growers across the state.",
    footer_about: "A local mushroom farm from Chhattisgarh, bringing fresh harvests and grower supplies to homes and kitchens.",
    footer_shop: "Shop", footer_help: "Help", footer_contact: "Contact",
    adm_dashboard: "Dashboard", adm_orders: "Orders", adm_products: "Products", adm_inventory: "Inventory", adm_purchases: "Purchases", adm_notifications: "Notifications", adm_content: "Site Content", adm_store: "Back to store",
  },
  hi: {
    tagline: "छत्तीसगढ़ के खेतों से ताज़ा",
    nav_shop: "दुकान", nav_home: "होम", nav_account: "मेरा खाता", nav_admin: "एडमिन", nav_login: "लॉगिन", nav_logout: "लॉगआउट",
    hero_eyebrow: "छत्तीसगढ़ में उगाए गए",
    hero_title: "खेत से ताज़ा मशरूम, आपकी रसोई के लिए",
    hero_sub: "ऑयस्टर, बटन, मिल्की और भी — हमारे फार्म में उगाए, ताज़ा पैक करके आपके घर तक।",
    hero_cta: "मशरूम खरीदें", hero_cta2: "किस्में देखें",
    feat_fresh: "ताज़ा तोड़े गए", feat_fresh_d: "भेजने से ठीक पहले तोड़े और पैक किए गए।",
    feat_spawn: "किसानों के लिए बीज", feat_spawn_d: "हमारे स्पॉन से अपनी मशरूम खेती शुरू करें।",
    feat_cod: "कैश ऑन डिलीवरी", feat_cod_d: "ऑर्डर आने पर भुगतान करें।",
    featured: "हमारी किस्में", featured_sub: "इस हफ़्ते की फार्म फ़सल", view_all: "सभी देखें",
    cat_all: "सभी", cat_fresh: "ताज़ा", cat_dried: "सूखे", cat_spawn: "बीज (स्पॉन)", cat_value_added: "मूल्य संवर्धित",
    search: "मशरूम खोजें...", sort: "क्रम", sort_default: "विशेष", sort_low: "कीमत: कम से ज़्यादा", sort_high: "कीमत: ज़्यादा से कम",
    add_to_cart: "कार्ट में डालें", added: "कार्ट में जोड़ा गया", out_of_stock: "स्टॉक में नहीं", in_stock: "स्टॉक में", low_stock: "केवल {n} बचे",
    qty: "मात्रा", per: "प्रति", no_products: "आपकी खोज से कोई मशरूम नहीं मिला।",
    cart: "आपका कार्ट", cart_empty: "आपका कार्ट खाली है", subtotal: "उप-योग", delivery: "डिलीवरी", free: "मुफ़्त", total: "कुल",
    checkout: "चेकआउट", continue_shopping: "खरीदारी जारी रखें", free_delivery_note: "{n} से ऊपर के ऑर्डर पर मुफ़्त डिलीवरी",
    shipping_address: "डिलीवरी पता", full_name: "पूरा नाम", phone: "फ़ोन", line1: "मकान / गली", line2: "क्षेत्र / लैंडमार्क",
    city: "शहर", state: "राज्य", pincode: "पिनकोड", payment: "भुगतान का तरीका", cod: "कैश ऑन डिलीवरी", cod_d: "ऑर्डर आने पर नकद या UPI से भुगतान करें",
    online: "ऑनलाइन भुगतान (Razorpay)", online_d: "UPI, कार्ड, नेट बैंकिंग", online_off: "ऑनलाइन भुगतान अभी चालू नहीं है",
    place_order: "ऑर्डर करें", placing: "ऑर्डर हो रहा है...", order_summary: "ऑर्डर सारांश",
    login_title: "फिर से स्वागत है", login_sub: "अपने ऑर्डर ट्रैक करने के लिए साइन इन करें", email: "ईमेल", password: "पासवर्ड",
    sign_in: "साइन इन", google: "Google से जारी रखें", no_account: "नए हैं?", create_account: "खाता बनाएं",
    register_title: "अपना खाता बनाएं", register_sub: "कुछ ही टैप में ताज़ा मशरूम मंगाएं", have_account: "पहले से खाता है?", or: "या",
    my_orders: "मेरे ऑर्डर", profile: "प्रोफ़ाइल", save: "सहेजें", no_orders: "आपने अभी तक कोई ऑर्डर नहीं किया है।",
    order: "ऑर्डर", placed_on: "ऑर्डर की तारीख", items: "सामान", track: "ऑर्डर ट्रैक करें", cancel_order: "ऑर्डर रद्द करें", payment_status: "भुगतान",
    st_placed: "ऑर्डर हुआ", st_confirmed: "पुष्टि हुई", st_packed: "पैक हुआ", st_shipped: "भेजा गया", st_delivered: "पहुँचा दिया", st_cancelled: "रद्द",
    pay_pending: "बाकी", pay_paid: "भुगतान हुआ", pay_failed: "विफल",
    about_title: "हमारे फार्म के बारे में", about_body: "CG Mushroom छत्तीसगढ़ का एक पारिवारिक मशरूम फार्म है। हम साफ़, नियंत्रित वातावरण वाले शेड में ऑयस्टर, बटन और मिल्की मशरूम उगाते हैं और हर सुबह फ़सल तोड़ते हैं ताकि आपका ऑर्डर पूरी ताज़गी के साथ पहुँचे। हम नए किसानों को अच्छी गुणवत्ता का स्पॉन और मार्गदर्शन भी देते हैं।",
    footer_about: "छत्तीसगढ़ का एक स्थानीय मशरूम फार्म, जो ताज़ा फ़सल और खेती की सामग्री घरों और रसोई तक पहुँचाता है।",
    footer_shop: "दुकान", footer_help: "सहायता", footer_contact: "संपर्क",
    adm_dashboard: "डैशबोर्ड", adm_orders: "ऑर्डर", adm_products: "उत्पाद", adm_inventory: "इन्वेंटरी", adm_purchases: "खरीद", adm_notifications: "सूचनाएं", adm_content: "साइट सामग्री", adm_store: "दुकान पर वापस",
  },
};

const LangContext = createContext(null);

export function LangProvider({ children }) {
  const [lang, setLangState] = useState(() => localStorage.getItem("cgm_lang") || "en");
  const setLang = (l) => { localStorage.setItem("cgm_lang", l); setLangState(l); };
  const t = useCallback((key, vars) => {
    let s = dict[lang][key] ?? dict.en[key] ?? key;
    if (vars) Object.entries(vars).forEach(([k, v]) => { s = s.replace(`{${k}}`, v); });
    return s;
  }, [lang]);
  const pn = useCallback((p) => (lang === "hi" && p?.name_hi ? p.name_hi : p?.name), [lang]);
  const pd = useCallback((p) => (lang === "hi" && p?.description_hi ? p.description_hi : p?.description), [lang]);
  return <LangContext.Provider value={{ lang, setLang, t, pn, pd }}>{children}</LangContext.Provider>;
}

export const useLang = () => useContext(LangContext);
