import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { IndianRupee, ShoppingCart, Users, TrendingUp, AlertTriangle, Wallet } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar } from "recharts";
import { api, inr, fmtDate, fmtQty } from "@/lib/api";
import { useLang } from "@/lib/i18n";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/Badges";
import { Loading } from "@/components/ProtectedRoute";
import { AdminHeader, Panel, LiveDot } from "@/pages/admin/AdminLayout";

const Kpi = ({ icon: Icon, label, value, tone, testId }) => (
  <div data-testid={testId} className="bastar-card-top rounded-xl border border-[#E5E0D8] bg-white p-5">
    <div className="flex items-center justify-between">
      <span className="text-xs font-semibold uppercase tracking-wider text-[#5A6567]">{label}</span>
      <span className={`grid h-8 w-8 place-items-center rounded-lg ${tone}`}><Icon className="h-4 w-4" /></span>
    </div>
    <p className="mt-3 font-display text-2xl font-bold text-[#1C2526]">{value}</p>
  </div>
);

export default function AdminDashboard() {
  const { t } = useLang();
  const [days, setDays] = useState("30");
  const [d, setD] = useState(null);

  useEffect(() => {
    const load = () => api.get("/admin/analytics", { params: { days } }).then((r) => setD(r.data));
    load();
    const id = setInterval(load, 15000);
    return () => clearInterval(id);
  }, [days]);

  if (!d) return <Loading />;
  const chart = d.daily.map((x) => ({ ...x, label: x.date.slice(5) }));

  return (
    <div data-testid="admin-dashboard">
      <AdminHeader title={t("adm_dashboard")} sub="Sales, purchases and stock at a glance">
        <LiveDot />
        <Select value={days} onValueChange={setDays}>
          <SelectTrigger data-testid="dashboard-range-select" className="h-9 w-36 bg-white"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </AdminHeader>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi testId="kpi-revenue" icon={IndianRupee} label="Revenue" value={inr(d.revenue)} tone="bg-[#1B4D3E]/10 text-[#1B4D3E]" />
        <Kpi testId="kpi-orders" icon={ShoppingCart} label="Orders" value={d.orders} tone="bg-[#C86D3B]/10 text-[#C86D3B]" />
        <Kpi testId="kpi-purchase-cost" icon={Wallet} label="Purchase cost" value={inr(d.purchase_cost)} tone="bg-[#8B4513]/10 text-[#8B4513]" />
        <Kpi testId="kpi-margin" icon={TrendingUp} label="Revenue − cost" value={inr(d.gross_margin)} tone="bg-[#DAA520]/15 text-[#8A6A10]" />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Panel title="Revenue vs purchase cost" className="xl:col-span-2" testId="chart-revenue">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chart} margin={{ left: -10, right: 8 }}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#1B4D3E" stopOpacity={0.35} /><stop offset="100%" stopColor="#1B4D3E" stopOpacity={0} /></linearGradient>
                </defs>
                <CartesianGrid stroke="#EEE9E1" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#5A6567" }} tickLine={false} axisLine={false} minTickGap={16} />
                <YAxis tick={{ fontSize: 11, fill: "#5A6567" }} tickLine={false} axisLine={false} />
                <Tooltip formatter={(v) => inr(v)} />
                <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#1B4D3E" strokeWidth={2} fill="url(#rev)" />
                <Area type="monotone" dataKey="cost" name="Purchase cost" stroke="#C86D3B" strokeWidth={2} fill="transparent" strokeDasharray="4 3" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel title="Order pipeline" testId="panel-pipeline">
          <div className="space-y-2.5">
            {d.status_breakdown.map((s) => (
              <div key={s.status} className="flex items-center justify-between"><StatusBadge status={s.status} /><span className="font-display font-semibold" data-testid={`pipeline-${s.status}`}>{s.count}</span></div>
            ))}
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3 border-t border-[#E5E0D8] pt-4 text-sm">
            <div><p className="text-xs text-[#5A6567]">Avg order</p><p className="font-display font-bold">{inr(d.avg_order_value)}</p></div>
            <div><p className="flex items-center gap-1 text-xs text-[#5A6567]"><Users className="h-3 w-3" />Customers</p><p className="font-display font-bold">{d.customers}</p></div>
          </div>
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Panel title="Top products" testId="panel-top-products">
          {d.top_products.length === 0 ? <p className="text-sm text-[#5A6567]">No sales in this period yet.</p> : (
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={d.top_products} layout="vertical" margin={{ left: 10 }}>
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11, fill: "#1C2526" }} tickLine={false} axisLine={false} />
                  <Tooltip formatter={(v) => inr(v)} />
                  <Bar dataKey="revenue" fill="#8B4513" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Panel>
        <Panel title="Low stock alerts" testId="panel-low-stock"
          action={<Link to="/admin/inventory" className="text-xs font-semibold text-[#1B4D3E] hover:underline">Inventory</Link>}>
          {d.low_stock.length === 0 ? <p className="text-sm text-[#5A6567]">All items are well stocked.</p> : (
            <ul className="space-y-2">
              {d.low_stock.map((l) => (
                <li key={l.id} data-testid={`low-stock-${l.id}`} className="flex items-center gap-3 rounded-lg bg-[#FEF3C7]/60 px-3 py-2 text-sm">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-[#D97706]" />
                  <span className="flex-1 truncate">{l.name}</span>
                  <span className="font-semibold text-[#B45309]">{fmtQty(l.level)} {l.kind === "supply" ? l.unit : ""}</span>
                  <Link to={`/admin/purchases?type=${l.kind}&id=${l.id}`} data-testid={`reorder-${l.id}`} className="rounded-md bg-[#1B4D3E] px-2 py-1 text-xs font-semibold text-white">Reorder</Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title="Recent orders" testId="panel-recent-orders"
          action={<Link to="/admin/orders" className="text-xs font-semibold text-[#1B4D3E] hover:underline">All orders</Link>}>
          {d.recent_orders.length === 0 ? <p className="text-sm text-[#5A6567]">No orders yet.</p> : (
            <ul className="divide-y divide-[#EEE9E1]">
              {d.recent_orders.map((o) => (
                <li key={o.order_id} className="flex items-center gap-3 py-2.5 text-sm">
                  <div className="flex-1"><p className="font-semibold">{o.order_number}</p><p className="text-xs text-[#5A6567]">{o.customer_name} · {fmtDate(o.created_at)}</p></div>
                  <StatusBadge status={o.status} /><span className="font-semibold">{inr(o.total)}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
