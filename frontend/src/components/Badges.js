import { useLang } from "@/lib/i18n";

const ORDER_COLORS = {
  placed: "bg-[#FDF3E7] text-[#8B4513] border-[#E8C9A6]",
  confirmed: "bg-[#EAF2EF] text-[#1B4D3E] border-[#BFD6CD]",
  packed: "bg-[#FBF5E1] text-[#8A6A10] border-[#EAD9A0]",
  shipped: "bg-[#E8F0F6] text-[#24527A] border-[#BCD0E0]",
  delivered: "bg-[#E7F6EC] text-[#16A34A] border-[#B4E2C3]",
  cancelled: "bg-[#FDECEC] text-[#DC2626] border-[#F3C0C0]",
};
const PAY_COLORS = {
  pending: "bg-[#FBF5E1] text-[#8A6A10] border-[#EAD9A0]",
  paid: "bg-[#E7F6EC] text-[#16A34A] border-[#B4E2C3]",
  failed: "bg-[#FDECEC] text-[#DC2626] border-[#F3C0C0]",
};

const base = "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap";

export const StatusBadge = ({ status, testId }) => {
  const { t } = useLang();
  return <span data-testid={testId} className={`${base} ${ORDER_COLORS[status] || ""}`}>{t(`st_${status}`)}</span>;
};

export const PaymentBadge = ({ status, testId }) => {
  const { t } = useLang();
  return <span data-testid={testId} className={`${base} ${PAY_COLORS[status] || ""}`}>{t(`pay_${status}`)}</span>;
};

export const StockBadge = ({ level, threshold, unit, testId }) => {
  const cls = level <= 0 ? "bg-[#FDECEC] text-[#DC2626] border-[#F3C0C0]"
    : level <= threshold ? "bg-[#FEF3C7] text-[#B45309] border-[#FCD34D]"
    : "bg-[#E7F6EC] text-[#16A34A] border-[#B4E2C3]";
  const label = level <= 0 ? "Out of stock" : level <= threshold ? "Low stock" : "In stock";
  return <span data-testid={testId} className={`${base} ${cls}`}>{label}{unit ? ` · ${unit}` : ""}</span>;
};
