import { useAuth } from "../context/AuthContext";

/**
 * useAccess Hook
 * 
 * Provides granular permission checking for pages and components.
 * 
 * Usage:
 * const { can, canField } = useAccess();
 * if (can('users', 'can_edit')) { ... }
 * if (canField('users', 'salary_field')) { ... }
 */
export const useAccess = () => {
    const { user, permissions } = useAuth();

    // Check if user is an Administrator (Super Admin bypass)
    const roleName = (user?.roleData?.name || user?.role || '').toString().toUpperCase();
    const isSuperAdmin =
        roleName === 'ADMIN' ||
        roleName === 'SUPER ADMIN' ||
        roleName === 'SUPERADMIN' ||
        roleName === 'ADMINISTRATOR' ||
        roleName === 'DEVELOPER' ||
        user?.email === 'felixpareja07@gmail.com';

    /**
     * Check if the user has a specific action permission for a page
     * @param {string} pageName - The ID of the page (e.g., 'users')
     * @param {string} action - The action type (can_view, can_create, can_edit, can_delete, can_special)
     */
    const can = (pageName, action = 'can_view') => {
        if (isSuperAdmin) return true;
        if (!permissions || permissions.length === 0) return false;

        const perm = permissions.find(p => p.page_name === pageName);
        if (!perm) return false;

        return !!perm[action];
    };

    /**
     * Check if the user has permission to see/interact with a specific field or component
     * @param {string} pageName - The ID of the page
     * @param {string} fieldId - The unique ID of the field/component
     */
    const canField = (pageName, fieldId) => {
        if (isSuperAdmin) return true;
        if (!permissions || permissions.length === 0) return false;

        const perm = permissions.find(p => p.page_name === pageName);
        if (!perm || !perm.field_permissions) return true; // Default to TRUE if no field restrictions exist

        // If explicitly restricted (set to false)
        if (perm.field_permissions[fieldId] === false) return false;

        return true;
    };

    return {
        can,
        canField,
        isSuperAdmin,
        role: roleName
    };
};

export default useAccess;
