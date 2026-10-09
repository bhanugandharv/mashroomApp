import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { api, formatErr, inr, fmtDate } from "@/lib/api";
import { useLang } from "@/lib/i18n";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StatusBadge, PaymentBadge } from "@/components/Badges";
import OrderTimeline from "@/components/OrderTimeline";
import { Loading } from "@/components/ProtectedRoute";
import { AdminHeader, LiveDot, btnGhost, th, td } from "@/pages/admin/AdminLayout";

const STATUSES = ["placed", "confirmed", "packed", "shipped", "delivered", "cancelled"];

const StatusSelect = ({ order, onChange }) => {
  const { t } = useLang();
  return (
    <Select value={order.status} disabled={order.status === "cancelled"} onValueChange={(v) => onChange(order, v)}>
      <SelectTrigger data-testid={`order-status-select-${order.order_number}`} className="h-8 w-36 bg-white text-xs"><SelectValue /></SelectTrigger>
      <SelectContent>
        {STATUSES.map((s) => <SelectItem key={s} value={s} data-testid={`order-status-option-${s}`}>{t(`st_${s}`)}</SelectItem>)}
      </SelectContent>
    </Select>
  );
};

const OrderDialog = ({ order, onClose }) => (
  <Dialog open={!!order} onOpenChange={(o) => !o && onClose()}>
    <DialogContent className="max-w-2xl" data-testid="admin-order-dialog">
      {order && (
        <>
          <DialogHeader><DialogTitle className="font-display">{order.order_number}</DialogTitle></DialogHeader>
          <OrderTimeline order={order} />
          <div className="grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-[#5A6567]">Customer</p>
              <p className="font-semibold">{order.address.full_name}</p>
              <p className="text-[#5A6567]">{order.customer_email}<br />{order.address.phone}<br />{order.address.line1}{order.address.line2 ? `, ${order.address.line2}` : ""}, {order.address.city}, {order.address.state} – {order.address.pincode}</p>
            </div>
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-[#5A6567]">Items</p>
              {order.items.map((i) => <p key={i.product_id} className="flex justify-between"><span>{i.name} × {i.quantity}</span><span>{inr(i.line_total)}</span></p>)}
              <p className="mt-2 flex justify-between border-t pt-2 font-semibold"><span>Total (incl. delivery {inr(order.delivery_fee)})</span><span>{inr(order.total)}</span></p>
            </div>
          </div>
        </>
      )}
    </DialogContent>
  </Dialog>
);

export default function AdminOrders() {
  const { t } = useLang();
  const [filter, setFilter] = useState("all");
  const [orders, setOrders] = useState(null);
  const [view, setView] = useState(null);

  const load = useCallback(() => api.get("/admin/orders", { params: { status: filter } }).then((r) => setOrders(r.data)), [filter]);
  useEffect(() => { load(); const id = setInterval(load, 15000); return () => clearInterval(id); }, [load]);

  const changeStatus = async (order, status) => {
    try {
      await api.patch(`/admin/orders/${order.order_id}/status`, { status });
      toast.success(`${order.order_number} → ${t(`st_${status}`)}`);
      load();
    } catch (err) { toast.error(formatErr(err)); }
  };

  return (
    <div data-testid="admin-orders">
      <AdminHeader title={t("adm_orders")} sub="Process and track customer orders"><LiveDot /></AdminHeader>
      <div className="mb-4 flex flex-wrap gap-2">
        {["all", ...STATUSES].map((s) => (
          <button key={s} data-testid={`orders-filter-${s}`} onClick={() => setFilter(s)}
            className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${filter === s ? "border-[#1B4D3E] bg-[#1B4D3E] text-white" : "border-[#E5E0D8] bg-white text-[#5A6567] hover:border-[#1B4D3E]"}`}>
            {s === "all" ? "All" : t(`st_${s}`)}
          </button>
        ))}
      </div>
      {orders === null ? <Loading /> : (
        <div className="overflow-x-auto rounded-xl border border-[#E5E0D8] bg-white">
          <table className="w-full min-w-[860px] text-sm" data-testid="admin-orders-table">
            <thead className="border-b border-[#E5E0D8] bg-[#FDFBF7]"><tr>
              {["Order", "Customer", "Date", "Items", "Total", "Payment", "Status", ""].map((h) => <th key={h} className={th}>{h}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-[#EEE9E1]">
              {orders.length === 0 && <tr><td colSpan={8} className="py-12 text-center text-[#5A6567]">No orders found.</td></tr>}
              {orders.map((o) => (
                <tr key={o.order_id} data-testid={`admin-order-row-${o.order_number}`} className="hover:bg-[#FDFBF7]">
                  <td className={`${td} font-semibold`}>{o.order_number}</td>
                  <td className={td}><p>{o.customer_name}</p><p className="text-xs text-[#5A6567]">{o.address.city}</p></td>
                  <td className={`${td} text-xs text-[#5A6567]`}>{fmtDate(o.created_at)}</td>
                  <td className={td}>{o.items.reduce((s, i) => s + i.quantity, 0)}</td>
                  <td className={`${td} font-semibold`}>{inr(o.total)}</td>
                  <td className={td}><div className="flex flex-col items-start gap-1"><span className="text-xs uppercase text-[#5A6567]">{o.payment_method}</span><PaymentBadge status={o.payment_status} /></div></td>
                  <td className={td}><div className="flex items-center gap-2"><StatusBadge status={o.status} /><StatusSelect order={o} onChange={changeStatus} /></div></td>
                  <td className={td}><button data-testid={`admin-order-view-${o.order_number}`} onClick={() => setView(o)} className={btnGhost}>View</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <OrderDialog order={view} onClose={() => setView(null)} />
    </div>
  );
}
