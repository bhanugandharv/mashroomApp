import { Link, NavLink, useNavigate } from "react-router-dom";
import { ShoppingBag, Sprout, User, LayoutDashboard, LogOut, Menu } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { useLang } from "@/lib/i18n";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";

export const Logo = ({ light = false }) => (
  <Link to="/" data-testid="nav-logo-link" className="flex items-center gap-2.5 group">
    <span className={`grid h-10 w-10 place-items-center rounded-xl ${light ? "bg-[#DAA520]/20 text-[#DAA520]" : "bg-[#1B4D3E] text-[#FDFBF7]"} transition-transform duration-300 group-hover:-rotate-6`}>
      <Sprout className="h-5 w-5" />
    </span>
    <span className="leading-tight">
      <span className={`block font-display text-lg font-bold tracking-tight ${light ? "text-[#FDFBF7]" : "text-[#1B4D3E]"}`}>CG Mushroom</span>
      <span className={`block text-[10px] font-semibold uppercase tracking-[0.2em] ${light ? "text-[#DAA520]" : "text-[#8B4513]"}`}>छत्तीसगढ़</span>
    </span>
  </Link>
);

export const LangToggle = ({ dark = false }) => {
  const { lang, setLang } = useLang();
  return (
    <div className={`flex rounded-full border p-0.5 text-xs font-semibold ${dark ? "border-white/20" : "border-[#E5E0D8] bg-white"}`} data-testid="lang-toggle">
      {["en", "hi"].map((l) => (
        <button key={l} data-testid={`lang-toggle-${l}`} onClick={() => setLang(l)}
          className={`rounded-full px-3 py-1 transition-colors duration-200 ${lang === l ? "bg-[#1B4D3E] text-white" : dark ? "text-[#E2ECE9]" : "text-[#5A6567] hover:text-[#1B4D3E]"}`}>
          {l === "en" ? "EN" : "हिं"}
        </button>
      ))}
    </div>
  );
};

const linkCls = ({ isActive }) =>
  `text-sm font-medium transition-colors duration-200 ${isActive ? "text-[#1B4D3E]" : "text-[#5A6567] hover:text-[#1B4D3E]"}`;

export default function Navbar() {
  const { count, setOpen } = useCart();
  const { user, logout } = useAuth();
  const { t } = useLang();
  const navigate = useNavigate();

  const links = (
    <>
      <NavLink to="/" end className={linkCls} data-testid="nav-home-link">{t("nav_home")}</NavLink>
      <NavLink to="/shop" className={linkCls} data-testid="nav-shop-link">{t("nav_shop")}</NavLink>
      {user && <NavLink to="/account" className={linkCls} data-testid="nav-account-link">{t("nav_account")}</NavLink>}
      {user?.role === "admin" && (
        <NavLink to="/admin" className={linkCls} data-testid="nav-admin-link">
          <span className="inline-flex items-center gap-1"><LayoutDashboard className="h-4 w-4" />{t("nav_admin")}</span>
        </NavLink>
      )}
    </>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-[#E5E0D8] bg-[#FDFBF7]/85 backdrop-blur-xl">
      <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Logo />
        <nav className="hidden items-center gap-8 md:flex">{links}</nav>
        <div className="flex items-center gap-2 sm:gap-3">
          <LangToggle />
          {user ? (
            <button data-testid="nav-logout-btn" onClick={async () => { await logout(); navigate("/"); }}
              className="hidden h-10 w-10 place-items-center rounded-full text-[#5A6567] transition-colors hover:bg-[#1B4D3E]/10 hover:text-[#1B4D3E] sm:grid" title={t("nav_logout")}>
              <LogOut className="h-4 w-4" />
            </button>
          ) : user === false ? (
            <Link to="/login" data-testid="nav-login-link" className="hidden items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium text-[#1B4D3E] hover:bg-[#1B4D3E]/10 sm:inline-flex">
              <User className="h-4 w-4" />{t("nav_login")}
            </Link>
          ) : null}
          <button data-testid="nav-cart-btn" onClick={() => setOpen(true)}
            className="relative grid h-10 w-10 place-items-center rounded-full bg-[#1B4D3E] text-white transition-transform duration-200 hover:scale-105 active:scale-95">
            <ShoppingBag className="h-4 w-4" />
            {count > 0 && (
              <span data-testid="nav-cart-count" className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-[#C86D3B] px-1 text-[10px] font-bold">{count}</span>
            )}
          </button>
          <Sheet>
            <SheetTrigger asChild>
              <button data-testid="nav-mobile-menu-btn" className="grid h-10 w-10 place-items-center rounded-full border border-[#E5E0D8] md:hidden"><Menu className="h-4 w-4" /></button>
            </SheetTrigger>
            <SheetContent side="left" className="bg-[#FDFBF7]">
              <SheetTitle className="sr-only">Menu</SheetTitle>
              <div className="mt-8 flex flex-col gap-5">
                {links}
                {user ? (
                  <button data-testid="nav-mobile-logout-btn" onClick={logout} className="text-left text-sm font-medium text-[#8B4513]">{t("nav_logout")}</button>
                ) : (
                  <NavLink to="/login" className={linkCls} data-testid="nav-mobile-login-link">{t("nav_login")}</NavLink>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
      <div className="bastar-strip opacity-40" style={{ height: 6, backgroundSize: "12px 6px" }} />
    </header>
  );
}
