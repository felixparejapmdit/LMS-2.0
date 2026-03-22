const express = require('express');
const router = express.Router();
const RolePermissionController = require('../controllers/RolePermissionController');

router.get('/', RolePermissionController.getAll);
router.get('/role/:roleId', RolePermissionController.getByRole);
router.get('/roles', RolePermissionController.getRoles);
router.get('/roles-with-permissions', RolePermissionController.getRolesWithPermissions);
router.get('/setup-status', RolePermissionController.checkSetupStatus);

router.post('/roles', RolePermissionController.createRole);
router.put('/roles/:id', RolePermissionController.updateRole);
router.delete('/roles/:id', RolePermissionController.deleteRole);

router.post('/bulk-update', RolePermissionController.updateMultiple);

module.exports = router;
