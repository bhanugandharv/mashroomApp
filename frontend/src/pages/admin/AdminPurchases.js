import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { api, formatErr, inr, fmtQty } from "@/lib/api";
import { useLang } from "@/lib/i18n";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loading } from "@/components/ProtectedRoute";
import { AdminHeader, btn, btnGhost, inputCls, th, td } from "@/pages/admin/AdminLayout";

const today = () => new Date().toISOString().slice(0, 10);

const PurchaseForm = ({ products, supplies, preset, onDone, onClose }) => {
  const [f, setF] = useState({ supplier: "", target_type: preset.type || "supply", target_id: preset.id || "", quantity: "", unit_cost: "", purchase_date: today(), invoice_no: "", notes: "" });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const options = f.target_type === "product"
    ? products.map((p) => ({ id: p.product_id, label: `${p.name} (${p.unit})` }))
    : supplies.map((s) => ({ id: s.supply_id, label: `${s.name} (${s.unit})` }));
  const total = (Number(f.quantity) || 0) * (Number(f.unit_cost) || 0);

  const submit = async (e) => {
    e.preventDefault();
    try {
      await api.post("/admin/purchases", { ...f, quantity: Number(f.quantity), unit_cost: Number(f.unit_cost) });
      toast.success("Purchase recorded and stock updated");
      onDone();
    } catch (err) { toast.error(formatErr(err)); }
  };

  return (
    <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2" data-testid="purchase-form">
      <label className="text-sm sm:col-span-2"><span className="mb-1 block text-[#5A6567]">Supplier</span>
        <input required data-testid="purchase-form-supplier" className={inputCls} value={f.supplier} onChange={set("supplier")} placeholder="Supplier name" /></label>
      <label className="text-sm"><span className="mb-1 block text-[#5A6567]">Restock</span>
        <select data-testid="purchase-form-type" className={inputCls} value={f.target_type} onChange={(e) => setF({ ...f, target_type: e.target.value, target_id: "" })}>
          <option value="supply">Farm supply (spawn, substrate, packaging)</option>
          <option value="product">Sellable product</option>
        </select></label>
      <label className="text-sm"><span className="mb-1 block text-[#5A6567]">Item</span>
        <select required data-testid="purchase-form-item" className={inputCls} value={f.target_id} onChange={set("target_id")}>
          <option value="">Select item</option>
          {options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
        </select></label>
      <label className="text-sm"><span className="mb-1 block text-[#5A6567]">Quantity</span>
        <input required type="number" min="0.01" step="any" data-testid="purchase-form-quantity" className={inputCls} value={f.quantity} onChange={set("quantity")} /></label>
      <label className="text-sm"><span className="mb-1 block text-[#5A6567]">Cost per unit (₹)</span>
        <input required type="number" min="0" step="any" data-testid="purchase-form-unit-cost" className={inputCls} value={f.unit_cost} onChange={set("unit_cost")} /></label>
      <label className="text-sm"><span className="mb-1 block text-[#5A6567]">Date</span>
        <input required type="date" data-testid="purchase-form-date" className={inputCls} value={f.purchase_date} onChange={set("purchase_date")} /></label>
      <label className="text-sm"><span className="mb-1 block text-[#5A6567]">Invoice no.</span>
        <input data-testid="purchase-form-invoice" className={inputCls} value={f.invoice_no} onChange={set("invoice_no")} /></label>
      <label className="text-sm sm:col-span-2"><span className="mb-1 block text-[#5A6567]">Notes</span>
        <input data-testid="purchase-form-notes" className={inputCls} value={f.notes} onChange={set("notes")} /></label>
      <div className="flex items-center justify-between sm:col-span-2">
        <span className="text-sm">Total: <b data-testid="purchase-form-total" className="font-display text-lg">{inr(total)}</b></span>
        <div className="flex gap-2"><button type="button" onClick={onClose} className={btnGhost}>Cancel</button><button data-testid="purchase-form-submit" className={btn}>Record purchase</button></div>
      </div>
    </form>
  );
};

export default function AdminPurchases() {
  const { t } = useLang();
  const [params, setParams] = useSearchParams();
  const [data, setData] = useState(null);
  const [open, setOpen] = useState(!!params.get("id"));
  const preset = { type: params.get("type"), id: params.get("id") };

  const load = useCallback(async () => {
    const [pu, p, s] = await Promise.all([api.get("/admin/purchases"), api.get("/admin/products"), api.get("/admin/supplies")]);
    setData({ purchases: pu.data, products: p.data, supplies: s.data });
  }, []);
  useEffect(() => { load(); }, [load]);

  const close = () => { setOpen(false); if (params.get("id")) setParams({}); };
  if (!data) return <Loading />;
  const totalSpend = data.purchases.reduce((s, p) => s + p.total_cost, 0);
  const byCat = data.purchases.reduce((acc, p) => ({ ...acc, [p.category]: (acc[p.category] || 0) + p.total_cost }), {});

  return (
    <div data-testid="admin-purchases">
      <AdminHeader title={t("adm_purchases")} sub="Record supplier purchases — stock is added automatically and costs feed analytics">
        <button data-testid="add-purchase-btn" onClick={() => setOpen(true)} className={btn}><Plus className="h-4 w-4" />Record purchase</button>
      </AdminHeader>
      <div className="mb-4 flex flex-wrap gap-3">
        <div className="bastar-card-top rounded-xl border border-[#E5E0D8] bg-white px-5 py-4"><p className="text-xs font-semibold uppercase tracking-wider text-[#5A6567]">Total spend</p><p data-testid="purchases-total-spend" className="font-display text-2xl font-bold">{inr(totalSpend)}</p></div>
        {Object.entries(byCat).map(([c, v]) => (
          <div key={c} className="rounded-xl border border-[#E5E0D8] bg-white px-5 py-4"><p className="text-xs font-semibold uppercase tracking-wider capitalize text-[#5A6567]">{c.replace("_", " ")}</p><p className="font-display text-xl font-bold text-[#8B4513]">{inr(v)}</p></div>
        ))}
      </div>
      <div className="overflow-x-auto rounded-xl border border-[#E5E0D8] bg-white">
        <table className="w-full min-w-[820px] text-sm" data-testid="admin-purchases-table">
          <thead className="border-b border-[#E5E0D8] bg-[#FDFBF7]"><tr>{["Date", "Supplier", "Item", "Qty", "Unit cost", "Total", "Invoice"].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-[#EEE9E1]">
            {data.purchases.length === 0 && <tr><td colSpan={7} className="py-12 text-center text-[#5A6567]">No purchases recorded yet.</td></tr>}
            {data.purchases.map((p) => (
              <tr key={p.purchase_id} data-testid={`purchase-row-${p.purchase_id}`}>
                <td className={td}>{p.purchase_date}</td>
                <td className={`${td} font-semibold`}>{p.supplier}</td>
                <td className={td}><p>{p.item_name}</p><p className="text-xs capitalize text-[#5A6567]">{p.target_type} · {p.category.replace("_", " ")}</p></td>
                <td className={td}>{fmtQty(p.quantity)} {p.target_type === "supply" ? p.unit : ""}</td>
                <td className={td}>{inr(p.unit_cost)}</td>
                <td className={`${td} font-semibold`}>{inr(p.total_cost)}</td>
                <td className={`${td} text-[#5A6567]`}>{p.invoice_no || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : close())}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle className="font-display">Record supplier purchase</DialogTitle></DialogHeader>
          {open && <PurchaseForm products={data.products} supplies={data.supplies} preset={preset} onClose={close} onDone={() => { close(); load(); }} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
