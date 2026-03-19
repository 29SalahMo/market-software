import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { apiRequest } from '../api';

type Props = { onLogout: () => void };

interface Overview {
  date: string;
  dailySummary: {
    totalGross: number;
    totalNet: number;
    totalTax: number;
    count: number;
  };
  topProducts: { productId: string; name: string; quantity: number; revenue: number }[];
  lowStock: { productId: string; name: string; quantity: number; minQuantity: number }[];
}

export function DashboardPlaceholder({ onLogout }: Props) {
  const { t } = useTranslation();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('esms_token') ?? undefined;
    if (!token) return;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await apiRequest<Overview>('/v1/reports/overview', { token });
        setOverview(data);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2 style={{ margin: 0 }}>{t('dashboard')}</h2>
          <p style={{ margin: '4px 0', color: 'var(--color-text-muted)' }}>{t('welcome')}</p>
        </div>
        <button
          type="button"
          onClick={onLogout}
          style={{
            padding: '8px 16px',
            borderRadius: 999,
            border: '1px solid var(--color-border)',
            background: 'transparent',
            color: 'var(--color-text-muted)',
          }}
        >
          Logout
        </button>
      </div>

      {error && <p style={{ color: '#f97373' }}>{error}</p>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div style={{ padding: 16, borderRadius: 12, background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          <p style={{ margin: 0, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-text-muted)' }}>Today gross</p>
          <p style={{ margin: '8px 0 0', fontSize: 24, fontWeight: 600 }}>{overview?.dailySummary.totalGross.toFixed(2) ?? '0.00'} EGP</p>
        </div>
        <div style={{ padding: 16, borderRadius: 12, background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          <p style={{ margin: 0, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-text-muted)' }}>Net after tax</p>
          <p style={{ margin: '8px 0 0', fontSize: 24, fontWeight: 600 }}>{overview?.dailySummary.totalNet.toFixed(2) ?? '0.00'} EGP</p>
        </div>
        <div style={{ padding: 16, borderRadius: 12, background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          <p style={{ margin: 0, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-text-muted)' }}>Receipts</p>
          <p style={{ margin: '8px 0 0', fontSize: 24, fontWeight: 600 }}>{overview?.dailySummary.count ?? 0}</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr', gap: 16 }}>
        <div style={{ padding: 16, borderRadius: 12, background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          <h3 style={{ marginTop: 0, marginBottom: 8 }}>Top products today</h3>
          {loading && <p>Loading...</p>}
          {!loading && (!overview || !overview.topProducts.length) && <p style={{ color: 'var(--color-text-muted)' }}>No sales yet today.</p>}
          {!loading && overview && overview.topProducts.length > 0 && (
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 8 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left' }}>Product</th>
                  <th style={{ textAlign: 'right' }}>Qty</th>
                  <th style={{ textAlign: 'right' }}>Revenue</th>
                </tr>
              </thead>
              <tbody>
                {overview.topProducts.map((p) => (
                  <tr key={p.productId}>
                    <td>{p.name}</td>
                    <td style={{ textAlign: 'right' }}>{p.quantity}</td>
                    <td style={{ textAlign: 'right' }}>{p.revenue.toFixed(2)} EGP</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div style={{ padding: 16, borderRadius: 12, background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          <h3 style={{ marginTop: 0, marginBottom: 8 }}>Low stock alerts</h3>
          {!loading && (!overview || !overview.lowStock.length) && <p style={{ color: 'var(--color-text-muted)' }}>No low stock items.</p>}
          {!loading && overview && overview.lowStock.length > 0 && (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {overview.lowStock.map((s) => (
                <li key={s.productId} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--color-border)' }}>
                  <span>{s.name}</span>
                  <span>
                    {s.quantity} / {s.minQuantity}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
