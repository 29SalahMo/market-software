import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getApiBase } from '../api';

type Props = {
  onSuccess: (token: string, user: any) => void;
  initialEmail?: string;
  initialPassword?: string;
};

export function LoginForm({ onSuccess, initialEmail = '', initialPassword = '' }: Props) {
  const { t } = useTranslation();
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState(initialPassword);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setEmail(initialEmail);
  }, [initialEmail]);

  useEffect(() => {
    setPassword(initialPassword);
  }, [initialPassword]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const API_BASE = getApiBase();
      const res = await fetch(`${API_BASE}/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error?.message || t('invalidCredentials'));
        return;
      }
      onSuccess(data.access_token, data.user);
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: '0 auto' }}>
      <h2 style={{ marginBottom: '1.5rem' }}>{t('loginTitle')}</h2>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 16 }}>
          <label htmlFor="email" style={{ display: 'block', marginBottom: 4 }}>{t('email')}</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6 }}
          />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label htmlFor="password" style={{ display: 'block', marginBottom: 4 }}>{t('password')}</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6 }}
          />
        </div>
        {error && <p style={{ color: '#dc2626', marginBottom: 12 }}>{error}</p>}
        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            padding: '10px 16px',
            background: 'var(--color-primary)',
            color: 'white',
            border: 'none',
            borderRadius: 6,
            fontWeight: 600,
          }}
        >
          {loading ? '...' : t('login')}
        </button>
      </form>
      <p style={{ marginTop: 16, fontSize: 14, color: 'var(--color-text-muted)' }}>
        Demo: admin@esms.local / Admin@123
      </p>
    </div>
  );
}
