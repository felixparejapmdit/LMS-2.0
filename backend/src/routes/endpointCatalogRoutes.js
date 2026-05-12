const express = require('express');
const router = express.Router();

const ENDPOINT_CATALOG = [
  // Auth
  { path: '/api/auth/login', method: 'POST', department: 'Authentication', securityLevel: 'Public', description: 'User login' },
  { path: '/api/auth/me', method: 'GET', department: 'Authentication', securityLevel: 'User', description: 'Get current user profile' },
  { path: '/api/auth/validate-token', method: 'POST', department: 'Authentication', securityLevel: 'User', description: 'Validate auth token' },
  
  // Letters
  { path: '/api/letters', method: 'GET', department: 'Letters', securityLevel: 'User', description: 'Get all letters' },
  { path: '/api/letters/:id', method: 'GET', department: 'Letters', securityLevel: 'User', description: 'Get letter by ID' },
  { path: '/api/letters', method: 'POST', department: 'Letters', securityLevel: 'User', description: 'Create a new letter' },
  { path: '/api/letters/:id', method: 'PUT', department: 'Letters', securityLevel: 'User', description: 'Update a letter' },
  { path: '/api/letters/:id', method: 'DELETE', department: 'Letters', securityLevel: 'Admin', description: 'Delete a letter' },
  
  // Letter Assignments
  { path: '/api/letter-assignments', method: 'GET', department: 'Letters', securityLevel: 'User', description: 'Get letter assignments' },
  { path: '/api/letter-assignments', method: 'POST', department: 'Letters', securityLevel: 'User', description: 'Assign a letter' },
  
  // Trays
  { path: '/api/trays', method: 'GET', department: 'Trays', securityLevel: 'User', description: 'Get all trays' },
  { path: '/api/trays/:id', method: 'GET', department: 'Trays', securityLevel: 'User', description: 'Get tray by ID' },
  { path: '/api/trays', method: 'POST', department: 'Trays', securityLevel: 'Admin', description: 'Create a tray' },
  { path: '/api/trays/:id', method: 'PUT', department: 'Trays', securityLevel: 'Admin', description: 'Update a tray' },
  { path: '/api/trays/:id', method: 'DELETE', department: 'Trays', securityLevel: 'Admin', description: 'Delete a tray' },

  // Departments
  { path: '/api/departments', method: 'GET', department: 'Departments', securityLevel: 'User', description: 'Get all departments' },
  { path: '/api/departments/:id', method: 'GET', department: 'Departments', securityLevel: 'User', description: 'Get department by ID' },
  { path: '/api/departments', method: 'POST', department: 'Departments', securityLevel: 'Admin', description: 'Create a department' },
  { path: '/api/departments/:id', method: 'PUT', department: 'Departments', securityLevel: 'Admin', description: 'Update a department' },
  { path: '/api/departments/:id', method: 'DELETE', department: 'Departments', securityLevel: 'Admin', description: 'Delete a department' },

  // Statuses
  { path: '/api/statuses', method: 'GET', department: 'System', securityLevel: 'User', description: 'Get all statuses' },
  { path: '/api/statuses/:id', method: 'GET', department: 'System', securityLevel: 'User', description: 'Get status by ID' },
  { path: '/api/statuses', method: 'POST', department: 'System', securityLevel: 'Admin', description: 'Create a status' },
  { path: '/api/statuses/:id', method: 'PUT', department: 'System', securityLevel: 'Admin', description: 'Update a status' },
  { path: '/api/statuses/:id', method: 'DELETE', department: 'System', securityLevel: 'Admin', description: 'Delete a status' },

  // Letter Kinds
  { path: '/api/letter-kinds', method: 'GET', department: 'System', securityLevel: 'User', description: 'Get all letter kinds' },
  { path: '/api/letter-kinds', method: 'POST', department: 'System', securityLevel: 'Admin', description: 'Create a letter kind' },
  { path: '/api/letter-kinds/:id', method: 'PUT', department: 'System', securityLevel: 'Admin', description: 'Update a letter kind' },
  { path: '/api/letter-kinds/:id', method: 'DELETE', department: 'System', securityLevel: 'Admin', description: 'Delete a letter kind' },

  // Process Steps
  { path: '/api/process-steps', method: 'GET', department: 'System', securityLevel: 'User', description: 'Get all process steps' },
  { path: '/api/process-steps', method: 'POST', department: 'System', securityLevel: 'Admin', description: 'Create a process step' },
  { path: '/api/process-steps/:id', method: 'PUT', department: 'System', securityLevel: 'Admin', description: 'Update a process step' },
  { path: '/api/process-steps/:id', method: 'DELETE', department: 'System', securityLevel: 'Admin', description: 'Delete a process step' },

  // Users
  { path: '/api/users', method: 'GET', department: 'Users', securityLevel: 'Admin', description: 'Get all users' },
  { path: '/api/users/:id', method: 'GET', department: 'Users', securityLevel: 'Admin', description: 'Get user by ID' },
  { path: '/api/users', method: 'POST', department: 'Users', securityLevel: 'Admin', description: 'Create a user' },
  { path: '/api/users/:id', method: 'PUT', department: 'Users', securityLevel: 'Admin', description: 'Update a user' },
  { path: '/api/users/:id', method: 'DELETE', department: 'Users', securityLevel: 'Admin', description: 'Delete a user' },

  // Attachments
  { path: '/api/attachments', method: 'GET', department: 'Attachments', securityLevel: 'User', description: 'Get all attachments' },
  { path: '/api/attachments', method: 'POST', department: 'Attachments', securityLevel: 'User', description: 'Upload attachment' },
  { path: '/api/attachments/:id', method: 'DELETE', department: 'Attachments', securityLevel: 'User', description: 'Delete attachment' },

  // Stats
  { path: '/api/stats/dashboard', method: 'GET', department: 'Stats', securityLevel: 'User', description: 'Get dashboard statistics' },
  { path: '/api/stats/inbox', method: 'GET', department: 'Stats', securityLevel: 'User', description: 'Get inbox statistics' },

  // Outbox
  { path: '/api/outbox', method: 'GET', department: 'Letters', securityLevel: 'User', description: 'Get outbox items' },

  // Comments
  { path: '/api/comments', method: 'GET', department: 'Comments', securityLevel: 'User', description: 'Get all comments' },
  { path: '/api/comments', method: 'POST', department: 'Comments', securityLevel: 'User', description: 'Create a comment' },
  { path: '/api/comments/:id', method: 'PUT', department: 'Comments', securityLevel: 'User', description: 'Update a comment' },
  { path: '/api/comments/:id', method: 'DELETE', department: 'Comments', securityLevel: 'User', description: 'Delete a comment' },

  // Persons
  { path: '/api/persons', method: 'GET', department: 'Persons', securityLevel: 'User', description: 'Get all persons' },
  { path: '/api/persons/search', method: 'GET', department: 'Persons', securityLevel: 'User', description: 'Search persons' },
  { path: '/api/persons', method: 'POST', department: 'Persons', securityLevel: 'Admin', description: 'Create a person' },
  { path: '/api/persons/:id', method: 'PUT', department: 'Persons', securityLevel: 'Admin', description: 'Update a person' },
  { path: '/api/persons/:id', method: 'DELETE', department: 'Persons', securityLevel: 'Admin', description: 'Delete a person' },

  // Endorsements
  { path: '/api/endorsements', method: 'GET', department: 'Letters', securityLevel: 'User', description: 'Get endorsements' },
  { path: '/api/endorsements', method: 'POST', department: 'Letters', securityLevel: 'User', description: 'Create endorsement' },
  { path: '/api/endorsements/:id', method: 'PUT', department: 'Letters', securityLevel: 'User', description: 'Update endorsement' },

  // Role Permissions
  { path: '/api/role-permissions', method: 'GET', department: 'Security', securityLevel: 'Admin', description: 'Get role permissions' },
  { path: '/api/role-permissions/roles', method: 'GET', department: 'Security', securityLevel: 'Admin', description: 'Get roles' },
  { path: '/api/role-permissions/roles', method: 'POST', department: 'Security', securityLevel: 'Admin', description: 'Create role' },
  { path: '/api/role-permissions/bulk-update', method: 'POST', department: 'Security', securityLevel: 'Admin', description: 'Update permissions in bulk' },

  // System Pages
  { path: '/api/system-pages', method: 'GET', department: 'System', securityLevel: 'Admin', description: 'Get system pages' },
  { path: '/api/system-pages/sync', method: 'POST', department: 'System', securityLevel: 'Admin', description: 'Sync system pages' },

  // Telegram
  { path: '/api/telegram/ping', method: 'GET', department: 'Integrations', securityLevel: 'Admin', description: 'Ping Telegram bot' },
  { path: '/api/telegram/webhook', method: 'POST', department: 'Integrations', securityLevel: 'Public', description: 'Telegram Webhook' },
  { path: '/api/telegram/notify-lms-bot', method: 'POST', department: 'Integrations', securityLevel: 'Admin', description: 'Send LMS Bot Notification' },

  // Inter Dept
  { path: '/api/inter-dept', method: 'GET', department: 'Departments', securityLevel: 'User', description: 'Get inter-department routing' },
  { path: '/api/inter-dept', method: 'POST', department: 'Departments', securityLevel: 'Admin', description: 'Create inter-department routing' },

  // Sections
  { path: '/api/sections/registry', method: 'GET', department: 'Departments', securityLevel: 'User', description: 'Get section registry' },
  { path: '/api/sections/overview', method: 'GET', department: 'Departments', securityLevel: 'User', description: 'Get section overview' },
  { path: '/api/sections/assign-section', method: 'POST', department: 'Departments', securityLevel: 'Admin', description: 'Assign section' },

  // Audit Logs
  { path: '/api/audit-logs', method: 'GET', department: 'Security', securityLevel: 'Admin', description: 'Get audit logs' },

  // Endpoints Catalog
  { path: '/api/endpoint-catalog', method: 'GET', department: 'System', securityLevel: 'Admin', description: 'Get catalog of all API endpoints' }
];

router.get('/', (req, res) => {
  res.json(ENDPOINT_CATALOG);
});

module.exports = router;
