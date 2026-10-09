import { useNavigate } from "react-router-dom";
import { Minus, Plus, Trash2, ShoppingBag } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useCart } from "@/context/CartContext";
import { useLang } from "@/lib/i18n";
import { inr } from "@/lib/api";

export default function CartDrawer() {
  const { items, open, setOpen, update, remove, subtotal } = useCart();
  const { t, pn } = useLang();
  const navigate = useNavigate();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side="right" className="flex w-full flex-col bg-[#FDFBF7] p-0 sm:max-w-md" data-testid="cart-drawer">
        <SheetHeader className="border-b border-[#E5E0D8] px-6 py-5">
          <SheetTitle className="font-display text-xl text-[#1B4D3E]">{t("cart")}</SheetTitle>
        </SheetHeader>
        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center text-[#5A6567]" data-testid="cart-empty">
            <ShoppingBag className="h-10 w-10 text-[#C86D3B]" />
            <p>{t("cart_empty")}</p>
            <button data-testid="cart-continue-btn" onClick={() => { setOpen(false); navigate("/shop"); }} className="mt-2 rounded-full border border-[#1B4D3E] px-5 py-2 text-sm font-semibold text-[#1B4D3E] hover:bg-[#1B4D3E] hover:text-white">{t("continue_shopping")}</button>
          </div>
        ) : (
          <>
            <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
              {items.map((i) => (
                <div key={i.product_id} data-testid={`cart-item-${i.product_id}`} className="flex gap-4 rounded-xl border border-[#E5E0D8] bg-white p-3">
                  <img src={i.image} alt={i.name} className="h-20 w-20 rounded-lg object-cover" />
                  <div className="flex flex-1 flex-col">
                    <div className="flex justify-between gap-2">
                      <p className="font-semibold leading-snug">{pn(i)}</p>
                      <button data-testid={`cart-remove-${i.product_id}`} onClick={() => remove(i.product_id)} className="text-[#5A6567] hover:text-[#DC2626]"><Trash2 className="h-4 w-4" /></button>
                    </div>
                    <p className="text-xs text-[#5A6567]">{i.unit} · {inr(i.price)}</p>
                    <div className="mt-auto flex items-center justify-between pt-2">
                      <div className="flex items-center rounded-full border border-[#E5E0D8]">
                        <button data-testid={`cart-dec-${i.product_id}`} onClick={() => update(i.product_id, i.quantity - 1)} className="grid h-8 w-8 place-items-center"><Minus className="h-3 w-3" /></button>
                        <span data-testid={`cart-qty-${i.product_id}`} className="w-6 text-center text-sm font-semibold">{i.quantity}</span>
                        <button data-testid={`cart-inc-${i.product_id}`} onClick={() => update(i.product_id, i.quantity + 1)} className="grid h-8 w-8 place-items-center"><Plus className="h-3 w-3" /></button>
                      </div>
                      <span className="font-semibold text-[#1B4D3E]">{inr(i.price * i.quantity)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-[#E5E0D8] bg-white px-6 py-5">
              <div className="flex justify-between text-sm"><span className="text-[#5A6567]">{t("subtotal")}</span><span data-testid="cart-subtotal" className="font-display text-lg font-bold">{inr(subtotal)}</span></div>
              <button data-testid="cart-checkout-btn" onClick={() => { setOpen(false); navigate("/checkout"); }}
                className="mt-4 w-full rounded-full bg-[#1B4D3E] py-3 font-semibold text-white transition-[background-color,transform] hover:bg-[#143C30] active:scale-[0.98]">{t("checkout")}</button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
