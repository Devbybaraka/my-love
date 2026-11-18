import { Component } from 'react';
import { reportError } from '../lib/monitoring';

/**
 * If a page throws, show something gentle (and in the same voice as the rest of
 * the site) instead of a white screen — and report it so it gets fixed.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    reportError(error, { boundary: info?.componentStack ? 'app' : 'unknown' });
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="aura flex min-h-screen items-center justify-center px-5 py-16">
        <div className="glass w-full max-w-md rounded-3xl p-8 text-center">
          <div className="mx-auto mb-5 grid h-12 w-12 place-items-center rounded-full border border-gold/30 bg-blush-soft text-gold-deep">
            ❦
          </div>
          <p className="font-display text-2xl text-ink">
            Something flickered on our side.
          </p>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-ink/55">
            Not your fault, love. I&rsquo;ve been told about it. Try once more.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="btn-primary mt-6"
          >
            try again
          </button>
        </div>
      </div>
    );
  }
}
