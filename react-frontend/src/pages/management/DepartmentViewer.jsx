import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/Sidebar';
import { useAuth, useSession } from '../../context/AuthContext';
import { 
    LayoutGrid, 
    Search, 
    Filter, 
    Building2, 
    FileText, 
    ChevronRight, 
    Loader2, 
    Calendar, 
    User, 
    Target,
    ArrowUpRight,
    MapPin
} from 'lucide-react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function DepartmentViewer() {
    const { user } = useSession();
    const { layoutStyle, setIsMobileMenuOpen } = useAuth();
    const navigate = useNavigate();
    
    const [assignedDepts, setAssignedDepts] = useState([]);
    const [selectedDeptId, setSelectedDeptId] = useState('');
    const [letters, setLetters] = useState([]);
    const [loading, setLoading] = useState(true);
    const [lettersLoading, setLettersLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [recordsPerPage] = useState(50);

    useEffect(() => {
        if (user?.id) {
            fetchAssignedDepartments();
        }
    }, [user?.id]);

    useEffect(() => {
        if (selectedDeptId) {
            fetchLetters(selectedDeptId, currentPage);
        } else {
            setLetters([]);
        }
    }, [selectedDeptId, currentPage]);

    const fetchAssignedDepartments = async (retryCount = 0) => {
        if (!user?.id) return;
        
        try {
            const res = await axios.get(`${API_BASE}/inter-dept/users/${user.id}`);
            
            if (Array.isArray(res.data)) {
                // Extract unique departments from mapping
                const depts = res.data.map(mapping => mapping.department).filter(Boolean);
                setAssignedDepts(depts);
                
                // Auto-select first if available
                if (depts.length > 0 && !selectedDeptId) {
                    const firstDept = depts[0];
                    if (firstDept && firstDept.id) {
                        setSelectedDeptId(firstDept.id.toString());
                    }
                }
            }
        } catch (error) {
            console.error("Fetch depts error:", error.message);
            // Simple retry for aborted requests or transient network issues (up to 2 times)
            if (retryCount < 2 && (error.code === 'ECONNABORTED' || error.message.includes('aborted'))) {
                console.log(`Retrying fetch depts... (${retryCount + 1})`);
                setTimeout(() => fetchAssignedDepartments(retryCount + 1), 1000);
            }
        } finally {
            if (retryCount === 0 || retryCount >= 2) {
                setLoading(false);
            }
        }
    };

    const fetchLetters = async (deptId, page = 1, retryCount = 0) => {
        if (!deptId) return;
        if (retryCount === 0) setLettersLoading(true);
        
        try {
            const roleName = user?.roleData?.name || user?.role || '';
            const res = await axios.get(`${API_BASE}/letter-assignments`, {
                params: {
                    department_id: deptId,
                    page: page,
                    limit: recordsPerPage,
                    role: roleName
                }
            });
            
            if (res.data && res.data.data) {
                setLetters(res.data.data);
                setTotalPages(res.data.totalPages || 1);
            } else {
                setLetters(Array.isArray(res.data) ? res.data : []);
            }
        } catch (error) {
            console.error("Fetch letters error:", error.message);
            // Retry logic for Brave/Aborted requests
            if (retryCount < 2 && (error.code === 'ECONNABORTED' || error.message?.includes('aborted'))) {
                console.log(`Retrying fetch letters... (${retryCount + 1})`);
                setTimeout(() => fetchLetters(deptId, page, retryCount + 1), 1000);
            }
        } finally {
            if (retryCount === 0 || retryCount >= 2) {
                setLettersLoading(false);
            }
        }
    };

    const filteredLetters = letters.filter(l => 
        l.letter?.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.letter?.barcode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.letter?.encoder?.first_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const pageBg = layoutStyle === 'minimalist' ? 'bg-[#F9FAFB] dark:bg-[#0D0D0D]' : 'bg-slate-50';
    const cardBg = layoutStyle === 'minimalist' ? 'bg-white dark:bg-[#111] border-[#E5E5E5] dark:border-[#222]' : 'bg-white border-slate-200 shadow-sm';
    const textColor = layoutStyle === 'minimalist' ? 'text-[#1A1A1B] dark:text-white' : 'text-slate-900 dark:text-white';

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-white dark:bg-[#0d0d0d]">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
    );

    return (
        <div className={`min-h-screen flex overflow-hidden ${pageBg}`}>
            <Sidebar />
            <main className="flex-1 flex flex-col h-screen overflow-hidden">
                <header className="h-16 px-8 flex items-center justify-between border-b border-[#E5E5E5] dark:border-[#222] bg-white dark:bg-[#0D0D0D] z-10">
                    <div className="flex items-center gap-4">
                        <Building2 className="w-5 h-5 text-blue-600" />
                        <h1 className="text-xs font-black uppercase tracking-widest text-gray-400">Tracking / Cross-Unit Tracker</h1>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    <div className="max-w-7xl mx-auto space-y-8">
                        {/* Header Section */}
                        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                            <div>
                                <h2 className={`text-3xl font-black tracking-tight ${textColor}`}>Unit Correspondence</h2>
                                <p className="text-gray-500 mt-2 text-sm font-medium">Viewing letters from departments you are authorized to track.</p>
                            </div>

                            <div className="flex items-center gap-3">
                                <div className="text-right hidden md:block">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Switch Department</p>
                                    <p className="text-xs font-bold text-blue-600 truncate max-w-[200px]">{assignedDepts.find(d => d.id.toString() === selectedDeptId)?.dept_name || 'Select Unit'}</p>
                                </div>
                                <div className="relative group">
                                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <select 
                                        value={selectedDeptId}
                                        onChange={(e) => setSelectedDeptId(e.target.value)}
                                        className="pl-10 pr-10 py-3 rounded-2xl border border-gray-100 dark:border-[#222] bg-white dark:bg-white/5 text-sm font-bold min-w-[240px] appearance-none outline-none focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm"
                                    >
                                        <option value="">No Department selected</option>
                                        {assignedDepts.map(dept => (
                                            <option key={dept.id} value={dept.id}>{dept.dept_name} ({dept.dept_code})</option>
                                        ))}
                                    </select>
                                    <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none rotate-90" />
                                </div>
                            </div>
                        </div>

                        {/* Search Bar */}
                        <div className={`${cardBg} border p-4 rounded-3xl`}>
                            <div className="relative group/search">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within/search:text-blue-500 transition-colors" />
                                <input 
                                    type="text" 
                                    placeholder="Search letters, barcode, or subject..."
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-2xl text-sm font-bold outline-none focus:bg-white dark:focus:bg-[#0D0D0D] transition-all"
                                />
                                {lettersLoading && <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500 animate-spin" />}
                            </div>
                        </div>

                        {/* Letters Grid or Fallback */}
                        {lettersLoading ? (
                            <div className="py-40 flex flex-col items-center justify-center gap-4">
                                <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Synchronizing Correspondence...</p>
                            </div>
                        ) : (
                            <>
                                {filteredLetters.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                        {filteredLetters.map(assignment => (
                                            <div 
                                                key={assignment.id} 
                                                onClick={() => navigate(`/letter/${assignment.letter_id}`)}
                                                className={`${cardBg} border rounded-[2rem] p-6 hover:border-blue-500/50 hover:shadow-2xl hover:shadow-blue-500/10 cursor-pointer transition-all group overflow-hidden relative`}
                                            >
                                                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-100 transition-opacity">
                                                    <ArrowUpRight className="w-5 h-5 text-blue-500" />
                                                </div>
                                                
                                                <div className="space-y-4">
                                                    <div className="flex items-start justify-between">
                                                        <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
                                                            <FileText className="w-6 h-6" />
                                                        </div>
                                                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-blue-50 dark:bg-blue-900/20 text-blue-600`}>
                                                            {assignment.statusInfo?.status_name || 'In Progress'}
                                                        </span>
                                                    </div>

                                                    <div>
                                                        <h3 className={`text-sm font-black uppercase tracking-tight truncate leading-tight mb-2 ${textColor}`}>
                                                            {assignment.letter?.subject || 'Untitled Correspondence'}
                                                        </h3>
                                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                                            Barcode: {assignment.letter?.barcode}
                                                        </p>
                                                    </div>

                                                    <div className="pt-4 border-t border-gray-50 dark:border-white/5 space-y-2">
                                                        <div className="flex items-center gap-2 text-gray-500">
                                                            <User className="w-3.5 h-3.5" />
                                                            <span className="text-[10px] font-bold uppercase truncate">{assignment.letter?.encoder?.first_name} {assignment.letter?.encoder?.last_name}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2 text-gray-500">
                                                            <Calendar className="w-3.5 h-3.5" />
                                                            <span className="text-[10px] font-bold uppercase">{new Date(assignment.letter?.date_encoded).toLocaleDateString()}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2 text-blue-500">
                                                            <Target className="w-3.5 h-3.5 font-black" />
                                                            <span className="text-[10px] font-black uppercase tracking-widest">{assignment.step?.step_name}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : selectedDeptId ? (
                                    <div className={`${cardBg} border rounded-[3rem] py-32 flex flex-col items-center justify-center text-center opacity-50`}>
                                        <div className="w-20 h-20 bg-slate-50 dark:bg-white/5 rounded-[2rem] flex items-center justify-center text-gray-300 mb-6">
                                            <FileText className="w-10 h-10" />
                                        </div>
                                        <h3 className="text-xl font-black uppercase tracking-tight text-gray-500">No Letters Found</h3>
                                        <p className="text-sm font-medium text-gray-400 mt-2 max-w-sm ml-auto mr-auto">This department currently has no letters or assignments to show.</p>
                                    </div>
                                ) : (
                                    <div className={`${cardBg} border rounded-[3rem] py-32 flex flex-col items-center justify-center text-center`}>
                                        <div className="w-24 h-24 bg-blue-50 dark:bg-blue-900/10 rounded-[2.5rem] flex items-center justify-center text-blue-600 mb-8 animate-pulse shadow-xl shadow-blue-500/10">
                                            <Building2 className="w-12 h-12" />
                                        </div>
                                        <h3 className={`text-2xl font-black uppercase tracking-tight ${textColor}`}>Department Viewer</h3>
                                        <p className="text-gray-500 mt-3 text-sm font-medium max-w-md mx-auto">Please pick a department from the menu above to view its letters and current status.</p>
                                    </div>
                                )}

                                {/* Pagination Footer */}
                                {letters.length > 0 && (
                                    <div className="flex items-center justify-center gap-4 py-8">
                                        <button 
                                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                            disabled={currentPage === 1}
                                            className={`px-4 py-2 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${currentPage === 1 ? 'opacity-30 border-gray-100 dark:border-[#222] cursor-not-allowed' : 'bg-white dark:bg-[#111] border-gray-200 hover:bg-blue-600 hover:text-white hover:border-blue-600 shadow-sm'}`}
                                        >
                                            Previous
                                        </button>
                                        <div className="flex items-center gap-3">
                                            <span className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center text-xs font-black shadow-lg shadow-blue-500/20">{currentPage}</span>
                                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">of {totalPages}</span>
                                        </div>
                                        <button 
                                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                            disabled={currentPage === totalPages}
                                            className={`px-4 py-2 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${currentPage === totalPages ? 'opacity-30 border-gray-100 dark:border-[#222] cursor-not-allowed' : 'bg-white dark:bg-[#111] border-gray-200 hover:bg-blue-600 hover:text-white hover:border-blue-600 shadow-sm'}`}
                                        >
                                            Next
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
