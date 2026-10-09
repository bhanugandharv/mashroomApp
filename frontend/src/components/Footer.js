import { Link } from "react-router-dom";
import { MapPin, Phone, Mail } from "lucide-react";
import { Logo } from "@/components/Navbar";
import { useLang } from "@/lib/i18n";

export default function Footer() {
  const { t } = useLang();
  return (
    <footer className="relative mt-24 bg-[#0F2E23] text-[#E2ECE9]" data-testid="site-footer">
      <div className="bastar-strip-light" />
      <div className="bastar-texture-dark">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 md:grid-cols-12 lg:px-8">
          <div className="md:col-span-5">
            <Logo light />
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-[#E2ECE9]/75">{t("footer_about")}</p>
          </div>
          <div className="md:col-span-3">
            <h4 className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-[#DAA520]">{t("footer_shop")}</h4>
            <ul className="space-y-2.5 text-sm">
              {["fresh", "dried", "spawn"].map((c) => (
                <li key={c}><Link data-testid={`footer-cat-${c}`} to={`/shop?category=${c}`} className="text-[#E2ECE9]/80 transition-colors hover:text-white">{t(`cat_${c}`)}</Link></li>
              ))}
              <li><Link data-testid="footer-account-link" to="/account" className="text-[#E2ECE9]/80 hover:text-white">{t("my_orders")}</Link></li>
            </ul>
          </div>
          <div className="md:col-span-4">
            <h4 className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-[#DAA520]">{t("footer_contact")}</h4>
            <ul className="space-y-3 text-sm text-[#E2ECE9]/80">
              <li className="flex items-start gap-2.5"><MapPin className="mt-0.5 h-4 w-4 text-[#C86D3B]" />[Farm address], Chhattisgarh, India</li>
              <li className="flex items-center gap-2.5"><Phone className="h-4 w-4 text-[#C86D3B]" />[Phone number]</li>
              <li className="flex items-center gap-2.5"><Mail className="h-4 w-4 text-[#C86D3B]" />[Email address]</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/10">
          <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-6 text-xs text-[#E2ECE9]/55 sm:flex-row sm:justify-between sm:px-6 lg:px-8">
            <span>© {new Date().getFullYear()} CG Mushroom. {t("tagline")}.</span>
            <span>Motifs inspired by Bastar tribal art</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
