import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';

const ConsoleErrorReporter = () => {
  const [errors, setErrors] = useState([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMinimized, setIsMinimized] = useState(true);
  const originalConsoleError = useRef(null);
  const originalConsoleWarn = useRef(null);
  const errorId = useRef(0);

  useEffect(() => {
    // Only enable in development
    if (!import.meta.env.DEV) return;

    // Store original console methods
    originalConsoleError.current = console.error;
    originalConsoleWarn.current = console.warn;

    // Override console.error
    console.error = (...args) => {
      // Call original console.error
      originalConsoleError.current(...args);

      // Add to our error list
      const errorMessage = args
        .map(arg => {
          if (typeof arg === 'object') {
            try {
              return JSON.stringify(arg, null, 2);
            } catch (e) {
              return String(arg);
            }
          }
          return String(arg);
        })
        .join(' ');

      const id = ++errorId.current;
      const error = {
        id,
        type: 'error',
        message: errorMessage,
        timestamp: new Date().toLocaleTimeString(),
        stack: new Error().stack
      };

      setErrors(prev => [...prev.slice(-49), error]); // Keep last 50 errors
      setIsMinimized(false); // Show panel when error occurs
      
      // Show toast for critical errors
      if (errorMessage.toLowerCase().includes('uncaught') || 
          errorMessage.toLowerCase().includes('fatal')) {
        toast.error('Console error detected - check error panel');
      }
    };

    // Override console.warn for development
    console.warn = (...args) => {
      // Call original console.warn
      originalConsoleWarn.current(...args);

      // Only track specific warnings
      const warnMessage = args.join(' ');
      if (warnMessage.includes('Error') || 
          warnMessage.includes('Failed') ||
          warnMessage.includes('Warning')) {
        
        const id = ++errorId.current;
        const warning = {
          id,
          type: 'warning',
          message: warnMessage,
          timestamp: new Date().toLocaleTimeString()
        };

        setErrors(prev => [...prev.slice(-49), warning]);
      }
    };

    // Listen for unhandled promise rejections
    const handleUnhandledRejection = (event) => {
      const id = ++errorId.current;
      const error = {
        id,
        type: 'promise',
        message: `Unhandled Promise Rejection: ${event.reason}`,
        timestamp: new Date().toLocaleTimeString()
      };
      
      setErrors(prev => [...prev.slice(-49), error]);
      setIsMinimized(false);
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    // Cleanup
    return () => {
      console.error = originalConsoleError.current;
      console.warn = originalConsoleWarn.current;
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  const clearErrors = () => {
    setErrors([]);
    toast.success('Console errors cleared');
  };

  const copyError = (error) => {
    const errorText = `[${error.timestamp}] ${error.type.toUpperCase()}: ${error.message}`;
    navigator.clipboard.writeText(errorText);
    toast.success('Error copied to clipboard');
  };

  // Don't render in production
  if (!import.meta.env.DEV) return null;

  // Don't render if no errors
  if (errors.length === 0) return null;

  return (
    <div 
      className="position-fixed bottom-0 end-0 m-3" 
      style={{ 
        zIndex: 9999, 
        maxWidth: isMinimized ? '60px' : (isExpanded ? '600px' : '400px'),
        transition: 'all 0.3s ease'
      }}
    >
      {isMinimized ? (
        <button
          className="btn btn-danger btn-sm position-relative"
          onClick={() => setIsMinimized(false)}
          title="Show console errors"
        >
          <i className="bi bi-exclamation-triangle"></i>
          <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
            {errors.length}
          </span>
        </button>
      ) : (
        <div className="card bg-dark text-light border-danger">
          <div className="card-header bg-danger text-white d-flex justify-content-between align-items-center py-2">
            <div className="d-flex align-items-center">
              <i className="bi bi-terminal me-2"></i>
              <span className="fw-bold">Console Errors ({errors.length})</span>
            </div>
            <div className="d-flex gap-1">
              <button
                className="btn btn-sm btn-link text-white p-0 px-2"
                onClick={() => setIsExpanded(!isExpanded)}
                title={isExpanded ? 'Collapse' : 'Expand'}
              >
                <i className={`bi bi-${isExpanded ? 'compress' : 'arrows-expand'}`}></i>
              </button>
              <button
                className="btn btn-sm btn-link text-white p-0 px-2"
                onClick={clearErrors}
                title="Clear all errors"
              >
                <i className="bi bi-trash"></i>
              </button>
              <button
                className="btn btn-sm btn-link text-white p-0 px-2"
                onClick={() => setIsMinimized(true)}
                title="Minimize"
              >
                <i className="bi bi-dash"></i>
              </button>
            </div>
          </div>
          <div 
            className="card-body p-2" 
            style={{ 
              maxHeight: isExpanded ? '400px' : '200px', 
              overflowY: 'auto',
              fontSize: '0.875rem'
            }}
          >
            {errors.length === 0 ? (
              <p className="text-muted mb-0">No console errors</p>
            ) : (
              <div className="d-flex flex-column gap-2">
                {errors.map(error => (
                  <div 
                    key={error.id}
                    className={`p-2 rounded border ${
                      error.type === 'error' ? 'border-danger bg-danger bg-opacity-10' :
                      error.type === 'warning' ? 'border-warning bg-warning bg-opacity-10' :
                      'border-info bg-info bg-opacity-10'
                    }`}
                  >
                    <div className="d-flex justify-content-between align-items-start">
                      <div className="flex-grow-1">
                        <div className="d-flex align-items-center gap-2 mb-1">
                          <i className={`bi bi-${
                            error.type === 'error' ? 'x-circle-fill text-danger' :
                            error.type === 'warning' ? 'exclamation-triangle-fill text-warning' :
                            'exclamation-circle-fill text-info'
                          }`}></i>
                          <small className="text-muted">{error.timestamp}</small>
                        </div>
                        <pre 
                          className="mb-0 text-white" 
                          style={{ 
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                            fontSize: '0.8rem'
                          }}
                        >
                          {error.message}
                        </pre>
                      </div>
                      <button
                        className="btn btn-sm btn-link text-secondary p-0 ms-2"
                        onClick={() => copyError(error)}
                        title="Copy error"
                      >
                        <i className="bi bi-clipboard"></i>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          {errors.length > 10 && (
            <div className="card-footer py-1 text-center">
              <small className="text-warning">
                Showing last {errors.length} errors
              </small>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ConsoleErrorReporter;