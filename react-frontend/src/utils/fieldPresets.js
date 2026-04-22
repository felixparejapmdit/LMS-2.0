export const PAGE_FIELD_PRESETS = {
    "home": ["refresh_button", "quick_new_letter_button", "quick_trays_button"],
    "vip-view": ["step_selector", "pdf_button", "comment_box", "submit_button", "edit_button", "delete_button", "logout_button"],
    "new-letter": ["sender_field", "summary_field", "status_dropdown", "department_selector", "attachment_selector", "attachment_upload", "kind_dropdown", "tray_selector", "save_button"],
    "inbox": ["search", "refresh_button", "tab_filter", "tray_selector"],
    "outbox": ["search", "refresh_button"],
    "spam": ["search", "submit_button", "clear_button", "save_button", "refresh_button"],
    "master-table": ["search", "edit_button", "delete_button", "status_dropdown", "department_selector", "step_selector", "pdf_button", "save_button", "attachment_upload", "endorse_button", "track_button", "print_qr_button", "refresh_button"],
    "letters-with-comments": ["search", "pdf_button", "tab_filter", "refresh_button"],
    "letter-tracker": ["search", "pdf_button", "track_button", "print_qr_button", "refresh_button"],
    "upload-pdf": ["attachment_upload", "save_button", "pdf_button", "delete_button", "view_toggle"],
    "guest-send-letter": ["sender_field", "encoder_field", "summary_field", "attachment_selector", "kind_dropdown", "attachment_upload", "submit_button", "clear_button"],
    "endorsements": ["search", "print_button", "delete_button", "view_button", "refresh_button"],
    "settings": ["save_button", "layout_selector", "font_selector"],
    "attachments": ["add_button", "edit_button", "delete_button", "save_button", "refresh_button", "view_toggle"],
    "persons": ["add_button", "edit_button", "delete_button", "save_button", "refresh_button", "view_toggle"],
    "data-import": ["persons_import_button", "users_import_button"],
    "departments": ["add_button", "edit_button", "delete_button", "save_button", "refresh_button", "view_toggle"],
    "letter-kinds": ["add_button", "edit_button", "delete_button", "save_button", "refresh_button", "view_toggle"],
    "statuses": ["add_button", "edit_button", "delete_button", "save_button", "refresh_button", "view_toggle"],
    "process-steps": ["add_button", "edit_button", "delete_button", "save_button", "refresh_button", "view_toggle"],
    "trays": ["add_button", "edit_button", "delete_button", "save_button", "refresh_button", "view_toggle", "navigate_button"],
    "users": ["search", "add_button", "edit_button", "delete_button", "save_button", "refresh_button", "view_toggle", "role_filter", "department_filter", "avatar_upload"],
    "role-matrix": ["search", "save_button", "edit_field", "allow_all_button", "restrict_button", "role_selector", "department_filter"],
    "setup": ["department_field", "dept_code_field", "template_selector", "add_button", "delete_button", "submit_button", "next_button", "back_button"],
    "letter-detail": ["pdf_button", "back_button"],
    "department-letters": ["back_button", "search", "refresh_button", "tab_filter", "tray_selector"],
    "profile": ["save_button", "password_field", "avatar_upload", "username_field"]
};

export const getFieldPresetForPage = (pageId = "") => {
    const keys = PAGE_FIELD_PRESETS[pageId] || ["search", "save_button"];
    return keys.reduce((acc, key) => {
        acc[key] = true;
        return acc;
    }, {});
};
