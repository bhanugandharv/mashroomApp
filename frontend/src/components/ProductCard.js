import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { useCart } from "@/context/CartContext";
import { useLang } from "@/lib/i18n";
import { inr } from "@/lib/api";

export const StockNote = ({ product }) => {
  const { t } = useLang();
  if (product.stock <= 0) return <span className="text-xs font-semibold text-[#DC2626]">{t("out_of_stock")}</span>;
  if (product.stock <= product.low_stock_threshold) return <span className="text-xs font-semibold text-[#B45309]">{t("low_stock", { n: product.stock })}</span>;
  return <span className="text-xs font-semibold text-[#16A34A]">{t("in_stock")}</span>;
};

export default function ProductCard({ product, index = 0 }) {
  const { add } = useCart();
  const { t, pn } = useLang();
  const out = product.stock <= 0;
  const onAdd = () => { add(product, 1); toast.success(`${pn(product)} — ${t("added")}`); };

  return (
    <div data-testid={`product-card-${product.product_id}`}
      className="fade-up bastar-card-top group flex flex-col overflow-hidden rounded-2xl border border-[#E5E0D8] bg-white shadow-[0_1px_2px_rgba(28,37,38,0.04)] transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-[0_18px_40px_-18px_rgba(27,77,62,0.35)]"
      style={{ animationDelay: `${index * 60}ms` }}>
      <Link to={`/product/${product.product_id}`} data-testid={`product-card-link-${product.product_id}`} className="relative block aspect-[4/3] overflow-hidden bg-[#F3EEE6]">
        <img src={product.image} alt={product.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
        <span className="absolute left-3 top-3 rounded-full bg-[#FDFBF7]/90 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-[#8B4513] backdrop-blur">
          {t(`cat_${product.category}`)}
        </span>
      </Link>
      <div className="flex flex-1 flex-col p-5">
        <Link to={`/product/${product.product_id}`} className="font-display text-lg font-semibold leading-snug text-[#1C2526] hover:text-[#1B4D3E]">{pn(product)}</Link>
        <p className="mt-1 text-xs text-[#5A6567]">{product.unit}</p>
        <div className="mt-auto flex items-end justify-between pt-5">
          <div>
            <div data-testid={`product-price-${product.product_id}`} className="font-display text-xl font-bold text-[#1B4D3E]">{inr(product.price)}</div>
            <StockNote product={product} />
          </div>
          <button data-testid={`add-to-cart-btn-${product.product_id}`} disabled={out} onClick={onAdd}
            className="inline-flex h-10 items-center gap-1.5 rounded-full bg-[#1B4D3E] px-4 text-sm font-semibold text-white transition-[background-color,transform] duration-200 hover:bg-[#143C30] active:scale-95 disabled:cursor-not-allowed disabled:bg-[#C9C3B8]">
            <Plus className="h-4 w-4" />{out ? t("out_of_stock") : t("add_to_cart")}
          </button>
        </div>
      </div>
    </div>
  );
}
