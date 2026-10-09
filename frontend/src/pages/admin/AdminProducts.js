import { useEffect, useState, useCallback, useRef } from "react";
import { Plus, Pencil, Trash2, Upload, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { api, formatErr, inr, fmtQty } from "@/lib/api";
import { useLang } from "@/lib/i18n";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { StockBadge } from "@/components/Badges";
import { Loading } from "@/components/ProtectedRoute";
import { AdminHeader, btn, btnGhost, inputCls, th, td } from "@/pages/admin/AdminLayout";

const EMPTY = { name: "", name_hi: "", category: "fresh", description: "", description_hi: "", price: "", unit: "200 g pack", stock: 0, low_stock_threshold: 15, image: "", featured: false, is_active: true };
const CATS = ["fresh", "dried", "spawn", "value_added"];

const F = ({ label, children, span }) => (
  <label className={`block text-sm ${span ? "sm:col-span-2" : ""}`}><span className="mb-1 block font-medium text-[#5A6567]">{label}</span>{children}</label>
);

const ProductForm = ({ initial, onSaved, onClose }) => {
  const [f, setF] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const onUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const { data } = await api.post("/admin/upload-image", fd, { headers: { "Content-Type": "multipart/form-data" } });
      setF((prev) => ({ ...prev, image: data.url }));
      toast.success("Photo uploaded");
    } catch (err) { toast.error(formatErr(err)); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ""; }
  };
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    const body = { ...f, price: Number(f.price), stock: Number(f.stock), low_stock_threshold: Number(f.low_stock_threshold) };
    try {
      if (f.product_id) await api.put(`/admin/products/${f.product_id}`, body);
      else await api.post("/admin/products", body);
      toast.success("Product saved");
      onSaved(); onClose();
    } catch (err) { toast.error(formatErr(err)); } finally { setBusy(false); }
  };
  return (
    <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2" data-testid="product-form">
      <F label="Name (English)"><input required data-testid="product-form-name" className={inputCls} value={f.name} onChange={set("name")} /></F>
      <F label="Name (Hindi)"><input data-testid="product-form-name-hi" className={inputCls} value={f.name_hi} onChange={set("name_hi")} /></F>
      <F label="Category">
        <select data-testid="product-form-category" className={inputCls} value={f.category} onChange={set("category")}>
          {CATS.map((c) => <option key={c} value={c}>{c.replace("_", " ")}</option>)}
        </select>
      </F>
      <F label="Unit / pack size"><input required data-testid="product-form-unit" className={inputCls} value={f.unit} onChange={set("unit")} /></F>
      <F label="Price (₹)"><input required type="number" min="1" step="0.01" data-testid="product-form-price" className={inputCls} value={f.price} onChange={set("price")} /></F>
      <F label="Stock (units)"><input required type="number" min="0" step="1" data-testid="product-form-stock" className={inputCls} value={f.stock} onChange={set("stock")} /></F>
      <F label="Low-stock alert at"><input type="number" min="0" data-testid="product-form-threshold" className={inputCls} value={f.low_stock_threshold} onChange={set("low_stock_threshold")} /></F>
      <F label="Product photo" span>
        <div className="flex items-start gap-3">
          {f.image
            ? <img src={f.image} alt="" className="h-16 w-16 shrink-0 rounded-lg border border-[#E5E0D8] object-cover" />
            : <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border border-dashed border-[#E5E0D8] bg-[#FDFBF7] text-[#B9B2A6]"><ImageIcon className="h-5 w-5" /></div>}
          <div className="flex-1 space-y-2">
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" capture="environment" hidden data-testid="product-form-image-file" onChange={onUpload} />
            <button type="button" data-testid="product-form-upload-btn" disabled={uploading} onClick={() => fileRef.current?.click()} className={btnGhost}>
              <Upload className="h-3.5 w-3.5" />{uploading ? "Uploading..." : "Upload photo"}
            </button>
            <input data-testid="product-form-image" className={inputCls} value={f.image} onChange={set("image")} placeholder="or paste an image URL" />
          </div>
        </div>
      </F>
      <F label="Description (English)" span><textarea data-testid="product-form-description" rows={2} className={`${inputCls} h-auto py-2`} value={f.description} onChange={set("description")} /></F>
      <F label="Description (Hindi)" span><textarea data-testid="product-form-description-hi" rows={2} className={`${inputCls} h-auto py-2`} value={f.description_hi} onChange={set("description_hi")} /></F>
      <div className="flex items-center gap-6 sm:col-span-2">
        <label className="flex items-center gap-2 text-sm"><Switch data-testid="product-form-featured" checked={f.featured} onCheckedChange={(v) => setF({ ...f, featured: v })} />Featured on home</label>
        <label className="flex items-center gap-2 text-sm"><Switch data-testid="product-form-active" checked={f.is_active} onCheckedChange={(v) => setF({ ...f, is_active: v })} />Visible in store</label>
      </div>
      <div className="flex justify-end gap-2 sm:col-span-2">
        <button type="button" onClick={onClose} className={btnGhost}>Cancel</button>
        <button data-testid="product-form-submit" disabled={busy} className={btn}>Save product</button>
      </div>
    </form>
  );
};

export default function AdminProducts() {
  const { t } = useLang();
  const [products, setProducts] = useState(null);
  const [editing, setEditing] = useState(null);
  const load = useCallback(() => api.get("/admin/products").then((r) => setProducts(r.data)), []);
  useEffect(() => { load(); }, [load]);

  const del = async (p) => {
    try { await api.delete(`/admin/products/${p.product_id}`); toast.success("Product deleted"); load(); }
    catch (err) { toast.error(formatErr(err)); }
  };

  return (
    <div data-testid="admin-products">
      <AdminHeader title={t("adm_products")} sub="Manage your catalogue, prices and visibility">
        <button data-testid="add-product-btn" onClick={() => setEditing(EMPTY)} className={btn}><Plus className="h-4 w-4" />Add product</button>
      </AdminHeader>
      {products === null ? <Loading /> : (
        <div className="overflow-x-auto rounded-xl border border-[#E5E0D8] bg-white">
          <table className="w-full min-w-[820px] text-sm" data-testid="admin-products-table">
            <thead className="border-b border-[#E5E0D8] bg-[#FDFBF7]"><tr>{["Product", "Category", "Price", "Stock", "Status", ""].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-[#EEE9E1]">
              {products.map((p) => (
                <tr key={p.product_id} data-testid={`admin-product-row-${p.product_id}`}>
                  <td className={td}><div className="flex items-center gap-3"><img src={p.image} alt="" className="h-11 w-11 rounded-lg bg-[#F3EEE6] object-cover" /><div><p className="font-semibold">{p.name}</p><p className="text-xs text-[#5A6567]">{p.name_hi} · {p.unit}</p></div></div></td>
                  <td className={`${td} capitalize`}>{p.category.replace("_", " ")}</td>
                  <td className={`${td} font-semibold`}>{inr(p.price)}</td>
                  <td className={td}><span className="mr-2 font-semibold">{fmtQty(p.stock)}</span><StockBadge level={p.stock} threshold={p.low_stock_threshold} /></td>
                  <td className={td}>{p.is_active ? <span className="text-xs font-semibold text-[#16A34A]">Visible</span> : <span className="text-xs font-semibold text-[#5A6567]">Hidden</span>}{p.featured && <span className="ml-2 text-xs font-semibold text-[#8B4513]">Featured</span>}</td>
                  <td className={td}>
                    <div className="flex justify-end gap-2">
                      <button data-testid={`edit-product-${p.product_id}`} onClick={() => setEditing(p)} className={btnGhost}><Pencil className="h-3.5 w-3.5" />Edit</button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild><button data-testid={`delete-product-${p.product_id}`} className={`${btnGhost} hover:border-[#DC2626] hover:text-[#DC2626]`}><Trash2 className="h-3.5 w-3.5" /></button></AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader><AlertDialogTitle>Delete {p.name}?</AlertDialogTitle></AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction data-testid={`confirm-delete-product-${p.product_id}`} onClick={() => del(p)} className="bg-[#DC2626] hover:bg-[#B91C1C]">Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader><DialogTitle className="font-display">{editing?.product_id ? "Edit product" : "Add product"}</DialogTitle></DialogHeader>
          {editing && <ProductForm initial={editing} onSaved={load} onClose={() => setEditing(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
