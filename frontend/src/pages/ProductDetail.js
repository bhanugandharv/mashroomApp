import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Minus, Plus, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { api, inr } from "@/lib/api";
import { useLang } from "@/lib/i18n";
import { useCart } from "@/context/CartContext";
import { StockNote } from "@/components/ProductCard";
import { Loading } from "@/components/ProtectedRoute";

export default function ProductDetail() {
  const { id } = useParams();
  const { t, pn, pd } = useLang();
  const { add, setOpen } = useCart();
  const [p, setP] = useState(null);
  const [qty, setQty] = useState(1);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    const load = () => api.get(`/products/${id}`).then((r) => setP(r.data)).catch(() => setMissing(true));
    load();
    const timer = setInterval(load, 15000);
    return () => clearInterval(timer);
  }, [id]);

  if (missing) return <p className="py-24 text-center text-[#5A6567]" data-testid="product-not-found">Product not found.</p>;
  if (!p) return <Loading />;
  const out = p.stock <= 0;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <Link to="/shop" data-testid="product-back-link" className="inline-flex items-center gap-1.5 text-sm font-medium text-[#5A6567] hover:text-[#1B4D3E]">
        <ArrowLeft className="h-4 w-4" />{t("nav_shop")}
      </Link>
      <div className="mt-6 grid gap-10 lg:grid-cols-2 lg:gap-16">
        <div className="fade-up overflow-hidden rounded-3xl border border-[#E5E0D8] bg-[#F3EEE6]">
          <img src={p.image} alt={p.name} className="aspect-square w-full object-cover" />
        </div>
        <div className="fade-up flex flex-col" style={{ animationDelay: "80ms" }}>
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8B4513]">{t(`cat_${p.category}`)}</span>
          <h1 data-testid="product-detail-name" className="mt-3 text-4xl font-extrabold tracking-tight text-[#1B4D3E] sm:text-5xl">{pn(p)}</h1>
          <div className="bastar-strip mt-5 w-32" />
          <p className="mt-6 text-base leading-relaxed text-[#5A6567]">{pd(p)}</p>
          <div className="mt-8 flex items-baseline gap-3">
            <span data-testid="product-detail-price" className="font-display text-4xl font-bold text-[#1C2526]">{inr(p.price)}</span>
            <span className="text-sm text-[#5A6567]">{t("per")} {p.unit}</span>
          </div>
          <div className="mt-2" data-testid="product-detail-stock"><StockNote product={p} /></div>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <div className="flex items-center rounded-full border border-[#E5E0D8] bg-white">
              <button data-testid="product-qty-dec" onClick={() => setQty(Math.max(1, qty - 1))} className="grid h-12 w-12 place-items-center"><Minus className="h-4 w-4" /></button>
              <span data-testid="product-qty-value" className="w-8 text-center font-semibold">{qty}</span>
              <button data-testid="product-qty-inc" onClick={() => setQty(Math.min(p.stock, qty + 1))} className="grid h-12 w-12 place-items-center"><Plus className="h-4 w-4" /></button>
            </div>
            <button data-testid="product-add-to-cart-btn" disabled={out}
              onClick={() => { add(p, qty); toast.success(`${pn(p)} — ${t("added")}`); setOpen(true); }}
              className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-[#1B4D3E] px-8 font-semibold text-white transition-[background-color,transform] hover:bg-[#143C30] active:scale-[0.98] disabled:bg-[#C9C3B8] sm:flex-none">
              <ShoppingBag className="h-4 w-4" />{out ? t("out_of_stock") : t("add_to_cart")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
