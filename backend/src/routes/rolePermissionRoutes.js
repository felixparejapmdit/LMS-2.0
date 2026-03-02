const express = require('express');
const router = express.Router();
const RolePermissionController = require('../controllers/RolePermissionController');

router.get('/', RolePermissionController.getAll);
router.get('/role/:roleId', RolePermissionController.getByRole);
router.get('/roles-with-permissions', RolePermissionController.getRolesWithPermissions);
router.post('/bulk-update', RolePermissionController.updateMultiple);

module.exports = router;
