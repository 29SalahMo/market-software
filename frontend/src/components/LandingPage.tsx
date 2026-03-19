type Props = {
  onTryDemo: () => void;
};

const featureCards = [
  { title: 'Smart POS', text: 'Fast checkout, barcode-ready search, cash/card/e-wallet payments.' },
  { title: 'Inventory Control', text: 'Track stock per branch, low-stock alerts, and live stock movement.' },
  { title: 'Customer & Supplier CRM', text: 'Manage customer profiles and supplier data in one place.' },
  { title: 'Reports & Insights', text: 'Daily sales KPIs, top products, and tax-ready summaries.' },
];

export function LandingPage({ onTryDemo }: Props) {
  return (
    <section style={{ maxWidth: 1100, margin: '0 auto 2rem', padding: '1rem' }}>
      <div
        style={{
          border: '1px solid var(--color-border)',
          borderRadius: 16,
          background: 'linear-gradient(135deg, rgba(34,197,94,0.12), rgba(2,6,23,0.7))',
          padding: '2rem',
          marginBottom: '1.25rem',
        }}
      >
        <h2 style={{ marginTop: 0, marginBottom: 8, fontSize: '2rem' }}>
          Modern Supermarket SaaS for Egypt
        </h2>
        <p style={{ marginTop: 0, color: 'var(--color-text-muted)', maxWidth: 780 }}>
          Manage sales, products, prices, customers, branches, and daily operations from one cloud dashboard.
          Arabic/English, EGP, and VAT-ready.
        </p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 16 }}>
          <button
            type="button"
            onClick={onTryDemo}
            style={{
              border: 'none',
              borderRadius: 999,
              padding: '0.7rem 1.1rem',
              background: 'var(--color-primary)',
              color: '#052e16',
              fontWeight: 700,
            }}
          >
            Try Demo Now
          </button>
          <span style={{ alignSelf: 'center', color: 'var(--color-text-muted)' }}>
            Demo login: admin@esms.local / Admin@123
          </span>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: 12,
        }}
      >
        {featureCards.map((card) => (
          <div
            key={card.title}
            style={{
              background: 'rgba(15,23,42,0.88)',
              border: '1px solid var(--color-border)',
              borderRadius: 12,
              padding: '0.9rem',
            }}
          >
            <h3 style={{ margin: '0 0 6px', fontSize: '1rem' }}>{card.title}</h3>
            <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: '0.92rem' }}>{card.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

