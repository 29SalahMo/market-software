import { useEffect, useState } from 'react';
import { apiRequest } from '../api';

type Props = { token: string };

interface Customer {
  id: string;
  name: string;
  phone?: string;
}

export function CustomersPage({ token }: Props) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  const loadCustomers = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest<{ customers: Customer[] }>('/v1/customers', { token });
      setCustomers(data.customers);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadCustomers();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await apiRequest('/v1/customers', {
        method: 'POST',
        token,
        body: JSON.stringify({
          name,
          phone: phone || undefined,
        }),
      });
      setName('');
      setPhone('');
      await loadCustomers();
    } catch (e: any) {
      setError(e.message);
    }
  };

  return (
    <div>
      <h2>Customers</h2>
      <form onSubmit={handleCreate} style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <input
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <input
          placeholder="Phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        <button type="submit">Add customer</button>
      </form>
      {error && <p style={{ color: '#dc2626' }}>{error}</p>}
      {loading ? (
        <p>Loading...</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Name</th>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Phone</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c.id}>
                <td>{c.name}</td>
                <td>{c.phone ?? '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

