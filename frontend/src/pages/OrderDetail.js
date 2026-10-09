import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { api, formatErr, inr, fmtDate } from "@/lib/api";
import { useLang } from "@/lib/i18n";
import { StatusBadge, PaymentBadge } from "@/components/Badges";
import OrderTimeline from "@/components/OrderTimeline";
import { Loading } from "@/components/ProtectedRoute";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function OrderDetail() {
  const { id } = useParams();
  const { t, pn } = useLang();
  const [o, setO] = useState(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    const load = () => api.get(`/orders/${id}`).then((r) => setO(r.data)).catch(() => setMissing(true));
    load();
    const timer = setInterval(load, 20000);
    return () => clearInterval(timer);
  }, [id]);

  const cancel = async () => {
    try { const { data } = await api.post(`/orders/${id}/cancel`); setO(data); toast.success(t("st_cancelled")); }
    catch (err) { toast.error(formatErr(err)); }
  };

  if (missing) return <p className="py-24 text-center text-[#5A6567]" data-testid="order-not-found">Order not found.</p>;
  if (!o) return <Loading />;
  const a = o.address;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8" data-testid="order-detail">
      <Link to="/account" data-testid="order-back-link" className="inline-flex items-center gap-1.5 text-sm text-[#5A6567] hover:text-[#1B4D3E]"><ArrowLeft className="h-4 w-4" />{t("my_orders")}</Link>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <h1 data-testid="order-number" className="text-3xl font-extrabold tracking-tight text-[#1B4D3E] sm:text-4xl">{o.order_number}</h1>
        <StatusBadge status={o.status} testId="order-status-badge" />
        <PaymentBadge status={o.payment_status} testId="order-payment-badge" />
      </div>
      <p className="mt-1 text-sm text-[#5A6567]">{t("placed_on")} {fmtDate(o.created_at)} · {o.payment_method === "cod" ? t("cod") : t("online")}</p>

      <section className="bastar-card-top mt-8 rounded-2xl border border-[#E5E0D8] bg-white p-6 sm:p-8">
        <h2 className="mb-6 font-display text-lg font-semibold">{t("track")}</h2>
        <OrderTimeline order={o} />
      </section>

      <div className="mt-6 grid gap-6 md:grid-cols-5">
        <section className="rounded-2xl border border-[#E5E0D8] bg-white p-6 md:col-span-3">
          <h2 className="mb-4 font-display text-lg font-semibold">{t("items")}</h2>
          <div className="space-y-3">
            {o.items.map((i) => (
              <div key={i.product_id} className="flex items-center gap-3 text-sm">
                <img src={i.image} alt="" className="h-12 w-12 rounded-lg object-cover" />
                <div className="flex-1"><p className="font-semibold">{pn(i)}</p><p className="text-[#5A6567]">{i.quantity} × {inr(i.price)} · {i.unit}</p></div>
                <span className="font-semibold">{inr(i.line_total)}</span>
              </div>
            ))}
          </div>
          <div className="mt-5 space-y-1.5 border-t border-dashed border-[#E5E0D8] pt-4 text-sm">
            <div className="flex justify-between"><span className="text-[#5A6567]">{t("subtotal")}</span><span>{inr(o.subtotal)}</span></div>
            <div className="flex justify-between"><span className="text-[#5A6567]">{t("delivery")}</span><span>{o.delivery_fee ? inr(o.delivery_fee) : t("free")}</span></div>
            <div className="flex justify-between font-display text-lg font-bold"><span>{t("total")}</span><span data-testid="order-total">{inr(o.total)}</span></div>
          </div>
        </section>
        <section className="rounded-2xl border border-[#E5E0D8] bg-white p-6 md:col-span-2">
          <h2 className="mb-4 font-display text-lg font-semibold">{t("shipping_address")}</h2>
          <p className="text-sm leading-relaxed text-[#5A6567]" data-testid="order-address">
            <span className="font-semibold text-[#1C2526]">{a.full_name}</span><br />{a.line1}{a.line2 ? `, ${a.line2}` : ""}<br />{a.city}, {a.state} – {a.pincode}<br />{a.phone}
          </p>
          {["placed", "confirmed"].includes(o.status) && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button data-testid="order-cancel-btn" className="mt-6 w-full rounded-full border border-[#DC2626]/40 py-2.5 text-sm font-semibold text-[#DC2626] hover:bg-[#FDECEC]">{t("cancel_order")}</button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader><AlertDialogTitle>{t("cancel_order")} {o.order_number}?</AlertDialogTitle></AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel data-testid="order-cancel-dismiss">No</AlertDialogCancel>
                  <AlertDialogAction data-testid="order-cancel-confirm" onClick={cancel} className="bg-[#DC2626] hover:bg-[#B91C1C]">Yes, cancel</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </section>
      </div>
    </div>
  );
}
