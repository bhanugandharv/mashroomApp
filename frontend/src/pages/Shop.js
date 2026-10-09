import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Search } from "lucide-react";
import { api } from "@/lib/api";
import { useLang } from "@/lib/i18n";
import ProductCard from "@/components/ProductCard";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loading } from "@/components/ProtectedRoute";

const CATS = ["all", "fresh", "dried", "spawn", "value_added"];

export default function Shop() {
  const { t } = useLang();
  const [params, setParams] = useSearchParams();
  const category = params.get("category") || "all";
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("default");
  const [products, setProducts] = useState(null);

  useEffect(() => {
    const load = () => api.get("/products", { params: { category } }).then((r) => setProducts(r.data));
    load();
    const id = setInterval(load, 20000);
    return () => clearInterval(id);
  }, [category]);

  const shown = useMemo(() => {
    let list = (products || []).filter((p) => !q || `${p.name} ${p.name_hi}`.toLowerCase().includes(q.toLowerCase()));
    if (sort === "low") list = [...list].sort((a, b) => a.price - b.price);
    if (sort === "high") list = [...list].sort((a, b) => b.price - a.price);
    return list;
  }, [products, q, sort]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8B4513]">{t("tagline")}</p>
      <h1 className="mt-2 text-4xl font-extrabold tracking-tight text-[#1B4D3E] sm:text-5xl">{t("nav_shop")}</h1>
      <div className="bastar-strip mt-4 w-48" />

      <div className="mt-10 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2" data-testid="shop-category-filters">
          {CATS.map((c) => (
            <button key={c} data-testid={`shop-cat-${c}`} onClick={() => setParams(c === "all" ? {} : { category: c })}
              className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors duration-200 ${category === c ? "border-[#1B4D3E] bg-[#1B4D3E] text-white" : "border-[#E5E0D8] bg-white text-[#5A6567] hover:border-[#1B4D3E] hover:text-[#1B4D3E]"}`}>
              {t(`cat_${c}`)}
            </button>
          ))}
        </div>
        <div className="flex gap-3">
          <div className="relative flex-1 lg:w-72">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5A6567]" />
            <input data-testid="shop-search-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("search")}
              className="h-11 w-full rounded-full border border-[#E5E0D8] bg-white pl-10 pr-4 text-sm outline-none focus:border-[#1B4D3E] focus:ring-2 focus:ring-[#1B4D3E]/15" />
          </div>
          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger data-testid="shop-sort-select" className="h-11 w-44 rounded-full bg-white"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="default">{t("sort_default")}</SelectItem>
              <SelectItem value="low">{t("sort_low")}</SelectItem>
              <SelectItem value="high">{t("sort_high")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {products === null ? <Loading /> : shown.length === 0 ? (
        <p data-testid="shop-empty" className="py-24 text-center text-[#5A6567]">{t("no_products")}</p>
      ) : (
        <div data-testid="shop-product-grid" className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {shown.map((p, i) => <ProductCard key={p.product_id} product={p} index={i} />)}
        </div>
      )}
    </div>
  );
}
