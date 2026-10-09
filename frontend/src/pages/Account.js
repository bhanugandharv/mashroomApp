import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Package } from "lucide-react";
import { toast } from "sonner";
import { api, formatErr, inr, fmtDate } from "@/lib/api";
import { useLang } from "@/lib/i18n";
import { useAuth } from "@/context/AuthContext";
import { StatusBadge, PaymentBadge } from "@/components/Badges";
import { Loading } from "@/components/ProtectedRoute";

const Profile = () => {
  const { t } = useLang();
  const { user, setUser } = useAuth();
  const [form, setForm] = useState({ name: user.name || "", phone: user.phone || "" });
  const save = async (e) => {
    e.preventDefault();
    try { const { data } = await api.put("/auth/profile", form); setUser(data); toast.success("Saved"); }
    catch (err) { toast.error(formatErr(err)); }
  };
  return (
    <form onSubmit={save} className="bastar-card-top rounded-2xl border border-[#E5E0D8] bg-white p-6 sm:p-8" data-testid="profile-form">
      <div className="flex items-center gap-4">
        {user.picture ? <img src={user.picture} alt="" className="h-14 w-14 rounded-full object-cover" />
          : <span className="grid h-14 w-14 place-items-center rounded-full bg-[#1B4D3E] font-display text-xl font-bold text-white">{(user.name || "U")[0]}</span>}
        <div><p className="font-display text-lg font-semibold" data-testid="profile-name">{user.name}</p><p className="text-sm text-[#5A6567]" data-testid="profile-email">{user.email}</p></div>
      </div>
      <div className="mt-6 space-y-4">
        {["name", "phone"].map((k) => (
          <label key={k} className="block text-sm">
            <span className="mb-1.5 block font-medium text-[#5A6567]">{k === "name" ? t("full_name") : t("phone")}</span>
            <input data-testid={`profile-${k}-input`} value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })}
              className="h-11 w-full rounded-lg border border-[#E5E0D8] bg-[#FDFBF7] px-3.5 outline-none focus:border-[#1B4D3E]" />
          </label>
        ))}
        <button data-testid="profile-save-btn" className="rounded-full bg-[#1B4D3E] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#143C30]">{t("save")}</button>
      </div>
    </form>
  );
};

export default function Account() {
  const { t } = useLang();
  const [orders, setOrders] = useState(null);
  useEffect(() => { api.get("/orders/my").then((r) => setOrders(r.data)); }, []);

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-4xl font-extrabold tracking-tight text-[#1B4D3E] sm:text-5xl">{t("nav_account")}</h1>
      <div className="bastar-strip mt-4 w-40" />
      <div className="mt-10 grid gap-8 lg:grid-cols-12">
        <div className="lg:col-span-4"><Profile /></div>
        <section className="lg:col-span-8">
          <h2 className="mb-5 font-display text-xl font-semibold">{t("my_orders")}</h2>
          {orders === null ? <Loading /> : orders.length === 0 ? (
            <div data-testid="orders-empty" className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-[#E5E0D8] bg-white py-16 text-[#5A6567]">
              <Package className="h-8 w-8 text-[#C86D3B]" />{t("no_orders")}
              <Link to="/shop" className="font-semibold text-[#1B4D3E] hover:underline">{t("hero_cta")}</Link>
            </div>
          ) : (
            <div className="space-y-3" data-testid="orders-list">
              {orders.map((o) => (
                <Link key={o.order_id} to={`/orders/${o.order_id}`} data-testid={`order-row-${o.order_number}`}
                  className="group flex flex-wrap items-center gap-4 rounded-2xl border border-[#E5E0D8] bg-white p-5 transition-[border-color,box-shadow] hover:border-[#1B4D3E]/40 hover:shadow-md">
                  <div className="flex -space-x-3">
                    {o.items.slice(0, 3).map((i) => <img key={i.product_id} src={i.image} alt="" className="h-12 w-12 rounded-full border-2 border-white object-cover" />)}
                  </div>
                  <div className="min-w-[140px] flex-1">
                    <p className="font-display font-semibold">{o.order_number}</p>
                    <p className="text-xs text-[#5A6567]">{fmtDate(o.created_at)} · {o.items.length} {t("items")}</p>
                  </div>
                  <StatusBadge status={o.status} />
                  <PaymentBadge status={o.payment_status} />
                  <span className="font-display font-bold text-[#1B4D3E]">{inr(o.total)}</span>
                  <ChevronRight className="h-4 w-4 text-[#5A6567] transition-transform group-hover:translate-x-1" />
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
