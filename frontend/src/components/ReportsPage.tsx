import { useEffect, useState } from 'react';
import { apiRequest } from '../api';

type Props = { token: string };

interface DailySalesSummary {
  date: string;
  totalGross: number;
  totalNet: number;
  totalTax: number;
  count: number;
}

export function ReportsPage({ token }: Props) {
  const [summary, setSummary] = useState<DailySalesSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest<DailySalesSummary & { date: string }>('/v1/sales/reports/daily-sales', { token });
      setSummary(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <div>
      <h2>Reports</h2>
      <button type="button" onClick={load} style={{ marginBottom: 12 }}>
        Refresh daily sales
      </button>
      {loading && <p>Loading...</p>}
      {error && <p style={{ color: '#dc2626' }}>{error}</p>}
      {summary && !loading && (
        <div style={{ padding: 16, border: '1px solid #e5e7eb', borderRadius: 6, maxWidth: 400 }}>
          <p style={{ margin: 0 }}>Date: {summary.date}</p>
          <p style={{ margin: '4px 0' }}>Receipts: {summary.count}</p>
          <p style={{ margin: '4px 0' }}>Gross: {summary.totalGross.toFixed(2)} EGP</p>
          <p style={{ margin: '4px 0' }}>Tax: {summary.totalTax.toFixed(2)} EGP</p>
          <p style={{ margin: '4px 0' }}>Net: {summary.totalNet.toFixed(2)} EGP</p>
        </div>
      )}
    </div>
  );
}

