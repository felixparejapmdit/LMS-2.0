
import React, { useEffect, useState, useRef } from "react";
import Sidebar from "../../components/Sidebar";
import { useAuth } from "../../context/AuthContext";
import { directus } from "../../hooks/useDirectus";
import PermissionGuard from "../../components/PermissionGuard";
import useAccess from "../../hooks/useAccess";
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
    Send,
    Printer,
    Settings,
    Pencil
} from "lucide-react";
import letterService from "../../services/letterService";
import departmentService from "../../services/departmentService";
import statusService from "../../services/statusService";
import letterKindService from "../../services/letterKindService";
import axios from "axios";
import { useNavigate } from "react-router-dom";

export default function MasterTable() {
    const { user, layoutStyle, setIsMobileMenuOpen, isSuperAdmin } = useAuth();
    const { canField } = useAccess();
    const navigate = useNavigate();

    // Theme Variables (derived locally)
    const textColor = layoutStyle === 'minimalist' ? 'text-[#1A1A1B] dark:text-white' : 'text-slate-900 dark:text-white';
    const cardBg = layoutStyle === 'notion' ? 'bg-white dark:bg-[#191919] border-gray-100 dark:border-[#222]' : layoutStyle === 'minimalist' ? 'bg-white dark:bg-[#0D0D0D] border-[#E5E5E5] dark:border-[#222]' : 'bg-white dark:bg-[#141414] border-gray-100 dark:border-[#222]';
    const pageBg = layoutStyle === 'notion' ? 'bg-white dark:bg-[#191919]' : layoutStyle === 'grid' ? 'bg-slate-50' : 'bg-[#F9FAFB] dark:bg-[#0D0D0D]';

    const [letters, setLetters] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedIds, setSelectedIds] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalRecords, setTotalRecords] = useState(0);
    const [recordsPerPage] = useState(50);

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
    const [validationError, setValidationError] = useState("");
    const [isCombining, setIsCombining] = useState(false);
    const [newFile, setNewFile] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const canSearch = canField("master-table", "search");
    const canEdit = canField("master-table", "edit_button");
    const canDelete = canField("master-table", "delete_button");
    const canStatusDropdown = canField("master-table", "status_dropdown");
    const canDepartmentSelector = canField("master-table", "department_selector");
    const canStepSelector = canField("master-table", "step_selector");
    const canPdf = canField("master-table", "pdf_button");
    const canSave = canField("master-table", "save_button");
    const canAttachmentUpload = canField("master-table", "attachment_upload");
    const canEndorse = canField("master-table", "endorse_button");
    const canTrack = canField("master-table", "track_button");
    const canRefresh = canField("master-table", "refresh_button");

    // Status Manager State
    const [isStatusManagerOpen, setIsStatusManagerOpen] = useState(false);
    const [editingStatus, setEditingStatus] = useState(null);
    const [statusForm, setStatusForm] = useState({ status_name: '', dept_id: '' });

    const handleFileSelect = (file) => {
        if (!file) return;
        if (file.type !== 'application/pdf') {
            alert("Please upload a PDF file.");
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

    const fetchData = async (isRefreshing = false, retryCount = 0) => {
        if (!user?.id) return;
        if (isRefreshing || retryCount > 0) setRefreshing(true);
        if (retryCount === 0 && !isRefreshing) setLoading(true);

        try {
            const userDeptId = user?.dept_id?.id ?? user?.dept_id;
            const roleName = user?.roleData?.name || user?.role || '';
            const response = await letterService.getAll({
                user_id: user?.id,
                role: roleName,
                department_id: userDeptId,
                full_name: `${user?.first_name} ${user?.last_name}`.trim(),
                page: currentPage,
                limit: recordsPerPage
            });

            if (response && response.data) {
                setLetters(response.data);
                setTotalPages(response.totalPages || 1);
                setTotalRecords(response.total || response.data.length);
            } else {
                setLetters(Array.isArray(response) ? response : []);
            }

            // Fetch reference data with individual safety catches
            const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

            departmentService.getAll().then(setDepartments).catch(() => { });
            statusService.getAll({ dept_id: userDeptId }).then(setStatuses).catch(() => { });
            axios.get(`${apiBase}/process-steps`).then(res => setSteps(res.data)).catch(() => { });
            letterKindService.getAll().then(setLetterKinds).catch(() => { });
            axios.get(`${apiBase}/persons`).then(res => setPersons(Array.isArray(res.data) ? res.data : [])).catch(() => { });
            axios.get(`${apiBase}/trays?dept_id=${userDeptId}`).then(res => setTrays(res.data)).catch(() => { });
            axios.get(`${apiBase}/attachments?dept_id=${userDeptId}`).then(res => setAttachments(res.data)).catch(() => { });

        } catch (error) {
            console.error("Fetch failed:", error.message);
            // Retry logic for Brave/Aborted requests
            if (retryCount < 2 && (error.code === 'ECONNABORTED' || error.message?.includes('aborted'))) {
                console.log(`Retrying fetch data... (${retryCount + 1})`);
                setTimeout(() => fetchData(isRefreshing, retryCount + 1), 1000);
            }
        } finally {
            if (retryCount === 0 || retryCount >= 2) {
                setLoading(false);
                setRefreshing(false);
            }
        }
    };

    useEffect(() => {
        fetchData();
        // eslint-disable-next-line
    }, [currentPage]);

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
        const latestAssignment = letter.assignments?.sort((a, b) => b.id - a.id)[0];
        setSelectedLetter({
            ...letter,
            currentStepId: letter.currentStepId || latestAssignment?.step_id
        });
        setValidationError("");
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

    const handleStatusChange = async (id, statusIdOrName) => {
        try {
            const statusMatch = typeof statusIdOrName === 'number'
                ? statuses.find(s => s.id === statusIdOrName)
                : statuses.find(s => s.status_name === statusIdOrName);

            const payload = statusMatch ? { global_status: statusMatch.id } : { letter_type: statusIdOrName };

            await letterService.update(id, payload);
            fetchData();
        } catch (error) {
            console.error("Status update failed", error);
        }
    };

    const handleBulkStatusUpdate = async (statusIdOrName) => {
        if (!statusIdOrName) return;
        try {
            setLoading(true);
            if (statusIdOrName === "Combine Selected PDFs") {
                const res = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/attachments/combine-selected`, {
                    letter_ids: selectedIds
                });
                if (res.data.file_path) {
                    const b64 = btoa(res.data.file_path);
                    window.open(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/attachments/view-path?path=${b64}`, '_blank');
                }
            } else {
                for (const id of selectedIds) {
                    if (statusIdOrName === "Show to ATG Dashboard") {
                        await letterService.update(id, { tray_id: null, global_status: 2 });
                    } else {
                        const statusMatch = typeof statusIdOrName === 'number'
                            ? statuses.find(s => s.id === statusIdOrName)
                            : statuses.find(s => s.status_name === statusIdOrName);

                        const payload = statusMatch ? { global_status: statusMatch.id } : { letter_type: statusIdOrName };
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
        if (!selectedLetter.currentStepId) {
            setValidationError("Please select a valid Stage (e.g. FOR REVIEW, FOR SIGNATURE, VEM LETTER) before saving.");
            return;
        }

        const isAtgOrIncoming = selectedLetter.global_status
            ? [1, 2].includes(selectedLetter.global_status)
            : ['Incoming', 'ATG Note'].includes(selectedLetter.status?.status_name);

        if (!isAtgOrIncoming && (!selectedLetter.tray_id || selectedLetter.tray_id <= 0)) {
            alert("Please assign a tray first.");
            return;
        }

        try {
            setLoading(true);

            let updatedLetter = { ...selectedLetter };

            // 0. Handle File Upload if newFile is present
            if (newFile) {
                const formData = new FormData();
                formData.append('file', newFile);
                formData.append('no_record', 'true');

                // Auto-combine if there is an existing attachment
                if (selectedLetter.scanned_copy) {
                    formData.append('existing_path', selectedLetter.scanned_copy);
                } else if (selectedLetter.attachment_id) {
                    formData.append('combine_with', selectedLetter.attachment_id);
                }

                const uploadRes = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/attachments/upload`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });

                updatedLetter.scanned_copy = uploadRes.data.file_path;
            }

            // 1. Update core letter details with user context for logging
            await letterService.update(updatedLetter.id, {
                ...updatedLetter,
                user_id: user?.id
            });

            // 2. Update/Add Assignment for the new step if it changed
            if (updatedLetter.currentStepId) {
                if (updatedLetter.assignments && updatedLetter.assignments.length > 0) {
                    const latest = [...updatedLetter.assignments].sort((a, b) => b.id - a.id)[0];
                    await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/letter-assignments/${latest.id}`, {
                        step_id: updatedLetter.currentStepId
                    });
                } else {
                    const selectedStep = steps.find(s => Number(s.id) === Number(updatedLetter.currentStepId));
                    const stepDepartmentId =
                        selectedStep?.dept_id?.id ??
                        selectedStep?.dept_id ??
                        null;
                    const preservedDepartmentId =
                        [...(updatedLetter.assignments || [])].sort((a, b) => b.id - a.id)[0]?.department_id?.id ??
                        [...(updatedLetter.assignments || [])].sort((a, b) => b.id - a.id)[0]?.department_id ??
                        null;
                    const fallbackUserDeptId = user?.dept_id?.id || user?.dept_id || null;
                    const finalDepartmentId = stepDepartmentId || preservedDepartmentId || fallbackUserDeptId;

                    // If no assignment exists, create one!
                    await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/letter-assignments`, {
                        letter_id: updatedLetter.id,
                        step_id: updatedLetter.currentStepId,
                        department_id: finalDepartmentId,
                        assigned_by: user?.id,
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
            setValidationError("Failed to update letter details. Please check connection.");
        } finally {
            setLoading(false);
        }
    };

    const handleTrackOpen = async (letter) => {
        try {
            const fullLetter = await letterService.getById(letter.id);
            setTrackingLetter(fullLetter);
            setIsTrackDrawerOpen(true);
        } catch (error) {
            console.error("Failed to fetch logs", error);
            setTrackingLetter(letter);
            setIsTrackDrawerOpen(true);
        }
    };

    const handleViewPDF = (letter) => {
        if (letter.scanned_copy) {
            // Use a more robust base64 encoding for paths with special characters
            const pathValue = letter.scanned_copy;
            const encodedPath = btoa(unescape(encodeURIComponent(pathValue)));
            // Prioritize current origin if VITE_API_URL is relative
            const baseUrl = (import.meta.env.VITE_API_URL && import.meta.env.VITE_API_URL.startsWith('http'))
                ? import.meta.env.VITE_API_URL
                : window.location.origin + (import.meta.env.VITE_API_URL || '/api');

            window.open(`${baseUrl}/attachments/view-path?path=${encodedPath}`, '_blank');
        } else if (letter.attachment_id) {
            const baseUrl = (import.meta.env.VITE_API_URL && import.meta.env.VITE_API_URL.startsWith('http'))
                ? import.meta.env.VITE_API_URL
                : window.location.origin + (import.meta.env.VITE_API_URL || '/api');
            window.open(`${baseUrl}/attachments/view/${letter.attachment_id}`, '_blank');
        } else {
            alert("No document available to view.");
        }
    };

    const handlePrintQR = (lms_id) => {
        if (!lms_id) {
            alert("This record does not have a Reference Code yet.");
            return;
        }
        const printWindow = window.open('', '_blank');
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${lms_id}`;

        printWindow.document.write(`
            <html>
                <head>
                    <title>Reference QR - ${lms_id}</title>
                    <style>
                        body { 
                            margin: 0; 
                            padding: 0; 
                            font-family: sans-serif; 
                            background: white; 
                            display: flex;
                            align-items: flex-start;
                        }
                        @page { size: auto; margin: 0mm; }
                        .container { 
                            display: flex; 
                            align-items: center; 
                            gap: 2mm; 
                            padding: 2mm; 
                        }
                        img { 
                            width: 9mm; 
                            height: 9mm; 
                            object-fit: contain;
                        }
                        .ref { 
                            font-size: 8pt; 
                            font-weight: 900; 
                            white-space: nowrap;
                        }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <img src="${qrUrl}" />
                        <div class="ref">${lms_id}</div>
                    </div>
                    <script>
                        window.onload = () => { setTimeout(() => { window.print(); window.close(); }, 500); };
                    </script>
                </body>
            </html>
        `);
        printWindow.document.close();
    };

    const filteredLetters = letters.filter(l => {
        // Data Visibility Filter
        const roleName = user?.roleData?.name?.toString().toUpperCase() || '';
        const isUserRole = roleName === 'USER';
        const isAccessManager = roleName === 'ACCESS MANAGER';

        if ((isUserRole || isAccessManager) && !isSuperAdmin) {
            const isOwner = l.encoder_id === user.id;
            const userDeptId = user?.dept_id?.id ?? user?.dept_id;
            const isInDept = l.assignments?.some(a => (a.department_id?.id ?? a.department_id) === userDeptId);
            if (!isOwner && !isInDept) return false;
        }

        if (!canSearch) return true;

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

    const handleCreateStatus = async () => {
        if (!statusForm.status_name.trim()) return;
        try {
            await statusService.create({
                status_name: statusForm.status_name.trim(),
                dept_id: statusForm.dept_id ? parseInt(statusForm.dept_id) : null
            });
            statusService.getAll({ dept_id: user?.dept_id?.id ?? user?.dept_id }).then(setStatuses).catch(() => { });
            setStatusForm({ status_name: '', dept_id: '' });
        } catch (error) {
            alert('Failed to create status: ' + error.message);
        }
    };

    const handleUpdateStatus = async () => {
        if (!editingStatus || !statusForm.status_name.trim()) return;
        try {
            await statusService.update(editingStatus.id, {
                status_name: statusForm.status_name.trim(),
                dept_id: statusForm.dept_id !== '' ? parseInt(statusForm.dept_id) : null
            });
            statusService.getAll({ dept_id: user?.dept_id?.id ?? user?.dept_id }).then(setStatuses).catch(() => { });
            setEditingStatus(null);
            setStatusForm({ status_name: '', dept_id: '' });
        } catch (error) {
            alert('Failed to update status: ' + error.message);
        }
    };

    const handleDeleteStatus = async (id) => {
        if (!window.confirm('Delete this status? Letters using it will be affected.')) return;
        try {
            await statusService.delete(id);
            statusService.getAll({ dept_id: user?.dept_id?.id ?? user?.dept_id }).then(setStatuses).catch(() => { });
        } catch (error) {
            alert('Failed to delete status: ' + error.message);
        }
    };

    return (
        <div className={`min-h-screen ${pageBg} flex overflow-hidden`}>
            <Sidebar />
            <main className="flex-1 flex flex-col h-screen overflow-hidden">
                {/* Header */}
                <header className={`h-16 ${layoutStyle === 'minimalist' ? 'bg-white dark:bg-[#0D0D0D] border-[#E5E5E5] dark:border-[#222]' : 'bg-white dark:bg-[#0D0D0D] border-gray-100 dark:border-[#222]'} border-b px-8 flex items-center justify-between sticky top-0 z-10 shrink-0`}>
                    <div className="flex items-center gap-4">
                        <button onClick={() => setIsMobileMenuOpen(true)} className="lg:hidden p-2.5 bg-slate-100 dark:bg-white/5 rounded-xl">
                            <TableIcon className="w-5 h-5 text-gray-500" />
                        </button>
                        <div className="flex items-center gap-2">
                            <TableIcon className={`w-4 h-4 ${layoutStyle === 'minimalist' ? 'text-[#1A1A1B] dark:text-white' : 'text-orange-500'}`} />
                            <div>
                                <h1 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Master</h1>
                                <h2 className={`text-sm font-black uppercase tracking-tight ${textColor}`}>Master Table</h2>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {canDelete && selectedIds.length > 0 && (
                            <button
                                onClick={handleBulkDelete}
                                className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 border border-red-100 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                            >
                                <Trash2 className="w-3 h-3" />
                                Delete ({selectedIds.length})
                            </button>
                        )}
                        {canRefresh && <button onClick={() => fetchData(true)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition-all"><RefreshCw className={`w-4 h-4 text-gray-400 ${refreshing ? 'animate-spin' : ''}`} /></button>}
                        {isSuperAdmin && (
                            <button onClick={() => { setEditingStatus(null); setStatusForm({ status_name: '', dept_id: '' }); setIsStatusManagerOpen(true); }} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition-all" title="Manage Statuses">
                                <Settings className="w-4 h-4 text-gray-400" />
                            </button>
                        )}
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-10 custom-scrollbar">
                    <div className="max-w-full mx-auto space-y-6">
                        {/* Summary & Search */}
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <h2 className={`text-2xl font-black uppercase tracking-tight ${textColor}`}>Records</h2>
                                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Manage all files.</p>
                            </div>
                            {canSearch && (
                                <div className="relative group min-w-[300px]">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Search..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className={`w-full pl-12 pr-4 py-3 rounded-2xl border text-sm transition-all focus:ring-2 focus:ring-orange-500/20 outline-none ${layoutStyle === 'minimalist' ? 'bg-white dark:bg-white/5 border-[#E5E5E5] dark:border-[#222]' : 'bg-white dark:bg-[#141414] border-gray-100 dark:border-[#222]'}`}
                                    />
                                </div>
                            )}
                        </div>

                        {/* Bulk Status Actions Bar */}
                        {selectedIds.length > 0 && canStatusDropdown && (
                            <div className={`p-4 rounded-3xl border flex flex-col md:flex-row items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2 duration-300 ${'bg-orange-50 dark:bg-orange-900/10 border-orange-100 dark:border-orange-900/20'}`}>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-white dark:bg-white/10 rounded-full flex items-center justify-center text-orange-500 shadow-sm border border-orange-100 dark:border-orange-900/20">
                                        <CheckSquare className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className={`text-xs font-black uppercase tracking-tight ${textColor}`}>{selectedIds.length} Selected</p>
                                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Bulk update</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 custom-scrollbar w-full md:w-auto">
                                    {statuses
                                        .filter(s => s.status_name?.toLowerCase() !== 'done')
                                        .filter(s => {
                                            const userDeptId = user?.dept_id?.id ?? user?.dept_id;
                                            if (selectedIds.length === 0) return isSuperAdmin;
                                            // Show if global (null dept_id) OR matches the currently logged-in user's department
                                            return !s.dept_id || (userDeptId && Number(s.dept_id) === Number(userDeptId));
                                        })
                                        .map(s => {
                                            const dept = departments.find(d => Number(d.id) === Number(s.dept_id));
                                            const label = dept ? `${dept.dept_code}: ${s.status_name}` : s.status_name;
                                            return (
                                                <button
                                                    key={s.id}
                                                    onClick={() => handleBulkStatusUpdate(s.id)}
                                                    className={`whitespace-nowrap px-4 py-2 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all bg-white dark:bg-white/5 border-gray-100 dark:border-white/10 ${textColor} hover:bg-orange-500 hover:text-white hover:border-orange-500`}
                                                >
                                                    {label}
                                                </button>
                                            )
                                        })}
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
                        <div className={`rounded-[2.5rem] border overflow-hidden shadow-sm ${layoutStyle === 'minimalist' ? 'bg-white dark:bg-black/20 border-[#E5E5E5] dark:border-[#222]' : 'bg-white dark:bg-[#141414] border-gray-100 dark:border-[#222]'}`}>
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
                                            <th className="p-5 text-[10px] font-black uppercase tracking-widest text-gray-400">ID</th>
                                            <th className="p-5 text-[10px] font-black uppercase tracking-widest text-gray-400">Status</th>
                                            <th className="p-5 text-[10px] font-black uppercase tracking-widest text-gray-400">Group</th>
                                            <th className="p-5 text-[10px] font-black uppercase tracking-widest text-gray-400 whitespace-nowrap">Date</th>
                                            <th className="p-5 text-[10px] font-black uppercase tracking-widest text-gray-400">Sender</th>
                                            <th className="p-5 text-[10px] font-black uppercase tracking-widest text-gray-400">Re</th>
                                            <th className="p-5 text-[10px] font-black uppercase tracking-widest text-gray-400 text-center">Track</th>
                                            <th className="p-5 text-[10px] font-black uppercase tracking-widest text-gray-400 text-center">QR</th>
                                            <th className="p-5 text-[10px] font-black uppercase tracking-widest text-gray-400 text-center">PDF</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50 dark:divide-[#222]">
                                        {loading ? (
                                            <tr>
                                                <td colSpan="11" className="p-20 text-center">
                                                    <Loader2 className="w-10 h-10 text-orange-500 animate-spin mx-auto mb-4" />
                                                    <p className="text-xs font-black uppercase tracking-widest text-gray-400">Loading...</p>
                                                </td>
                                            </tr>
                                        ) : filteredLetters.length === 0 ? (
                                            <tr>
                                                <td colSpan="11" className="p-20 text-center">
                                                    <Search className="w-10 h-10 text-gray-200 mx-auto mb-4" />
                                                    <p className="text-xs font-black uppercase tracking-widest text-gray-400">No records</p>
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
                                                    {canEdit && (
                                                        <PermissionGuard page="master-table" action="can_edit">
                                                            <button
                                                                onClick={() => handleEdit(letter)}
                                                                className="p-2.5 rounded-xl bg-orange-50 dark:bg-orange-900/10 text-orange-500 hover:bg-orange-500 hover:text-white transition-all transform hover:scale-105 mx-auto"
                                                            >
                                                                <Edit className="w-4 h-4" />
                                                            </button>
                                                        </PermissionGuard>
                                                    )}
                                                </td>
                                                <td className="p-5 whitespace-nowrap">
                                                    <span className={`text-[10px] font-black px-2.5 py-1 rounded bg-slate-100 dark:bg-white/10 ${textColor}`}>
                                                        {letter.lms_id || 'PENDING'}{letter.tray?.tray_no ? <span className="text-orange-500 italic ml-1.5">({letter.tray.tray_no.toLowerCase()})</span> : ''}
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
                                                        <span className="text-orange-500">{new Date(letter.date_received || letter.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
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
                                                    {canTrack && (
                                                        <PermissionGuard page="master-table" action="can_special">
                                                            <button
                                                                onClick={() => handleTrackOpen(letter)}
                                                                className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-900/10 text-indigo-500 hover:bg-indigo-500 hover:text-white transition-all transform hover:scale-105 mx-auto"
                                                            >
                                                                <Activity className="w-4 h-4" />
                                                            </button>
                                                        </PermissionGuard>
                                                    )}
                                                </td>
                                                <td className="p-5 text-center">
                                                    <button
                                                        onClick={() => handlePrintQR(letter.lms_id)}
                                                        className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/10 text-blue-500 flex items-center justify-center hover:bg-blue-500 hover:text-white transition-all transform hover:scale-105 mx-auto"
                                                        title="Print QR Code"
                                                    >
                                                        <Printer className="w-4 h-4" />
                                                    </button>
                                                </td>
                                                <td className="p-5 text-center">
                                                    {(letter.attachment_id || letter.scanned_copy) ? (
                                                        (isSuperAdmin || canPdf) ? (
                                                            <button
                                                                onClick={() => handleViewPDF(letter)}
                                                                className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-900/10 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all mx-auto"
                                                            >
                                                                <FileText className="w-4 h-4" />
                                                            </button>
                                                        ) : (
                                                            <span className="text-gray-200 dark:text-[#333]">-</span>
                                                        )
                                                    ) : (
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 opacity-60">No File</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Footer / Pagination */}
                        <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-gray-400 px-4">
                            <span>Showing {letters.length} / {totalRecords} Records</span>
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className={`px-3 py-1 rounded transition-all ${currentPage === 1 ? 'opacity-30 cursor-not-allowed text-gray-300' : 'hover:bg-orange-500 hover:text-white pointer-events-auto cursor-pointer'}`}
                                >
                                    Previous
                                </button>
                                <div className="flex items-center gap-2">
                                    <span className="w-6 h-6 rounded flex items-center justify-center bg-orange-500 text-white shadow-lg shadow-orange-500/20">{currentPage}</span>
                                    <span className="mx-2">of</span>
                                    <span>{totalPages}</span>
                                </div>
                                <button
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                    className={`px-3 py-1 rounded transition-all ${currentPage === totalPages ? 'opacity-30 cursor-not-allowed text-gray-300' : 'hover:bg-orange-500 hover:text-white pointer-events-auto cursor-pointer'}`}
                                >
                                    Next
                                </button>
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
                                    <h2 className={`text-xl font-black uppercase tracking-tight ${textColor}`}>Update</h2>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{selectedLetter?.lms_id || 'Letter ' + selectedLetter?.id}</p>
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
                                    {canStepSelector && <div className="space-y-4">
                                        <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                                            <GitMerge className="w-3 h-3" /> Groups
                                        </label>
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {steps.map((step) => {
                                                const latestAssignment = selectedLetter.assignments?.sort((a, b) => b.id - a.id)[0];
                                                const currentStepId = selectedLetter.currentStepId || latestAssignment?.step_id;
                                                const isSelected = currentStepId === step.id;

                                                return (
                                                    <label
                                                        key={step.id}
                                                        onClick={() => setValidationError("")}
                                                        className={`flex-1 min-w-[120px] flex items-center gap-2 p-2 rounded-xl border cursor-pointer transition-all ${isSelected ? 'bg-indigo-500 text-white border-indigo-500 shadow-lg shadow-indigo-500/20' : 'bg-white dark:bg-white/5 border-gray-100 dark:border-white/10 hover:border-gray-200 dark:hover:border-white/20'}`}
                                                    >
                                                        <input
                                                            type="radio"
                                                            name="process_step"
                                                            className="hidden"
                                                            checked={isSelected}
                                                            onChange={() => {
                                                                setSelectedLetter(prev => ({ ...prev, currentStepId: step.id }));
                                                                setValidationError("");
                                                            }}
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
                                    </div>}

                                    {/* Date & Time Received Display */}
                                    <div className="pt-6 border-t border-dashed border-gray-200 dark:border-white/10 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-white dark:bg-white/10 flex items-center justify-center text-orange-500 shadow-sm border border-orange-50 dark:border-white/5">
                                                <Clock className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Date</label>
                                                <p className={`text-xs font-black uppercase tracking-tight ${textColor}`}>
                                                    {new Date(selectedLetter.date_received).toLocaleDateString(undefined, { dateStyle: 'long' })}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className={`text-xs font-black text-orange-500 uppercase`}>
                                                {new Date(selectedLetter.date_received).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: true })}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Detailed Fields */}
                                <div className="space-y-4 pt-4 px-2">
                                    {canDepartmentSelector && <div className="space-y-1">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                            Tray {!(selectedLetter.global_status ? [1, 2].includes(selectedLetter.global_status) : ['Incoming', 'ATG Note'].includes(selectedLetter.status?.status_name)) && <span className="text-red-500">*</span>}
                                        </label>
                                        <select
                                            value={selectedLetter.tray_id || ""}
                                            onChange={(e) => {
                                                setSelectedLetter({ ...selectedLetter, tray_id: e.target.value === "" ? null : parseInt(e.target.value) });
                                                setValidationError("");
                                            }}
                                            style={{ backgroundColor: 'white', color: 'black' }}
                                            className="w-full px-4 py-3 rounded-xl border text-sm font-bold outline-none focus:ring-2 focus:ring-orange-500/20 shadow-sm"
                                        >
                                            <option value="" style={{ color: 'black', backgroundColor: 'white' }}>-- No Tray Assigned --</option>
                                            {trays.map(t => (
                                                <option key={t.id} value={t.id} style={{ color: 'black', backgroundColor: 'white' }}>{t.tray_no}</option>
                                            ))}
                                        </select>
                                    </div>}

                                    {canStatusDropdown && <div className="space-y-1">
                                        <div className="flex items-center justify-between gap-2">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-orange-500">Status</label>
                                            <div className="flex items-center gap-2">
                                                {canEndorse && <button
                                                    type="button"
                                                    onClick={() => {
                                                        // Quick action to set for ATG Dashboard
                                                        setSelectedLetter(prev => ({ ...prev, tray_id: null, global_status: 2 }));
                                                    }}
                                                    className="text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-900/10 text-indigo-500 border border-indigo-100 dark:border-indigo-900/30 hover:bg-indigo-500 hover:text-white transition-all shadow-sm"
                                                >
                                                    To Dashboard
                                                </button>}
                                                {canDelete && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDelete(selectedLetter.id)}
                                                        className="text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg bg-red-50 dark:bg-red-900/10 text-red-500 border border-red-100 dark:border-red-900/30 hover:bg-red-500 hover:text-white transition-all shadow-sm"
                                                    >
                                                        Delete
                                                    </button>
                                                )}
                                            </div>

                                        </div>
                                        <select
                                            value={selectedLetter.global_status || ""}
                                            onChange={(e) => {
                                                const newStatusId = parseInt(e.target.value);
                                                setSelectedLetter(prev => ({ ...prev, global_status: e.target.value === "" ? null : newStatusId }));
                                                setValidationError("");
                                            }}
                                            style={{ backgroundColor: 'white', color: 'black' }}
                                            className="w-full px-4 py-3 rounded-xl border text-sm font-bold outline-none focus:ring-2 focus:ring-orange-500/20 shadow-sm"
                                        >
                                            <option value="" style={{ color: 'black', backgroundColor: 'white' }}>-- Status --</option>
                                            {statuses
                                                .filter(s => s.status_name?.toLowerCase() !== 'done')
                                                .filter(s => !s.dept_id || Number(s.dept_id) === Number(selectedLetter?.dept_id?.id ?? selectedLetter?.dept_id))
                                                .map(s => {
                                                    const dept = departments.find(d => Number(d.id) === Number(s.dept_id));
                                                    const label = dept ? `${dept.dept_code}: ${s.status_name}` : s.status_name;
                                                    return (
                                                        <option key={s.id} value={s.id} style={{ color: 'black', backgroundColor: 'white' }}>{label}</option>
                                                    )
                                                })}
                                        </select>
                                    </div>}

                                    {/* Kind Dropdown */}
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Kind</label>
                                        <select
                                            value={selectedLetter.kind || ""}
                                            onChange={(e) => setSelectedLetter({ ...selectedLetter, kind: e.target.value === "" ? null : parseInt(e.target.value) })}
                                            style={{ backgroundColor: 'white', color: 'black' }}
                                            className="w-full px-4 py-3 rounded-xl border text-sm font-bold outline-none focus:ring-2 focus:ring-orange-500/20 shadow-sm"
                                        >
                                            <option value="" style={{ color: 'black', backgroundColor: 'white' }}>-- Kind --</option>
                                            {letterKinds.map(k => (
                                                <option key={k.id} value={k.id} style={{ color: 'black', backgroundColor: 'white' }}>{k.kind_name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Sender</label>
                                        <input
                                            type="text"
                                            className={`w-full px-4 py-3 rounded-xl border text-sm font-bold ${'bg-slate-50 dark:bg-[#1a1a1a] border-gray-100 dark:border-[#333] text-slate-900 dark:text-white'}`}
                                            value={selectedLetter.sender || ""}
                                            onChange={(e) => setSelectedLetter({ ...selectedLetter, sender: e.target.value })}
                                        />
                                    </div>

                                    {/* Assign This Letter To (Endorsement) */}
                                    {canEndorse && <div className="space-y-1 p-4 rounded-2xl bg-orange-50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-900/20" ref={endorseRef}>
                                        <label className="text-[10px] font-black text-orange-500 uppercase tracking-widest flex items-center gap-1.5">
                                            <Send className="w-3 h-3" /> Endorse
                                        </label>
                                        <p className="text-[9px] text-orange-400/80 font-medium mb-2">Search person.</p>
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
                                    </div>}

                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Summary</label>
                                        <textarea
                                            rows="4"
                                            className={`w-full px-4 py-3 rounded-xl border text-sm font-bold resize-none ${'bg-slate-50 dark:bg-[#1a1a1a] border-gray-100 dark:border-[#333] text-slate-900 dark:text-white'}`}
                                            value={selectedLetter.summary || ""}
                                            onChange={(e) => setSelectedLetter({ ...selectedLetter, summary: e.target.value })}
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Security</label>
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
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">VEM Number</label>
                                        <input
                                            type="text"
                                            className={`w-full px-4 py-3 rounded-xl border text-sm font-bold ${'bg-slate-50 dark:bg-[#1a1a1a] border-gray-100 dark:border-[#333] text-slate-900 dark:text-white'}`}
                                            value={selectedLetter.vemcode || ""}
                                            onChange={(e) => setSelectedLetter({ ...selectedLetter, vemcode: e.target.value })}
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">AEVM Number</label>
                                        <input
                                            type="text"
                                            className={`w-full px-4 py-3 rounded-xl border text-sm font-bold ${'bg-slate-50 dark:bg-[#1a1a1a] border-gray-100 dark:border-[#333] text-slate-900 dark:text-white'}`}
                                            value={selectedLetter.aevm_number || ""}
                                            onChange={(e) => setSelectedLetter({ ...selectedLetter, aevm_number: e.target.value })}
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
                                    {canAttachmentUpload && <div className="space-y-4 pt-4 px-2">
                                        <div className="flex items-center justify-between">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                                <Paperclip className="w-3 h-3" /> Digital Attachment
                                            </label>

                                            {/* Auto-combining indicator */}
                                            {(selectedLetter.attachment_id || selectedLetter.scanned_copy) && (
                                                <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest bg-indigo-50 dark:bg-indigo-900/20 px-2 py-0.5 rounded border border-indigo-100 dark:border-indigo-900/30">
                                                    Will Auto-Combine
                                                </span>
                                            )}
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
                                                            Scan
                                                        </p>
                                                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest line-clamp-1">
                                                            {selectedLetter.scanned_copy.split(/[\\/]/).pop()}
                                                        </p>
                                                    </div>
                                                </div>
                                                {canPdf && <button
                                                    onClick={() => handleViewPDF(selectedLetter)}
                                                    className="p-2.5 rounded-xl bg-white dark:bg-white/5 text-blue-500 hover:bg-blue-500 hover:text-white border border-blue-100 dark:border-white/10 transition-all shadow-sm"
                                                    title="View Scan"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </button>}
                                            </div>
                                        )}
                                        <div className="flex flex-col gap-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Link</label>
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
                                                {canPdf && <button
                                                    onClick={() => handleViewPDF(selectedLetter)}
                                                    className="p-2.5 rounded-xl bg-white dark:bg-white/5 text-orange-500 hover:bg-orange-500 hover:text-white border border-orange-100 dark:border-white/10 transition-all shadow-sm"
                                                    title="View Document"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </button>}
                                            </div>
                                        )}
                                    </div>}
                                </div>
                            </div>
                        </div>

                        {/* Error Message */}
                        {validationError && (
                            <div className="px-8 mb-4 animate-in fade-in slide-in-from-top-1">
                                <div className="p-4 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 rounded-2xl flex items-center gap-3 text-red-600 dark:text-red-400 text-xs font-bold leading-relaxed shadow-sm">
                                    <AlertCircle className="w-5 h-5 shrink-0" />
                                    <span>{validationError}</span>
                                </div>
                            </div>
                        )}

                        {/* Drawer Footer */}
                        <div className={`p-8 border-t ${'border-gray-50 dark:border-[#222]'} flex items-center gap-3`}>
                            <button
                                onClick={() => setIsDrawerOpen(false)}
                                className="flex-1 py-4 px-6 rounded-2xl border border-gray-200 dark:border-[#333] text-xs font-black uppercase tracking-widest text-gray-500 hover:bg-gray-50 dark:hover:bg-white/5 transition-all"
                            >
                                Cancel
                            </button>
                            {canSave && (
                                <button
                                    onClick={handleUpdateDetails}
                                    disabled={loading}
                                    className="flex-[2] py-4 px-6 rounded-2xl bg-orange-500 text-white text-xs font-black uppercase tracking-widest shadow-xl shadow-orange-500/20 hover:bg-orange-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {loading && <Loader2 className="w-3 h-3 animate-spin" />}
                                    Save
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* TRACKING DRAWER - Activity Log Timeline */}
            {isTrackDrawerOpen && (
                <div className="fixed inset-0 z-[100] flex justify-start">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setIsTrackDrawerOpen(false)} />
                    <div className="w-full max-w-sm bg-white dark:bg-[#141414] shadow-2xl h-full relative z-10 animate-in slide-in-from-left duration-500 flex flex-col">
                        {/* Header */}
                        <div className="p-6 border-b border-gray-100 dark:border-[#222] flex items-center justify-between">
                            <div>
                                <span className="text-lg font-black text-orange-500 uppercase tracking-tight">{trackingLetter?.lms_id}</span>
                                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-0.5">Activity Tracking</p>
                            </div>
                            <button onClick={() => setIsTrackDrawerOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-colors">
                                <X className="w-5 h-5 text-gray-400" />
                            </button>
                        </div>

                        {/* Timeline Content */}
                        <div className="flex-1 overflow-y-auto px-4 py-8 custom-scrollbar">
                            {(!trackingLetter?.logs || trackingLetter.logs.length === 0) ? (
                                <p className="text-center text-gray-400 py-20 uppercase font-black tracking-widest text-[10px]">No activity recorded yet.</p>
                            ) : (
                                <div className="relative">
                                    {(() => {
                                        // 1. Sort ASCENDING (oldest to newest) to process progression
                                        const sorted = [...trackingLetter.logs].sort((a, b) =>
                                            new Date(a.timestamp || a.log_date || 0) - new Date(b.timestamp || b.log_date || 0)
                                        );

                                        // 2. Map and Filter Redundant Consecutive States
                                        const uniqueSequence = [];
                                        let lastStateKey = "";

                                        sorted.forEach((log) => {
                                            const statusComp = (log.status?.status_name || "").trim().toUpperCase();
                                            const stepComp = (log.step?.step_name || "").trim().toUpperCase();
                                            const actionType = (log.action_type || "").trim().toUpperCase();
                                            const deptComp = (log.department?.dept_code || "").trim().toUpperCase();
                                            const logDetails = (log.log_details || "");

                                            let displayHeading = "";
                                            let displaySubheading = "";

                                            // Priority Status Checks (Bypass workflow matrix)
                                            const isPriority = statusComp.includes('FILED') || actionType.includes('FILED') ||
                                                statusComp.includes('HOLD') || actionType.includes('HOLD') ||
                                                actionType.includes('ENDORSE');

                                            if (isPriority) {
                                                displayHeading = log.status?.status_name || log.action_type || actionType;
                                                displaySubheading = log.metadata?.location || logDetails || "";
                                            }
                                            // Workflow Logic Matrix Implementation
                                            else if (stepComp === 'VEM LETTER') {
                                                displayHeading = "Office of the Executive Minister";
                                            } else if (stepComp === 'AEVM LETTER') {
                                                displayHeading = "Office of the Deputy Executive Minister";
                                            } else if (stepComp === 'FOR SIGNATURE' || stepComp === 'FOR REVIEW') {
                                                // INCLUSIVE check for REVIEW status to handle "Review", "In Review", "Reviewing", etc.
                                                if (statusComp === 'REVIEW' || statusComp.includes('REVIEW')) {
                                                    displayHeading = "ATG";
                                                    displaySubheading = "Being Reviewed";
                                                } else {
                                                    displayHeading = "Processing";
                                                    displaySubheading = "For Incoming";
                                                }
                                            } else if (statusComp === 'PENDING') {
                                                displayHeading = "Processing";
                                                displaySubheading = "For Incoming";
                                            } else {
                                                if (deptComp === 'ATG') {
                                                    displayHeading = "ATG";
                                                    displaySubheading = logDetails || "Being Reviewed";
                                                } else if (deptComp === 'EVM') {
                                                    displayHeading = "Office of the Executive Minister";
                                                    displaySubheading = logDetails || actionType;
                                                } else {
                                                    displayHeading = log.department?.dept_code || log.step?.step_name || log.action_type || "Activity";
                                                    displaySubheading = logDetails || log.action_type || "";
                                                }
                                            }

                                            // Detect Duplicate State
                                            const currentStateKey = `${displayHeading}-${displaySubheading}`.toUpperCase();
                                            if (currentStateKey !== lastStateKey || isPriority) {
                                                uniqueSequence.push({
                                                    ...log,
                                                    displayHeading,
                                                    displaySubheading
                                                });
                                                lastStateKey = currentStateKey;
                                            }
                                        });

                                        // 3. Reverse (descending) for display: newest at top
                                        return uniqueSequence.reverse().map((log, i, arr) => {
                                            const logDate = new Date(log.timestamp || log.log_date);
                                            const isLastItem = i === arr.length - 1;

                                            return (
                                                <div key={i} className="relative grid grid-cols-[90px_auto_1fr] items-start gap-3 mb-8">
                                                    <div className="text-right pt-0.5">
                                                        <p className="text-xs font-black text-slate-800 dark:text-slate-200">
                                                            {logDate.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
                                                        </p>
                                                        <p className="text-[10px] font-medium text-gray-400">
                                                            {logDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                                                        </p>
                                                    </div>

                                                    <div className="flex flex-col items-center">
                                                        <div className="w-5 h-5 rounded-full border-2 border-orange-400 bg-white dark:bg-[#141414] z-10 flex items-center justify-center shrink-0">
                                                            <div className="w-2 h-2 rounded-full bg-orange-400" />
                                                        </div>
                                                        {!isLastItem && <div className="w-px flex-1 mt-1 border-l-2 border-dashed border-gray-200 dark:border-[#333] min-h-[2rem]" />}
                                                    </div>

                                                    <div className="pt-0.5">
                                                        <p className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-tight">
                                                            {log.displayHeading}
                                                        </p>
                                                        <p className="text-[10px] text-gray-500 font-medium mt-0.5 whitespace-pre-wrap">
                                                            {log.displaySubheading}
                                                        </p>
                                                    </div>
                                                </div>
                                            );
                                        });
                                    })()}
                                </div>
                            )}
                        </div>

                        <div className="p-6 border-t border-gray-100 dark:border-[#222]">
                            <button
                                onClick={() => setIsTrackDrawerOpen(false)}
                                className="w-full py-3 bg-orange-500 text-white text-xs font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-orange-500/20"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* STATUS MANAGER MODAL (Super Admin Only) */}
            {isStatusManagerOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsStatusManagerOpen(false)} />
                    <div className="relative z-10 w-full max-w-lg bg-white dark:bg-[#141414] rounded-[2rem] shadow-2xl flex flex-col max-h-[85vh]">
                        {/* Modal Header */}
                        <div className="p-6 border-b border-gray-100 dark:border-[#222] flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-orange-50 dark:bg-orange-900/10 flex items-center justify-center text-orange-500">
                                    <Settings className="w-5 h-5" />
                                </div>
                                <div>
                                    <h2 className={`text-sm font-black uppercase tracking-tight ${textColor}`}>Manage Statuses</h2>
                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Add, Edit or Remove</p>
                                </div>
                            </div>
                            <button onClick={() => setIsStatusManagerOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl">
                                <X className="w-5 h-5 text-gray-400" />
                            </button>
                        </div>

                        {/* Form */}
                        <div className="p-6 border-b border-gray-100 dark:border-[#222]">
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-3">{editingStatus ? 'Editing: ' + editingStatus.status_name : 'Add New Status'}</p>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    placeholder="Status name..."
                                    value={statusForm.status_name}
                                    onChange={e => setStatusForm(f => ({ ...f, status_name: e.target.value }))}
                                    className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-[#333] text-sm font-bold bg-white dark:bg-[#1a1a1a] text-slate-900 dark:text-white focus:ring-2 focus:ring-orange-500/20 outline-none"
                                />
                                <select
                                    value={statusForm.dept_id}
                                    onChange={e => setStatusForm(f => ({ ...f, dept_id: e.target.value }))}
                                    style={{ backgroundColor: 'white', color: 'black' }}
                                    className="px-3 py-2.5 rounded-xl border border-gray-200 text-sm font-bold outline-none focus:ring-2 focus:ring-orange-500/20"
                                >
                                    <option value="">Global</option>
                                    {departments.map(d => <option key={d.id} value={d.id}>{d.dept_code || d.dept_name}</option>)}
                                </select>
                                <button
                                    onClick={editingStatus ? handleUpdateStatus : handleCreateStatus}
                                    className="px-4 py-2.5 bg-orange-500 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/20"
                                >
                                    {editingStatus ? 'Update' : 'Add'}
                                </button>
                                {editingStatus && (
                                    <button
                                        onClick={() => { setEditingStatus(null); setStatusForm({ status_name: '', dept_id: '' }); }}
                                        className="px-3 py-2.5 bg-gray-100 dark:bg-white/5 text-gray-500 text-xs font-black uppercase tracking-widest rounded-xl hover:bg-gray-200 transition-all"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Status List */}
                        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-2">
                            {statuses.length === 0 ? (
                                <p className="text-center py-8 text-gray-400 text-[10px] font-black uppercase tracking-widest">No statuses found</p>
                            ) : (
                                statuses.map(s => {
                                    const dept = departments.find(d => Number(d.id) === Number(s.dept_id));
                                    return (
                                        <div key={s.id} className="flex items-center justify-between p-3 rounded-2xl border border-gray-100 dark:border-[#222] bg-gray-50 dark:bg-white/5 group">
                                            <div>
                                                <p className={`text-xs font-black uppercase tracking-tight ${textColor}`}>{s.status_name}</p>
                                                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{dept ? dept.dept_code || dept.dept_name : 'Global'}</p>
                                            </div>
                                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => { setEditingStatus(s); setStatusForm({ status_name: s.status_name, dept_id: s.dept_id ? String(s.dept_id) : '' }); }}
                                                    className="p-1.5 rounded-lg bg-orange-50 text-orange-500 hover:bg-orange-500 hover:text-white transition-all"
                                                >
                                                    <Pencil className="w-3 h-3" />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteStatus(s.id)}
                                                    className="p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all"
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
