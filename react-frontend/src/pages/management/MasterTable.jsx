
import React, { useEffect, useState, useRef } from "react";
import Sidebar from "../../components/Sidebar";
import { useAuth } from "../../context/AuthContext";
import { directus } from "../../hooks/useDirectus";
import PermissionGuard from "../../components/PermissionGuard";
import {
    Table as TableIcon,
    Plus,
    Loader2,
    RefreshCw,
    Search,
    Edit,
    Trash2,
    CheckSquare,
    Square,
    Menu,
    X,
    FileText,
    Download,
    Eye,
    ChevronRight,
    Filter,
    ArrowUpDown,
    CheckCircle2,
    Clock,
    AlertCircle,
    MoreHorizontal,
    ExternalLink,
    Paperclip,
    Activity,
    GitMerge,
    Upload,
    Send
} from "lucide-react";
import letterService from "../../services/letterService";
import departmentService from "../../services/departmentService";
import statusService from "../../services/statusService";
import letterKindService from "../../services/letterKindService";
import axios from "axios";
import { useNavigate } from "react-router-dom";

export default function MasterTable() {
    const { user, layoutStyle, setIsMobileMenuOpen, isSuperAdmin } = useAuth();
    const navigate = useNavigate();

    // Theme Variables (derived locally)
    const textColor = 'text-slate-900 dark:text-white';
    const cardBg = layoutStyle === 'notion' ? 'bg-white dark:bg-[#191919] border-gray-100 dark:border-[#222]' : 'bg-white dark:bg-[#141414] border-gray-100 dark:border-[#222]';
    const pageBg = layoutStyle === 'notion' ? 'bg-white dark:bg-[#191919]' : layoutStyle === 'grid' ? 'bg-slate-50' : 'bg-[#F9FAFB] dark:bg-[#0D0D0D]';

    const [letters, setLetters] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedIds, setSelectedIds] = useState([]);

    // Drawer/Modal State
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [isTrackDrawerOpen, setIsTrackDrawerOpen] = useState(false);
    const [selectedLetter, setSelectedLetter] = useState(null);
    const [trackingLetter, setTrackingLetter] = useState(null);
    const [drawerMode, setDrawerMode] = useState("edit"); // "view" or "edit"

    // Ref Data
    const [departments, setDepartments] = useState([]);
    const [statuses, setStatuses] = useState([]);
    const [steps, setSteps] = useState([]);
    const [trays, setTrays] = useState([]);
    const [attachments, setAttachments] = useState([]);
    const [letterKinds, setLetterKinds] = useState([]);
    const [persons, setPersons] = useState([]);
    const [endorseSuggestions, setEndorseSuggestions] = useState([]);
    const [showEndorseSuggestions, setShowEndorseSuggestions] = useState(false);
    const endorseRef = useRef(null);
    const [isCombining, setIsCombining] = useState(false);
    const [newFile, setNewFile] = useState(null);
    const [isDragging, setIsDragging] = useState(false);

    const handleFileSelect = (file) => {
        if (!file) return;
        if (file.type !== 'application/pdf') {
            alert("Please upload a PDF file.");
            return;
        }
        if ((selectedLetter.attachment_id || selectedLetter.scanned_copy) && !isCombining) {
            alert("Please check 'Combine PDF' if you wish to add this to the existing document.");
            return;
        }
        setNewFile(file);
    };

    // Handle Paste Globally when modal is open
    useEffect(() => {
        const handlePaste = (e) => {
            if (!isDrawerOpen || drawerMode !== 'edit') return;
            const item = e.clipboardData.items[0];
            if (item?.kind === 'file') {
                const file = item.getAsFile();
                handleFileSelect(file);
            }
        };
        window.addEventListener('paste', handlePaste);
        return () => window.removeEventListener('paste', handlePaste);
    }, [isDrawerOpen, drawerMode, isCombining, selectedLetter]);

    // Field statuses requested by user - replaced by dynamic 'statuses' from DB
    const SPECIAL_ACTIONS = [
        "Show to ATG Dashboard"
    ];

    const fetchData = async (isRefreshing = false) => {
        if (isRefreshing) setRefreshing(true);
        try {
            const userDeptId = user?.dept_id?.id ?? user?.dept_id;
            const roleName = user?.roleData?.name || user?.role || '';
            const data = await letterService.getAll({
                user_id: user?.id,
                role: roleName,
                department_id: userDeptId,
                full_name: `${user?.first_name} ${user?.last_name}`.trim()
            });
            setLetters(Array.isArray(data) ? data : []);

            const depts = await departmentService.getAll();
            setDepartments(depts);

            const stats = await statusService.getAll();
            setStatuses(stats);

            const stepsData = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/process-steps`);
            setSteps(stepsData.data);


            const kindsData = await letterKindService.getAll().catch(() => []);
            setLetterKinds(kindsData);

            const personsData = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/persons`).catch(() => ({ data: [] }));
            setPersons(Array.isArray(personsData.data) ? personsData.data : []);

            const traysData = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/trays`);
            setTrays(traysData.data);

            const attachmentsData = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/attachments`);
            setAttachments(attachmentsData.data);
        } catch (error) {
            console.error("Fetch failed", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const toggleSelectAll = () => {
        if (selectedIds.length === filteredLetters.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(filteredLetters.map(l => l.id));
        }
    };

    const toggleSelect = (id) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const fetchEndorseSuggestions = async (query) => {
        if (!query || query.length < 2) {
            setEndorseSuggestions([]);
            setShowEndorseSuggestions(false);
            return;
        }
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/persons/search?query=${query}`);
            setEndorseSuggestions(res.data);
            setShowEndorseSuggestions(res.data.length > 0);
        } catch { }
    };

    // Close endorse suggestions on outside click
    useEffect(() => {
        const handler = (e) => { if (endorseRef.current && !endorseRef.current.contains(e.target)) setShowEndorseSuggestions(false); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const handleEdit = (letter) => {
        setSelectedLetter({ ...letter });
        setDrawerMode("edit");
        setIsDrawerOpen(true);
        setIsCombining(false);
        setNewFile(null);
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this letter? This action cannot be undone.")) return;
        try {
            await letterService.delete(id);
            fetchData();
        } catch (error) {
            console.error("Delete failed", error);
            alert("Failed to delete letter.");
        }
    };

    const handleBulkDelete = async () => {
        if (!window.confirm(`Delete ${selectedIds.length} records?`)) return;
        try {
            // Sequential delete for now as per services
            for (const id of selectedIds) {
                await letterService.delete(id);
            }
            setSelectedIds([]);
            fetchData();
        } catch (error) {
            console.error("Bulk delete failed", error);
        }
    };

    const handleStatusChange = async (id, newStatus) => {
        try {
            const statusMatch = statuses.find(s => s.status_name === newStatus);
            const payload = statusMatch ? { global_status: statusMatch.id } : { letter_type: newStatus };

            await letterService.update(id, payload);
            fetchData();
        } catch (error) {
            console.error("Status update failed", error);
        }
    };

    const handleBulkStatusUpdate = async (newStatus) => {
        if (!newStatus) return;
        try {
            setLoading(true);
            if (newStatus === "Combine Selected PDFs") {
                const res = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/attachments/combine-selected`, {
                    letter_ids: selectedIds
                });
                if (res.data.file_path) {
                    const b64 = btoa(res.data.file_path);
                    window.open(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/attachments/view-path?path=${b64}`, '_blank');
                }
            } else {
                for (const id of selectedIds) {
                    if (newStatus === "Show to ATG Dashboard") {
                        await letterService.update(id, { tray_id: 0, global_status: 2 });
                    } else {
                        const statusMatch = statuses.find(s => s.status_name === newStatus);
                        const payload = statusMatch ? { global_status: statusMatch.id } : { letter_type: newStatus };
                        await letterService.update(id, payload);
                    }
                }
            }
            fetchData();
            setSelectedIds([]);
        } catch (error) {
            console.error("Bulk status update failed", error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateDetails = async () => {
        try {
            setLoading(true);

            let updatedLetter = { ...selectedLetter };

            // 0. Handle File Upload if newFile is present
            if (newFile) {
                const formData = new FormData();
                formData.append('file', newFile);
                formData.append('no_record', 'true');

                if (isCombining) {
                    if (selectedLetter.scanned_copy) {
                        formData.append('existing_path', selectedLetter.scanned_copy);
                    } else if (selectedLetter.attachment_id) {
                        formData.append('combine_with', selectedLetter.attachment_id);
                    }
                }

                const uploadRes = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/attachments/upload`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });

                updatedLetter.scanned_copy = uploadRes.data.file_path;
            }

            // 1. Update core letter details
            await letterService.update(updatedLetter.id, updatedLetter);

            // 2. Update/Add Assignment for the new step if it changed
            if (updatedLetter.currentStepId) {
                if (updatedLetter.assignments && updatedLetter.assignments.length > 0) {
                    const latest = updatedLetter.assignments.sort((a, b) => b.id - a.id)[0];
                    await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/letter-assignments/${latest.id}`, {
                        step_id: updatedLetter.currentStepId
                    });
                } else {
                    // If no assignment exists, create one!
                    await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/letter-assignments`, {
                        letter_id: updatedLetter.id,
                        step_id: updatedLetter.currentStepId,
                        department_id: user?.dept_id?.id || user?.dept_id || null,
                        assigned_by: user?.id,
                        status: 'Pending',
                        status_id: 8
                    });
                }
            }

            // 3. If endorsement person selected, record endorsement then navigate
            if (selectedLetter.endorse_to && selectedLetter.endorse_to !== '') {
                await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/endorsements`, {
                    letter_id: updatedLetter.id,
                    endorsed_to: selectedLetter.endorse_to,
                    endorsed_by: user?.id || null,
                    notes: ''
                });
                setIsDrawerOpen(false);
                setNewFile(null);
                setIsCombining(false);
                fetchData();
                navigate('/endorsements');
                return;
            }

            setIsDrawerOpen(false);
            setNewFile(null);
            setIsCombining(false);
            fetchData();
        } catch (error) {
            console.error("Update failed", error);
            alert("Failed to update letter details.");
        } finally {
            setLoading(false);
        }
    };

    const handleTrackOpen = (letter) => {
        setTrackingLetter(letter);
        setIsTrackDrawerOpen(true);
    };

    const handleViewPDF = (letter) => {
        if (letter.scanned_copy) {
            const encodedPath = btoa(letter.scanned_copy);
            window.open(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/attachments/view-path?path=${encodedPath}`, '_blank');
        } else if (letter.attachment_id) {
            window.open(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/attachments/view/${letter.attachment_id}`, '_blank');
        } else {
            alert("No document available to view.");
        }
    };

    const filteredLetters = letters.filter(l => {
        // Data Visibility Filter for USER role
        const roleName = user?.roleData?.name?.toString().toUpperCase() || '';
        if (roleName === 'USER' && !isSuperAdmin) {
            const isOwner = l.encoder_id === user.id;
            const userDeptId = user?.dept_id?.id ?? user?.dept_id;
            const isInDept = l.assignments?.some(a => (a.department_id?.id ?? a.department_id) === userDeptId);
            if (!isOwner && !isInDept) return false;
        }

        return (l.lms_id?.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (l.sender?.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (l.summary?.toLowerCase().includes(searchTerm.toLowerCase()));
    });

    const getStatusStyle = (status) => {
        switch (status?.toLowerCase()) {
            case 'incoming': return 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-900/10 dark:text-blue-400 dark:border-blue-900/30';
            case 'being reviewed': return 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-900/10 dark:text-amber-400 dark:border-amber-900/30';
            case 'hold': return 'bg-red-50 text-red-600 border-red-100 dark:bg-red-900/10 dark:text-red-400 dark:border-red-900/30';
            case 'endorse': return 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/10 dark:text-emerald-400 dark:border-emerald-900/30';
            default: return 'bg-slate-50 text-slate-600 border-slate-100 dark:bg-white/5 dark:text-slate-400 dark:border-white/10';
        }
    };

    return (
        <div className={`min-h-screen ${pageBg} flex overflow-hidden`}>
            <Sidebar />
            <main className="flex-1 flex flex-col h-screen overflow-hidden">
                {/* Header */}
                <header className={`h-16 ${'bg-white dark:bg-[#0D0D0D] border-gray-100 dark:border-[#222]'} border-b px-4 md:px-8 flex items-center justify-between z-10`}>
                    <div className="flex items-center gap-4">
                        <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 -ml-2 text-gray-400 md:hidden transition-colors"><Menu className="w-5 h-5" /></button>
                        <div className="flex items-center gap-2">
                            <TableIcon className="w-4 h-4 text-orange-500" />
                            <h1 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Master / Correspondence Table</h1>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {selectedIds.length > 0 && (
                            <button
                                onClick={handleBulkDelete}
                                className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 border border-red-100 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                            >
                                <Trash2 className="w-3 h-3" />
                                Delete ({selectedIds.length})
                            </button>
                        )}
                        <button onClick={() => fetchData(true)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition-all"><RefreshCw className={`w-4 h-4 text-gray-400 ${refreshing ? 'animate-spin' : ''}`} /></button>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-10 custom-scrollbar">
                    <div className="max-w-full mx-auto space-y-6">
                        {/* Summary & Search */}
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <h2 className={`text-2xl font-black uppercase tracking-tight ${textColor}`}>Master Records</h2>
                                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Manage and track all registered correspondence from a single view.</p>
                            </div>
                            <div className="relative group min-w-[300px]">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Find letters, senders, summaries..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className={`w-full pl-12 pr-4 py-3 rounded-2xl border text-sm transition-all focus:ring-2 focus:ring-orange-500/20 outline-none ${'bg-white dark:bg-[#141414] border-gray-100 dark:border-[#222]'}`}
                                />
                            </div>
                        </div>

                        {/* Bulk Status Actions Bar */}
                        {selectedIds.length > 0 && (
                            <div className={`p-4 rounded-3xl border flex flex-col md:flex-row items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2 duration-300 ${'bg-orange-50 dark:bg-orange-900/10 border-orange-100 dark:border-orange-900/20'}`}>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-white dark:bg-white/10 rounded-full flex items-center justify-center text-orange-500 shadow-sm border border-orange-100 dark:border-orange-900/20">
                                        <CheckSquare className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className={`text-xs font-black uppercase tracking-tight ${textColor}`}>{selectedIds.length} Records Selected</p>
                                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Apply bulk updates to the letters</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 custom-scrollbar w-full md:w-auto">
                                    {statuses.map(s => (
                                        <button
                                            key={s.id}
                                            onClick={() => handleBulkStatusUpdate(s.status_name)}
                                            className={`whitespace-nowrap px-4 py-2 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all bg-white dark:bg-white/5 border-gray-100 dark:border-white/10 ${textColor} hover:bg-orange-500 hover:text-white hover:border-orange-500`}
                                        >
                                            {s.status_name}
                                        </button>
                                    ))}
                                    {SPECIAL_ACTIONS.map(action => (
                                        <button
                                            key={action}
                                            onClick={() => handleBulkStatusUpdate(action)}
                                            className="whitespace-nowrap px-4 py-2 rounded-xl border border-indigo-500 bg-indigo-50 dark:bg-indigo-900/10 text-indigo-500 text-[10px] font-black uppercase tracking-widest transition-all hover:bg-indigo-500 hover:text-white"
                                        >
                                            {action}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Table Container */}
                        <div className={`rounded-[2.5rem] border overflow-hidden shadow-sm ${'bg-white dark:bg-[#141414] border-gray-100 dark:border-[#222]'}`}>
                            <div className="overflow-x-auto custom-scrollbar">
                                <table className="w-full text-left border-collapse min-w-[1200px]">
                                    <thead>
                                        <tr className={`border-b ${'border-gray-50 dark:border-[#222] bg-gray-50/50 dark:bg-white/5'}`}>
                                            <th className="p-5 w-12 text-center">
                                                <button onClick={toggleSelectAll} className="text-gray-400 hover:text-orange-500 transition-colors">
                                                    {selectedIds.length === filteredLetters.length && filteredLetters.length > 0 ? <CheckSquare className="w-5 h-5 text-orange-500" /> : <Square className="w-5 h-5" />}
                                                </button>
                                            </th>
                                            <th className="p-5 w-12 text-center"></th>
                                            <th className="p-5 text-[10px] font-black uppercase tracking-widest text-gray-400">LMS ID</th>
                                            <th className="p-5 text-[10px] font-black uppercase tracking-widest text-gray-400">Status</th>
                                            <th className="p-5 text-[10px] font-black uppercase tracking-widest text-gray-400">Group</th>
                                            <th className="p-5 text-[10px] font-black uppercase tracking-widest text-gray-400 whitespace-nowrap">Date Received</th>
                                            <th className="p-5 text-[10px] font-black uppercase tracking-widest text-gray-400">Sender</th>
                                            <th className="p-5 text-[10px] font-black uppercase tracking-widest text-gray-400">Summary</th>
                                            <th className="p-5 text-[10px] font-black uppercase tracking-widest text-gray-400 text-center">Track</th>
                                            <th className="p-5 text-[10px] font-black uppercase tracking-widest text-gray-400 text-center">PDF</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50 dark:divide-[#222]">
                                        {loading ? (
                                            <tr>
                                                <td colSpan="9" className="p-20 text-center">
                                                    <Loader2 className="w-10 h-10 text-orange-500 animate-spin mx-auto mb-4" />
                                                    <p className="text-xs font-black uppercase tracking-widest text-gray-400">Compiling Database...</p>
                                                </td>
                                            </tr>
                                        ) : filteredLetters.length === 0 ? (
                                            <tr>
                                                <td colSpan="9" className="p-20 text-center">
                                                    <Search className="w-10 h-10 text-gray-200 mx-auto mb-4" />
                                                    <p className="text-xs font-black uppercase tracking-widest text-gray-400">No Records Found</p>
                                                </td>
                                            </tr>
                                        ) : filteredLetters.map((letter) => (
                                            <tr key={letter.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group">
                                                <td className="p-5 text-center">
                                                    <button onClick={() => toggleSelect(letter.id)} className="text-gray-300 group-hover:text-gray-400 transition-colors">
                                                        {selectedIds.includes(letter.id) ? <CheckSquare className="w-5 h-5 text-orange-500" /> : <Square className="w-5 h-5" />}
                                                    </button>
                                                </td>
                                                <td className="p-5 text-center px-0">
                                                    <PermissionGuard page="master-table" action="can_edit">
                                                        <button
                                                            onClick={() => handleEdit(letter)}
                                                            className="p-2.5 rounded-xl bg-orange-50 dark:bg-orange-900/10 text-orange-500 hover:bg-orange-500 hover:text-white transition-all transform hover:scale-105 mx-auto"
                                                        >
                                                            <Edit className="w-4 h-4" />
                                                        </button>
                                                    </PermissionGuard>
                                                </td>
                                                <td className="p-5 whitespace-nowrap">
                                                    <span className={`text-[10px] font-black px-2.5 py-1 rounded bg-slate-100 dark:bg-white/10 ${textColor}`}>
                                                        {letter.lms_id || 'PENDING'}
                                                    </span>
                                                </td>
                                                <td className="p-5 whitespace-nowrap text-xs font-bold">
                                                    <span className={`px-3 py-1 rounded-full text-[10px] uppercase font-black tracking-widest ${letter.status?.status_name === 'Incoming' ? 'bg-blue-50 text-blue-600' :
                                                        letter.status?.status_name === 'Forwarded' ? 'bg-purple-50 text-purple-600' :
                                                            'bg-gray-50 text-gray-600'
                                                        }`}>
                                                        {letter.status?.status_name || 'N/A'}
                                                    </span>
                                                </td>
                                                <td className="p-5 whitespace-nowrap text-xs font-bold text-indigo-500 uppercase tracking-tighter">
                                                    {letter.assignments?.sort((a, b) => b.id - a.id)[0]?.step?.step_name || 'N/A'}
                                                </td>
                                                <td className="p-5 whitespace-nowrap text-[10px] font-bold text-gray-500 dark:text-gray-400">
                                                    <div className="flex flex-col">
                                                        <span>{new Date(letter.date_received || letter.createdAt).toLocaleDateString()}</span>
                                                        <span className="text-orange-500">{new Date(letter.date_received || letter.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                    </div>
                                                </td>
                                                <td className="p-5 text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-tight">
                                                    {letter.sender}
                                                </td>
                                                <td className="p-5 max-w-xs">
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium line-clamp-2">
                                                        {letter.summary}
                                                    </p>
                                                </td>
                                                <td className="p-5 text-center">
                                                    <PermissionGuard page="master-table" action="can_special">
                                                        <button
                                                            onClick={() => handleTrackOpen(letter)}
                                                            className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-900/10 text-indigo-500 hover:bg-indigo-500 hover:text-white transition-all transform hover:scale-105 mx-auto"
                                                        >
                                                            <Activity className="w-4 h-4" />
                                                        </button>
                                                    </PermissionGuard>
                                                </td>
                                                <td className="p-5 text-center">
                                                    {(letter.attachment_id || letter.scanned_copy) ? (
                                                        <button
                                                            onClick={() => handleViewPDF(letter)}
                                                            className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-900/10 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all mx-auto"
                                                        >
                                                            <FileText className="w-4 h-4" />
                                                        </button>
                                                    ) : (
                                                        <span className="text-gray-200 dark:text-[#333]">-</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Footer / Pagination Placeholder */}
                        <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-gray-400 px-4">
                            <span>Showing {filteredLetters.length} of {letters.length} entries</span>
                            <div className="flex items-center gap-4">
                                <button disabled className="opacity-50">Previous</button>
                                <div className="flex items-center gap-2">
                                    <span className="w-6 h-6 rounded flex items-center justify-center bg-orange-500 text-white shadow-lg shadow-orange-500/20">1</span>
                                </div>
                                <button disabled className="opacity-50">Next</button>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* POPUP MODAL FROM RIGHT (Drawer) */}
            {isDrawerOpen && selectedLetter && (
                <div className="fixed inset-0 z-[100] flex justify-end">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setIsDrawerOpen(false)} />
                    <div className={`w-full max-w-xl ${'bg-white dark:bg-[#141414] shadow-2xl'} h-full relative z-10 animate-in slide-in-from-right duration-500 flex flex-col`}>
                        {/* Drawer Header */}
                        <div className={`p-8 border-b ${'border-gray-50 dark:border-[#222]'} flex items-center justify-between`}>
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-900/10 flex items-center justify-center text-red-500">
                                    <FileText className="w-6 h-6" />
                                </div>
                                <div>
                                    <h2 className={`text-xl font-black uppercase tracking-tight ${textColor}`}>Letter Details</h2>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{selectedLetter?.lms_id || 'System ID: ' + selectedLetter?.id}</p>
                                </div>
                            </div>
                            <button onClick={() => setIsDrawerOpen(false)} className="p-2 hover:bg-gray-50 dark:hover:bg-white/5 rounded-xl transition-colors">
                                <X className="w-6 h-6 text-gray-400" />
                            </button>
                        </div>

                        {/* Drawer Content */}
                        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-8">
                            <div className="space-y-6">
                                {/* Core Info Card */}
                                <div className={`p-6 rounded-[2rem] border ${'bg-slate-50 dark:bg-white/5 border-gray-100 dark:border-[#333] shadow-inner'} space-y-6`}>



                                    {/* Workflow Step Selection (Radio Buttons) */}
                                    <div className="space-y-4">
                                        <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                                            <GitMerge className="w-3 h-3" /> Update Process Step
                                        </label>
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {steps.map((step) => {
                                                const latestAssignment = selectedLetter.assignments?.sort((a, b) => b.id - a.id)[0];
                                                const currentStepId = selectedLetter.currentStepId || latestAssignment?.step_id;
                                                const isSelected = currentStepId === step.id;

                                                return (
                                                    <label
                                                        key={step.id}
                                                        className={`flex-1 min-w-[120px] flex items-center gap-2 p-2 rounded-xl border cursor-pointer transition-all ${isSelected ? 'bg-indigo-500 text-white border-indigo-500 shadow-lg shadow-indigo-500/20' : 'bg-white dark:bg-white/5 border-gray-100 dark:border-white/10 hover:border-gray-200 dark:hover:border-white/20'}`}
                                                    >
                                                        <input
                                                            type="radio"
                                                            name="process_step"
                                                            className="hidden"
                                                            checked={isSelected}
                                                            onChange={() => setSelectedLetter(prev => ({ ...prev, currentStepId: step.id }))}
                                                        />
                                                        <div className={`w-3 h-3 rounded-full border flex items-center justify-center ${isSelected ? 'border-white' : 'border-gray-300 dark:border-gray-600'}`}>
                                                            {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                                                        </div>
                                                        <span className={`text-[10px] font-black uppercase tracking-tight truncate`}>
                                                            {step.step_name}
                                                        </span>
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Date & Time Received Display */}
                                    <div className="pt-6 border-t border-dashed border-gray-200 dark:border-white/10 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-white dark:bg-white/10 flex items-center justify-center text-orange-500 shadow-sm border border-orange-50 dark:border-white/5">
                                                <Clock className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Received On</label>
                                                <p className={`text-xs font-black uppercase tracking-tight ${textColor}`}>
                                                    {new Date(selectedLetter.date_received).toLocaleDateString(undefined, { dateStyle: 'long' })}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className={`text-xs font-black text-orange-500 uppercase`}>
                                                {new Date(selectedLetter.date_received).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Detailed Fields */}
                                <div className="space-y-4 pt-4 px-2">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Active Tray Location</label>
                                        <select
                                            value={selectedLetter.tray_id || ""}
                                            onChange={(e) => setSelectedLetter({ ...selectedLetter, tray_id: e.target.value === "" ? null : parseInt(e.target.value) })}
                                            style={{ backgroundColor: 'white', color: 'black' }}
                                            className="w-full px-4 py-3 rounded-xl border text-sm font-bold outline-none focus:ring-2 focus:ring-orange-500/20 shadow-sm"
                                        >
                                            <option value="" style={{ color: 'black', backgroundColor: 'white' }}>-- No Tray Assigned --</option>
                                            {trays.map(t => (
                                                <option key={t.id} value={t.id} style={{ color: 'black', backgroundColor: 'white' }}>{t.tray_no}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="space-y-1">
                                        <div className="flex items-center justify-between gap-2">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-orange-500">Correspondence Status</label>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    // Quick action to set for ATG Dashboard
                                                    setSelectedLetter(prev => ({ ...prev, tray_id: 0, global_status: 2 }));
                                                }}
                                                className="text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-900/10 text-indigo-500 border border-indigo-100 dark:border-indigo-900/30 hover:bg-indigo-500 hover:text-white transition-all shadow-sm"
                                            >
                                                Show to ATG Dashboard
                                            </button>
                                        </div>
                                        <select
                                            value={selectedLetter.global_status || ""}
                                            onChange={(e) => {
                                                const newStatusId = parseInt(e.target.value);
                                                setSelectedLetter(prev => ({ ...prev, global_status: e.target.value === "" ? null : newStatusId }));
                                            }}
                                            style={{ backgroundColor: 'white', color: 'black' }}
                                            className="w-full px-4 py-3 rounded-xl border text-sm font-bold outline-none focus:ring-2 focus:ring-orange-500/20 shadow-sm"
                                        >
                                            <option value="" style={{ color: 'black', backgroundColor: 'white' }}>-- Change Status --</option>
                                            {statuses.map(s => (
                                                <option key={s.id} value={s.id} style={{ color: 'black', backgroundColor: 'white' }}>{s.status_name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Kind Dropdown */}
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Letter Kind</label>
                                        <select
                                            value={selectedLetter.kind || ""}
                                            onChange={(e) => setSelectedLetter({ ...selectedLetter, kind: e.target.value === "" ? null : parseInt(e.target.value) })}
                                            style={{ backgroundColor: 'white', color: 'black' }}
                                            className="w-full px-4 py-3 rounded-xl border text-sm font-bold outline-none focus:ring-2 focus:ring-orange-500/20 shadow-sm"
                                        >
                                            <option value="" style={{ color: 'black', backgroundColor: 'white' }}>-- Select Kind --</option>
                                            {letterKinds.map(k => (
                                                <option key={k.id} value={k.id} style={{ color: 'black', backgroundColor: 'white' }}>{k.kind_name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Sender Entity</label>
                                        <input
                                            type="text"
                                            className={`w-full px-4 py-3 rounded-xl border text-sm font-bold ${'bg-slate-50 dark:bg-[#1a1a1a] border-gray-100 dark:border-[#333] text-slate-900 dark:text-white'}`}
                                            value={selectedLetter.sender || ""}
                                            onChange={(e) => setSelectedLetter({ ...selectedLetter, sender: e.target.value })}
                                        />
                                    </div>

                                    {/* Assign This Letter To (Endorsement) */}
                                    <div className="space-y-1 p-4 rounded-2xl bg-orange-50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-900/20" ref={endorseRef}>
                                        <label className="text-[10px] font-black text-orange-500 uppercase tracking-widest flex items-center gap-1.5">
                                            <Send className="w-3 h-3" /> Assign This Letter To (Endorse)
                                        </label>
                                        <p className="text-[9px] text-orange-400/80 font-medium mb-2">Type to search and select a person. This will record an endorsement on Update Changes.</p>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                placeholder="Type name to search..."
                                                value={selectedLetter.endorse_to || ""}
                                                onChange={(e) => {
                                                    setSelectedLetter({ ...selectedLetter, endorse_to: e.target.value });
                                                    fetchEndorseSuggestions(e.target.value);
                                                }}
                                                className="w-full px-4 py-3 rounded-xl border text-sm font-bold outline-none focus:ring-2 focus:ring-orange-400/30 bg-white border-orange-100 text-gray-900 shadow-sm"
                                            />
                                            {showEndorseSuggestions && endorseSuggestions.length > 0 && (
                                                <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white dark:bg-[#141414] border border-gray-100 dark:border-[#333] rounded-xl shadow-xl overflow-hidden max-h-40 overflow-y-auto">
                                                    {endorseSuggestions.map((p) => (
                                                        <button
                                                            key={p.id}
                                                            type="button"
                                                            onClick={() => {
                                                                setSelectedLetter({ ...selectedLetter, endorse_to: p.name });
                                                                setShowEndorseSuggestions(false);
                                                            }}
                                                            className="w-full text-left px-4 py-2.5 text-sm font-bold text-gray-900 dark:text-white hover:bg-orange-50 dark:hover:bg-orange-900/10 transition-colors"
                                                        >
                                                            {p.name}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Summary / Content</label>
                                        <textarea
                                            rows="4"
                                            className={`w-full px-4 py-3 rounded-xl border text-sm font-bold resize-none ${'bg-slate-50 dark:bg-[#1a1a1a] border-gray-100 dark:border-[#333] text-slate-900 dark:text-white'}`}
                                            value={selectedLetter.summary || ""}
                                            onChange={(e) => setSelectedLetter({ ...selectedLetter, summary: e.target.value })}
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Letter Security Type</label>
                                        <select
                                            value={selectedLetter.letter_type || "Non-Confidential"}
                                            onChange={(e) => setSelectedLetter({ ...selectedLetter, letter_type: e.target.value })}
                                            className={`w-full px-4 py-3 rounded-xl border text-sm font-bold outline-none focus:ring-2 focus:ring-orange-500/20 ${'bg-slate-50 dark:bg-[#1a1a1a] border-gray-100 dark:border-[#333] text-slate-900 dark:text-white'}`}
                                        >
                                            <option value="Confidential">Confidential</option>
                                            <option value="Non-Confidential">Non-Confidential</option>
                                        </select>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">VEM Code</label>
                                        <input
                                            type="text"
                                            className={`w-full px-4 py-3 rounded-xl border text-sm font-bold ${'bg-slate-50 dark:bg-[#1a1a1a] border-gray-100 dark:border-[#333] text-slate-900 dark:text-white'}`}
                                            value={selectedLetter.vemcode || ""}
                                            onChange={(e) => setSelectedLetter({ ...selectedLetter, vemcode: e.target.value })}
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-indigo-500 uppercase tracking-wides">EVM Marginal Note</label>
                                        <input
                                            type="text"
                                            className={`w-full px-4 py-3 rounded-xl border text-sm font-bold ${'bg-slate-50 dark:bg-[#1a1a1a] border-gray-100 dark:border-[#333] text-slate-900 dark:text-white'}`}
                                            value={selectedLetter.evemnote || ""}
                                            onChange={(e) => setSelectedLetter({ ...selectedLetter, evemnote: e.target.value })}
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-indigo-500 uppercase tracking-wides">AEVM Marginal Note</label>
                                        <textarea
                                            rows="2"
                                            className={`w-full px-4 py-3 rounded-xl border text-sm font-bold resize-none ${'bg-slate-50 dark:bg-[#1a1a1a] border-gray-100 dark:border-[#333] text-slate-900 dark:text-white'}`}
                                            value={selectedLetter.aevmnote || ""}
                                            onChange={(e) => setSelectedLetter({ ...selectedLetter, aevmnote: e.target.value })}
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">ATG Marginal Note</label>
                                        <textarea
                                            rows="3"
                                            className={`w-full px-4 py-3 rounded-xl border text-sm font-bold resize-none ${'bg-indigo-50 dark:bg-indigo-900/5 border-indigo-100 dark:border-indigo-900/20 text-slate-900 dark:text-white'}`}
                                            value={selectedLetter.atgnote || ""}
                                            onChange={(e) => setSelectedLetter({ ...selectedLetter, atgnote: e.target.value })}
                                        />
                                    </div>

                                    {/* Attachment Section */}
                                    <div className="space-y-4 pt-4 px-2">
                                        <div className="flex items-center justify-between">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                                <Paperclip className="w-3 h-3" /> Digital Attachment
                                            </label>

                                            <div className="flex items-center gap-2">
                                                <label className="text-[10px] font-black text-indigo-500 uppercase tracking-widest cursor-pointer flex items-center gap-1">
                                                    <input
                                                        type="checkbox"
                                                        checked={isCombining}
                                                        onChange={(e) => setIsCombining(e.target.checked)}
                                                        className="w-3 h-3 rounded text-indigo-500 focus:ring-0"
                                                    />
                                                    Combine PDF
                                                </label>
                                            </div>
                                        </div>

                                        <div
                                            className={`p-6 rounded-[2rem] border-2 border-dashed transition-all ${isDragging ? 'border-orange-500 bg-orange-500/10 scale-[1.02]' : newFile ? 'border-orange-500 bg-orange-500/5' : 'border-gray-200 dark:border-[#222] hover:border-orange-500/50'} flex flex-col items-center justify-center gap-4 group relative`}
                                            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                                            onDragLeave={() => setIsDragging(false)}
                                            onDrop={(e) => {
                                                e.preventDefault();
                                                setIsDragging(false);
                                                const file = e.dataTransfer.files[0];
                                                handleFileSelect(file);
                                            }}
                                        >
                                            <input
                                                type="file"
                                                accept="application/pdf"
                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                                onChange={(e) => {
                                                    const file = e.target.files[0];
                                                    handleFileSelect(file);
                                                }}
                                            />
                                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${newFile ? 'bg-orange-500 text-white shadow-xl shadow-orange-500/20' : 'bg-gray-100 dark:bg-white/5 text-gray-400 group-hover:scale-110'}`}>
                                                <Upload className="w-7 h-7" />
                                            </div>
                                            <div className="text-center">
                                                <p className={`text-xs font-black uppercase tracking-tight ${textColor}`}>{newFile ? newFile.name : 'Select PDF File'}</p>
                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">{newFile ? (newFile.size / 1024 / 1024).toFixed(2) + ' MB' : 'Drag or click to upload new document'}</p>
                                            </div>
                                        </div>

                                        {/* Current / Selected Attachment Info */}
                                        {selectedLetter.scanned_copy && (
                                            <div className={`p-4 mb-4 rounded-2xl border ${'bg-blue-50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/20'} flex items-center justify-between`}>
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-blue-500 text-white flex items-center justify-center shadow-lg shadow-blue-500/20">
                                                        <FileText className="w-5 h-5" />
                                                    </div>
                                                    <div>
                                                        <p className={`text-xs font-black uppercase tracking-tight ${textColor}`}>
                                                            Digitized Scan
                                                        </p>
                                                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest line-clamp-1">
                                                            {selectedLetter.scanned_copy.split(/[\\/]/).pop()}
                                                        </p>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => handleViewPDF(selectedLetter)}
                                                    className="p-2.5 rounded-xl bg-white dark:bg-white/5 text-blue-500 hover:bg-blue-500 hover:text-white border border-blue-100 dark:border-white/10 transition-all shadow-sm"
                                                    title="View Scan"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </button>
                                            </div>
                                        )}
                                        <div className="flex flex-col gap-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Selected Reference Attachment</label>
                                            <select
                                                value={selectedLetter.attachment_id || ""}
                                                onChange={(e) => setSelectedLetter({ ...selectedLetter, attachment_id: e.target.value === "" ? null : parseInt(e.target.value) })}
                                                style={{ backgroundColor: 'white', color: 'black' }}
                                                className="w-full px-4 py-3 rounded-xl border text-sm font-bold outline-none focus:ring-2 focus:ring-orange-500/20 shadow-sm"
                                            >
                                                <option value="" style={{ color: 'black', backgroundColor: 'white' }}>-- No Reference File --</option>
                                                {attachments.map(att => (
                                                    <option key={att.id} value={att.id} style={{ color: 'black', backgroundColor: 'white' }}>
                                                        {att.attachment_name} {att.description ? `- ${att.description.substring(0, 40)}` : ''}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        {selectedLetter.attachment_id && (
                                            <div className={`p-4 rounded-2xl border ${'bg-orange-50 dark:bg-orange-900/10 border-orange-100 dark:border-orange-900/20'} flex items-center justify-between`}>
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-orange-500 text-white flex items-center justify-center shadow-lg shadow-orange-500/20">
                                                        <FileText className="w-5 h-5" />
                                                    </div>
                                                    <div>
                                                        <p className={`text-xs font-black uppercase tracking-tight ${textColor}`}>
                                                            {attachments.find(a => a.id === selectedLetter.attachment_id)?.attachment_name || `Attachment ID: ${selectedLetter.attachment_id}`}
                                                        </p>
                                                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                                                            {attachments.find(a => a.id === selectedLetter.attachment_id)?.description || 'Reference Content'}
                                                        </p>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => handleViewPDF(selectedLetter)}
                                                    className="p-2.5 rounded-xl bg-white dark:bg-white/5 text-orange-500 hover:bg-orange-500 hover:text-white border border-orange-100 dark:border-white/10 transition-all shadow-sm"
                                                    title="View Document"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Drawer Footer */}
                        <div className={`p-8 border-t ${'border-gray-50 dark:border-[#222]'} flex items-center gap-3`}>
                            <button
                                onClick={() => setIsDrawerOpen(false)}
                                className="flex-1 py-4 px-6 rounded-2xl border border-gray-200 dark:border-[#333] text-xs font-black uppercase tracking-widest text-gray-500 hover:bg-gray-50 dark:hover:bg-white/5 transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleUpdateDetails}
                                disabled={loading}
                                className="flex-[2] py-4 px-6 rounded-2xl bg-orange-500 text-white text-xs font-black uppercase tracking-widest shadow-xl shadow-orange-500/20 hover:bg-orange-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {loading && <Loader2 className="w-3 h-3 animate-spin" />}
                                Update changes
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* TRACKING DRAWER FROM LEFT */}
            {isTrackDrawerOpen && (
                <div className="fixed inset-0 z-[100] flex justify-start">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setIsTrackDrawerOpen(false)} />
                    <div className={`w-full max-w-md ${'bg-white dark:bg-[#141414] shadow-2xl'} h-full relative z-10 animate-in slide-in-from-left duration-500 flex flex-col`}>
                        {/* Drawer Header */}
                        <div className={`p-8 border-b ${'border-gray-50 dark:border-[#222]'} flex items-center justify-between`}>
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-900/10 flex items-center justify-center text-indigo-500">
                                    <GitMerge className="w-6 h-6" />
                                </div>
                                <div>
                                    <h2 className={`text-xl font-black uppercase tracking-tight ${textColor}`}>Workflow Track</h2>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{trackingLetter?.lms_id}</p>
                                </div>
                            </div>
                            <button onClick={() => setIsTrackDrawerOpen(false)} className="p-2 hover:bg-gray-50 dark:hover:bg-white/5 rounded-xl transition-colors">
                                <ChevronRight className="w-6 h-6 text-gray-400 rotate-180" />
                            </button>
                        </div>

                        {/* Drawer Content */}
                        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                            <div className="space-y-8">
                                {steps.length === 0 ? (
                                    <p className="text-center text-gray-400 py-20 uppercase font-black tracking-widest text-[10px]">Configuring workflow steps...</p>
                                ) : (
                                    <div className="relative pl-8 space-y-12 before:absolute before:left-[15px] before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-100 dark:before:bg-[#222]">
                                        {steps.map((step, idx) => {
                                            const latestAssignment = trackingLetter?.assignments?.sort((a, b) => b.id - a.id)[0];
                                            const currentStepId = latestAssignment?.step_id || 1;
                                            const currentStepIdx = steps.findIndex(s => s.id === currentStepId);

                                            const isDone = idx < currentStepIdx;
                                            const isCurrent = idx === currentStepIdx;

                                            const stepAssignment = trackingLetter?.assignments?.find(a => a.step_id === step.id);

                                            return (
                                                <div key={step.id} className="relative">
                                                    <div className={`absolute -left-[27px] top-1 w-4 h-4 rounded-full border-4 ${isDone ? 'bg-emerald-500 border-white dark:border-[#141414]' : isCurrent ? 'bg-orange-500 border-orange-200 dark:border-orange-900/40 animate-pulse' : 'bg-slate-200 dark:bg-[#333] border-white dark:border-[#141414]'}`} />
                                                    <div className="flex flex-col">
                                                        <span className={`text-xs font-black uppercase tracking-widest ${isDone ? 'text-emerald-500' : isCurrent ? 'text-orange-500' : 'text-slate-400'}`}>
                                                            {step.step_name}
                                                        </span>
                                                        <p className="text-[10px] text-gray-500 font-medium mt-1">
                                                            {isDone ? 'Processed successfully' : isCurrent ? 'Currently active step' : 'Awaiting reaching this stage'}
                                                        </p>
                                                        {(isDone || isCurrent) && stepAssignment && (
                                                            <div className="mt-3 bg-slate-50 dark:bg-white/5 p-3 rounded-xl border border-gray-100 dark:border-[#222]">
                                                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Assigned Department</p>
                                                                <p className={`text-[11px] font-bold mt-1 ${textColor}`}>{stepAssignment.department?.dept_name || 'System Auto-Log'}</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className={`p-8 border-t ${'border-gray-50 dark:border-[#222]'}`}>
                            <button
                                onClick={() => setIsTrackDrawerOpen(false)}
                                className="w-full py-4 bg-indigo-600 text-white text-xs font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-indigo-600/20"
                            >
                                Close Tracker
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
