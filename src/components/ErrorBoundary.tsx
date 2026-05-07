import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          padding: '2rem',
          background: '#0b1120',
          color: '#e2e8f0',
          fontFamily: 'system-ui, sans-serif',
          textAlign: 'center',
        }}
      >
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.75rem' }}>
          Une erreur est survenue
        </h1>
        <p style={{ fontSize: '0.875rem', color: '#94a3b8', maxWidth: '28rem', lineHeight: 1.6 }}>
          L'application a rencontre un probleme inattendu. Rechargez la page pour reprendre.
        </p>
        <pre
          style={{
            marginTop: '1.5rem',
            padding: '1rem',
            borderRadius: '0.5rem',
            background: '#1e293b',
            fontSize: '0.75rem',
            color: '#f87171',
            maxWidth: '36rem',
            overflow: 'auto',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {error.message}
        </pre>
        <button
          onClick={() => window.location.reload()}
          style={{
            marginTop: '1.5rem',
            padding: '0.625rem 1.5rem',
            borderRadius: '0.5rem',
            border: '1px solid #334155',
            background: '#1e293b',
            color: '#e2e8f0',
            fontSize: '0.875rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Recharger
        </button>
      </div>
    );
  }
}
