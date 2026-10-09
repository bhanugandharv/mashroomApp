import { Check, X } from "lucide-react";
import { useLang } from "@/lib/i18n";
import { fmtDate } from "@/lib/api";

const STEPS = ["placed", "confirmed", "packed", "shipped", "delivered"];

export default function OrderTimeline({ order }) {
  const { t } = useLang();
  const reached = Object.fromEntries((order.status_history || []).map((h) => [h.status, h.at]));
  if (order.status === "cancelled") {
    return (
      <div data-testid="order-timeline-cancelled" className="flex items-center gap-3 rounded-xl border border-[#F3C0C0] bg-[#FDECEC] p-4 text-[#DC2626]">
        <X className="h-5 w-5" /><span className="font-semibold">{t("st_cancelled")}</span>
        <span className="text-xs">{fmtDate(reached.cancelled)}</span>
      </div>
    );
  }
  const current = STEPS.indexOf(order.status);
  return (
    <ol data-testid="order-timeline" className="grid grid-cols-5 gap-1">
      {STEPS.map((s, i) => {
        const done = i <= current;
        return (
          <li key={s} data-testid={`timeline-step-${s}`} className="relative flex flex-col items-center text-center">
            {i > 0 && <span className={`absolute right-1/2 top-4 h-0.5 w-full ${i <= current ? "bg-[#1B4D3E]" : "bg-[#E5E0D8]"}`} />}
            <span className={`relative z-10 grid h-8 w-8 place-items-center rounded-full border-2 ${done ? "border-[#1B4D3E] bg-[#1B4D3E] text-white" : "border-[#E5E0D8] bg-white text-[#C9C3B8]"}`}>
              {done ? <Check className="h-4 w-4" /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}
            </span>
            <span className={`mt-2 text-[11px] font-semibold sm:text-xs ${done ? "text-[#1B4D3E]" : "text-[#5A6567]"}`}>{t(`st_${s}`)}</span>
            {reached[s] && <span className="hidden text-[10px] text-[#5A6567] sm:block">{fmtDate(reached[s])}</span>}
          </li>
        );
      })}
    </ol>
  );
}
