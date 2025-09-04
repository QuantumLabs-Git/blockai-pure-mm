import React, { useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-toastify';
import axios from 'axios';

const Settings = () => {
  const { user, updateUserProfile } = useAuth();
  const fileInputRef = useRef(null);
  
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState(user?.profilePhoto || null);
  
  // Profile form state
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    email: user?.email || ''
  });
  
  // Password form state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  // Security settings
  const [securitySettings, setSecuritySettings] = useState({
    twoFactorEnabled: user?.settings?.security?.twoFactorEnabled || false
  });
  
  // Password visibility toggles
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleProfilePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      toast.error('Please select a valid image file (JPEG, PNG, or GIF)');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size should be less than 5MB');
      return;
    }

    // Convert to base64
    const reader = new FileReader();
    reader.onloadend = () => {
      setProfilePhoto(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    
    if (!profileData.name.trim()) {
      toast.error('Name is required');
      return;
    }
    
    if (!profileData.email.trim()) {
      toast.error('Email is required');
      return;
    }
    
    setLoading(true);
    try {
      const response = await axios.put('/api/auth/profile', {
        name: profileData.name,
        email: profileData.email,
        profilePhoto: profilePhoto
      });
      
      if (response.data.success) {
        updateUserProfile(response.data.user);
        toast.success('Profile updated successfully');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    
    if (!passwordData.currentPassword) {
      toast.error('Current password is required');
      return;
    }
    
    if (!passwordData.newPassword) {
      toast.error('New password is required');
      return;
    }
    
    if (passwordData.newPassword.length < 8) {
      toast.error('Password must be at least 8 characters long');
      return;
    }
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    
    setLoading(true);
    try {
      const response = await axios.put('/api/auth/change-password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      
      if (response.data.success) {
        toast.success('Password changed successfully');
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle2FA = async () => {
    setLoading(true);
    try {
      const response = await axios.post('/api/auth/2fa/toggle', {
        enable: !securitySettings.twoFactorEnabled
      });
      
      if (response.data.success) {
        setSecuritySettings({
          ...securitySettings,
          twoFactorEnabled: !securitySettings.twoFactorEnabled
        });
        toast.success(
          securitySettings.twoFactorEnabled 
            ? 'Two-factor authentication disabled' 
            : 'Two-factor authentication enabled'
        );
      }
    } catch (error) {
      toast.error('Failed to update security settings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-4">
      <h1 className="mb-4">Settings</h1>
      
      {/* Tab Navigation */}
      <ul className="nav nav-tabs mb-4">
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            <i className="bi bi-person me-2"></i>
            Profile
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === 'security' ? 'active' : ''}`}
            onClick={() => setActiveTab('security')}
          >
            <i className="bi bi-shield-lock me-2"></i>
            Security
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === 'preferences' ? 'active' : ''}`}
            onClick={() => setActiveTab('preferences')}
          >
            <i className="bi bi-gear me-2"></i>
            Preferences
          </button>
        </li>
      </ul>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="row">
          <div className="col-md-8">
            <div className="card">
              <div className="card-header">
                <h5 className="mb-0">Profile Information</h5>
              </div>
              <div className="card-body">
                <form onSubmit={handleProfileUpdate}>
                  {/* Profile Photo */}
                  <div className="mb-4 text-center">
                    <div className="mb-3">
                      {profilePhoto ? (
                        <img
                          src={profilePhoto}
                          alt="Profile"
                          className="rounded-circle"
                          style={{ width: '120px', height: '120px', objectFit: 'cover' }}
                        />
                      ) : (
                        <div 
                          className="bg-secondary rounded-circle d-inline-flex align-items-center justify-content-center"
                          style={{ width: '120px', height: '120px' }}
                        >
                          <i className="bi bi-person-circle text-white" style={{ fontSize: '60px' }}></i>
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-primary"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <i className="bi bi-camera me-2"></i>
                      Change Photo
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={handleProfilePhotoChange}
                    />
                  </div>

                  {/* Name */}
                  <div className="mb-3">
                    <label className="form-label">Name</label>
                    <input
                      type="text"
                      className="form-control"
                      value={profileData.name}
                      onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                      required
                    />
                  </div>

                  {/* Email */}
                  <div className="mb-3">
                    <label className="form-label">Email Address</label>
                    <input
                      type="email"
                      className="form-control"
                      value={profileData.email}
                      onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                      required
                    />
                    <div className="form-text">
                      Changing your email will require verification
                    </div>
                  </div>

                  {/* User ID */}
                  <div className="mb-3">
                    <label className="form-label">User ID</label>
                    <input
                      type="text"
                      className="form-control"
                      value={user?.id || ''}
                      disabled
                    />
                    <div className="form-text">
                      Your unique identifier (cannot be changed)
                    </div>
                  </div>

                  {/* Member Since */}
                  <div className="mb-3">
                    <label className="form-label">Member Since</label>
                    <input
                      type="text"
                      className="form-control"
                      value={user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                      disabled
                    />
                  </div>

                  <button 
                    type="submit" 
                    className="btn btn-primary"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2"></span>
                        Saving...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-check-circle me-2"></i>
                        Save Changes
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>
          </div>

          {/* Account Stats */}
          <div className="col-md-4">
            <div className="card">
              <div className="card-header">
                <h5 className="mb-0">Account Statistics</h5>
              </div>
              <div className="card-body">
                <div className="mb-3">
                  <small className="text-muted">Total Projects</small>
                  <h4>{user?.stats?.projectCount || 0}</h4>
                </div>
                <div className="mb-3">
                  <small className="text-muted">Total Trades</small>
                  <h4>{user?.stats?.tradeCount || 0}</h4>
                </div>
                <div className="mb-3">
                  <small className="text-muted">Account Type</small>
                  <h4 className="text-capitalize">{user?.role || 'User'}</h4>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Security Tab */}
      {activeTab === 'security' && (
        <div className="row">
          <div className="col-md-8">
            {/* Password Change */}
            <div className="card mb-4">
              <div className="card-header">
                <h5 className="mb-0">Change Password</h5>
              </div>
              <div className="card-body">
                <form onSubmit={handlePasswordChange}>
                  <div className="mb-3">
                    <label className="form-label">Current Password</label>
                    <div className="position-relative">
                      <input
                        type={showCurrentPassword ? "text" : "password"}
                        className="form-control pe-5"
                        value={passwordData.currentPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                        required
                      />
                      <button
                        type="button"
                        className="btn btn-link position-absolute top-50 end-0 translate-middle-y pe-3"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        style={{ 
                          border: 'none', 
                          background: 'none',
                          color: '#6c757d'
                        }}
                      >
                        <i className={`bi bi-eye${showCurrentPassword ? '-slash' : ''}`}></i>
                      </button>
                    </div>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">New Password</label>
                    <div className="position-relative">
                      <input
                        type={showNewPassword ? "text" : "password"}
                        className="form-control pe-5"
                        value={passwordData.newPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                        required
                      />
                      <button
                        type="button"
                        className="btn btn-link position-absolute top-50 end-0 translate-middle-y pe-3"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        style={{ 
                          border: 'none', 
                          background: 'none',
                          color: '#6c757d'
                        }}
                      >
                        <i className={`bi bi-eye${showNewPassword ? '-slash' : ''}`}></i>
                      </button>
                    </div>
                    <div className="form-text">
                      Must be at least 8 characters long
                    </div>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Confirm New Password</label>
                    <div className="position-relative">
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        className="form-control pe-5"
                        value={passwordData.confirmPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
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
                    className="btn btn-primary"
                    disabled={loading}
                  >
                    {loading ? 'Changing...' : 'Change Password'}
                  </button>
                </form>
              </div>
            </div>

            {/* Two-Factor Authentication */}
            <div className="card">
              <div className="card-header">
                <h5 className="mb-0">Two-Factor Authentication</h5>
              </div>
              <div className="card-body">
                <p>Add an extra layer of security to your account</p>
                <div className="form-check form-switch">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="2faToggle"
                    checked={securitySettings.twoFactorEnabled}
                    onChange={handleToggle2FA}
                    disabled={loading}
                  />
                  <label className="form-check-label" htmlFor="2faToggle">
                    Enable Two-Factor Authentication
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div className="col-md-4">
            <div className="card">
              <div className="card-header">
                <h5 className="mb-0">Security Tips</h5>
              </div>
              <div className="card-body">
                <ul className="list-unstyled">
                  <li className="mb-2">
                    <i className="bi bi-check-circle text-success me-2"></i>
                    Use a strong, unique password
                  </li>
                  <li className="mb-2">
                    <i className="bi bi-check-circle text-success me-2"></i>
                    Enable two-factor authentication
                  </li>
                  <li className="mb-2">
                    <i className="bi bi-check-circle text-success me-2"></i>
                    Keep your email secure
                  </li>
                  <li className="mb-2">
                    <i className="bi bi-check-circle text-success me-2"></i>
                    Log out when using shared devices
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Preferences Tab */}
      {activeTab === 'preferences' && (
        <div className="row">
          <div className="col-md-8">
            <div className="card">
              <div className="card-header">
                <h5 className="mb-0">Preferences</h5>
              </div>
              <div className="card-body">
                <p className="text-muted">Notification and display preferences coming soon...</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;