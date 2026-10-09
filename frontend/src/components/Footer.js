import { Link } from "react-router-dom";
import { MapPin, Phone, Mail } from "lucide-react";
import { Logo } from "@/components/Navbar";
import { useLang } from "@/lib/i18n";
import { useContent } from "@/context/ContentContext";
import { MessageCircle, Instagram, Facebook } from "lucide-react";

export default function Footer() {
  const { t } = useLang();
  const { c, contact } = useContent();
  const wa = (contact.whatsapp || "").replace(/\D/g, "");
  return (
    <footer className="relative mt-24 bg-[#0F2E23] text-[#E2ECE9]" data-testid="site-footer">
      <div className="bastar-strip-light" />
      <div className="bastar-texture-dark">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 md:grid-cols-12 lg:px-8">
          <div className="md:col-span-5">
            <Logo light />
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-[#E2ECE9]/75">{c("footer_about")}</p>
            <div className="mt-5 flex gap-3">
              {contact.instagram && <a data-testid="footer-instagram" href={contact.instagram} target="_blank" rel="noreferrer" className="text-[#E2ECE9]/70 hover:text-white"><Instagram className="h-5 w-5" /></a>}
              {contact.facebook && <a data-testid="footer-facebook" href={contact.facebook} target="_blank" rel="noreferrer" className="text-[#E2ECE9]/70 hover:text-white"><Facebook className="h-5 w-5" /></a>}
            </div>
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
              <li data-testid="footer-address" className="flex items-start gap-2.5"><MapPin className="mt-0.5 h-4 w-4 text-[#C86D3B]" />{contact.address || "Chhattisgarh, India"}</li>
              {contact.phone && <li data-testid="footer-phone" className="flex items-center gap-2.5"><Phone className="h-4 w-4 text-[#C86D3B]" /><a href={`tel:${contact.phone}`} className="hover:text-white">{contact.phone}</a></li>}
              {wa && <li data-testid="footer-whatsapp" className="flex items-center gap-2.5"><MessageCircle className="h-4 w-4 text-[#C86D3B]" /><a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer" className="hover:text-white">WhatsApp {contact.whatsapp}</a></li>}
              {contact.email && <li data-testid="footer-email" className="flex items-center gap-2.5"><Mail className="h-4 w-4 text-[#C86D3B]" /><a href={`mailto:${contact.email}`} className="hover:text-white">{contact.email}</a></li>}
            </ul>
          </div>
        </div>
        <div className="border-t border-white/10">
          <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-6 text-xs text-[#E2ECE9]/55 sm:flex-row sm:justify-between sm:px-6 lg:px-8">
            <span>© {new Date().getFullYear()} CG Mushroom. {c("tagline")}.</span>
            <span>Motifs inspired by Bastar tribal art</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
