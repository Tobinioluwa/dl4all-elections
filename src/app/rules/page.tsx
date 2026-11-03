import Link from 'next/link';
import { RulesText } from '@/components/RulesText';

export const metadata = { title: 'Rules of the election' };

export default function RulesPage() {
  return (
    <div className="shell">
      <header className="header">
        <Link href="/" className="brand">
          <div className="logo" aria-hidden="true">DL</div>
          <div className="display" style={{ fontWeight: 800, fontSize: 20 }}>DL4All Nigeria</div>
        </Link>
      </header>
      <main className="page narrow">
        <div className="card">
          <div className="eyebrow">Please read</div>
          <h1 className="title-xl" style={{ marginBottom: 16 }}>Rules of the election</h1>
          <RulesText />
          <Link className="btn" href="/" style={{ display: 'inline-flex', alignItems: 'center', marginTop: 24, textDecoration: 'none' }}>Back to the election</Link>
        </div>
      </main>
    </div>
  );
}
