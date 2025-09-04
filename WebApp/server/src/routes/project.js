const express = require('express');
const router = express.Router();
const Project = require('../models/Project');
const { authMiddleware: auth } = require('../middleware/auth');

// Get all projects for the current user
router.get('/', auth, async (req, res) => {
  try {
    const projects = await Project.find({
      $or: [
        { owner: req.userId },
        { 'members.user': req.userId }
      ],
      isActive: true
    })
    .populate('owner', 'name email')
    .populate('members.user', 'name email')
    .sort('-updatedAt');

    res.json(projects);
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

// Get a specific project
router.get('/:id', auth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('owner', 'name email')
      .populate('members.user', 'name email');

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Check access
    if (!project.hasAccess(req.userId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(project);
  } catch (error) {
    console.error('Error fetching project:', error);
    res.status(500).json({ error: 'Failed to fetch project' });
  }
});

// Create a new project
router.post('/', auth, async (req, res) => {
  try {
    const { name, description, defaultChain } = req.body;

    // Check if project name already exists for this user
    const existing = await Project.findOne({
      name,
      owner: req.userId,
      isActive: true
    });

    if (existing) {
      return res.status(400).json({ error: 'Project with this name already exists' });
    }

    const project = new Project({
      name,
      description,
      owner: req.userId,
      members: [{
        user: req.userId,
        role: 'owner'
      }],
      settings: {
        defaultChain: defaultChain || 'solana'
      }
    });

    await project.save();
    
    // Populate owner info before sending
    await project.populate('owner', 'name email');
    await project.populate('members.user', 'name email');

    res.status(201).json(project);
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({ error: 'Failed to create project' });
  }
});

// Update project settings
router.patch('/:id', auth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Check if user has admin access
    if (!project.hasAccess(req.userId, 'admin')) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Update allowed fields
    const allowedUpdates = ['name', 'description', 'settings', 'tokens', 'wallets'];
    const updates = Object.keys(req.body)
      .filter(key => allowedUpdates.includes(key))
      .reduce((obj, key) => {
        obj[key] = req.body[key];
        return obj;
      }, {});

    Object.assign(project, updates);
    await project.save();

    await project.populate('owner', 'name email');
    await project.populate('members.user', 'name email');

    res.json(project);
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).json({ error: 'Failed to update project' });
  }
});

// Add a member to project
router.post('/:id/members', auth, async (req, res) => {
  try {
    const { userId, role = 'member' } = req.body;
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Check if user has admin access
    if (!project.hasAccess(req.userId, 'admin')) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Check if member already exists
    const existingMember = project.members.find(
      m => m.user.toString() === userId
    );

    if (existingMember) {
      return res.status(400).json({ error: 'User is already a member' });
    }

    project.members.push({ user: userId, role });
    await project.save();

    await project.populate('members.user', 'name email');
    res.json(project);
  } catch (error) {
    console.error('Error adding member:', error);
    res.status(500).json({ error: 'Failed to add member' });
  }
});

// Remove a member from project
router.delete('/:id/members/:userId', auth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Check if user has admin access
    if (!project.hasAccess(req.userId, 'admin')) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Cannot remove owner
    if (project.owner.toString() === req.params.userId) {
      return res.status(400).json({ error: 'Cannot remove project owner' });
    }

    project.members = project.members.filter(
      m => m.user.toString() !== req.params.userId
    );

    await project.save();
    res.json({ message: 'Member removed successfully' });
  } catch (error) {
    console.error('Error removing member:', error);
    res.status(500).json({ error: 'Failed to remove member' });
  }
});

// Add trading history entry
router.post('/:id/trades', auth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Check if user has member access
    if (!project.hasAccess(req.userId, 'member')) {
      return res.status(403).json({ error: 'Member access required' });
    }

    await project.addTrade(req.body);
    res.json({ message: 'Trade recorded successfully' });
  } catch (error) {
    console.error('Error recording trade:', error);
    res.status(500).json({ error: 'Failed to record trade' });
  }
});

// Add log entry
router.post('/:id/logs', auth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Check if user has member access
    if (!project.hasAccess(req.userId, 'member')) {
      return res.status(403).json({ error: 'Member access required' });
    }

    const { activity, message, type = 'info', metadata = {} } = req.body;

    // Map type to level for the model
    const level = type === 'error' ? 'error' : type === 'warning' ? 'warning' : 'info';
    
    await project.addLog(level, `[${activity}] ${message}`, metadata);
    res.json({ message: 'Log added successfully' });
  } catch (error) {
    console.error('Error adding log:', error);
    res.status(500).json({ error: 'Failed to add log' });
  }
});

// Get project logs
router.get('/:id/logs', auth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .select('logs');

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Check access
    if (!project.hasAccess(req.userId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Return last 100 logs by default
    const limit = parseInt(req.query.limit) || 100;
    const logs = project.logs.slice(-limit);

    res.json(logs);
  } catch (error) {
    console.error('Error fetching logs:', error);
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

// Delete project (soft delete)
router.delete('/:id', auth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Only owner can delete
    if (project.owner.toString() !== req.userId) {
      return res.status(403).json({ error: 'Only project owner can delete' });
    }

    project.isActive = false;
    await project.save();

    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

module.exports = router;