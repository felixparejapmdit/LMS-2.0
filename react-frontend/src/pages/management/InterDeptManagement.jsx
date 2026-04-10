import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/Sidebar';
import { useAuth } from '../../context/AuthContext';
import { 
    Users, 
    Building2, 
    ChevronRight, 
    ChevronLeft, 
    Save, 
    Loader2, 
    Search, 
    CheckCircle2, 
    FolderTree,
    ArrowRightCircle,
    ArrowLeftCircle
} from 'lucide-react';
import axios from 'axios';
import API_BASE from '../../config/apiConfig';

export default function InterDeptManagement() {
    const { layoutStyle, setIsMobileMenuOpen } = useAuth();
    const [users, setUsers] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [selectedUserId, setSelectedUserId] = useState('');
    const [assignedDeptIds, setAssignedDeptIds] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [userSearch, setUserSearch] = useState('');
    const [deptSearch, setDeptSearch] = useState('');

    useEffect(() => {
        fetchInitialData();
    }, []);

    useEffect(() => {
        if (selectedUserId) {
            fetchUserAssignments(selectedUserId);
        } else {
            setAssignedDeptIds([]);
        }
    }, [selectedUserId]);

    const fetchInitialData = async (retryCount = 0) => {

        try {
            const [usersRes, deptsRes] = await Promise.all([
                axios.get(`${API_BASE}/inter-dept/inter-users`),
                axios.get(`${API_BASE}/departments`)
            ]);
            setUsers(usersRes.data);
            setDepartments(deptsRes.data);
        } catch (error) {
            console.error("Fetch error:", error);
            // Retry logic for aborted/transient errors
            if (retryCount < 2 && (error.code === 'ECONNABORTED' || error.message?.includes('aborted'))) {
                console.log(`Retrying initial data fetch... (${retryCount + 1})`);
                setTimeout(() => fetchInitialData(retryCount + 1), 1000);
            }
        } finally {
            if (retryCount === 0 || retryCount >= 2) {
                setLoading(false);
            }
        }
    };

    const fetchUserAssignments = async (userId, retryCount = 0) => {

        try {
            const res = await axios.get(`${API_BASE}/inter-dept/users/${userId}`);
            setAssignedDeptIds(res.data.map(a => a.department_id));
        } catch (error) {
            console.error("Assignment fetch error:", error);
            if (retryCount < 2 && (error.code === 'ECONNABORTED' || error.message?.includes('aborted'))) {
                setTimeout(() => fetchUserAssignments(userId, retryCount + 1), 1000);
            }
        }
    };

    const handleSave = async () => {
        if (!selectedUserId) return;
        setSaving(true);
        try {
            await axios.post(`${API_BASE}/inter-dept/users/${selectedUserId}`, {
                departmentIds: assignedDeptIds
            });
            alert("Interdepartment access saved successfully!");
        } catch (error) {
            console.error("Save error:", error);
            alert("Failed to save access mapping.");
        } finally {
            setSaving(false);
        }
    };

    const toggleDept = (deptId) => {
        setAssignedDeptIds(prev => 
            prev.includes(deptId) 
                ? prev.filter(id => id !== deptId) 
                : [...prev, deptId]
        );
    };

    const moveAll = (toAssigned) => {
        if (toAssigned) {
            setAssignedDeptIds(departments.map(d => d.id));
        } else {
            setAssignedDeptIds([]);
        }
    };

    const availableDepts = departments.filter(d => 
        !assignedDeptIds.includes(d.id) && 
        (d.dept_name.toLowerCase().includes(deptSearch.toLowerCase()) || d.dept_code.toLowerCase().includes(deptSearch.toLowerCase()))
    );

    const selectedDepts = departments.filter(d => 
        assignedDeptIds.includes(d.id)
    );

    const pageBg = layoutStyle === 'minimalist' ? 'bg-[#F9FAFB] dark:bg-[#0D0D0D]' : 'bg-slate-50';
    const cardBg = layoutStyle === 'minimalist' ? 'bg-white dark:bg-[#111] border-[#E5E5E5] dark:border-[#222]' : 'bg-white border-slate-200';
    const textColor = layoutStyle === 'minimalist' ? 'text-[#1A1A1B] dark:text-white' : 'text-slate-900 dark:text-gray-100';

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-white dark:bg-[#0d0d0d]">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
    );

    return (
        <div className={`min-h-screen flex overflow-hidden ${pageBg}`}>
            <Sidebar />
            <main className="flex-1 flex flex-col h-screen overflow-hidden">
                <header className="h-16 px-8 flex items-center justify-between border-b border-[#E5E5E5] dark:border-[#222] bg-white dark:bg-[#0D0D0D] z-10 transition-colors">
                    <div className="flex items-center gap-4">
                        <FolderTree className="w-5 h-5 text-blue-600" />
                        <h1 className="text-xs font-black uppercase tracking-widest text-gray-400">Settings / Unit Access</h1>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-12 custom-scrollbar">
                    <div className="max-w-[100vw] mx-auto space-y-8">
                        <div>
                            <h2 className={`text-3xl font-black tracking-tight ${textColor}`}>Unit Access Control</h2>
                            <p className="text-gray-500 mt-2 text-sm font-medium">Assign departments that authorized staff can view and track.</p>
                        </div>

                        {/* User Selection */}
                        <div className={`${cardBg} border p-6 rounded-3xl shadow-sm space-y-4`}>
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block ml-1">Select Staff Member</label>
                            <div className="flex flex-col md:flex-row gap-4">
                                <div className="relative flex-1 group">
                                    <Users className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 transition-colors group-focus-within:text-blue-600" />
                                    <select 
                                        value={selectedUserId}
                                        onChange={(e) => setSelectedUserId(e.target.value)}
                                        className="w-full pl-12 pr-4 py-3 rounded-2xl border bg-slate-50 dark:bg-white/5 border-gray-100 dark:border-[#222] text-sm font-bold appearance-none outline-none focus:ring-2 focus:ring-blue-500/20"
                                    >
                                        <option value="">-- Choose a user --</option>
                                        {users.map(u => (
                                            <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>
                                        ))}
                                    </select>
                                </div>
                                {selectedUserId && (
                                    <button 
                                        onClick={handleSave}
                                        disabled={saving}
                                        className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black rounded-2xl shadow-lg shadow-blue-500/20 uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
                                    >
                                        {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                                        Save Changes
                                    </button>
                                )}
                            </div>
                        </div>

                        {selectedUserId ? (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start animate-in fade-in slide-in-from-bottom-4 duration-500">
                                {/* Left Panel: Available */}
                                <div className={`${cardBg} border rounded-3xl overflow-hidden shadow-sm h-[600px] flex flex-col`}>
                                    <div className="p-6 border-b border-gray-100 dark:border-[#222] bg-slate-50/50 dark:bg-white/5 flex items-center justify-between">
                                        <div>
                                            <h3 className="text-xs font-black uppercase tracking-widest text-gray-400">Available Departments</h3>
                                            <p className="text-[10px] text-gray-400 font-bold mt-1 uppercase leading-none">{availableDepts.length} units remaining</p>
                                        </div>
                                        <button onClick={() => moveAll(true)} className="text-[10px] font-black uppercase text-blue-600 hover:text-blue-700 transition-colors">Select All</button>
                                    </div>
                                    <div className="p-4 border-b border-gray-100 dark:border-[#222]">
                                        <div className="relative group">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                                            <input 
                                                type="text" 
                                                placeholder="Search departments..."
                                                value={deptSearch}
                                                onChange={e => setDeptSearch(e.target.value)}
                                                className="w-full pl-10 pr-4 py-2 text-xs font-bold rounded-xl border border-gray-100 dark:border-[#333] bg-white dark:bg-white/5 outline-none focus:border-blue-500/50"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                                        {availableDepts.map(dept => (
                                            <div 
                                                key={dept.id} 
                                                onClick={() => toggleDept(dept.id)}
                                                className="group p-4 rounded-2xl border border-gray-50 dark:border-white/5 bg-slate-50/30 dark:bg-white/5 hover:border-blue-500/30 hover:bg-blue-50/30 dark:hover:bg-blue-900/10 cursor-pointer transition-all flex items-center justify-between"
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-xl bg-white dark:bg-white/10 flex items-center justify-center text-gray-400 transition-all group-hover:bg-blue-600 group-hover:text-white shadow-sm font-black text-xs">
                                                        {dept.dept_code}
                                                    </div>
                                                    <div>
                                                        <h4 className="text-xs font-black uppercase text-slate-700 dark:text-gray-300 tracking-tight">{dept.dept_name}</h4>
                                                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{dept.dept_code}</p>
                                                    </div>
                                                </div>
                                                <ArrowRightCircle className="w-5 h-5 text-gray-200 group-hover:text-blue-500 transition-all opacity-0 group-hover:opacity-100 transform translate-x-2 group-hover:translate-x-0" />
                                            </div>
                                        ))}
                                        {availableDepts.length === 0 && (
                                            <div className="h-full flex flex-col items-center justify-center py-20 text-gray-400 opacity-50">
                                                <CheckCircle2 className="w-12 h-12 mb-4" />
                                                <span className="text-[10px] font-black uppercase tracking-widest">All departments selected</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Right Panel: Selected */}
                                <div className={`${cardBg} border rounded-3xl overflow-hidden shadow-xl h-[600px] flex flex-col ring-2 ring-blue-500/5`}>
                                    <div className="p-6 border-b border-gray-100 dark:border-[#222] bg-blue-50/30 dark:bg-blue-900/10 flex items-center justify-between">
                                        <div>
                                            <h3 className="text-xs font-black uppercase tracking-widest text-blue-600">Authorized Departments</h3>
                                            <p className="text-[10px] text-blue-500 font-bold mt-1 uppercase leading-none">{selectedDepts.length} units granted</p>
                                        </div>
                                        <button onClick={() => moveAll(false)} className="text-[10px] font-black uppercase text-red-500 hover:text-red-600 transition-colors">Deselect All</button>
                                    </div>
                                    <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                                        {selectedDepts.map(dept => (
                                            <div 
                                                key={dept.id} 
                                                onClick={() => toggleDept(dept.id)}
                                                className="group p-4 rounded-2xl border border-blue-100 dark:border-blue-900/30 bg-blue-50/30 dark:bg-blue-900/10 hover:border-red-500/30 hover:bg-red-50/30 dark:hover:bg-red-900/10 cursor-pointer transition-all flex items-center justify-between"
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/20 font-black text-xs shrink-0 group-hover:bg-red-500">
                                                        <Building2 className="w-4 h-4" />
                                                    </div>
                                                    <div>
                                                        <h4 className="text-xs font-black uppercase text-blue-600 dark:text-blue-400 tracking-tight group-hover:text-red-500">{dept.dept_name}</h4>
                                                        <p className="text-[9px] font-bold text-blue-400 uppercase tracking-widest group-hover:text-red-400">{dept.dept_code}</p>
                                                    </div>
                                                </div>
                                                <ArrowLeftCircle className="w-5 h-5 text-red-500 transition-all opacity-0 group-hover:opacity-100 transform -translate-x-2 group-hover:translate-x-0" />
                                            </div>
                                        ))}
                                        {selectedDepts.length === 0 && (
                                            <div className="h-full flex flex-col items-center justify-center py-20 text-gray-400 opacity-50">
                                                <Building2 className="w-12 h-12 mb-4" />
                                                <span className="text-[10px] font-black uppercase tracking-widest text-center">No units assigned yet<br/>for this staff member</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className={`${cardBg} border rounded-3xl p-20 flex flex-col items-center justify-center text-center opacity-40 grayscale`}>
                                <Users className="w-20 h-20 text-gray-300 mb-6" />
                                <h3 className="text-lg font-black uppercase tracking-tight text-gray-400">Select Staff</h3>
                                <p className="text-sm font-medium text-gray-400 mt-2 max-w-sm">Choose a staff member from the dropdown above to manage their access rights.</p>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
