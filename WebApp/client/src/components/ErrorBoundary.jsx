import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null,
      errorInfo: null,
      errorCount: 0
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo,
      errorCount: this.state.errorCount + 1
    });

    // Log to project if available
    if (this.props.logError) {
      this.props.logError(error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({ 
      hasError: false, 
      error: null,
      errorInfo: null 
    });
  };

  render() {
    if (this.state.hasError) {
      const isDevelopment = import.meta.env.DEV;

      return (
        <div className="min-vh-100 d-flex align-items-center justify-content-center bg-dark">
          <div className="container">
            <div className="row justify-content-center">
              <div className="col-lg-8">
                <div className="card bg-dark border-danger">
                  <div className="card-header bg-danger text-white">
                    <h4 className="mb-0">
                      <i className="bi bi-exclamation-triangle-fill me-2"></i>
                      Application Error
                    </h4>
                  </div>
                  <div className="card-body text-light">
                    <p className="mb-3">
                      Something went wrong while rendering this page. The error has been logged.
                    </p>
                    
                    {isDevelopment && this.state.error && (
                      <div className="mb-4">
                        <h5 className="text-danger">Error Details (Development Mode)</h5>
                        <div className="bg-black p-3 rounded border border-secondary">
                          <pre className="text-danger mb-0" style={{ fontSize: '0.875rem' }}>
                            {this.state.error.toString()}
                          </pre>
                          {this.state.error.stack && (
                            <pre className="text-muted mt-3 mb-0" style={{ fontSize: '0.75rem' }}>
                              {this.state.error.stack}
                            </pre>
                          )}
                        </div>
                        
                        {this.state.errorInfo && this.state.errorInfo.componentStack && (
                          <div className="mt-3">
                            <h6 className="text-warning">Component Stack:</h6>
                            <div className="bg-black p-3 rounded border border-secondary">
                              <pre className="text-muted mb-0" style={{ fontSize: '0.75rem' }}>
                                {this.state.errorInfo.componentStack}
                              </pre>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="d-flex gap-2">
                      <button 
                        className="btn btn-primary"
                        onClick={this.handleReset}
                      >
                        <i className="bi bi-arrow-clockwise me-2"></i>
                        Try Again
                      </button>
                      <button 
                        className="btn btn-secondary"
                        onClick={() => window.location.href = '/'}
                      >
                        <i className="bi bi-house me-2"></i>
                        Go to Dashboard
                      </button>
                    </div>

                    {this.state.errorCount > 2 && (
                      <div className="alert alert-warning mt-3">
                        <i className="bi bi-exclamation-circle me-2"></i>
                        This error has occurred {this.state.errorCount} times. 
                        Consider refreshing the page or clearing your browser cache.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;