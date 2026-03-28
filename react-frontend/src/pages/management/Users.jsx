import React, { useEffect, useState } from "react";
import Sidebar from "../../components/Sidebar";
import { useAuth } from "../../context/AuthContext";
import {
    Users as UsersIcon,
    Plus,
    Loader2,
    RefreshCw,
    MoreVertical,
    ChevronRight,
    LayoutGrid,
    List,
    Archive,
    Menu,
    X,
    Edit2,
    Trash2,
    AlertCircle,
    UserCircle,
    Search,
    Camera,
    Upload
} from "lucide-react";
import { directus, directusUrl, getAssetUrl } from "../../hooks/useDirectus";
import useAccess from "../../hooks/useAccess";
import { uploadFiles } from "@directus/sdk";
import userService from "../../services/userService";
import departmentService from "../../services/departmentService";
import axios from "axios";
import API_BASE from "../../config/apiConfig";

export default function Users() {
    const access = useAccess();
    const context = useAuth();
    if (!context) return <div className="p-20 text-red-500">Error: AuthContext not found</div>;

    const { user, layoutStyle, setIsMobileMenuOpen } = context;
    const canField = access?.canField || (() => true);
    const [users, setUsers] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [viewMode, setViewMode] = useState("list");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState("create");
    const [selectedUser, setSelectedUser] = useState(null);
    const [isMenuOpen, setIsMenuOpen] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedRole, setSelectedRole] = useState("");
    const [selectedDepartment, setSelectedDepartment] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 15;

    const [roles, setRoles] = useState([]);

    const [formData, setFormData] = useState({
        first_name: "",
        last_name: "",
        username: "",
        email: "",
        password: "",
        role: "",
        dept_id: "",
        avatar: null,
        telegram_chat_id: "",
        interdepartment: false
    });
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");
    const canSearch = canField("users", "search");
    const canAdd = canField("users", "add_button");
    const canEdit = canField("users", "edit_button");
    const canDelete = canField("users", "delete_button");
    const canSave = canField("users", "save_button");
    const canRefresh = canField("users", "refresh_button");
    const canViewToggle = canField("users", "view_toggle");
    const canRoleFilter = canField("users", "role_filter");
    const canDepartmentFilter = canField("users", "department_filter");
    const canAvatarUpload = canField("users", "avatar_upload");

    const handleFileUpload = async (file) => {
        if (!file || !file.type.startsWith('image/')) {
            console.warn("Invalid file type:", file?.type);
            return;
        }

        // Create local preview immediately
        const localUrl = URL.createObjectURL(file);
        setPreviewUrl(localUrl);

        setUploadingPhoto(true);
        try {
            const form = new FormData();
            form.append("file", file);
            const res = await directus.request(uploadFiles(form));
            const fileId = res.id;
            setFormData(prev => ({ ...prev, avatar: fileId }));
        } catch (err) {
            console.error("Upload failed", err);
            setError("Failed to upload image. Please try again.");
        } finally {
            setUploadingPhoto(false);
        }
    };

    useEffect(() => {
        const handlePaste = (e) => {
            if (!isModalOpen) return;
            const items = e.clipboardData?.items;
            if (!items) return;
            for (let i = 0; i < items.length; i++) {
                if (items[i].type.indexOf("image") !== -1) {
                    const blob = items[i].getAsFile();
                    handleFileUpload(blob);
                }
            }
        };
        window.addEventListener('paste', handlePaste);
        return () => window.removeEventListener('paste', handlePaste);
    }, [isModalOpen]);

    const roleName = (user?.roleData?.name || user?.role || '').toString().toUpperCase();
    const isSuperAdmin = ['ADMINISTRATOR', 'SYSTEM ADMIN', 'SUPERUSER', 'ADMIN', 'SUPER ADMIN', 'DEVELOPER', 'ROOT'].includes(roleName);

    const fetchData = async (isRefreshing = false) => {
        if (isRefreshing) setRefreshing(true);
        try {
            const userDeptId = user?.dept_id?.id ?? user?.dept_id;
            const params = isSuperAdmin ? {} : { dept_id: userDeptId };
            
            // For SuperAdmins, fetch ALL roles by not passing dept_id
            // For others, fetch roles for their department
            let finalRolesUrl = `${API_BASE}/role-permissions/roles`;
            if (!isSuperAdmin && userDeptId) {
                finalRolesUrl += `?dept_id=${userDeptId}`;
            }

            const [usersData, deptsData, rolesRes] = await Promise.all([
                userService.getAll(params),
                departmentService.getAll(),
                axios.get(finalRolesUrl)
            ]);
            setUsers(Array.isArray(usersData) ? usersData : []);
            setDepartments(Array.isArray(deptsData) ? deptsData : []);
            setRoles(Array.isArray(rolesRes.data) ? rolesRes.data : []);

            // Default role if none set
            if (!formData.role && rolesRes.data?.length > 0) {
                const defaultRole = rolesRes.data.find(r => r.name === 'User') || rolesRes.data[0];
                setFormData(prev => ({ ...prev, role: defaultRole.id }));
            }
        } catch (error) {
            console.error("Fetch failed", error);
            setError("Failed to fetch data.");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        if (user) fetchData();
    }, [user]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setError("");
        try {
            const dataToSubmit = { ...formData };
            if (modalMode === 'edit' && !dataToSubmit.password) {
                delete dataToSubmit.password; // Don't send empty password on edit
            }
            if (!dataToSubmit.dept_id || !isSuperAdmin) {
                dataToSubmit.dept_id = user?.dept_id?.id ?? user?.dept_id;
            }

            if (modalMode === 'create') {
                await userService.create(dataToSubmit);
            } else {
                await userService.update(selectedUser.id, dataToSubmit);
            }
            setIsModalOpen(false);
            fetchData();
        } catch (err) {
            console.error("CRUD Error:", err);
            setError("Failed to save user.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this user?")) return;
        try {
            await userService.delete(id);
            fetchData();
        } catch (err) {
            console.error("Delete failed:", err);
            alert("Delete failed.");
        }
    };

    const openCreateModal = () => {
        setModalMode('create');
        setFormData({
            first_name: "",
            last_name: "",
            username: "",
            email: "",
            password: "",
            role: roles.find(r => r.name === 'User')?.id || roles[0]?.id || "",
            dept_id: "",
            avatar: null,
            telegram_chat_id: "",
            interdepartment: false
        });
        setPreviewUrl(null);
        setSelectedUser(null);
        setIsModalOpen(true);
    };

    const openEditModal = (user) => {
        setModalMode('edit');
        setSelectedUser(user);
        setFormData({
            first_name: user.first_name || "",
            last_name: user.last_name || "",
            username: user.username || "",
            email: user.email || "",
            password: "",
            role: user.role || "",
            dept_id: user.dept_id || "",
            avatar: user.avatar || null,
            telegram_chat_id: user.telegram_chat_id || "",
            interdepartment: user.interdepartment || false
        });
        setPreviewUrl(user.avatar ? getAssetUrl(user.avatar) : null);
        setIsModalOpen(true);
        setIsMenuOpen(null);
    };

    const pageBg = layoutStyle === 'notion' ? 'bg-white dark:bg-[#191919]' : layoutStyle === 'grid' ? 'bg-slate-50' : layoutStyle === 'minimalist' ? 'bg-[#F7F7F7] dark:bg-[#0D0D0D]' : 'bg-[#F9FAFB] dark:bg-[#0D0D0D]';
    const headerBg = layoutStyle === 'notion' ? 'bg-white dark:bg-[#191919] border-gray-100 dark:border-[#222]' : layoutStyle === 'grid' ? 'bg-white border-slate-200' : layoutStyle === 'minimalist' ? 'bg-white dark:bg-[#0D0D0D] border-[#E5E5E5] dark:border-[#222]' : 'bg-white dark:bg-[#0D0D0D] border-gray-100 dark:border-[#222]';
    const cardBg = layoutStyle === 'notion' ? 'bg-white dark:bg-[#191919] border-gray-100 dark:border-[#222]' : layoutStyle === 'minimalist' ? 'bg-white dark:bg-[#111] border-[#E5E5E5] dark:border-[#222]' : 'bg-white dark:bg-[#141414] border-gray-100 dark:border-[#222]';
    const textColor = layoutStyle === 'minimalist' ? 'text-[#1A1A1B] dark:text-white' : 'text-slate-900 dark:text-white';

    const filteredUsers = users.filter(userItem => {
        const matchesSearch = !canSearch ||
            `${userItem.first_name} ${userItem.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
            userItem.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            userItem.email?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesRole = !selectedRole || (userItem.roleData?.name || userItem.role) === selectedRole;
        const matchesDept = !selectedDepartment || 
            (selectedDepartment === 'null' ? (userItem.dept_id === null || userItem.dept_id === undefined) : userItem.dept_id == selectedDepartment);

        return matchesSearch && matchesRole && matchesDept;
    });

    const sortedUsers = [...filteredUsers].sort((a, b) => {
        const roleA = a.roleData?.name || a.role || "";
        const roleB = b.roleData?.name || b.role || "";
        if (roleA !== roleB) return roleA.localeCompare(roleB);

        const nameA = `${a.first_name} ${a.last_name}`.toLowerCase();
        const nameB = `${b.first_name} ${b.last_name}`.toLowerCase();
        return nameA.localeCompare(nameB);
    });

    const totalPages = Math.ceil(sortedUsers.length / pageSize);
    const paginatedUsers = sortedUsers.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    // Grouping logic for rendering
    const groupUsersByRole = (usersList) => {
        const groups = {};
        usersList.forEach(u => {
            const roleName = u.roleData?.name || u.role || "Unassigned";
            if (!groups[roleName]) groups[roleName] = [];
            groups[roleName].push(u);
        });
        return groups;
    };

    const groupedUsers = groupUsersByRole(paginatedUsers);

    // Reset pagination on filter change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, selectedRole, selectedDepartment]);

    const renderCard = (userItem) => {
        return (
            <div key={userItem.id} className={`${cardBg} ${viewMode === 'grid' ? 'p-8 rounded-[2.5rem]' : 'p-4 rounded-2xl flex items-center justify-between'} border shadow-sm hover:shadow-xl hover:border-blue-200 dark:hover:border-blue-900/40 transition-all group cursor-pointer`}>
                <div className={viewMode === 'grid' ? "space-y-6" : "flex items-center gap-6 overflow-hidden flex-1"}>
                    <div className={`relative ${viewMode === 'grid' ? 'w-full aspect-square' : 'w-16 h-16'} rounded-[2rem] bg-slate-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 flex items-center justify-center overflow-hidden transition-all group-hover:scale-105`}>
                        {userItem.avatar ? (
                            <img
                                src={getAssetUrl(userItem.avatar, "?width=200&height=200&fit=cover")}
                                alt="Profile"
                                className="w-full h-full object-cover"
                                onError={(e) => { e.target.src = 'https://ui-avatars.com/api/?name=' + userItem.first_name + '+' + userItem.last_name + '&background=random'; }}
                            />
                        ) : (
                            <div className="flex flex-col items-center gap-1 text-gray-300">
                                <UserCircle className={`${viewMode === 'grid' ? 'w-12 h-12' : 'w-8 h-8'}`} />
                            </div>
                        )}
                        {userItem.role === 'Superuser' && (
                            <div className="absolute top-2 right-2 p-1.5 bg-yellow-400 rounded-lg shadow-lg">
                                <Archive className="w-3 h-3 text-white" />
                            </div>
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1 relative">
                            <h3 className={`font-black uppercase tracking-tight truncate ${textColor}`}>{userItem.first_name} {userItem.last_name} <span className="opacity-50 text-[10px] font-bold lowercase">(@{userItem.username || 'no-username'})</span></h3>
                            {(canEdit || canDelete) && (
                                <div className="relative">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setIsMenuOpen(isMenuOpen === userItem.id ? null : userItem.id); }}
                                        className="p-1 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg transition-colors"
                                    >
                                        <MoreVertical className="w-4 h-4 text-gray-400" />
                                    </button>
                                    {isMenuOpen === userItem.id && (
                                        <div className="absolute right-0 top-full mt-2 w-32 bg-white dark:bg-[#1a1a1a] border border-gray-100 dark:border-[#333] rounded-xl shadow-xl z-20 py-1">
                                            {canEdit && <button onClick={() => openEditModal(userItem)} className="w-full flex items-center gap-2 px-3 py-2 text-[10px] font-black uppercase text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5"><Edit2 className="w-3 h-3" /> Edit</button>}
                                            {canDelete && <button onClick={() => handleDelete(userItem.id)} className="w-full flex items-center gap-2 px-3 py-2 text-[10px] font-black uppercase text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10"><Trash2 className="w-3 h-3" /> Delete</button>}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                        <p className="text-xs text-gray-500 font-medium line-clamp-1">{userItem.email}</p>
                        {viewMode === 'grid' && (
                            <div className="mt-2 text-[10px] font-bold text-gray-400 uppercase">Role: {userItem.roleData?.name || userItem.role} | Dept: {userItem.department?.dept_name || 'None'}</div>
                        )}
                    </div>
                </div>
                {viewMode === 'list' && (
                    <div className="flex items-center gap-4">
                        <div className="text-right hidden md:block shrink-0">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{userItem.roleData?.name || userItem.role}</p>
                            <p className="text-sm font-bold text-blue-500">{userItem.department?.dept_code || 'No Dept'}</p>
                        </div>
                        {(canEdit || canDelete) && (
                            <div className="flex items-center gap-1">
                                {canEdit && <button onClick={(e) => { e.stopPropagation(); openEditModal(userItem); }} className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-xl transition-all text-gray-400 hover:text-blue-500"><Edit2 className="w-4 h-4" /></button>}
                                {canDelete && <button onClick={(e) => { e.stopPropagation(); handleDelete(userItem.id); }} className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>}
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className={`min-h-screen ${pageBg} flex overflow-hidden`}>
            <Sidebar />
            <main className="flex-1 flex flex-col h-screen overflow-hidden">
                <header className={`h-16 ${headerBg} border-b px-4 md:px-8 flex items-center justify-between z-10`}>
                    <div className="flex items-center gap-4">
                        <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 -ml-2 text-gray-400 md:hidden transition-colors"><Menu className="w-5 h-5" /></button>
                        <div className="flex items-center gap-2">
                            <UsersIcon className={`w-4 h-4 ${layoutStyle === 'minimalist' ? 'text-[#1A1A1B] dark:text-white' : 'text-blue-500'}`} />
                            <h1 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Management / Users</h1>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {canRefresh && <button onClick={() => fetchData(true)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition-all"><RefreshCw className={`w-4 h-4 text-gray-400 ${refreshing ? 'animate-spin' : ''}`} /></button>}
                        {canAdd && <button onClick={openCreateModal} className="hidden md:flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black rounded-xl transition-all shadow-lg shadow-blue-500/20 uppercase tracking-widest"><Plus className="w-3 h-3" /> Add User</button>}
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-10 custom-scrollbar">
                    <div className="max-w-[100vw] mx-auto">
                        <div className="mb-8">
                            <h2 className={`text-4xl font-black tracking-tight ${textColor}`}>System Users</h2>
                        </div>

                        <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-8 gap-4">
                            <div className="flex-1 flex flex-col md:flex-row gap-4">
                                {canSearch && (
                                    <div className="relative flex-1 group">
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                                        <input
                                            type="text"
                                            placeholder="Search by name, email or username..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="w-full pl-12 pr-4 py-3 rounded-2xl border bg-white dark:bg-[#141414] border-gray-100 dark:border-[#222] text-sm focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                                        />
                                    </div>
                                )}
                                {canRoleFilter && (
                                    <select
                                        value={selectedRole}
                                        onChange={(e) => setSelectedRole(e.target.value)}
                                        className="px-4 py-3 rounded-2xl border bg-white dark:bg-[#141414] border-gray-100 dark:border-[#222] text-sm focus:ring-2 focus:ring-blue-500/20 outline-none transition-all min-w-[150px] font-bold text-gray-500"
                                    >
                                        <option value="">All Roles</option>
                                        {roles.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
                                    </select>
                                )}
                                {isSuperAdmin && canDepartmentFilter && (
                                    <select
                                        value={selectedDepartment}
                                        onChange={(e) => setSelectedDepartment(e.target.value)}
                                        className="px-4 py-3 rounded-2xl border bg-white dark:bg-[#141414] border-gray-100 dark:border-[#222] text-sm focus:ring-2 focus:ring-blue-500/20 outline-none transition-all min-w-[150px] font-bold text-gray-500"
                                    >
                                        <option value="">All Departments</option>
                                        <option value="null">Admin Defaults</option>
                                        {departments.map(d => <option key={d.id} value={d.id}>{d.dept_name}</option>)}
                                    </select>
                                )}
                            </div>
                            {canViewToggle && (
                                <div className="flex items-center gap-2 bg-white dark:bg-[#141414] p-1.5 rounded-2xl border border-gray-100 dark:border-[#222] shadow-sm font-sans h-fit">
                                    <button onClick={() => setViewMode("grid")} className={`p-2.5 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-blue-500 text-white shadow-md' : 'text-gray-400 hover:bg-slate-50 dark:hover:bg-white/5'}`}><LayoutGrid className="w-5 h-5" /></button>
                                    <button onClick={() => setViewMode("list")} className={`p-2.5 rounded-xl transition-all ${viewMode === 'list' ? 'bg-blue-500 text-white shadow-md' : 'text-gray-400 hover:bg-slate-50 dark:hover:bg-white/5'}`}><List className="w-5 h-5" /></button>
                                </div>
                            )}
                        </div>

                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-60 gap-6">
                                <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
                                <p className="text-sm text-gray-400 font-bold uppercase tracking-[0.2em]">Synchronizing Users...</p>
                            </div>
                        ) : (
                            <>
                                <div className="space-y-12">
                                    {Object.entries(groupedUsers).map(([roleName, usersInRole]) => (
                                        <div key={roleName} className="space-y-6">
                                            <div className="flex items-center gap-4 px-2">
                                                <div className="h-px bg-gray-100 dark:bg-white/5 flex-1" />
                                                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-500 whitespace-nowrap bg-white dark:bg-[#141414] px-4 py-1 rounded-full border border-gray-100 dark:border-white/5">
                                                    {roleName} ({usersInRole.length})
                                                </h3>
                                                <div className="h-px bg-gray-100 dark:bg-white/5 flex-1" />
                                            </div>
                                            <div className={viewMode === 'grid' ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 3xl:grid-cols-6 gap-8" : "space-y-4"}>
                                                {usersInRole.map(renderCard)}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {totalPages > 1 && (
                                    <div className="mt-12 flex flex-col md:flex-row items-center justify-between gap-6 pb-20">
                                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                                            Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, filteredUsers.length)} of {filteredUsers.length} Users
                                        </p>
                                        <div className="flex items-center gap-2">
                                            <button
                                                disabled={currentPage === 1}
                                                onClick={() => setCurrentPage(p => p - 1)}
                                                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${currentPage === 1 ? 'text-gray-300 pointer-events-none' : 'text-gray-500 hover:bg-white dark:hover:bg-white/5 border border-gray-100 dark:border-white/5 hover:border-blue-500/50'}`}
                                            >
                                                Previous
                                            </button>
                                            <div className="flex items-center gap-1">
                                                {[...Array(totalPages)].map((_, i) => (
                                                    <button
                                                        key={i + 1}
                                                        onClick={() => setCurrentPage(i + 1)}
                                                        className={`w-8 h-8 rounded-lg text-[10px] font-black transition-all ${currentPage === i + 1 ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' : 'text-gray-400 hover:bg-white dark:hover:bg-white/5'}`}
                                                    >
                                                        {i + 1}
                                                    </button>
                                                ))}
                                            </div>
                                            <button
                                                disabled={currentPage === totalPages}
                                                onClick={() => setCurrentPage(p => p + 1)}
                                                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${currentPage === totalPages ? 'text-gray-300 pointer-events-none' : 'text-gray-500 hover:bg-white dark:hover:bg-white/5 border border-gray-100 dark:border-white/5 hover:border-blue-500/50'}`}
                                            >
                                                Next
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </main>

            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 md:p-4">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
                    <div className={`${cardBg} w-full h-full md:h-auto md:max-h-[90vh] md:max-w-xl md:rounded-[2.5rem] border-0 md:border shadow-2xl relative z-10 animate-in zoom-in-95 duration-200 overflow-hidden flex flex-col`}>
                        <div className="p-6 md:p-8 flex-1 overflow-y-auto custom-scrollbar">
                            <div className="flex items-center justify-between mb-8">
                                <h3 className={`text-xl font-black uppercase tracking-tight ${textColor}`}>{modalMode === 'create' ? 'Create User' : 'Edit User'}</h3>
                                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition-colors"><X className="w-5 h-5 text-gray-400" /></button>
                            </div>

                            {canAvatarUpload && (
                                <div className="flex flex-col items-center mb-10">
                                    <div
                                        className={`relative group/avatar cursor-pointer transition-all ${isDragging ? 'scale-110' : ''}`}
                                        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                                        onDragLeave={() => setIsDragging(false)}
                                        onDrop={(e) => {
                                            e.preventDefault();
                                            setIsDragging(false);
                                            const file = e.dataTransfer.files?.[0];
                                            if (file) handleFileUpload(file);
                                        }}
                                    >
                                        <div className={`w-32 h-32 rounded-[2.5rem] bg-slate-50 dark:bg-white/5 border-2 border-dashed flex items-center justify-center overflow-hidden transition-all ${isDragging ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/10' : 'border-gray-200 dark:border-white/10 group-hover/avatar:border-blue-500/50'}`}>
                                            {uploadingPhoto ? (
                                                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                                            ) : previewUrl ? (
                                                <img src={previewUrl} className="w-full h-full object-cover" alt="Preview" />
                                            ) : (
                                                <div className="flex flex-col items-center gap-2 text-gray-400">
                                                    <Camera className="w-8 h-8" />
                                                    <span className="text-[10px] font-bold uppercase tracking-widest">Upload Photo</span>
                                                </div>
                                            )}
                                        </div>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            className="absolute inset-0 opacity-0 cursor-pointer"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) handleFileUpload(file);
                                            }}
                                        />
                                        <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg border-4 border-white dark:border-[#111] transition-transform group-hover/avatar:scale-110">
                                            <Upload className="w-4 h-4" />
                                        </div>
                                    </div>
                                    <p className="mt-4 text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">{uploadingPhoto ? 'Uploading image...' : 'Drag & Drop or Paste Image'}</p>
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-4">
                                {error && <div className="text-red-500 text-sm font-bold">{error}</div>}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">First Name</label>
                                        <input type="text" required value={formData.first_name} onChange={e => setFormData({ ...formData, first_name: e.target.value })} className="w-full px-4 py-3 rounded-xl border bg-slate-50 dark:bg-white/5 border-gray-100 dark:border-[#333] text-sm font-bold" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Last Name</label>
                                        <input type="text" required value={formData.last_name} onChange={e => setFormData({ ...formData, last_name: e.target.value })} className="w-full px-4 py-3 rounded-xl border bg-slate-50 dark:bg-white/5 border-gray-100 dark:border-[#333] text-sm font-bold" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Username</label>
                                        <input type="text" required value={formData.username} onChange={e => setFormData({ ...formData, username: e.target.value })} className="w-full px-4 py-3 rounded-xl border bg-slate-50 dark:bg-white/5 border-gray-100 dark:border-[#333] text-sm font-bold" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Email</label>
                                        <input type="email" required value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="w-full px-4 py-3 rounded-xl border bg-slate-50 dark:bg-white/5 border-gray-100 dark:border-[#333] text-sm font-bold" />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Password {modalMode === 'edit' && "(Leave blank to keep current)"}</label>
                                    <input type="password" required={modalMode === 'create'} value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} className="w-full px-4 py-3 rounded-xl border bg-slate-50 dark:bg-white/5 border-gray-100 dark:border-[#333] text-sm font-bold" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Role</label>
                                        <select value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })} className="w-full px-4 py-3 rounded-xl border bg-slate-50 dark:bg-white/5 border-gray-100 dark:border-[#333] text-sm font-bold">
                                            {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                                        </select>
                                    </div>
                                    {isSuperAdmin && (
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Department</label>
                                            <select value={formData.dept_id} onChange={e => setFormData({ ...formData, dept_id: e.target.value })} className="w-full px-4 py-3 rounded-xl border bg-slate-50 dark:bg-white/5 border-gray-100 dark:border-[#333] text-sm font-bold">
                                                <option value="">None / Default</option>
                                                {departments.map(d => <option key={d.id} value={d.id}>{d.dept_name}</option>)}
                                            </select>
                                        </div>
                                    )}
                                </div>
                                <div className="space-y-1">
                                    <input type="text" value={formData.telegram_chat_id} onChange={e => setFormData({ ...formData, telegram_chat_id: e.target.value })} placeholder="e.g. 123456789" className="w-full px-4 py-3 rounded-xl border bg-slate-50 dark:bg-white/5 border-gray-100 dark:border-[#333] text-sm font-bold" />
                                </div>
                                <div className="flex items-center gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-gray-100 dark:border-[#333] transition-all hover:border-blue-500/30 group">
                                    <div className="relative flex items-center">
                                        <input 
                                            type="checkbox" 
                                            id="interdepartment"
                                            checked={formData.interdepartment} 
                                            onChange={e => setFormData({ ...formData, interdepartment: e.target.checked })}
                                            className="w-5 h-5 rounded-lg border-2 border-gray-300 text-blue-600 focus:ring-blue-500/20 transition-all cursor-pointer accent-blue-600" 
                                        />
                                    </div>
                                    <label htmlFor="interdepartment" className="flex-1 cursor-pointer">
                                        <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1 group-hover:text-blue-500 transition-colors">Interdepartment Access</div>
                                        <div className="text-[9px] text-gray-400 font-medium">Allow viewing letters from multiple departments</div>
                                    </label>
                                </div>
                                {canSave && (
                                    <div className="pt-4">
                                        <button disabled={submitting} className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest text-xs rounded-2xl flex items-center justify-center gap-2">{submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save User"}</button>
                                    </div>
                                )}
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
