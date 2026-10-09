import { createContext, useContext, useEffect, useState } from "react";

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    try { return JSON.parse(localStorage.getItem("cgm_cart")) || []; } catch { return []; }
  });
  const [open, setOpen] = useState(false);

  useEffect(() => { localStorage.setItem("cgm_cart", JSON.stringify(items)); }, [items]);

  const add = (product, quantity = 1) => {
    setItems((prev) => {
      const found = prev.find((i) => i.product_id === product.product_id);
      if (found) {
        return prev.map((i) => i.product_id === product.product_id
          ? { ...i, quantity: Math.min(i.quantity + quantity, product.stock), stock: product.stock } : i);
      }
      const { product_id, name, name_hi, price, unit, image, stock } = product;
      return [...prev, { product_id, name, name_hi, price, unit, image, stock, quantity: Math.min(quantity, stock) }];
    });
  };
  const update = (id, quantity) =>
    setItems((prev) => prev.map((i) => (i.product_id === id ? { ...i, quantity: Math.max(1, Math.min(quantity, i.stock)) } : i)));
  const remove = (id) => setItems((prev) => prev.filter((i) => i.product_id !== id));
  const clear = () => setItems([]);

  const count = items.reduce((s, i) => s + i.quantity, 0);
  const subtotal = items.reduce((s, i) => s + i.quantity * i.price, 0);

  return (
    <CartContext.Provider value={{ items, add, update, remove, clear, count, subtotal, open, setOpen }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
