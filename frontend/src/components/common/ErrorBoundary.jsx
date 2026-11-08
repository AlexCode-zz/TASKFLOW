import { Component } from 'react';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error capturado por ErrorBoundary:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  handleGoHome = () => {
    window.location.hash = '#/';
    window.location.reload();
  };

  render() {
    const { hasError } = this.state;

    if (hasError) {
      return (
        <div className="error-boundary d-flex flex-column align-items-center justify-content-center text-center py-5">
          <div className="error-boundary-icon mb-3">⚠️</div>
          <h2 className="fw-bold mb-2">Algo salió mal</h2>
          <p className="text-muted-tf mb-2">La página encontró un error inesperado.</p>
          {this.state.error && (
            <pre className="error-boundary-detail text-muted-tf small mb-4">
              {this.state.error.message || String(this.state.error)}
            </pre>
          )}
          <div className="d-flex gap-2">
            <button type="button" className="btn btn-outline-primary" onClick={this.handleRetry}>
              Reintentar
            </button>
            <button type="button" className="btn btn-primary" onClick={this.handleGoHome}>
              Ir al inicio
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
