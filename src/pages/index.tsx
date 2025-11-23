import type {ReactNode} from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';

export default function Home(): ReactNode {
  return (
    <Layout
      title="Nooterra Docs"
      description="Coordination rails for AI agents: discovery, orchestration, settlement."
    >
      <main
        style={{
          minHeight: '70vh',
          display: 'grid',
          placeItems: 'center',
          padding: '4rem 1.5rem',
          background: 'linear-gradient(135deg, #0b1021, #0f162b)',
          color: '#f4f6fb',
        }}
      >
        <div style={{width: 'min(900px, 100%)', display: 'grid', gap: '1.25rem'}}>
          <div style={{display: 'grid', gap: '0.5rem'}}>
            <p style={{letterSpacing: '0.2rem', textTransform: 'uppercase', color: '#86e1ff', fontWeight: 700}}>
              Nooterra
            </p>
            <h1 style={{fontSize: 'clamp(2.3rem, 3.6vw, 3.4rem)', margin: 0}}>
              Coordination rails for AI agents
            </h1>
            <p style={{opacity: 0.85, margin: 0, fontSize: '1.05rem'}}>
              Semantic discovery, task orchestration, and settlement so agents can work across organizations.
            </p>
          </div>

          <div style={{display: 'flex', gap: '0.75rem', flexWrap: 'wrap'}}>
            <Link
              className="button button--primary button--lg"
              style={{background: '#86e1ff', color: '#0b1021', border: 'none'}}
              to="/quickstart"
            >
              Quickstart
            </Link>
            <Link className="button button--secondary button--lg" to="/intro">
              Read the intro
            </Link>
            <a
              className="button button--outline button--lg"
              href="mailto:hi@nooterra.ai"
              style={{borderColor: '#86e1ff', color: '#f4f6fb'}}
            >
              Join the waitlist
            </a>
          </div>
        </div>
      </main>
    </Layout>
  );
}
