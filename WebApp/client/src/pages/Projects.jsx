import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProject } from '../contexts/ProjectContext';
import { toast } from 'react-toastify';

const Projects = () => {
  const navigate = useNavigate();
  const { projects, currentProject, switchProject, createProject, deleteProject, loading } = useProject();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProject, setNewProject] = useState({
    name: '',
    description: '',
    defaultChain: 'solana'
  });

  const handleCreateProject = async (e) => {
    e.preventDefault();
    
    try {
      const project = await createProject(newProject);
      toast.success(`Project "${project.name}" created successfully!`);
      setShowCreateModal(false);
      setNewProject({ name: '', description: '', defaultChain: 'solana' });
      navigate('/');
    } catch (error) {
      toast.error(error.message || 'Failed to create project');
    }
  };

  const handleSelectProject = (project) => {
    switchProject(project);
    navigate('/');
    toast.success(`Switched to project: ${project.name}`);
  };

  const handleDeleteProject = async (project) => {
    if (!window.confirm(`Are you sure you want to delete "${project.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await deleteProject(project._id);
      toast.success(`Project "${project.name}" deleted successfully`);
    } catch (error) {
      toast.error(error.message || 'Failed to delete project');
    }
  };

  if (loading) {
    return (
      <div className="container-fluid py-4">
        <div className="text-center">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid py-4">
      <div className="row mb-4">
        <div className="col-12">
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h2 className="mb-0">
                <i className="bi bi-folder2-open me-2"></i>
                Projects
              </h2>
              <p className="text-muted">Manage your trading projects</p>
            </div>
            <button 
              className="btn btn-primary"
              onClick={() => setShowCreateModal(true)}
            >
              <i className="bi bi-plus-circle me-2"></i>
              Create New Project
            </button>
          </div>
        </div>
      </div>

      {/* No Projects Message */}
      {projects.length === 0 && (
        <div className="row">
          <div className="col-12">
            <div className="card text-center py-5">
              <div className="card-body">
                <i className="bi bi-folder-plus display-1 text-muted mb-3"></i>
                <h4>No Projects Yet</h4>
                <p className="text-muted">Create your first project to get started</p>
                <button 
                  className="btn btn-primary"
                  onClick={() => setShowCreateModal(true)}
                >
                  <i className="bi bi-plus-circle me-2"></i>
                  Create Your First Project
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Projects Grid */}
      <div className="row">
        {projects.map(project => (
          <div key={project._id} className="col-md-6 col-lg-4 mb-4">
            <div className={`card h-100 ${currentProject?._id === project._id ? 'border-primary' : ''}`}>
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-start mb-3">
                  <h5 className="card-title mb-0">
                    {project.name}
                    {currentProject?._id === project._id && (
                      <span className="badge bg-primary ms-2">Active</span>
                    )}
                  </h5>
                  <div className="dropdown">
                    <button 
                      className="btn btn-sm btn-secondary dropdown-toggle"
                      type="button"
                      data-bs-toggle="dropdown"
                    >
                      <i className="bi bi-three-dots-vertical"></i>
                    </button>
                    <ul className="dropdown-menu">
                      <li>
                        <button 
                          className="dropdown-item"
                          onClick={() => navigate(`/projects/${project._id}/settings`)}
                        >
                          <i className="bi bi-gear me-2"></i>
                          Settings
                        </button>
                      </li>
                      <li><hr className="dropdown-divider" /></li>
                      <li>
                        <button 
                          className="dropdown-item text-danger"
                          onClick={() => handleDeleteProject(project)}
                        >
                          <i className="bi bi-trash me-2"></i>
                          Delete
                        </button>
                      </li>
                    </ul>
                  </div>
                </div>

                <p className="card-text text-muted">
                  {project.description || 'No description provided'}
                </p>

                <div className="mb-3">
                  <small className="text-muted">
                    <i className="bi bi-calendar me-1"></i>
                    Created: {new Date(project.createdAt).toLocaleDateString()}
                  </small>
                  <br />
                  <small className="text-muted">
                    <i className="bi bi-activity me-1"></i>
                    Last activity: {project.stats?.lastActivity 
                      ? new Date(project.stats.lastActivity).toLocaleDateString() 
                      : 'No activity yet'}
                  </small>
                </div>

                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <span className="badge bg-secondary me-2">
                      {project.settings?.defaultChain || 'solana'}
                    </span>
                    <span className="badge bg-info">
                      {project.stats?.totalTrades || 0} trades
                    </span>
                  </div>
                  <button 
                    className="btn btn-primary btn-sm"
                    onClick={() => handleSelectProject(project)}
                    disabled={currentProject?._id === project._id}
                  >
                    {currentProject?._id === project._id ? 'Current' : 'Select'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Create Project Modal */}
      {showCreateModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Create New Project</h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => setShowCreateModal(false)}
                ></button>
              </div>
              <form onSubmit={handleCreateProject}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label htmlFor="projectName" className="form-label">Project Name *</label>
                    <input
                      type="text"
                      className="form-control"
                      id="projectName"
                      value={newProject.name}
                      onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                      required
                      placeholder="My Trading Project"
                    />
                  </div>

                  <div className="mb-3">
                    <label htmlFor="projectDescription" className="form-label">Description</label>
                    <textarea
                      className="form-control"
                      id="projectDescription"
                      rows="3"
                      value={newProject.description}
                      onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                      placeholder="Brief description of your project..."
                    />
                  </div>

                  <div className="mb-3">
                    <label htmlFor="defaultChain" className="form-label">Default Blockchain</label>
                    <select
                      className="form-select"
                      id="defaultChain"
                      value={newProject.defaultChain}
                      onChange={(e) => setNewProject({ ...newProject, defaultChain: e.target.value })}
                    >
                      <option value="ethereum">Ethereum</option>
                      <option value="solana">Solana</option>
                      <option value="bsc">BSC</option>
                      <option value="base">Base</option>
                      <option value="sui">Sui</option>
                    </select>
                  </div>
                </div>
                <div className="modal-footer">
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    onClick={() => setShowCreateModal(false)}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="btn btn-primary"
                    disabled={!newProject.name.trim()}
                  >
                    <i className="bi bi-plus-circle me-2"></i>
                    Create Project
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Projects;