import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Register = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      alert('Passwords do not match');
      return;
    }

    setLoading(true);
    const result = await register(formData.email, formData.password, formData.name);
    
    if (result.success) {
      navigate('/login');
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
                  <h2 className="fw-bold">Create Account</h2>
                  <p className="text-muted">Join BlockAI Pure MM</p>
                </div>

                <form onSubmit={handleSubmit}>
                  <div className="mb-3">
                    <label htmlFor="name" className="form-label">Full Name</label>
                    <input
                      type="text"
                      className="form-control"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                    />
                  </div>

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
                        minLength="8"
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

                  <div className="mb-3">
                    <label htmlFor="confirmPassword" className="form-label">Confirm Password</label>
                    <div className="position-relative">
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        className="form-control pe-5"
                        id="confirmPassword"
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        required
                      />
                      <button
                        type="button"
                        className="btn btn-link position-absolute top-50 end-0 translate-middle-y pe-3"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        style={{ 
                          border: 'none', 
                          background: 'none',
                          color: '#6c757d'
                        }}
                      >
                        <i className={`bi bi-eye${showConfirmPassword ? '-slash' : ''}`}></i>
                      </button>
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    className="btn btn-primary w-100 mb-3"
                    disabled={loading}
                  >
                    {loading ? 'Creating Account...' : 'Create Account'}
                  </button>

                  <div className="text-center">
                    <p className="mb-0">
                      Already have an account?{' '}
                      <Link to="/login" className="text-decoration-none fw-semibold">
                        Sign in
                      </Link>
                    </p>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;