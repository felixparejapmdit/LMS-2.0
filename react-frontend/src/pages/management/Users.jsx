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
    UserCircle
} from "lucide-react";
import userService from "../../services/userService";
import departmentService from "../../services/departmentService";

export default function Users() {
    const context = useAuth();
    if (!context) return <div className="p-20 text-red-500">Error: AuthContext not found</div>;

    const { layoutStyle, setIsMobileMenuOpen } = context;
    const [users, setUsers] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [viewMode, setViewMode] = useState("list");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState("create");
    const [selectedUser, setSelectedUser] = useState(null);
    const [isMenuOpen, setIsMenuOpen] = useState(null);

    const roles = ["Superuser", "Admin", "User", "Encoder", "VIP"];

    const [formData, setFormData] = useState({
        first_name: "",
        last_name: "",
        username: "",
        email: "",
        password: "",
        role: "User",
        dept_id: ""
    });
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");

    const fetchData = async (isRefreshing = false) => {
        if (isRefreshing) setRefreshing(true);
        try {
            const [usersData, deptsData] = await Promise.all([
                userService.getAll(),
                departmentService.getAll()
            ]);
            setUsers(Array.isArray(usersData) ? usersData : []);
            setDepartments(Array.isArray(deptsData) ? deptsData : []);
        } catch (error) {
            console.error("Fetch failed", error);
            setError("Failed to fetch data.");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setError("");
        try {
            const dataToSubmit = { ...formData };
            if (modalMode === 'edit' && !dataToSubmit.password) {
                delete dataToSubmit.password; // Don't send empty password on edit
            }
            if (!dataToSubmit.dept_id) {
                dataToSubmit.dept_id = null;
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
        setModalMode("create");
        setFormData({ first_name: "", last_name: "", username: "", email: "", password: "", role: "User", dept_id: "" });
        setSelectedUser(null);
        setIsModalOpen(true);
    };

    const openEditModal = (userItem) => {
        setModalMode("edit");
        setFormData({
            first_name: userItem.first_name || "",
            last_name: userItem.last_name || "",
            username: userItem.username || "",
            email: userItem.email || "",
            password: "",
            role: userItem.roleData?.name || userItem.role || "User",
            dept_id: userItem.dept_id || ""
        });
        setSelectedUser(userItem);
        setIsModalOpen(true);
        setIsMenuOpen(null);
    };

    const pageBg = layoutStyle === 'notion' ? 'bg-white dark:bg-[#191919]' : layoutStyle === 'grid' ? 'bg-slate-50' : 'bg-[#F9FAFB] dark:bg-[#0D0D0D]';
    const headerBg = layoutStyle === 'notion' ? 'bg-white dark:bg-[#191919] border-gray-100 dark:border-[#222]' : layoutStyle === 'grid' ? 'bg-white border-slate-200' : 'bg-white dark:bg-[#0D0D0D] border-gray-100 dark:border-[#222]';
    const cardBg = layoutStyle === 'notion' ? 'bg-white dark:bg-[#191919] border-gray-100 dark:border-[#222]' : 'bg-white dark:bg-[#141414] border-gray-100 dark:border-[#222]';
    const textColor = 'text-slate-900 dark:text-white';

    const renderCard = (userItem) => {
        return (
            <div key={userItem.id} className={`${cardBg} ${viewMode === 'grid' ? 'p-8 rounded-[2.5rem]' : 'p-4 rounded-2xl flex items-center justify-between'} border shadow-sm hover:shadow-xl hover:border-blue-200 dark:hover:border-blue-900/40 transition-all group cursor-pointer`}>
                <div className={viewMode === 'grid' ? "space-y-6" : "flex items-center gap-6 overflow-hidden flex-1"}>
                    <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/10 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform shrink-0">
                        <UserCircle className="w-6 h-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1 relative">
                            <h3 className={`font-black uppercase tracking-tight truncate ${textColor}`}>{userItem.first_name} {userItem.last_name} <span className="opacity-50 text-[10px] font-bold lowercase">(@{userItem.username || 'no-username'})</span></h3>
                            <div className="relative">
                                <button
                                    onClick={(e) => { e.stopPropagation(); setIsMenuOpen(isMenuOpen === userItem.id ? null : userItem.id); }}
                                    className="p-1 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg transition-colors"
                                >
                                    <MoreVertical className="w-4 h-4 text-gray-400" />
                                </button>
                                {isMenuOpen === userItem.id && (
                                    <div className="absolute right-0 top-full mt-2 w-32 bg-white dark:bg-[#1a1a1a] border border-gray-100 dark:border-[#333] rounded-xl shadow-xl z-20 py-1">
                                        <button onClick={() => openEditModal(userItem)} className="w-full flex items-center gap-2 px-3 py-2 text-[10px] font-black uppercase text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5"><Edit2 className="w-3 h-3" /> Edit</button>
                                        <button onClick={() => handleDelete(userItem.id)} className="w-full flex items-center gap-2 px-3 py-2 text-[10px] font-black uppercase text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10"><Trash2 className="w-3 h-3" /> Delete</button>
                                    </div>
                                )}
                            </div>
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
                        <div className="flex items-center gap-1">
                            <button onClick={(e) => { e.stopPropagation(); openEditModal(userItem); }} className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-xl transition-all text-gray-400 hover:text-blue-500"><Edit2 className="w-4 h-4" /></button>
                            <button onClick={(e) => { e.stopPropagation(); handleDelete(userItem.id); }} className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                        </div>
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
                            <UsersIcon className="w-4 h-4 text-blue-500" />
                            <h1 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Management / Users</h1>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={() => fetchData(true)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition-all"><RefreshCw className={`w-4 h-4 text-gray-400 ${refreshing ? 'animate-spin' : ''}`} /></button>
                        <button onClick={openCreateModal} className="hidden md:flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black rounded-xl transition-all shadow-lg shadow-blue-500/20 uppercase tracking-widest"><Plus className="w-3 h-3" /> Add User</button>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-12 custom-scrollbar">
                    <div className="max-w-[100vw] mx-auto">
                        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-8">
                            <div>
                                <h2 className={`text-4xl font-black tracking-tight ${textColor}`}>System Users</h2>
                                <p className="text-gray-500 mt-3 text-lg">Manage user accounts, roles, and department assignments with our unified control plane.</p>
                            </div>
                            <div className="flex items-center gap-2 bg-white dark:bg-[#141414] p-1.5 rounded-2xl border border-gray-100 dark:border-[#222] shadow-sm font-sans">
                                <button onClick={() => setViewMode("grid")} className={`p-2.5 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-blue-500 text-white shadow-md' : 'text-gray-400 hover:bg-slate-50 dark:hover:bg-white/5'}`}><LayoutGrid className="w-5 h-5" /></button>
                                <button onClick={() => setViewMode("list")} className={`p-2.5 rounded-xl transition-all ${viewMode === 'list' ? 'bg-blue-500 text-white shadow-md' : 'text-gray-400 hover:bg-slate-50 dark:hover:bg-white/5'}`}><List className="w-5 h-5" /></button>
                            </div>
                        </div>

                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-60 gap-6">
                                <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
                                <p className="text-sm text-gray-400 font-bold uppercase tracking-[0.2em]">Synchronizing Users...</p>
                            </div>
                        ) : (
                            <div className={viewMode === 'grid' ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 3xl:grid-cols-6 gap-8" : "space-y-6"}>
                                {users.map(renderCard)}
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
                    <div className={`${cardBg} w-full max-w-lg rounded-[2.5rem] border shadow-2xl relative z-10 animate-in zoom-in-95 duration-200 overflow-hidden`}>
                        <div className="p-8">
                            <div className="flex items-center justify-between mb-8">
                                <h3 className={`text-xl font-black uppercase tracking-tight ${textColor}`}>{modalMode === 'create' ? 'Create User' : 'Edit User'}</h3>
                                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition-colors"><X className="w-5 h-5 text-gray-400" /></button>
                            </div>

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
                                            {roles.map(r => <option key={r} value={r}>{r}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Department</label>
                                        <select value={formData.dept_id} onChange={e => setFormData({ ...formData, dept_id: e.target.value })} className="w-full px-4 py-3 rounded-xl border bg-slate-50 dark:bg-white/5 border-gray-100 dark:border-[#333] text-sm font-bold">
                                            <option value="">None</option>
                                            {departments.map(d => <option key={d.id} value={d.id}>{d.dept_name}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div className="pt-4">
                                    <button disabled={submitting} className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest text-xs rounded-2xl flex items-center justify-center gap-2">{submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save User"}</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
