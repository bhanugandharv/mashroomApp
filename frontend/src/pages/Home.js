import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Leaf, Sprout, Truck } from "lucide-react";
import { api } from "@/lib/api";
import { useLang } from "@/lib/i18n";
import ProductCard from "@/components/ProductCard";
import { useContent } from "@/context/ContentContext";

const HERO = "https://images.unsplash.com/photo-1735282260417-cb781d757604?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600";
const HERO2 = "https://images.unsplash.com/photo-1621455799534-deab8a1c1d89?crop=entropy&cs=srgb&fm=jpg&q=85&w=900";

const Feature = ({ icon: Icon, title, desc, tone, testId }) => (
  <div data-testid={testId} className={`fade-up flex items-start gap-4 rounded-2xl p-6 ${tone}`}>
    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/15"><Icon className="h-5 w-5" /></span>
    <div>
      <h3 className="font-display text-lg font-semibold">{title}</h3>
      <p className="mt-1 text-sm opacity-80">{desc}</p>
    </div>
  </div>
);

export default function Home() {
  const { t } = useLang();
  const { c, content } = useContent();
  const [featured, setFeatured] = useState([]);
  useEffect(() => { api.get("/products", { params: { featured: true } }).then((r) => setFeatured(r.data)); }, []);

  return (
    <div className="bastar-texture">
      <section className="mx-auto grid max-w-7xl gap-5 px-4 pb-16 pt-8 sm:px-6 lg:grid-cols-12 lg:px-8 lg:pt-12">
        <div className="fade-up relative min-h-[460px] overflow-hidden rounded-3xl lg:col-span-8" data-testid="home-hero">
          <img src={HERO} alt="Mushroom harvest" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0F2E23]/90 via-[#0F2E23]/60 to-transparent" />
          <div className="relative flex h-full flex-col justify-end p-8 sm:p-12">
            <span className="mb-4 inline-flex w-fit items-center gap-2 rounded-full border border-[#DAA520]/50 bg-[#0F2E23]/40 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#DAA520] backdrop-blur">
              <Leaf className="h-3.5 w-3.5" />{c("hero_eyebrow")}
            </span>
            <h1 className="max-w-xl text-4xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-6xl">{c("hero_title")}</h1>
            <p className="mt-5 max-w-lg text-base text-white/80">{c("hero_sub")}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/shop" data-testid="hero-shop-btn" className="inline-flex items-center gap-2 rounded-full bg-[#DAA520] px-6 py-3 font-semibold text-[#0F2E23] transition-[transform,background-color] duration-200 hover:-translate-y-0.5 hover:bg-[#E8B530]">
                {c("hero_cta")}<ArrowRight className="h-4 w-4" />
              </Link>
              <a href="#varieties" data-testid="hero-varieties-btn" className="inline-flex items-center rounded-full border border-white/40 px-6 py-3 font-semibold text-white transition-colors hover:bg-white/10">{c("hero_cta2")}</a>
            </div>
          </div>
          <div className="bastar-strip-light absolute inset-x-0 bottom-0" />
        </div>
        <div className="grid gap-5 lg:col-span-4">
          <div className="fade-up relative min-h-[180px] overflow-hidden rounded-3xl" style={{ animationDelay: "80ms" }}>
            <img src={HERO2} alt="Fresh mushrooms" className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#1C2526]/70 to-transparent" />
            <p className="absolute bottom-5 left-6 font-display text-xl font-semibold text-white">{c("tagline")}</p>
          </div>
          <Feature testId="feature-fresh" icon={Leaf} title={c("feat_fresh")} desc={c("feat_fresh_d")} tone="bg-[#1B4D3E] text-white" />
          <Feature testId="feature-spawn" icon={Sprout} title={c("feat_spawn")} desc={c("feat_spawn_d")} tone="bg-[#8B4513] text-white" />
          <Feature testId="feature-cod" icon={Truck} title={c("feat_cod")} desc={c("feat_cod_d")} tone="bg-[#F3E6D3] text-[#5A3A1A]" />
        </div>
      </section>

      <section id="varieties" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8B4513]">{t("featured_sub")}</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-[#1C2526] sm:text-4xl">{t("featured")}</h2>
            <div className="bastar-strip mt-4 w-40" />
          </div>
          <Link to="/shop" data-testid="home-view-all-link" className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#1B4D3E] hover:gap-2.5 transition-[gap]">
            {t("view_all")}<ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4" data-testid="featured-products">
          {featured.map((p, i) => <ProductCard key={p.product_id} product={p} index={i} />)}
        </div>
      </section>

      {content.about_enabled && (
        <section data-testid="about-section" className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
          <div className="bastar-card-top grid gap-8 rounded-3xl border border-[#E5E0D8] bg-white p-8 sm:p-12 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8B4513]">{c("hero_eyebrow")}</p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-[#1C2526] sm:text-4xl">{c("about_title")}</h2>
              <div className="bastar-strip mt-4 w-40" />
            </div>
            <p className="whitespace-pre-line text-base leading-relaxed text-[#5A6567] lg:col-span-8">{c("about_body")}</p>
          </div>
        </section>
      )}
    </div>
  );
}
