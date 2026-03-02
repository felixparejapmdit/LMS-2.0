import React from 'react';
import { useAuth } from '../context/AuthContext';

/**
 * PermissionGuard component to conditionally render children based on user permissions.
 * 
 * @param {string} page - The page identifier (e.g., 'master-table')
 * @param {string} action - The action identifier (e.g., 'can_view', 'can_edit')
 * @param {React.ReactNode} children - The content to render if permitted
 * @param {React.ReactNode} fallback - Optional content to render if not permitted
 */
export default function PermissionGuard({ page, action = 'can_view', children, fallback = null }) {
    const { hasPermission, loading } = useAuth();

    if (loading) return null;

    if (hasPermission(page, action)) {
        return <>{children}</>;
    }

    return <>{fallback}</>;
}
