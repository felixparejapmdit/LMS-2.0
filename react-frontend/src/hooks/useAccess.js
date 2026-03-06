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
    const { permissions } = useAuth();
    const normalizePageId = (value = "") => value.toString().toLowerCase().replace(/[^a-z0-9]/g, "");
    const normalizeFieldId = (value = "") => value.toString().toLowerCase().replace(/[^a-z0-9]/g, "");
    const isExplicitFalse = (value) => value === false || `${value}`.toLowerCase() === "false";

    const FIELD_ALIASES = {
        search: ["search", "search_field", "search_input", "searchbox", "search_box", "search_textbox", "search_bar", "filter_search"],
        save_button: ["save_button", "save", "save_btn", "submit_button", "submit_btn", "apply_button"],
        add_button: ["add_button", "add", "add_btn", "create_button", "new_button"],
        edit_button: ["edit_button", "edit", "edit_btn", "update_button"],
        delete_button: ["delete_button", "delete", "delete_btn", "remove_button"],
        view_button: ["view_button", "view", "view_btn", "preview_button"],
        pdf_button: ["pdf_button", "pdf", "view_pdf", "pdf_viewer", "open_pdf"],
        attachment_upload: ["attachment_upload", "upload_attachment", "file_upload", "upload_pdf", "upload_button"],
        sender_field: ["sender_field", "sender", "sender_input"],
        summary_field: ["summary_field", "summary", "summary_input", "content_field"],
        comment_box: ["comment_box", "comment_field", "comment_input", "add_comment"],
        status_dropdown: ["status_dropdown", "status_select", "status_field"],
        department_selector: ["department_selector", "department_select", "department_field"],
        step_selector: ["step_selector", "step_select", "process_step"],
        endorse_button: ["endorse_button", "endorse", "endorse_btn"],
        print_button: ["print_button", "print", "print_btn"],
        edit_field: ["edit_field", "field_editor", "field_permissions"]
    };

    const getFieldCandidates = (fieldId) => {
        const values = Array.isArray(fieldId) ? fieldId : [fieldId];
        const normalizedCandidates = new Set();

        values.forEach((raw) => {
            if (!raw) return;
            const normalized = normalizeFieldId(raw);
            if (!normalized) return;
            normalizedCandidates.add(normalized);

            const aliasGroup = Object.entries(FIELD_ALIASES).find(([, aliases]) =>
                aliases.some((alias) => normalizeFieldId(alias) === normalized)
            );
            if (aliasGroup) {
                aliasGroup[1].forEach((alias) => normalizedCandidates.add(normalizeFieldId(alias)));
            }
        });

        return normalizedCandidates;
    };

    /**
     * Check if the user has a specific action permission for a page
     * @param {string} pageName - The ID of the page (e.g., 'users')
     * @param {string} action - The action type (can_view, can_create, can_edit, can_delete, can_special)
     */
    const can = (pageName, action = 'can_view') => {
        if (!permissions || permissions.length === 0) return false;

        const perm = permissions.find(p =>
            p.page_name === pageName ||
            normalizePageId(p.page_name) === normalizePageId(pageName)
        );
        if (!perm) return false;

        return !!perm[action];
    };

    /**
     * Check if the user has permission to see/interact with a specific field or component
     * @param {string} pageName - The ID of the page
     * @param {string} fieldId - The unique ID of the field/component
     */
    const canField = (pageName, fieldId) => {
        if (!permissions || permissions.length === 0) return true;

        const perm = permissions.find(p =>
            p.page_name === pageName ||
            normalizePageId(p.page_name) === normalizePageId(pageName)
        );
        if (!perm || !perm.field_permissions) return true; // Default to TRUE if no field restrictions exist

        // If explicitly restricted (set to false), including normalized alias matches.
        const deniedFieldIds = new Set(
            Object.entries(perm.field_permissions || {})
                .filter(([, value]) => isExplicitFalse(value))
                .map(([key]) => normalizeFieldId(key))
        );
        const candidates = getFieldCandidates(fieldId);
        for (const candidate of candidates) {
            if (deniedFieldIds.has(candidate)) return false;
        }

        return true;
    };

    return {
        can,
        canField,
        isSuperAdmin: false,
        role: null
    };
};

export default useAccess;
