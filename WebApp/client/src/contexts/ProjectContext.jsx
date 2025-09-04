import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

const ProjectContext = createContext();

export const useProject = () => {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
};

export const ProjectProvider = ({ children }) => {
  const [projects, setProjects] = useState([]);
  const [currentProject, setCurrentProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { isAuthenticated } = useAuth();

  // Fetch all projects for the user
  const fetchProjects = async () => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/projects', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch projects');
      }

      const data = await response.json();
      setProjects(data);

      // If no current project is selected and projects exist, select the first one
      if (!currentProject && data.length > 0) {
        // Check localStorage for last selected project
        const lastProjectId = localStorage.getItem('lastSelectedProject');
        const lastProject = data.find(p => p._id === lastProjectId);
        
        if (lastProject) {
          setCurrentProject(lastProject);
        } else {
          setCurrentProject(data[0]);
          localStorage.setItem('lastSelectedProject', data[0]._id);
        }
      }
    } catch (err) {
      console.error('Error fetching projects:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Create a new project
  const createProject = async (projectData) => {
    const token = localStorage.getItem('token');
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(projectData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create project');
      }

      const newProject = await response.json();
      setProjects(prev => [...prev, newProject]);
      
      // Automatically select the new project
      setCurrentProject(newProject);
      localStorage.setItem('lastSelectedProject', newProject._id);
      
      return newProject;
    } catch (err) {
      console.error('Error creating project:', err);
      throw err;
    }
  };

  // Update project settings
  const updateProject = async (projectId, updates) => {
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        throw new Error('Failed to update project');
      }

      const updatedProject = await response.json();
      
      // Update in local state
      setProjects(prev => prev.map(p => 
        p._id === projectId ? updatedProject : p
      ));
      
      // Update current project if it's the one being updated
      if (currentProject?._id === projectId) {
        setCurrentProject(updatedProject);
      }
      
      return updatedProject;
    } catch (err) {
      console.error('Error updating project:', err);
      throw err;
    }
  };

  // Switch to a different project
  const switchProject = (project) => {
    setCurrentProject(project);
    localStorage.setItem('lastSelectedProject', project._id);
  };

  // Delete a project
  const deleteProject = async (projectId) => {
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete project');
      }

      // Remove from local state
      setProjects(prev => prev.filter(p => p._id !== projectId));
      
      // If deleted project was current, switch to another
      if (currentProject?._id === projectId) {
        const remaining = projects.filter(p => p._id !== projectId);
        if (remaining.length > 0) {
          setCurrentProject(remaining[0]);
          localStorage.setItem('lastSelectedProject', remaining[0]._id);
        } else {
          setCurrentProject(null);
          localStorage.removeItem('lastSelectedProject');
        }
      }
    } catch (err) {
      console.error('Error deleting project:', err);
      throw err;
    }
  };

  // Add trading history to current project
  const addTrade = async (tradeData) => {
    if (!currentProject) {
      throw new Error('No project selected');
    }

    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`/api/projects/${currentProject._id}/trades`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(tradeData)
      });

      if (!response.ok) {
        throw new Error('Failed to record trade');
      }

      // Refresh current project to get updated stats
      await fetchProjects();
    } catch (err) {
      console.error('Error recording trade:', err);
      throw err;
    }
  };

  // Add log entry to current project
  const addLog = async (activity, message, type = 'info', metadata = {}) => {
    if (!currentProject) {
      throw new Error('No project selected');
    }

    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`/api/projects/${currentProject._id}/logs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          activity,
          message,
          type,
          metadata
        })
      });

      if (!response.ok) {
        throw new Error('Failed to add log');
      }

      return await response.json();
    } catch (err) {
      console.error('Error adding log:', err);
      throw err;
    }
  };

  // Get logs for current project
  const getProjectLogs = async (limit = 100) => {
    if (!currentProject) {
      return [];
    }

    const token = localStorage.getItem('token');
    try {
      const response = await fetch(
        `/api/projects/${currentProject._id}/logs?limit=${limit}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch logs');
      }

      return await response.json();
    } catch (err) {
      console.error('Error fetching logs:', err);
      return [];
    }
  };

  // Effect to fetch projects when auth state changes
  useEffect(() => {
    if (isAuthenticated) {
      fetchProjects();
    } else {
      setProjects([]);
      setCurrentProject(null);
      setLoading(false);
    }
  }, [isAuthenticated]);

  // Helper function to get chain-specific data from current project
  const getChainData = (chain) => {
    if (!currentProject || !currentProject.tokens) {
      return null;
    }
    return currentProject.tokens[chain] || null;
  };

  // Helper function to check if user has permission
  const hasPermission = (permission = 'viewer') => {
    if (!currentProject) return false;
    
    const userId = localStorage.getItem('userId'); // Assuming userId is stored
    if (currentProject.owner._id === userId) return true;
    
    const member = currentProject.members.find(m => m.user._id === userId);
    if (!member) return false;
    
    const roleHierarchy = { owner: 4, admin: 3, member: 2, viewer: 1 };
    return roleHierarchy[member.role] >= roleHierarchy[permission];
  };

  const value = {
    projects,
    currentProject,
    loading,
    error,
    createProject,
    updateProject,
    switchProject,
    deleteProject,
    addTrade,
    addLog,
    getProjectLogs,
    getChainData,
    hasPermission,
    refreshProjects: fetchProjects
  };

  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  );
};