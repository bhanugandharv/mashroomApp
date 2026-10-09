import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Banknote, CreditCard, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { api, formatErr, inr } from "@/lib/api";
import { useLang } from "@/lib/i18n";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";

const FIELDS = [["full_name", "sm:col-span-2"], ["phone", ""], ["pincode", ""], ["line1", "sm:col-span-2"], ["line2", "sm:col-span-2"], ["city", ""], ["state", ""]];

const loadRazorpay = () => new Promise((resolve) => {
  if (window.Razorpay) return resolve(true);
  const s = document.createElement("script");
  s.src = "https://checkout.razorpay.com/v1/checkout.js";
  s.onload = () => resolve(true);
  s.onerror = () => resolve(false);
  document.body.appendChild(s);
});

const PayOption = ({ value, current, onSelect, icon: Icon, title, desc, disabled }) => (
  <button type="button" data-testid={`checkout-pay-${value}`} disabled={disabled} onClick={() => onSelect(value)}
    className={`flex w-full items-start gap-4 rounded-xl border p-4 text-left transition-colors ${current === value ? "border-[#1B4D3E] bg-[#1B4D3E]/5 ring-1 ring-[#1B4D3E]" : "border-[#E5E0D8] bg-white hover:border-[#1B4D3E]/50"} disabled:cursor-not-allowed disabled:opacity-55`}>
    <Icon className="mt-0.5 h-5 w-5 text-[#8B4513]" />
    <span><span className="block font-semibold">{title}</span><span className="text-sm text-[#5A6567]">{desc}</span></span>
  </button>
);

export default function Checkout() {
  const { t, pn } = useLang();
  const { items, subtotal, clear } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [cfg, setCfg] = useState(null);
  const [method, setMethod] = useState("cod");
  const [busy, setBusy] = useState(false);
  const [addr, setAddr] = useState({ full_name: user?.name || "", phone: user?.phone || "", line1: "", line2: "", city: "", state: "Chhattisgarh", pincode: "" });

  useEffect(() => { api.get("/payments/config").then((r) => setCfg(r.data)); }, []);
  useEffect(() => { if (items.length === 0 && !busy) navigate("/shop"); }, [items.length, busy, navigate]);

  const delivery = cfg && subtotal >= cfg.free_delivery_above ? 0 : cfg?.delivery_fee || 0;

  const payOnline = async (order) => {
    if (!(await loadRazorpay())) throw new Error("Could not load Razorpay");
    await new Promise((resolve, reject) => {
      const rz = new window.Razorpay({
        key: cfg.razorpay_key_id, amount: Math.round(order.total * 100), currency: "INR", name: "CG Mushroom",
        description: order.order_number, order_id: order.razorpay_order_id,
        prefill: { name: addr.full_name, email: user.email, contact: addr.phone },
        theme: { color: "#1B4D3E" },
        handler: (res) => api.post(`/orders/${order.order_id}/razorpay/verify`, res).then(resolve).catch(reject),
        modal: { ondismiss: () => reject(new Error("Payment was not completed. You can retry from your orders or choose COD.")) },
      });
      rz.open();
    });
  };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { data: order } = await api.post("/orders", {
        items: items.map((i) => ({ product_id: i.product_id, quantity: i.quantity })), address: addr, payment_method: method,
      });
      clear();
      if (method === "razorpay") {
        try { await payOnline(order); } catch (err) { toast.error(formatErr(err)); }
      }
      toast.success(`${t("order")} ${order.order_number}`);
      navigate(`/orders/${order.order_id}`);
    } catch (err) {
      toast.error(formatErr(err));
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-12 lg:px-8" data-testid="checkout-form">
      <div className="space-y-8 lg:col-span-7">
        <h1 className="text-4xl font-extrabold tracking-tight text-[#1B4D3E]">{t("checkout")}</h1>
        <section className="bastar-card-top rounded-2xl border border-[#E5E0D8] bg-white p-6 sm:p-8">
          <h2 className="mb-5 font-display text-lg font-semibold">{t("shipping_address")}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {FIELDS.map(([f, span]) => (
              <label key={f} className={`text-sm ${span}`}>
                <span className="mb-1.5 block font-medium text-[#5A6567]">{t(f)}</span>
                <input data-testid={`checkout-${f}-input`} required={f !== "line2"} value={addr[f]}
                  onChange={(e) => setAddr({ ...addr, [f]: e.target.value })}
                  maxLength={f === "pincode" ? 6 : undefined} minLength={f === "pincode" ? 6 : f === "phone" ? 10 : undefined}
                  className="h-11 w-full rounded-lg border border-[#E5E0D8] bg-[#FDFBF7] px-3.5 outline-none focus:border-[#1B4D3E] focus:ring-2 focus:ring-[#1B4D3E]/15" />
              </label>
            ))}
          </div>
        </section>
        <section className="rounded-2xl border border-[#E5E0D8] bg-white p-6 sm:p-8">
          <h2 className="mb-5 font-display text-lg font-semibold">{t("payment")}</h2>
          <div className="space-y-3">
            <PayOption value="cod" current={method} onSelect={setMethod} icon={Banknote} title={t("cod")} desc={t("cod_d")} />
            <PayOption value="razorpay" current={method} onSelect={setMethod} icon={CreditCard} title={t("online")}
              desc={cfg?.razorpay_enabled ? t("online_d") : t("online_off")} disabled={!cfg?.razorpay_enabled} />
          </div>
        </section>
      </div>
      <aside className="lg:col-span-5">
        <div className="sticky top-24 rounded-2xl border border-[#E5E0D8] bg-white p-6 sm:p-8" data-testid="checkout-summary">
          <h2 className="font-display text-lg font-semibold">{t("order_summary")}</h2>
          <div className="mt-5 space-y-4">
            {items.map((i) => (
              <div key={i.product_id} className="flex items-center gap-3">
                <img src={i.image} alt="" className="h-14 w-14 rounded-lg object-cover" />
                <div className="flex-1 text-sm"><p className="font-semibold">{pn(i)}</p><p className="text-[#5A6567]">{i.quantity} × {inr(i.price)}</p></div>
                <span className="text-sm font-semibold">{inr(i.quantity * i.price)}</span>
              </div>
            ))}
          </div>
          <div className="mt-6 space-y-2 border-t border-dashed border-[#E5E0D8] pt-5 text-sm">
            <div className="flex justify-between"><span className="text-[#5A6567]">{t("subtotal")}</span><span>{inr(subtotal)}</span></div>
            <div className="flex justify-between"><span className="text-[#5A6567]">{t("delivery")}</span><span data-testid="checkout-delivery">{delivery ? inr(delivery) : t("free")}</span></div>
            {cfg && <p className="text-xs text-[#8B4513]">{t("free_delivery_note", { n: inr(cfg.free_delivery_above) })}</p>}
            <div className="flex justify-between pt-3 font-display text-xl font-bold"><span>{t("total")}</span><span data-testid="checkout-total">{inr(subtotal + delivery)}</span></div>
          </div>
          <button data-testid="checkout-place-order-btn" disabled={busy || !cfg}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#1B4D3E] py-3.5 font-semibold text-white transition-[background-color,transform] hover:bg-[#143C30] active:scale-[0.98] disabled:opacity-60">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}{busy ? t("placing") : t("place_order")}
          </button>
        </div>
      </aside>
    </form>
  );
}
