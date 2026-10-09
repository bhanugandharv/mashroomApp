import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { Plus, SlidersHorizontal, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api, formatErr, fmtDate, fmtQty } from "@/lib/api";
import { useLang } from "@/lib/i18n";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StockBadge } from "@/components/Badges";
import { Loading } from "@/components/ProtectedRoute";
import { AdminHeader, Panel, LiveDot, btn, btnGhost, inputCls, th, td } from "@/pages/admin/AdminLayout";

const AdjustForm = ({ target, onDone }) => {
  const [delta, setDelta] = useState("");
  const [reason, setReason] = useState("");
  const submit = async (e) => {
    e.preventDefault();
    const url = target.kind === "product" ? `/admin/products/${target.id}/stock` : `/admin/supplies/${target.id}/stock`;
    try { await api.patch(url, { delta: Number(delta), reason: reason || "Manual adjustment" }); toast.success("Stock updated"); onDone(); }
    catch (err) { toast.error(formatErr(err)); }
  };
  return (
    <form onSubmit={submit} className="space-y-3" data-testid="adjust-stock-form">
      <p className="text-sm text-[#5A6567]">Current level: <b>{fmtQty(target.level)} {target.unit}</b>. Use a negative number to reduce (e.g. spoilage, used in production).</p>
      <input required type="number" step="any" data-testid="adjust-stock-delta" className={inputCls} placeholder="e.g. 10 or -5" value={delta} onChange={(e) => setDelta(e.target.value)} />
      <input data-testid="adjust-stock-reason" className={inputCls} placeholder="Reason (e.g. harvest, spoilage)" value={reason} onChange={(e) => setReason(e.target.value)} />
      <button data-testid="adjust-stock-submit" className={btn}>Update stock</button>
    </form>
  );
};

const SupplyForm = ({ onDone }) => {
  const [f, setF] = useState({ name: "", category: "substrate", unit: "kg", quantity: 0, low_stock_threshold: 15 });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault();
    try { await api.post("/admin/supplies", { ...f, quantity: Number(f.quantity), low_stock_threshold: Number(f.low_stock_threshold) }); toast.success("Supply added"); onDone(); }
    catch (err) { toast.error(formatErr(err)); }
  };
  return (
    <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2" data-testid="supply-form">
      <input required data-testid="supply-form-name" className={`${inputCls} sm:col-span-2`} placeholder="Name (e.g. Paddy straw)" value={f.name} onChange={set("name")} />
      <select data-testid="supply-form-category" className={inputCls} value={f.category} onChange={set("category")}>
        {["spawn", "substrate", "packaging", "other"].map((c) => <option key={c} value={c}>{c}</option>)}
      </select>
      <input required data-testid="supply-form-unit" className={inputCls} placeholder="Unit (kg, pcs)" value={f.unit} onChange={set("unit")} />
      <label className="text-xs text-[#5A6567]">Opening quantity<input type="number" min="0" step="any" data-testid="supply-form-quantity" className={inputCls} value={f.quantity} onChange={set("quantity")} /></label>
      <label className="text-xs text-[#5A6567]">Low-stock alert at<input type="number" min="0" step="any" data-testid="supply-form-threshold" className={inputCls} value={f.low_stock_threshold} onChange={set("low_stock_threshold")} /></label>
      <button data-testid="supply-form-submit" className={`${btn} sm:col-span-2 justify-center`}>Add supply</button>
    </form>
  );
};

const StockTable = ({ rows, onAdjust, onDelete, testId }) => (
  <div className="overflow-x-auto rounded-xl border border-[#E5E0D8] bg-white">
    <table className="w-full min-w-[720px] text-sm" data-testid={testId}>
      <thead className="border-b border-[#E5E0D8] bg-[#FDFBF7]"><tr>{["Item", "Category", "In stock", "Alert at", "Status", ""].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
      <tbody className="divide-y divide-[#EEE9E1]">
        {rows.map((r) => (
          <tr key={r.id} data-testid={`stock-row-${r.id}`} className={r.level <= r.threshold ? "bg-[#FEF3C7]/30" : ""}>
            <td className={`${td} font-semibold`}>{r.name}</td>
            <td className={`${td} capitalize text-[#5A6567]`}>{r.category.replace("_", " ")}</td>
            <td className={td}><span data-testid={`stock-level-${r.id}`} className="font-display text-base font-bold">{fmtQty(r.level)}</span> <span className="text-xs text-[#5A6567]">{r.unit}</span></td>
            <td className={`${td} text-[#5A6567]`}>{fmtQty(r.threshold)}</td>
            <td className={td}><StockBadge level={r.level} threshold={r.threshold} testId={`stock-badge-${r.id}`} /></td>
            <td className={td}>
              <div className="flex justify-end gap-2">
                {r.level <= r.threshold && <Link to={`/admin/purchases?type=${r.kind}&id=${r.id}`} data-testid={`stock-reorder-${r.id}`} className={`${btnGhost} border-[#D97706] text-[#B45309]`}>Reorder</Link>}
                <button data-testid={`stock-adjust-${r.id}`} onClick={() => onAdjust(r)} className={btnGhost}><SlidersHorizontal className="h-3.5 w-3.5" />Adjust</button>
                {onDelete && <button data-testid={`supply-delete-${r.id}`} onClick={() => onDelete(r)} className={`${btnGhost} hover:border-[#DC2626] hover:text-[#DC2626]`}><Trash2 className="h-3.5 w-3.5" /></button>}
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export default function AdminInventory() {
  const { t } = useLang();
  const [data, setData] = useState(null);
  const [adjust, setAdjust] = useState(null);
  const [addSupply, setAddSupply] = useState(false);

  const load = useCallback(async () => {
    const [p, s, m] = await Promise.all([api.get("/admin/products"), api.get("/admin/supplies"), api.get("/admin/stock-movements")]);
    setData({
      products: p.data.map((x) => ({ id: x.product_id, kind: "product", name: x.name, category: x.category, level: x.stock, threshold: x.low_stock_threshold, unit: x.unit })),
      supplies: s.data.map((x) => ({ id: x.supply_id, kind: "supply", name: x.name, category: x.category, level: x.quantity, threshold: x.low_stock_threshold, unit: x.unit })),
      movements: m.data,
    });
  }, []);
  useEffect(() => { load(); const id = setInterval(load, 10000); return () => clearInterval(id); }, [load]);

  const delSupply = async (r) => {
    if (!window.confirm(`Delete ${r.name}?`)) return;
    try { await api.delete(`/admin/supplies/${r.id}`); load(); } catch (err) { toast.error(formatErr(err)); }
  };

  if (!data) return <Loading />;
  const lowCount = [...data.products, ...data.supplies].filter((r) => r.level <= r.threshold).length;

  return (
    <div data-testid="admin-inventory">
      <AdminHeader title={t("adm_inventory")} sub={`${lowCount} item(s) at or below alert level · refreshes every 10s`}>
        <LiveDot />
        <button data-testid="add-supply-btn" onClick={() => setAddSupply(true)} className={btn}><Plus className="h-4 w-4" />Add supply</button>
      </AdminHeader>
      <div className="grid gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <Tabs defaultValue="products">
            <TabsList className="mb-3">
              <TabsTrigger value="products" data-testid="inventory-tab-products">Products ({data.products.length})</TabsTrigger>
              <TabsTrigger value="supplies" data-testid="inventory-tab-supplies">Farm supplies ({data.supplies.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="products"><StockTable rows={data.products} onAdjust={setAdjust} testId="inventory-products-table" /></TabsContent>
            <TabsContent value="supplies"><StockTable rows={data.supplies} onAdjust={setAdjust} onDelete={delSupply} testId="inventory-supplies-table" /></TabsContent>
          </Tabs>
        </div>
        <Panel title="Recent stock movements" testId="stock-movements">
          {data.movements.length === 0 ? <p className="text-sm text-[#5A6567]">No movements yet.</p> : (
            <ul className="max-h-[520px] space-y-2 overflow-y-auto pr-1">
              {data.movements.map((m) => (
                <li key={m.movement_id} className="flex items-start gap-3 rounded-lg border border-[#EEE9E1] px-3 py-2 text-sm">
                  <span className={`mt-0.5 font-display font-bold ${m.delta >= 0 ? "text-[#16A34A]" : "text-[#DC2626]"}`}>{m.delta >= 0 ? "+" : ""}{fmtQty(m.delta)}</span>
                  <div className="min-w-0 flex-1"><p className="truncate font-medium">{m.name}</p><p className="truncate text-xs text-[#5A6567]">{m.reason}{m.ref ? ` · ${m.ref}` : ""} · {fmtDate(m.created_at)}</p></div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
      <Dialog open={!!adjust} onOpenChange={(o) => !o && setAdjust(null)}>
        <DialogContent><DialogHeader><DialogTitle className="font-display">Adjust · {adjust?.name}</DialogTitle></DialogHeader>
          {adjust && <AdjustForm target={adjust} onDone={() => { setAdjust(null); load(); }} />}
        </DialogContent>
      </Dialog>
      <Dialog open={addSupply} onOpenChange={setAddSupply}>
        <DialogContent><DialogHeader><DialogTitle className="font-display">Add farm supply</DialogTitle></DialogHeader>
          <SupplyForm onDone={() => { setAddSupply(false); load(); }} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
