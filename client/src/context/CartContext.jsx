import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const CART_KEY = 'pramas_cart';
const CartContext = createContext(null);

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }) {
  const [items, setItems] = useState(load);
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(items));
    } catch {
      /* storage unavailable */
    }
  }, [items]);

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const add = (product, variant, qty = 1) => {
    setItems((list) => {
      const key = `${product._id}:${variant._id}`;
      const existing = list.find((i) => i.key === key);
      const max = Math.min(10, variant.stock);
      if (existing) return list.map((i) => (i.key === key ? { ...i, qty: Math.min(max, i.qty + qty) } : i));
      return [
        ...list,
        {
          key,
          productId: product._id,
          variantId: variant._id,
          slug: product.slug,
          name: product.name,
          size: variant.size,
          price: variant.price,
          stock: variant.stock,
          look: product.look,
          image: product.image,
          qty: Math.min(max, qty),
        },
      ];
    });
    setOpen(true);
  };

  const setQty = (key, qty) =>
    setItems((list) => list.map((i) => (i.key === key ? { ...i, qty: Math.max(1, Math.min(10, i.stock, qty)) } : i)));
  const remove = (key) => setItems((list) => list.filter((i) => i.key !== key));
  const clear = () => setItems([]);

  const value = useMemo(() => {
    const count = items.reduce((s, i) => s + i.qty, 0);
    const subtotal = items.reduce((s, i) => s + i.qty * i.price, 0);
    return { items, count, subtotal, add, setQty, remove, clear, open, setOpen, toast, setToast };
  }, [items, open, toast]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export const useCart = () => useContext(CartContext);
