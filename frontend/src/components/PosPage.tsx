import { useEffect, useMemo, useState } from 'react';
import { apiRequest } from '../api';

type Props = { token: string };

interface Product {
  id: string;
  sku: string;
  name: string;
  defaultPrice: number;
}

interface CartItem {
  product: Product;
  quantity: number;
}

export function PosPage({ token }: Props) {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD' | 'EWALLET'>('CASH');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await apiRequest<{ products: Product[] }>('/v1/catalog/products', { token });
        setProducts(data.products);
      } catch (e: any) {
        setError(e.message);
      }
    };
    void load();
  }, []);

  const filteredProducts = useMemo(() => {
    const q = search.toLowerCase();
    return products.filter(
      (p) => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q),
    );
  }, [products, search]);

  const handleAddToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.product.id === product.id);
      if (existing) {
        return prev.map((c) =>
          c.product.id === product.id ? { ...c, quantity: c.quantity + 1 } : c,
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const handleQtyChange = (productId: string, qty: number) => {
    setCart((prev) =>
      prev
        .map((c) => (c.product.id === productId ? { ...c, quantity: qty } : c))
        .filter((c) => c.quantity > 0),
    );
  };

  const totals = useMemo(() => {
    const subtotal = cart.reduce((sum, c) => sum + c.product.defaultPrice * c.quantity, 0);
    return { subtotal, netTotal: subtotal };
  }, [cart]);

  const handleCheckout = async () => {
    if (!cart.length) return;
    setSubmitting(true);
    setError(null);
    setMessage(null);
    try {
      await apiRequest('/v1/sales', {
        method: 'POST',
        token,
        body: JSON.stringify({
          paymentMethod,
          items: cart.map((c) => ({
            productId: c.product.id,
            quantity: c.quantity,
            unitPrice: c.product.defaultPrice,
            discount: 0,
          })),
        }),
      });
      setCart([]);
      setMessage('Sale completed.');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, alignItems: 'flex-start' }}>
      <div>
        <h2>POS</h2>
        <input
          placeholder="Scan barcode or search by name/SKU"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: '100%', padding: 8, marginBottom: 12 }}
        />
        <div style={{ maxHeight: 400, overflow: 'auto', border: '1px solid #e5e7eb', borderRadius: 4 }}>
          {filteredProducts.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => handleAddToCart(p)}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                width: '100%',
                padding: '8px 12px',
                border: 'none',
                borderBottom: '1px solid #e5e7eb',
                background: 'white',
                cursor: 'pointer',
              }}
            >
              <span>{p.name}</span>
              <span>{p.defaultPrice.toFixed(2)} EGP</span>
            </button>
          ))}
          {!filteredProducts.length && <p style={{ padding: 8 }}>No products</p>}
        </div>
      </div>
      <div>
        <h3>Cart</h3>
        {cart.length === 0 ? (
          <p>No items.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 8 }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left' }}>Item</th>
                <th style={{ textAlign: 'right' }}>Qty</th>
                <th style={{ textAlign: 'right' }}>Price</th>
                <th style={{ textAlign: 'right' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {cart.map((c) => (
                <tr key={c.product.id}>
                  <td>{c.product.name}</td>
                  <td style={{ textAlign: 'right' }}>
                    <input
                      type="number"
                      min={1}
                      value={c.quantity}
                      onChange={(e) => handleQtyChange(c.product.id, Number(e.target.value))}
                      style={{ width: 60 }}
                    />
                  </td>
                  <td style={{ textAlign: 'right' }}>{c.product.defaultPrice.toFixed(2)}</td>
                  <td style={{ textAlign: 'right' }}>
                    {(c.product.defaultPrice * c.quantity).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Subtotal</span>
            <strong>{totals.subtotal.toFixed(2)} EGP</strong>
          </div>
        </div>
        <div style={{ marginBottom: 8 }}>
          <label>
            Payment method:{' '}
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as any)}
            >
              <option value="CASH">Cash</option>
              <option value="CARD">Card</option>
              <option value="EWALLET">E-Wallet</option>
            </select>
          </label>
        </div>
        {error && <p style={{ color: '#dc2626' }}>{error}</p>}
        {message && <p style={{ color: '#16a34a' }}>{message}</p>}
        <button
          type="button"
          disabled={!cart.length || submitting}
          onClick={handleCheckout}
          style={{ width: '100%', padding: '10px 16px' }}
        >
          {submitting ? 'Processing...' : `Charge ${totals.netTotal.toFixed(2)} EGP`}
        </button>
      </div>
    </div>
  );
}

