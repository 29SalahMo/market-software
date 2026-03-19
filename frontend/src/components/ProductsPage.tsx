import { useEffect, useState } from 'react';
import { apiRequest } from '../api';

type Props = { token: string };

interface Product {
  id: string;
  sku: string;
  name: string;
  defaultPrice: number;
  taxRate: number;
}

export function ProductsPage({ token }: Props) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [price, setPrice] = useState<number>(0);

  const loadProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest<{ products: Product[] }>('/v1/catalog/products', { token });
      setProducts(data.products);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadProducts();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await apiRequest('/v1/catalog/products', {
        method: 'POST',
        token,
        body: JSON.stringify({
          sku,
          name,
          defaultPrice: Number(price),
        }),
      });
      setSku('');
      setName('');
      setPrice(0);
      await loadProducts();
    } catch (e: any) {
      setError(e.message);
    }
  };

  return (
    <div>
      <h2>Products</h2>
      <form onSubmit={handleCreate} style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <input
          placeholder="SKU"
          value={sku}
          onChange={(e) => setSku(e.target.value)}
          required
        />
        <input
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <input
          type="number"
          placeholder="Price (EGP)"
          value={price}
          onChange={(e) => setPrice(Number(e.target.value))}
          required
          min={0}
          step={0.01}
        />
        <button type="submit">Add product</button>
      </form>
      {error && <p style={{ color: '#dc2626' }}>{error}</p>}
      {loading ? (
        <p>Loading...</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>SKU</th>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Name</th>
              <th style={{ textAlign: 'right', borderBottom: '1px solid #e5e7eb' }}>Price</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id}>
                <td>{p.sku}</td>
                <td>{p.name}</td>
                <td style={{ textAlign: 'right' }}>{p.defaultPrice.toFixed(2)} EGP</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

