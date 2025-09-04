import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-toastify';

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const result = await login(formData.email, formData.password);
    
    if (result.success) {
      navigate('/');
    }
    
    setLoading(false);
  };

  return (
    <div className="min-vh-100 d-flex align-items-center bg-dark">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-md-6 col-lg-5">
            <div className="card shadow-lg">
              <div className="card-body p-5">
                <div className="text-center mb-4">
                  <img 
                    src="/static/img/blockai-logo-large.png" 
                    alt="BlockAI Logo" 
                    className="mb-3"
                    style={{ maxWidth: '150px' }}
                  />
                  <h2 className="fw-bold">
                    Block<span className="text-primary">AI</span> <span className="text-muted">Pure MM</span>
                  </h2>
                  <p className="text-muted">Sign in to your account</p>
                </div>

                <form onSubmit={handleSubmit}>
                  <div className="mb-3">
                    <label htmlFor="email" className="form-label">Email address</label>
                    <input
                      type="email"
                      className="form-control"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      placeholder="Enter your email"
                    />
                  </div>

                  <div className="mb-3">
                    <label htmlFor="password" className="form-label">Password</label>
                    <div className="position-relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        className="form-control pe-5"
                        id="password"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        required
                        placeholder="Enter your password"
                      />
                      <button
                        type="button"
                        className="btn btn-link position-absolute top-50 end-0 translate-middle-y pe-3"
                        onClick={() => setShowPassword(!showPassword)}
                        style={{ 
                          border: 'none', 
                          background: 'none',
                          color: '#6c757d'
                        }}
                      >
                        <i className={`bi bi-eye${showPassword ? '-slash' : ''}`}></i>
                      </button>
                    </div>
                  </div>

                  <div className="mb-3 form-check">
                    <input 
                      type="checkbox" 
                      className="form-check-input" 
                      id="rememberMe"
                    />
                    <label className="form-check-label" htmlFor="rememberMe">
                      Remember me
                    </label>
                  </div>

                  <button 
                    type="submit" 
                    className="btn btn-primary w-100 mb-3"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Signing in...
                      </>
                    ) : (
                      'Sign In'
                    )}
                  </button>

                  <div className="text-center">
                    <p className="mb-2">
                      <Link to="/forgot-password" className="text-decoration-none">
                        Forgot your password?
                      </Link>
                    </p>
                    <p className="mb-0">
                      Don't have an account?{' '}
                      <Link to="/register" className="text-decoration-none fw-semibold">
                        Sign up
                      </Link>
                    </p>
                  </div>
                </form>

                <div className="mt-4 pt-4 border-top">
                  <div className="alert alert-info mb-0">
                    <i className="bi bi-shield-lock me-2"></i>
                    <strong>Secure Platform</strong>
                    <p className="mb-0 mt-2 small">
                      Your private keys are never sent to our servers. All cryptographic operations 
                      are performed locally in your browser.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;