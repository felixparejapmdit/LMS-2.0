export const PAGE_FIELD_PRESETS = {
    "letter-tracker": ["search"],
    "master-table": ["search", "edit_button", "delete_button", "status_dropdown", "department_selector", "step_selector", "pdf_button", "save_button", "attachment_upload", "endorse_button"],
    "new-letter": ["sender_field", "summary_field", "status_dropdown", "department_selector", "attachment_upload", "save_button"],
    "vip-view": ["search", "comment_box", "submit_button", "pdf_button"],
    "guest-send-letter": ["sender_field", "summary_field", "attachment_upload", "submit_button"],
    "endorsements": ["search", "print_button", "delete_button", "view_button"],
    "letters-with-comments": ["search", "comment_box", "pdf_button"],
    "upload-pdf": ["attachment_upload", "search", "save_button"],
    "users": ["search", "add_button", "edit_button", "delete_button", "save_button"],
    "departments": ["search", "add_button", "edit_button", "delete_button", "save_button"],
    "persons": ["search", "add_button", "edit_button", "delete_button", "save_button"],
    "letter-kinds": ["search", "add_button", "edit_button", "delete_button", "save_button"],
    "statuses": ["search", "add_button", "edit_button", "delete_button", "save_button"],
    "process-steps": ["search", "add_button", "edit_button", "delete_button", "save_button"],
    "trays": ["search", "add_button", "edit_button", "delete_button", "save_button"],
    "role-matrix": ["search", "save_button", "edit_field"],
    "settings": ["save_button"]
};

export const getFieldPresetForPage = (pageId = "") => {
    const keys = PAGE_FIELD_PRESETS[pageId] || ["search", "save_button"];
    return keys.reduce((acc, key) => {
        acc[key] = true;
        return acc;
    }, {});
};

