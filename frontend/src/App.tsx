import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LoginForm } from './components/LoginForm';
import { DashboardPlaceholder } from './components/DashboardPlaceholder';
import { ProductsPage } from './components/ProductsPage';
import { CustomersPage } from './components/CustomersPage';
import { PosPage } from './components/PosPage';
import { ReportsPage } from './components/ReportsPage';
import { LandingPage } from './components/LandingPage';

interface UserInfo {
  id: string;
  email: string;
  role: string;
  tenantId: string;
  branchId: string | null;
}

function AppShell({ token, user, onLogout }: { token: string; user: UserInfo; onLogout: () => void }) {
  const { i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';
  document.documentElement.lang = i18n.language;
  document.documentElement.dir = isRtl ? 'rtl' : 'ltr';

  return (
    <BrowserRouter>
      <div className="app" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <header style={{ padding: '1rem 1.5rem', background: 'var(--color-surface)', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ margin: 0, fontSize: '1.25rem' }}>ESMS — Egypt Supermarket Management System</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 14, color: 'var(--color-text-muted)' }}>{user.email}</span>
            <button type="button" onClick={() => i18n.changeLanguage('en')} style={{ marginRight: 4 }}>EN</button>
            <button type="button" onClick={() => i18n.changeLanguage('ar')}>العربية</button>
            <button type="button" onClick={onLogout} style={{ marginLeft: 8 }}>Logout</button>
          </div>
        </header>
        <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
          <nav style={{ width: 220, borderRight: '1px solid var(--color-border)', padding: '1rem', background: 'rgba(15,23,42,0.85)', backdropFilter: 'blur(12px)' }}>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <li><Link to="/app/dashboard">Dashboard</Link></li>
              <li><Link to="/app/pos">POS</Link></li>
              <li><Link to="/app/products">Products</Link></li>
              <li><Link to="/app/customers">Customers</Link></li>
              <li><Link to="/app/reports">Reports</Link></li>
            </ul>
          </nav>
          <main style={{ padding: '1.5rem', flex: 1, overflow: 'auto' }}>
            <Routes>
              <Route path="/app/dashboard" element={<DashboardPlaceholder onLogout={onLogout} />} />
              <Route path="/app/pos" element={<PosPage token={token} />} />
              <Route path="/app/products" element={<ProductsPage token={token} />} />
              <Route path="/app/customers" element={<CustomersPage token={token} />} />
              <Route path="/app/reports" element={<ReportsPage token={token} />} />
              <Route path="*" element={<Navigate to="/app/dashboard" replace />} />
            </Routes>
          </main>
        </div>
      </div>
    </BrowserRouter>
  );
}

function App() {
  const { i18n } = useTranslation();
  const [token, setToken] = useState<string | null>(localStorage.getItem('esms_token'));
  const [demoEmail, setDemoEmail] = useState('');
  const [demoPassword, setDemoPassword] = useState('');
  const [user, setUser] = useState<UserInfo | null>(() => {
    const raw = localStorage.getItem('esms_user');
    if (!raw) return null;
    try {
      return JSON.parse(raw) as UserInfo;
    } catch {
      return null;
    }
  });

  const handleLogin = (t: string, u: any) => {
    localStorage.setItem('esms_token', t);
    localStorage.setItem('esms_user', JSON.stringify(u));
    setToken(t);
    setUser(u);
  };

  const handleLogout = () => {
    localStorage.removeItem('esms_token');
    localStorage.removeItem('esms_user');
    setToken(null);
    setUser(null);
  };

  const isRtl = i18n.language === 'ar';
  document.documentElement.lang = i18n.language;
  document.documentElement.dir = isRtl ? 'rtl' : 'ltr';

  if (!token || !user) {
    return (
      <div className="app" style={{ minHeight: '100vh' }}>
        <header style={{ padding: '1rem 1.5rem', background: 'var(--color-surface)', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ margin: 0, fontSize: '1.25rem' }}>ESMS — Egypt Supermarket Management System</h1>
          <div>
            <button type="button" onClick={() => i18n.changeLanguage('en')} style={{ marginRight: 8 }}>EN</button>
            <button type="button" onClick={() => i18n.changeLanguage('ar')}>العربية</button>
          </div>
        </header>
        <main style={{ padding: '1rem 1rem 2rem' }}>
          <LandingPage
            onTryDemo={() => {
              setDemoEmail('admin@esms.local');
              setDemoPassword('Admin@123');
            }}
          />
          <div style={{ maxWidth: 460, margin: '0 auto', padding: '1rem', background: 'rgba(15,23,42,0.9)', border: '1px solid var(--color-border)', borderRadius: 16 }}>
            <LoginForm
              onSuccess={handleLogin}
              initialEmail={demoEmail}
              initialPassword={demoPassword}
            />
          </div>
        </main>
      </div>
    );
  }

  return <AppShell token={token} user={user} onLogout={handleLogout} />;
}

export default App;
