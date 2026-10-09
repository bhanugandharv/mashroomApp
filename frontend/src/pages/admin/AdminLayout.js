import { NavLink, Outlet, Link } from "react-router-dom";
import { LayoutDashboard, ShoppingCart, Package, Boxes, Truck, Store, Bell, PenLine, KeyRound } from "lucide-react";
import { useLang } from "@/lib/i18n";
import { useAuth } from "@/context/AuthContext";
import { Logo, LangToggle } from "@/components/Navbar";

const NAV = [
  ["/admin", "adm_dashboard", LayoutDashboard, true],
  ["/admin/orders", "adm_orders", ShoppingCart],
  ["/admin/products", "adm_products", Package],
  ["/admin/inventory", "adm_inventory", Boxes],
  ["/admin/purchases", "adm_purchases", Truck],
  ["/admin/notifications", "adm_notifications", Bell],
  ["/admin/content", "adm_content", PenLine],
  ["/admin/account", "adm_account", KeyRound],
];

const itemCls = ({ isActive }) =>
  `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-200 whitespace-nowrap ${isActive ? "bg-[#DAA520]/15 text-[#DAA520]" : "text-[#E2ECE9]/75 hover:bg-white/5 hover:text-white"}`;

export default function AdminLayout() {
  const { t } = useLang();
  const { user } = useAuth();
  const links = NAV.map(([to, key, Icon, end]) => (
    <NavLink key={to} to={to} end={end} className={itemCls} data-testid={`admin-nav-${key.replace("adm_", "")}`}>
      <Icon className="h-4 w-4" />{t(key)}
    </NavLink>
  ));

  return (
    <div className="min-h-screen bg-[#F6F3EE] lg:flex">
      <aside className="bastar-texture-dark sticky top-0 hidden h-screen w-64 shrink-0 flex-col bg-[#0F2E23] p-5 lg:flex">
        <Logo light />
        <div className="bastar-strip-light my-6 opacity-70" />
        <nav className="flex flex-col gap-1">{links}</nav>
        <div className="mt-auto space-y-4">
          <LangToggle dark />
          <Link to="/" data-testid="admin-back-to-store" className="flex items-center gap-2 text-sm text-[#E2ECE9]/70 hover:text-white"><Store className="h-4 w-4" />{t("adm_store")}</Link>
          <p className="truncate text-xs text-[#E2ECE9]/50">{user?.email}</p>
        </div>
      </aside>
      <div className="bg-[#0F2E23] lg:hidden">
        <div className="flex items-center justify-between p-4"><Logo light /><LangToggle dark /></div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3">{links}
          <Link to="/" className="flex items-center gap-2 px-3 py-2.5 text-sm text-[#E2ECE9]/70"><Store className="h-4 w-4" /></Link>
        </nav>
      </div>
      <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8"><Outlet /></main>
    </div>
  );
}

export const AdminHeader = ({ title, sub, children }) => (
  <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
    <div>
      <h1 className="text-3xl font-bold tracking-tight text-[#1C2526]">{title}</h1>
      {sub && <p className="mt-1 text-sm text-[#5A6567]">{sub}</p>}
    </div>
    <div className="flex flex-wrap items-center gap-2">{children}</div>
  </div>
);

export const Panel = ({ title, action, children, className = "", testId }) => (
  <section data-testid={testId} className={`rounded-xl border border-[#E5E0D8] bg-white p-5 ${className}`}>
    {(title || action) && (
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-display text-base font-semibold">{title}</h2>{action}
      </div>
    )}
    {children}
  </section>
);

export const LiveDot = () => (
  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E7F6EC] px-2.5 py-1 text-xs font-semibold text-[#16A34A]" data-testid="live-indicator">
    <span className="live-dot h-1.5 w-1.5 rounded-full bg-[#16A34A]" />Live
  </span>
);

export const btn = "inline-flex items-center gap-1.5 rounded-lg bg-[#1B4D3E] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#143C30] disabled:opacity-60";
export const btnGhost = "inline-flex items-center gap-1.5 rounded-lg border border-[#E5E0D8] bg-white px-3 py-1.5 text-sm font-medium text-[#1C2526] transition-colors hover:border-[#1B4D3E] hover:text-[#1B4D3E]";
export const inputCls = "h-10 w-full rounded-lg border border-[#E5E0D8] bg-[#FDFBF7] px-3 text-sm outline-none focus:border-[#1B4D3E] focus:ring-2 focus:ring-[#1B4D3E]/15";
export const th = "px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-[#5A6567]";
export const td = "px-3 py-3 align-middle";
