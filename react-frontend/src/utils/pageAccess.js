export const PAGE_NAME_OVERRIDES = {
    home: "Home",
    "vip-view": "VIP View",
    "new-letter": "New Letter",
    inbox: "Inbox",
    outbox: "Outbox",
    spam: "Spam",
    "master-table": "Master Table",
    "letters-with-comments": "Letters with Comment",
    "letter-tracker": "Letter Tracker",
    "upload-pdf": "Upload PDF Files",
    "guest-send-letter": "Guest Send Letter",
    endorsements: "Endorsements",
    settings: "App Settings",
    attachments: "Attachments",
    persons: "Contacts",
    "data-import": "Data Import",
    departments: "Departments",
    "letter-kinds": "Letter Kinds",
    statuses: "Statuses",
    "process-steps": "Process Steps",
    trays: "Trays",
    users: "Users",
    "role-matrix": "Access Matrix",
    setup: "Setup Wizard",
    "letter-detail": "Letter Detail",
    "department-letters": "Department Letters",
    profile: "Profile",
};

export const BASE_SYSTEM_PAGES = [
    { page_id: "home", page_name: PAGE_NAME_OVERRIDES.home },
    { page_id: "vip-view", page_name: PAGE_NAME_OVERRIDES["vip-view"] },
    { page_id: "new-letter", page_name: PAGE_NAME_OVERRIDES["new-letter"] },
    { page_id: "inbox", page_name: PAGE_NAME_OVERRIDES.inbox },
    { page_id: "outbox", page_name: PAGE_NAME_OVERRIDES.outbox },
    { page_id: "spam", page_name: PAGE_NAME_OVERRIDES.spam },
    { page_id: "master-table", page_name: PAGE_NAME_OVERRIDES["master-table"] },
    { page_id: "letters-with-comments", page_name: PAGE_NAME_OVERRIDES["letters-with-comments"] },
    { page_id: "letter-tracker", page_name: PAGE_NAME_OVERRIDES["letter-tracker"] },
    { page_id: "upload-pdf", page_name: PAGE_NAME_OVERRIDES["upload-pdf"] },
    { page_id: "guest-send-letter", page_name: PAGE_NAME_OVERRIDES["guest-send-letter"] },
    { page_id: "endorsements", page_name: PAGE_NAME_OVERRIDES.endorsements },
    { page_id: "settings", page_name: PAGE_NAME_OVERRIDES.settings },
    { page_id: "attachments", page_name: PAGE_NAME_OVERRIDES.attachments },
    { page_id: "persons", page_name: PAGE_NAME_OVERRIDES.persons },
    { page_id: "data-import", page_name: PAGE_NAME_OVERRIDES["data-import"] },
    { page_id: "departments", page_name: PAGE_NAME_OVERRIDES.departments },
    { page_id: "letter-kinds", page_name: PAGE_NAME_OVERRIDES["letter-kinds"] },
    { page_id: "statuses", page_name: PAGE_NAME_OVERRIDES.statuses },
    { page_id: "process-steps", page_name: PAGE_NAME_OVERRIDES["process-steps"] },
    { page_id: "trays", page_name: PAGE_NAME_OVERRIDES.trays },
    { page_id: "users", page_name: PAGE_NAME_OVERRIDES.users },
    { page_id: "role-matrix", page_name: PAGE_NAME_OVERRIDES["role-matrix"] },
    { page_id: "setup", page_name: PAGE_NAME_OVERRIDES.setup },
    { page_id: "letter-detail", page_name: PAGE_NAME_OVERRIDES["letter-detail"] },
    { page_id: "department-letters", page_name: PAGE_NAME_OVERRIDES["department-letters"] },
    { page_id: "profile", page_name: PAGE_NAME_OVERRIDES.profile },
];

export const getPageKeyFromPath = (rawPath = "") => {
    const path = rawPath.split("?")[0];
    if (path === "/" || path === "/dashboard") return "home";
    if (path === "/guest/send-letter") return "guest-send-letter";
    if (/^\/letter\/[^/]+$/i.test(path)) return "letter-detail";
    if (/^\/departments\/[^/]+\/letters$/i.test(path)) return "department-letters";
    if (path.startsWith("/setup/")) return path.split("/").pop();
    return path.startsWith("/") ? path.slice(1) : path;
};

export const humanizePageId = (pageId = "") => {
    if (PAGE_NAME_OVERRIDES[pageId]) return PAGE_NAME_OVERRIDES[pageId];
    return pageId
        .replace(/[-_]+/g, " ")
        .replace(/\b\w/g, (m) => m.toUpperCase())
        .trim();
};

