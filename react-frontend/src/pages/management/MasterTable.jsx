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
  Pencil,
  ChevronDown
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
  const textColor =
    layoutStyle === "minimalist"
      ? "text-[#1A1A1B] dark:text-white"
      : "text-slate-900 dark:text-white";
  const cardBg =
    layoutStyle === "notion"
      ? "bg-white dark:bg-[#191919] border-gray-100 dark:border-[#222]"
      : layoutStyle === "minimalist"
        ? "bg-white dark:bg-[#0D0D0D] border-[#E5E5E5] dark:border-[#222]"
        : "bg-white dark:bg-[#141414] border-gray-100 dark:border-[#222]";
  const pageBg =
    layoutStyle === "notion"
      ? "bg-white dark:bg-[#191919]"
      : layoutStyle === "grid"
        ? "bg-slate-50"
        : "bg-[#F9FAFB] dark:bg-[#0D0D0D]";

  const [letters, setLetters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [recordsPerPage] = useState(50);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterGroup, setFilterGroup] = useState("");

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

  const [authorizedSuggestions, setAuthorizedSuggestions] = useState([]);
  const [highlightedEndorseIndex, setHighlightedEndorseIndex] = useState(-1);
  const [showAuthorizedSuggestions, setShowAuthorizedSuggestions] = useState(false);
  const [highlightedAuthIndex, setHighlightedAuthIndex] = useState(-1);
  const authorizedRef = useRef(null);
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
  const canPrintQR = canField("master-table", "print_qr_button");
  const canRefresh = canField("master-table", "refresh_button");

  // Status Manager State
  const [isStatusManagerOpen, setIsStatusManagerOpen] = useState(false);
  const [editingStatus, setEditingStatus] = useState(null);
  const [statusForm, setStatusForm] = useState({
    status_name: "",
    dept_id: "",
  });

  const handleFileSelect = (file) => {
    if (!file) return;
    if (file.type !== "application/pdf") {
      alert("Please upload a PDF file.");
      return;
    }
    setNewFile(file);
  };

  // Handle Paste Globally when modal is open
  useEffect(() => {
    const handlePaste = (e) => {
      if (!isDrawerOpen || drawerMode !== "edit") return;
      const item = e.clipboardData.items[0];
      if (item?.kind === "file") {
        const file = item.getAsFile();
        handleFileSelect(file);
      }
    };
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [isDrawerOpen, drawerMode, isCombining, selectedLetter]);

  // Field statuses requested by user - replaced by dynamic 'statuses' from DB
  const SPECIAL_ACTIONS = ["Show to ATG Dashboard"];

  const fetchData = async (isRefreshing = false, retryCount = 0) => {
    if (!user?.id) return;
    if (isRefreshing || retryCount > 0) setRefreshing(true);
    if (retryCount === 0 && !isRefreshing) setLoading(true);

    try {
      const userDeptId = user?.dept_id?.id ?? user?.dept_id;
      const roleName = user?.roleData?.name || user?.role || "";
      const response = await letterService.getAll({
        user_id: user?.id,
        role: roleName,
        full_name: `${user?.first_name} ${user?.last_name}`.trim(),
        page: currentPage,
        limit: recordsPerPage,
      });

      if (response && response.data) {
        setLetters(Array.isArray(response.data) ? response.data : []);
        setTotalPages(response.totalPages || 1);
        setTotalRecords(
          response.total ||
          (Array.isArray(response.data) ? response.data.length : 0),
        );
      } else {
        setLetters(Array.isArray(response) ? response : []);
      }

      // Fetch reference data with individual safety catches
      const apiBase =
        import.meta.env.VITE_API_URL || "http://localhost:5000/api";

      departmentService
        .getAll()
        .then(setDepartments)
        .catch(() => { });
      statusService
        .getAll({ dept_id: "all" })
        .then(setStatuses)
        .catch(() => { });
      axios
        .get(`${apiBase}/process-steps`)
        .then((res) => setSteps(res.data))
        .catch(() => { });
      letterKindService
        .getAll()
        .then(setLetterKinds)
        .catch(() => { });
      axios
        .get(`${apiBase}/persons`)
        .then((res) => setPersons(Array.isArray(res.data) ? res.data : []))
        .catch(() => { });
      axios
        .get(`${apiBase}/trays?dept_id=all`)
        .then((res) => setTrays(res.data))
        .catch(() => { });
      axios
        .get(`${apiBase}/attachments?dept_id=${userDeptId}`)
        .then((res) => setAttachments(res.data))
        .catch(() => { });
    } catch (error) {
      console.error("Fetch failed:", error.message);
      // Retry logic for Brave/Aborted requests
      if (
        retryCount < 2 &&
        (error.code === "ECONNABORTED" || error.message?.includes("aborted"))
      ) {
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
    if (user?.id) fetchData();
    // eslint-disable-next-line
  }, [currentPage, user?.id]);

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredLetters.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredLetters.map((l) => l.id));
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const fetchEndorseSuggestions = async (query) => {
    if (!query || query.length < 2) {
      setEndorseSuggestions([]);
      setShowEndorseSuggestions(false);
      return;
    }
    try {
      const res = await axios.get(
        `${import.meta.env.VITE_API_URL || "http://localhost:5000/api"}/persons/search?query=${query}`,
      );
      setEndorseSuggestions(res.data);
      setShowEndorseSuggestions(res.data.length > 0);
    } catch { }
  };

  // Close endorse suggestions on outside click
  useEffect(() => {
    const handler = (e) => {
      if (endorseRef.current && !endorseRef.current.contains(e.target))
        setShowEndorseSuggestions(false);
      if (authorizedRef.current && !authorizedRef.current.contains(e.target))
        setShowAuthorizedSuggestions(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleEdit = (letter) => {
    const latestAssignment = (letter.assignments || []).sort((a, b) => b.id - a.id)[0];
    const latestEndorsement = (letter.endorsements || []).sort((a, b) => b.id - a.id)[0];

    setSelectedLetter({
      ...letter,
      currentStepId: letter.currentStepId || latestAssignment?.step_id,
      endorse_to: latestEndorsement?.endorsed_to || "",
    });
    setValidationError("");
    setDrawerMode("edit");
    setIsDrawerOpen(true);
    setIsCombining(false);
    setNewFile(null);
  };

  const fetchAuthorizedSuggestions = async (query) => {
    if (!query || query.length < 2) {
      setAuthorizedSuggestions([]);
      setShowAuthorizedSuggestions(false);
      setHighlightedAuthIndex(-1);
      return;
    }
    try {
      const res = await axios.get(
        `${import.meta.env.VITE_API_URL || "http://localhost:5000/api"}/persons/search?query=${query}`,
      );
      setAuthorizedSuggestions(res.data);
      setShowAuthorizedSuggestions(res.data.length > 0);
      setHighlightedAuthIndex(res.data.length > 0 ? 0 : -1);
    } catch { }
  };

  const selectAuthorizedSuggestion = (name) => {
    const cleanName = name.replace(/,+$/, "").trim();
    const parts = (selectedLetter.authorized_users || "").split(";").map((p) => p.trim());
    parts[parts.length - 1] = cleanName;
    const newValue = parts.filter((p) => p !== "").join("; ");
    setSelectedLetter({ ...selectedLetter, authorized_users: newValue + "; " });
    setShowAuthorizedSuggestions(false);
    setHighlightedAuthIndex(-1);
  };

  const handleAuthorizedKeyDown = (e) => {
    if (!authorizedSuggestions || authorizedSuggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!showAuthorizedSuggestions) setShowAuthorizedSuggestions(true);
      setHighlightedAuthIndex((prev) => Math.min(prev < 0 ? 0 : prev + 1, authorizedSuggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedAuthIndex((prev) => Math.max(prev < 0 ? 0 : prev - 1, 0));
    } else if (e.key === "Enter" && showAuthorizedSuggestions) {
      e.preventDefault();
      const picked = authorizedSuggestions[highlightedAuthIndex < 0 ? 0 : highlightedAuthIndex];
      if (picked) selectAuthorizedSuggestion(picked.name);
    } else if (e.key === "Escape") {
      setShowAuthorizedSuggestions(false);
    }
  };

  const handleEndorseKeyDown = (e) => {
    if (!endorseSuggestions || endorseSuggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!showEndorseSuggestions) setShowEndorseSuggestions(true);
      setHighlightedEndorseIndex((prev) => Math.min(prev < 0 ? 0 : prev + 1, endorseSuggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedEndorseIndex((prev) => Math.max(prev < 0 ? 0 : prev - 1, 0));
    } else if (e.key === "Enter" && showEndorseSuggestions) {
      e.preventDefault();
      const picked = endorseSuggestions[highlightedEndorseIndex < 0 ? 0 : highlightedEndorseIndex];
      if (picked) {
        setSelectedLetter({ ...selectedLetter, endorse_to: picked.name });
        setShowEndorseSuggestions(false);
      }
    } else if (e.key === "Escape") {
      setShowEndorseSuggestions(false);
    }
  };

  const handleDelete = async (id) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this letter? This action cannot be undone.",
      )
    )
      return;
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
      const statusMatch =
        typeof statusIdOrName === "number"
          ? statuses.find((s) => s.id === statusIdOrName)
          : statuses.find((s) => s.status_name === statusIdOrName);

      const payload = statusMatch
        ? { global_status: statusMatch.id }
        : { letter_type: statusIdOrName };

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
        const res = await axios.post(
          `${import.meta.env.VITE_API_URL || "http://localhost:5000/api"}/attachments/combine-selected`,
          {
            letter_ids: selectedIds,
          },
        );
        if (res.data.file_path) {
          const b64 = btoa(res.data.file_path);
          window.open(
            `${import.meta.env.VITE_API_URL || "http://localhost:5000/api"}/attachments/view-path?path=${b64}`,
            "_blank",
          );
        }
      } else {
        for (const id of selectedIds) {
          if (statusIdOrName === "Show to ATG Dashboard") {
            await letterService.update(id, { tray_id: null, global_status: 2 });
          } else {
            const statusMatch =
              typeof statusIdOrName === "number"
                ? statuses.find((s) => s.id === statusIdOrName)
                : statuses.find((s) => s.status_name === statusIdOrName);

            const payload = statusMatch
              ? { global_status: statusMatch.id }
              : { letter_type: statusIdOrName };
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

  const resetDrawerState = () => {
    setIsDrawerOpen(false);
    setNewFile(null);
    setIsCombining(false);
  };

  const createEndorsement = async (letterId, name = null) => {
    const endorsedTo = (name || selectedLetter.endorse_to || "").trim();
    if (!endorsedTo) {
      setValidationError("Please select a person to endorse to.");
      return false;
    }

    await axios.post(
      `${import.meta.env.VITE_API_URL || "http://localhost:5000/api"}/endorsements`,
      {
        letter_id: letterId,
        endorsed_to: endorsedTo,
        endorsed_by: user?.id || null,
        notes: "",
        dept_id: selectedLetter?.dept_id?.id ?? selectedLetter?.dept_id ?? null,
      },
    );
    return true;
  };

  const updateDetailsInternal = async (forceCombine = null) => {
    if (!selectedLetter.currentStepId) {
      setValidationError(
        "Please select a valid Stage (e.g. FOR REVIEW, FOR SIGNATURE, VEM LETTER) before saving.",
      );
      return null;
    }

    const statusObj = selectedLetter.global_status && statuses ? statuses.find(s => s.id === selectedLetter.global_status) : null;
    const statusName = (statusObj?.status_name || "").toLowerCase();
    if (statusName.includes("forward") || statusName.includes("endorse")) {
      const endorsedTo = (selectedLetter.endorse_to || "").trim();
      if (!endorsedTo) {
        setValidationError(`Please select a person to endorse to when setting status to ${statusObj?.status_name || 'Endorsed/Forwarded'}.`);
        return null;
      }
    }

    let updatedLetter = { ...selectedLetter };
    const activeCombining = forceCombine !== null ? forceCombine : isCombining;

    // 0. Handle File Upload if newFile is present
    if (newFile) {
      const formData = new FormData();
      formData.append("file", newFile);

      if (activeCombining) {
        // Instead of merging physically, we upload it as a separate attachment and link it
        formData.append("no_record", "false");
        formData.append("attachment_name", newFile.name);
        formData.append("dept_id", user?.dept_id?.id || user?.dept_id || null);

        const uploadRes = await axios.post(
          `${import.meta.env.VITE_API_URL || "http://localhost:5000/api"}/attachments/upload`,
          formData,
          { headers: { "Content-Type": "multipart/form-data" } }
        );

        const newAttachmentId = uploadRes.data.id;
        const currentIds = updatedLetter.attachment_id ? String(updatedLetter.attachment_id).split(',').filter(id => id.trim()) : [];
        currentIds.unshift(newAttachmentId);
        updatedLetter.attachment_id = currentIds.join(',');
      } else {
        // Overwrite flow: delete ALL old physical files (primary and secondary)
        if (selectedLetter.scanned_copy) {
          try {
            await axios.delete(`${import.meta.env.VITE_API_URL || "http://localhost:5000/api"}/letters/${selectedLetter.id}/scanned-copy`);
          } catch (e) {
            console.warn("Could not delete old scanned_copy prior to replace:", e);
          }
        }

        // Also delete all secondary attachments linked to this letter
        if (selectedLetter.attachment_id) {
          const ids = String(selectedLetter.attachment_id).split(',').filter(id => id.trim());
          for (const id of ids) {
            try {
              await axios.delete(`${import.meta.env.VITE_API_URL || "http://localhost:5000/api"}/attachments/${id}`);
            } catch (e) {
              console.warn(`Could not delete attachment ${id}:`, e);
            }
          }
        }

        formData.append("no_record", "true");
        const uploadRes = await axios.post(
          `${import.meta.env.VITE_API_URL || "http://localhost:5000/api"}/attachments/upload`,
          formData,
          { headers: { "Content-Type": "multipart/form-data" } }
        );
        updatedLetter.scanned_copy = uploadRes.data.file_path;
        updatedLetter.attachment_id = null; // Clear all secondary links
      }
    }

    console.log("Saving updated letter:", {
      id: updatedLetter.id,
      scanned_copy: updatedLetter.scanned_copy,
      attachment_id: updatedLetter.attachment_id
    });

    // 1. Update core letter details with user context for logging
    const shouldMarkPending =
      !!updatedLetter.currentStepId &&
      (!updatedLetter.assignments || updatedLetter.assignments.length === 0);
    await letterService.update(updatedLetter.id, {
      ...updatedLetter,
      ...(shouldMarkPending ? { global_status: 8 } : {}),
      user_id: user?.id,
    });

    // 2. Update/Add Assignment for the new step if it changed
    if (updatedLetter.currentStepId) {
      if (updatedLetter.assignments && updatedLetter.assignments.length > 0) {
        const latest = [...updatedLetter.assignments].sort((a, b) => b.id - a.id)[0];
        await axios.put(
          `${import.meta.env.VITE_API_URL || "http://localhost:5000/api"}/letter-assignments/${latest.id}`,
          {
            step_id: updatedLetter.currentStepId,
          },
        );
      } else {
        const selectedStep = steps.find(
          (s) => Number(s.id) === Number(updatedLetter.currentStepId),
        );
        const stepDepartmentId =
          selectedStep?.dept_id?.id ?? selectedStep?.dept_id ?? null;
        const preservedDepartmentId =
          [...(updatedLetter.assignments || [])].sort((a, b) => b.id - a.id)[0]
            ?.department_id?.id ??
          [...(updatedLetter.assignments || [])].sort((a, b) => b.id - a.id)[0]
            ?.department_id ??
          null;
        const fallbackUserDeptId = user?.dept_id?.id || user?.dept_id || null;
        const finalDepartmentId =
          stepDepartmentId || preservedDepartmentId || fallbackUserDeptId;

        // If no assignment exists, create one!
        await axios.post(
          `${import.meta.env.VITE_API_URL || "http://localhost:5000/api"}/letter-assignments`,
          {
            letter_id: updatedLetter.id,
            step_id: updatedLetter.currentStepId,
            department_id: finalDepartmentId,
            assigned_by: user?.id,
          },
        );
      }
    }

    return updatedLetter;
  };

  const [showOverwriteConfirm, setShowOverwriteConfirm] = useState(false);
  const [pendingAction, setPendingAction] = useState(null); // 'save' or 'save-endorse'

  const handleUpdateDetails = async (forceOverwrite = false, forceCombine = null) => {
    // Validation: If files exist and we are NOT combining, ask for confirmation
    const hasExistingFiles = (selectedLetter?.scanned_copy && selectedLetter.scanned_copy.trim() !== "") ||
      (selectedLetter?.attachment_id && String(selectedLetter.attachment_id).trim() !== "");

    const activeCombining = forceCombine !== null ? forceCombine : isCombining;

    if (newFile && !activeCombining && hasExistingFiles && !forceOverwrite) {
      setPendingAction('save');
      setShowOverwriteConfirm(true);
      return;
    }

    try {
      setLoading(true);
      const updated = await updateDetailsInternal(forceCombine);
      if (!updated) return;

      // Automatically create endorsement record if status is Forwarded or Endorsed
      const statusObj = updated.global_status && statuses ? statuses.find(s => s.id === updated.global_status) : null;
      const statusName = (statusObj?.status_name || "").toLowerCase();
      if (statusName.includes("forward") || statusName.includes("endorse")) {
        await createEndorsement(updated.id, selectedLetter.endorse_to);
      }

      resetDrawerState();
      fetchData();
      setShowOverwriteConfirm(false);
      setPendingAction(null);
    } catch (error) {
      console.error("Update failed", error);
      const errMsg =
        error.response?.data?.error ||
        error.message ||
        "Please check connection.";
      setValidationError(`Failed to update letter details: ${errMsg}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFile = async (type, specificId = null) => {
    if (!window.confirm("Are you sure you want to delete this file? This action cannot be undone.")) return;

    try {
      setLoading(true);
      if (type === 'primary') {
        await axios.delete(`${import.meta.env.VITE_API_URL || "http://localhost:5000/api"}/letters/${selectedLetter.id}/scanned-copy`);
        setSelectedLetter(prev => ({ ...prev, scanned_copy: null }));
      } else if (type === 'secondary') {
        if (specificId) {
          // 1. Delete physical file & record via AttachmentController
          await axios.delete(`${import.meta.env.VITE_API_URL || "http://localhost:5000/api"}/attachments/${specificId}`);

          // 2. Remove from the letter's comma-separated list
          const currentIds = String(selectedLetter.attachment_id || "").split(',').filter(id => id.trim() !== String(specificId));
          const newAttachmentId = currentIds.length > 0 ? currentIds.join(',') : null;

          await letterService.update(selectedLetter.id, { attachment_id: newAttachmentId });
          setSelectedLetter(prev => ({ ...prev, attachment_id: newAttachmentId }));
        } else {
          // Delete all (fallback)
          const ids = String(selectedLetter.attachment_id || "").split(',');
          for (const aid of ids) {
            if (aid.trim()) {
              await axios.delete(`${import.meta.env.VITE_API_URL || "http://localhost:5000/api"}/attachments/${aid.trim()}`);
            }
          }
          await letterService.update(selectedLetter.id, { attachment_id: null });
          setSelectedLetter(prev => ({ ...prev, attachment_id: null }));
        }
      }
      fetchData();
    } catch (error) {
      console.error("Failed to delete file", error);
      alert("Failed to delete file. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEndorsement = async (id) => {
    if (!window.confirm("Are you sure you want to remove this endorsement?")) return;
    try {
      setLoading(true);
      await axios.delete(`${import.meta.env.VITE_API_URL || "http://localhost:5000/api"}/endorsements/${id}`);
      // Update local state
      setSelectedLetter(prev => ({
        ...prev,
        endorsements: (prev.endorsements || []).filter(e => e.id !== id)
      }));
      fetchData();
    } catch (error) {
      console.error("Failed to delete endorsement", error);
      alert("Failed to remove endorsement.");
    } finally {
      setLoading(false);
    }
  };


  const handleEndorseOnly = async () => {
    if (!selectedLetter?.id) return;
    try {
      setLoading(true);
      const ok = await createEndorsement(selectedLetter.id, selectedLetter.endorse_to);
      if (!ok) return;
      resetDrawerState();
      fetchData();
      navigate("/endorsements");
    } catch (error) {
      console.error("Endorse failed", error);
      const errMsg =
        error.response?.data?.error ||
        error.message ||
        "Please check connection.";
      setValidationError(`Failed to endorse: ${errMsg}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAndEndorse = async (forceOverwrite = false, forceCombine = null) => {
    // Validation: If files exist and we are NOT combining, ask for confirmation
    const hasExistingFiles = (selectedLetter?.scanned_copy && selectedLetter.scanned_copy.trim() !== "") ||
      (selectedLetter?.attachment_id && String(selectedLetter.attachment_id).trim() !== "");

    const activeCombining = forceCombine !== null ? forceCombine : isCombining;

    if (newFile && !activeCombining && hasExistingFiles && !forceOverwrite) {
      setPendingAction('save-endorse');
      setShowOverwriteConfirm(true);
      return;
    }

    try {
      setLoading(true);
      const updated = await updateDetailsInternal(forceCombine);
      if (!updated) return;
      const ok = await createEndorsement(updated.id, selectedLetter.endorse_to);
      if (!ok) return;
      resetDrawerState();
      fetchData();
      setShowOverwriteConfirm(false);
      setPendingAction(null);
      navigate("/endorsements");
    } catch (error) {
      console.error("Save and endorse failed", error);
      const errMsg =
        error.response?.data?.error ||
        error.message ||
        "Please check connection.";
      setValidationError(`Failed to save and endorse: ${errMsg}`);
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
    if (!letter.scanned_copy && !letter.attachment_id) {
      alert("No document available to view.");
      return;
    }
    if (!letter.scanned_copy && !letter.attachment_id) return;
    const apiBase =
      import.meta.env.VITE_API_URL || "http://localhost:5000/api";

    // Use combined view if there are multiple parts (or forced merge)
    if ((letter.scanned_copy && letter.attachment_id) || (letter.attachment_id && String(letter.attachment_id).includes(','))) {
      window.open(`${apiBase}/attachments/view-combined/${letter.id}`, "_blank");
    } else {
      const url = letter.scanned_copy
        ? `${apiBase}/attachments/view-path?path=${btoa(letter.scanned_copy)}`
        : `${apiBase}/attachments/view/${letter.attachment_id}`;
      window.open(url, "_blank");
    }
  };

  const handlePrintQR = (lms_id) => {
    if (!lms_id) {
      alert("This record does not have a Reference Code yet.");
      return;
    }
    const printWindow = window.open("", "_blank");
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

  const filteredLetters = letters.filter((l) => {
    // Data Visibility Filter
    const roleName = user?.roleData?.name?.toString().toUpperCase() || "";
    const isUserRole = roleName === "USER";
    const isAccessManager = roleName === "ACCESS MANAGER";

    if ((isUserRole || isAccessManager) && !isSuperAdmin) {
      const isOwner = l.encoder_id === user.id;

      const userLastName = user?.last_name?.toLowerCase() || "";
      const userFirstName = user?.first_name?.toLowerCase() || "";
      const fullName1 = `${userFirstName} ${userLastName}`.trim();
      const fullName2 = `${userLastName}, ${userFirstName}`.trim();

      const senderStr = (l.sender || "").toLowerCase();
      const endorseStr = (l.endorsed || "").toLowerCase();

      const isSenderOrEndorsed =
        (fullName1 &&
          (senderStr.includes(fullName1) || endorseStr.includes(fullName1))) ||
        (fullName2 &&
          (senderStr.includes(fullName2) || endorseStr.includes(fullName2)));

      const userDeptId = user?.dept_id?.id ?? user?.dept_id;
      const isInDept =
        l.assignments?.some(
          (a) => (a.department_id?.id ?? a.department_id) === userDeptId,
        ) || l.dept_id === userDeptId;
      if (!isOwner && !isInDept && !isSenderOrEndorsed) return false;
    }

    // Status filter
    if (filterStatus) {
      const letterStatusId = l.global_status ?? l.status?.id;
      if (String(letterStatusId) !== String(filterStatus)) return false;
    }

    // Group filter (latest step_name)
    if (filterGroup) {
      const latestStep = l.assignments?.sort((a, b) => b.id - a.id)[0]?.step?.step_name || "";
      if (latestStep.toLowerCase() !== filterGroup.toLowerCase()) return false;
    }

    if (!canSearch) return true;

    return (
      l.entry_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.lms_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.vemcode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.aevm_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.sender?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.summary?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const getStatusStyle = (status) => {
    switch (status?.toLowerCase()) {
      case "incoming":
        return "bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-900/10 dark:text-blue-400 dark:border-blue-900/30";
      case "being reviewed":
        return "bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-900/10 dark:text-amber-400 dark:border-amber-900/30";
      case "hold":
        return "bg-red-50 text-red-600 border-red-100 dark:bg-red-900/10 dark:text-red-400 dark:border-red-900/30";
      case "endorse":
        return "bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/10 dark:text-emerald-400 dark:border-emerald-900/30";
      default:
        return "bg-slate-50 text-slate-600 border-slate-100 dark:bg-white/5 dark:text-slate-400 dark:border-white/10";
    }
  };

  const handleCreateStatus = async () => {
    if (!statusForm.status_name.trim()) return;
    try {
      await statusService.create({
        status_name: statusForm.status_name.trim(),
        dept_id: statusForm.dept_id ? parseInt(statusForm.dept_id) : null,
      });
      statusService
        .getAll({ dept_id: user?.dept_id?.id ?? user?.dept_id })
        .then(setStatuses)
        .catch(() => { });
      setStatusForm({ status_name: "", dept_id: "" });
    } catch (error) {
      alert("Failed to create status: " + error.message);
    }
  };

  const handleUpdateStatus = async () => {
    if (!editingStatus || !statusForm.status_name.trim()) return;
    try {
      await statusService.update(editingStatus.id, {
        status_name: statusForm.status_name.trim(),
        dept_id:
          statusForm.dept_id !== "" ? parseInt(statusForm.dept_id) : null,
      });
      statusService
        .getAll({ dept_id: user?.dept_id?.id ?? user?.dept_id })
        .then(setStatuses)
        .catch(() => { });
      setEditingStatus(null);
      setStatusForm({ status_name: "", dept_id: "" });
    } catch (error) {
      alert("Failed to update status: " + error.message);
    }
  };

  const handleDeleteStatus = async (id) => {
    if (
      !window.confirm("Delete this status? Letters using it will be affected.")
    )
      return;
    try {
      await statusService.delete(id);
      statusService
        .getAll({ dept_id: user?.dept_id?.id ?? user?.dept_id })
        .then(setStatuses)
        .catch(() => { });
    } catch (error) {
      alert("Failed to delete status: " + error.message);
    }
  };

  return (
    <div className={`min-h-screen ${pageBg} flex overflow-hidden`}>
      <Sidebar />
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Header */}
        <header
          className={`h-16 ${layoutStyle === "minimalist" ? "bg-white dark:bg-[#0D0D0D] border-[#E5E5E5] dark:border-[#222]" : "bg-white dark:bg-[#0D0D0D] border-gray-100 dark:border-[#222]"} border-b px-8 flex items-center justify-between sticky top-0 z-10 shrink-0`}
        >
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-2.5 bg-slate-100 dark:bg-white/5 rounded-xl"
            >
              <TableIcon className="w-5 h-5 text-gray-500" />
            </button>
            <div className="flex items-center gap-2">
              <TableIcon
                className={`w-4 h-4 ${layoutStyle === "minimalist" ? "text-[#1A1A1B] dark:text-white" : "text-orange-500"}`}
              />
              <div>
                <h1 className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                  Master
                </h1>
                <h2
                  className={`text-sm font-black uppercase tracking-tight ${textColor}`}
                >
                  Master Table
                </h2>
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
            {canRefresh && (
              <button
                onClick={() => fetchData(true)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition-all"
              >
                <RefreshCw
                  className={`w-4 h-4 text-gray-400 ${refreshing ? "animate-spin" : ""}`}
                />
              </button>
            )}
            {isSuperAdmin && (
              <button
                onClick={() => {
                  setEditingStatus(null);
                  setStatusForm({ status_name: "", dept_id: "" });
                  setIsStatusManagerOpen(true);
                }}
                className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition-all"
                title="Manage Statuses"
              >
                <Settings className="w-4 h-4 text-gray-400" />
              </button>
            )}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-10 custom-scrollbar">
          <div className="max-w-full mx-auto space-y-6">
            {/* Summary & Search + Filters */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
                {/* Search */}
                {canSearch && (
                  <div className="relative group min-w-[240px]">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className={`w-full pl-12 pr-4 py-3 rounded-2xl border text-sm transition-all focus:ring-2 focus:ring-orange-500/20 outline-none ${layoutStyle === "minimalist" ? "bg-white dark:bg-white/5 border-[#E5E5E5] dark:border-[#222]" : "bg-white dark:bg-[#141414] border-gray-100 dark:border-[#222]"}`}
                    />
                  </div>
                )}

                {/* Status Filter */}
                <div className="relative">
                  <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                  <select
                    id="mt-filter-status"
                    value={filterStatus}
                    onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }}
                    className={`pl-8 pr-8 py-3 rounded-2xl border text-[11px] font-black uppercase tracking-widest transition-all focus:ring-2 focus:ring-orange-500/20 outline-none appearance-none cursor-pointer ${
                      filterStatus
                        ? "bg-orange-50 dark:bg-orange-900/10 border-orange-200 dark:border-orange-800 text-orange-600"
                        : layoutStyle === "minimalist"
                          ? "bg-white dark:bg-white/5 border-[#E5E5E5] dark:border-[#222] text-gray-500"
                          : "bg-white dark:bg-[#141414] border-gray-100 dark:border-[#222] text-gray-500"
                    }`}
                  >
                    <option value="">All Status</option>
                    {statuses.map((s) => (
                      <option key={s.id} value={s.id}>{s.status_name}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
                </div>

                {/* Group (Step) Filter */}
                <div className="relative">
                  <GitMerge className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                  <select
                    id="mt-filter-group"
                    value={filterGroup}
                    onChange={(e) => { setFilterGroup(e.target.value); setCurrentPage(1); }}
                    className={`pl-8 pr-8 py-3 rounded-2xl border text-[11px] font-black uppercase tracking-widest transition-all focus:ring-2 focus:ring-orange-500/20 outline-none appearance-none cursor-pointer ${
                      filterGroup
                        ? "bg-indigo-50 dark:bg-indigo-900/10 border-indigo-200 dark:border-indigo-800 text-indigo-600"
                        : layoutStyle === "minimalist"
                          ? "bg-white dark:bg-white/5 border-[#E5E5E5] dark:border-[#222] text-gray-500"
                          : "bg-white dark:bg-[#141414] border-gray-100 dark:border-[#222] text-gray-500"
                    }`}
                  >
                    <option value="">All Groups</option>
                    {[...new Set(steps.map((s) => s.step_name))].map((name) => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
                </div>

                {/* Clear filters */}
                {(filterStatus || filterGroup) && (
                  <button
                    onClick={() => { setFilterStatus(""); setFilterGroup(""); }}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gray-100 dark:bg-white/5 text-gray-500 hover:bg-red-50 hover:text-red-500 text-[10px] font-black uppercase tracking-widest transition-all border border-transparent hover:border-red-100"
                    title="Clear all filters"
                  >
                    <X className="w-3.5 h-3.5" />
                    Clear
                  </button>
                )}
              </div>

              {/* Record count */}
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 whitespace-nowrap">
                {filteredLetters.length} / {totalRecords} Records
              </span>
            </div>

            {/* Bulk Status Actions Bar */}
            {selectedIds.length > 0 && canStatusDropdown && (
              <div
                className={`p-4 rounded-3xl border flex flex-col md:flex-row items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2 duration-300 ${"bg-orange-50 dark:bg-orange-900/10 border-orange-100 dark:border-orange-900/20"}`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white dark:bg-white/10 rounded-full flex items-center justify-center text-orange-500 shadow-sm border border-orange-100 dark:border-orange-900/20">
                    <CheckSquare className="w-5 h-5" />
                  </div>
                  <div>
                    <p
                      className={`text-xs font-black uppercase tracking-tight ${textColor}`}
                    >
                      {selectedIds.length} Selected
                    </p>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                      Bulk update
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 custom-scrollbar w-full md:w-auto">
                  {statuses
                    .filter((s) => s.status_name?.toLowerCase() !== "done")
                    .filter((s) => {
                      const userDeptId = user?.dept_id?.id ?? user?.dept_id;
                      if (selectedIds.length === 0) return isSuperAdmin;
                      // Show if global (null dept_id) OR matches the currently logged-in user's department
                      return (
                        !s.dept_id ||
                        (userDeptId && Number(s.dept_id) === Number(userDeptId))
                      );
                    })
                    .map((s) => {
                      const dept = departments.find(
                        (d) => Number(d.id) === Number(s.dept_id),
                      );
                      const label = dept
                        ? `${dept.dept_code}: ${s.status_name}`
                        : s.status_name;
                      return (
                        <button
                          key={s.id}
                          onClick={() => handleBulkStatusUpdate(s.id)}
                          className={`whitespace-nowrap px-4 py-2 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all bg-white dark:bg-white/5 border-gray-100 dark:border-white/10 ${textColor} hover:bg-orange-500 hover:text-white hover:border-orange-500`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  {SPECIAL_ACTIONS.map((action) => (
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
            <div
              className={`rounded-[2.5rem] border overflow-hidden shadow-sm ${layoutStyle === "minimalist" ? "bg-white dark:bg-black/20 border-[#E5E5E5] dark:border-[#222]" : "bg-white dark:bg-[#141414] border-gray-100 dark:border-[#222]"}`}
            >
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse min-w-[1200px]">
                  <thead>
                    <tr
                      className={`border-b ${"border-gray-50 dark:border-[#222] bg-gray-50/50 dark:bg-white/5"}`}
                    >
                      <th className="p-5 w-12 text-center">
                        <button
                          onClick={toggleSelectAll}
                          className="text-gray-400 hover:text-orange-500 transition-colors"
                        >
                          {selectedIds.length === filteredLetters.length &&
                            filteredLetters.length > 0 ? (
                            <CheckSquare className="w-5 h-5 text-orange-500" />
                          ) : (
                            <Square className="w-5 h-5" />
                          )}
                        </button>
                      </th>
                      <th className="p-5 w-12 text-center"></th>
                      <th className="p-5 text-[10px] font-black uppercase tracking-widest text-gray-400">
                        ID
                      </th>
                      <th className="p-5 text-[10px] font-black uppercase tracking-widest text-gray-400">
                        Status
                      </th>
                      <th className="p-5 text-[10px] font-black uppercase tracking-widest text-gray-400">
                        Group
                      </th>
                      <th className="p-5 text-[10px] font-black uppercase tracking-widest text-gray-400 whitespace-nowrap">
                        Date
                      </th>
                      <th className="p-5 text-[10px] font-black uppercase tracking-widest text-gray-400">
                        Sender
                      </th>
                      <th className="p-5 text-[10px] font-black uppercase tracking-widest text-gray-400">
                        Re
                      </th>
                      <th className="p-5 text-[10px] font-black uppercase tracking-widest text-gray-400 text-center">
                        Track
                      </th>
                      <th className="p-5 text-[10px] font-black uppercase tracking-widest text-gray-400 text-center">
                        QR
                      </th>
                      <th className="p-5 text-[10px] font-black uppercase tracking-widest text-gray-400 text-center">
                        PDF
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-[#222]">
                    {loading ? (
                      <tr>
                        <td colSpan="11" className="p-20 text-center">
                          <Loader2 className="w-10 h-10 text-orange-500 animate-spin mx-auto mb-4" />
                          <p className="text-xs font-black uppercase tracking-widest text-gray-400">
                            Loading...
                          </p>
                        </td>
                      </tr>
                    ) : filteredLetters.length === 0 ? (
                      <tr>
                        <td colSpan="11" className="p-20 text-center">
                          <Search className="w-10 h-10 text-gray-200 mx-auto mb-4" />
                          <p className="text-xs font-black uppercase tracking-widest text-gray-400">
                            No records
                          </p>
                        </td>
                      </tr>
                    ) : (
                      filteredLetters.map((letter) => (
                        <tr
                          key={letter.id}
                          className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group"
                        >
                          <td className="p-5 text-center">
                            <button
                              onClick={() => toggleSelect(letter.id)}
                              className="text-gray-300 group-hover:text-gray-400 transition-colors"
                            >
                              {selectedIds.includes(letter.id) ? (
                                <CheckSquare className="w-5 h-5 text-orange-500" />
                              ) : (
                                <Square className="w-5 h-5" />
                              )}
                            </button>
                          </td>
                          <td className="p-5 text-center px-0">
                            {canEdit && (
                              <PermissionGuard
                                page="master-table"
                                action="can_edit"
                              >
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
                            <span
                              className={`text-[10px] font-black px-2.5 py-1 rounded bg-slate-100 dark:bg-white/10 ${textColor}`}
                            >
                              {letter.lms_id || "PENDING"}
                              {letter.tray?.tray_no ? (
                                <span className="text-orange-500 italic ml-1.5">
                                  ({letter.tray.tray_no.toLowerCase()})
                                </span>
                              ) : (
                                ""
                              )}
                            </span>
                          </td>
                          <td className="p-5 whitespace-nowrap text-xs font-bold">
                            <span
                              className={`px-3 py-1 rounded-full text-[10px] uppercase font-black tracking-widest ${letter.status?.status_name === "Incoming"
                                ? "bg-blue-50 text-blue-600"
                                : letter.status?.status_name === "Forwarded"
                                  ? "bg-purple-50 text-purple-600"
                                  : "bg-gray-50 text-gray-600"
                                }`}
                            >
                              {letter.status?.status_name || "N/A"}
                            </span>
                          </td>
                          <td className="p-5 whitespace-nowrap text-xs font-bold text-indigo-500 uppercase tracking-tighter">
                            {letter.assignments?.sort((a, b) => b.id - a.id)[0]
                              ?.step?.step_name || "N/A"}
                          </td>
                          <td className="p-5 whitespace-nowrap text-[10px] font-bold text-gray-500 dark:text-gray-400">
                            <div className="flex flex-col">
                              <span>
                                {new Date(
                                  letter.date_received || letter.createdAt,
                                ).toLocaleDateString("en-PH", {
                                  timeZone: "Asia/Manila",
                                })}
                              </span>
                              <span className="text-orange-500">
                                {new Date(
                                  letter.date_received || letter.createdAt,
                                ).toLocaleTimeString("en-PH", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  hour12: true,
                                  timeZone: "Asia/Manila",
                                })}
                              </span>
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
                              <PermissionGuard
                                page="master-table"
                                action="can_special"
                              >
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
                            {canPrintQR ? (
                              <button
                                onClick={() => handlePrintQR(letter.lms_id)}
                                className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/10 text-blue-500 flex items-center justify-center hover:bg-blue-500 hover:text-white transition-all transform hover:scale-105 mx-auto"
                                title="Print QR Code"
                              >
                                <Printer className="w-4 h-4" />
                              </button>
                            ) : (
                              <span className="text-gray-200 dark:text-[#333]">
                                -
                              </span>
                            )}
                          </td>
                          <td className="p-5 text-center">
                            {letter.attachment_id || letter.scanned_copy ? (
                              isSuperAdmin || canPdf ? (
                                <button
                                  onClick={() => handleViewPDF(letter)}
                                  className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-900/10 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all mx-auto"
                                >
                                  <FileText className="w-4 h-4" />
                                </button>
                              ) : (
                                <span className="text-gray-200 dark:text-[#333]">
                                  -
                                </span>
                              )
                            ) : (
                              <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 opacity-60">
                                No File
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Footer / Pagination */}
            <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-gray-400 px-4">
              <span>
                Showing {letters.length} / {totalRecords} Records
              </span>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className={`px-3 py-1 rounded transition-all ${currentPage === 1 ? "opacity-30 cursor-not-allowed text-gray-300" : "hover:bg-orange-500 hover:text-white pointer-events-auto cursor-pointer"}`}
                >
                  Previous
                </button>
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded flex items-center justify-center bg-orange-500 text-white shadow-lg shadow-orange-500/20">
                    {currentPage}
                  </span>
                  <span className="mx-2">of</span>
                  <span>{totalPages}</span>
                </div>
                <button
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={currentPage === totalPages}
                  className={`px-3 py-1 rounded transition-all ${currentPage === totalPages ? "opacity-30 cursor-not-allowed text-gray-300" : "hover:bg-orange-500 hover:text-white pointer-events-auto cursor-pointer"}`}
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
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300"
            onClick={() => setIsDrawerOpen(false)}
          />
          <div
            className={`w-full max-w-xl ${"bg-white dark:bg-[#141414] shadow-2xl"} h-full relative z-10 animate-in slide-in-from-right duration-500 flex flex-col`}
          >
            {/* Drawer Header */}
            <div
              className={`p-8 border-b ${"border-gray-50 dark:border-[#222]"} flex items-center justify-between`}
            >
              <div className="flex items-center gap-4">
                <button
                  onClick={() => handleViewPDF(selectedLetter)}
                  disabled={!selectedLetter?.scanned_copy && !selectedLetter?.attachment_id}
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${(selectedLetter?.scanned_copy || selectedLetter?.attachment_id)
                      ? "bg-red-50 dark:bg-red-900/10 text-red-500 hover:bg-red-500 hover:text-white shadow-lg shadow-red-500/20 cursor-pointer"
                      : "bg-gray-50 dark:bg-white/5 text-gray-300 opacity-50 cursor-not-allowed"
                    }`}
                  title="View Combined PDF"
                >
                  <FileText className="w-6 h-6" />
                </button>
                <div>
                  <h2
                    className={`text-xl font-black uppercase tracking-tight ${textColor}`}
                  >
                    Update
                  </h2>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    {selectedLetter?.lms_id || "Letter " + selectedLetter?.id}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsDrawerOpen(false)}
                className="p-2 hover:bg-gray-50 dark:hover:bg-white/5 rounded-xl transition-colors"
              >
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>

            {/* Drawer Content */}
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-8">
              <div className="space-y-6">
                {/* Core Info Card */}
                <div
                  className={`p-6 rounded-[2rem] border ${"bg-slate-50 dark:bg-white/5 border-gray-100 dark:border-[#333] shadow-inner"} space-y-6`}
                >
                  {/* Workflow Step Selection (Radio Buttons) */}
                  {canStepSelector && (
                    <div className="space-y-4">
                      <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                        <GitMerge className="w-3 h-3" /> Groups
                      </label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {steps.map((step) => {
                          const latestAssignment =
                            selectedLetter.assignments?.sort(
                              (a, b) => b.id - a.id,
                            )[0];
                          const currentStepId =
                            selectedLetter.currentStepId ||
                            latestAssignment?.step_id;
                          const isSelected = currentStepId === step.id;

                          return (
                            <label
                              key={step.id}
                              onClick={() => setValidationError("")}
                              className={`flex-1 min-w-[120px] flex items-center gap-2 p-2 rounded-xl border cursor-pointer transition-all ${isSelected ? "bg-indigo-500 text-white border-indigo-500 shadow-lg shadow-indigo-500/20" : "bg-white dark:bg-white/5 border-gray-100 dark:border-white/10 hover:border-gray-200 dark:hover:border-white/20"}`}
                            >
                              <input
                                type="radio"
                                name="process_step"
                                className="hidden"
                                checked={isSelected}
                                onChange={() => {
                                  setSelectedLetter((prev) => ({
                                    ...prev,
                                    currentStepId: step.id,
                                  }));
                                  setValidationError("");
                                }}
                              />
                              <div
                                className={`w-3 h-3 rounded-full border flex items-center justify-center ${isSelected ? "border-white" : "border-gray-300 dark:border-gray-600"}`}
                              >
                                {isSelected && (
                                  <div className="w-1.5 h-1.5 rounded-full bg-white" />
                                )}
                              </div>
                              <span
                                className={`text-[10px] font-black uppercase tracking-tight truncate`}
                              >
                                {step.step_name}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Date & Time Received Display */}
                  <div className="pt-6 border-t border-dashed border-gray-200 dark:border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white dark:bg-white/10 flex items-center justify-center text-orange-500 shadow-sm border border-orange-50 dark:border-white/5">
                        <Clock className="w-5 h-5" />
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                          Date
                        </label>
                        <p
                          className={`text-xs font-black uppercase tracking-tight ${textColor}`}
                        >
                          {new Date(
                            selectedLetter.date_received,
                          ).toLocaleDateString("en-PH", {
                            dateStyle: "long",
                            timeZone: "Asia/Manila",
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p
                        className={`text-xs font-black text-orange-500 uppercase`}
                      >
                        {new Date(
                          selectedLetter.date_received,
                        ).toLocaleTimeString("en-PH", {
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: true,
                          timeZone: "Asia/Manila",
                        })}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Detailed Fields */}
                <div className="space-y-4 pt-4 px-2">


                  {canStatusDropdown && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-orange-500">
                          Status
                        </label>
                        <div className="flex items-center gap-2">
                          {canEndorse && (
                            <button
                              type="button"
                              onClick={() => {
                                // Quick action to set for ATG Dashboard
                                setSelectedLetter((prev) => ({
                                  ...prev,
                                  tray_id: null,
                                  global_status: 2,
                                }));
                              }}
                              className="text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-900/10 text-indigo-500 border border-indigo-100 dark:border-indigo-900/30 hover:bg-indigo-500 hover:text-white transition-all shadow-sm"
                            >
                              To Dashboard
                            </button>
                          )}
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
                          setSelectedLetter((prev) => ({
                            ...prev,
                            global_status:
                              e.target.value === "" ? null : newStatusId,
                          }));
                          setValidationError("");
                        }}
                        style={{ backgroundColor: "white", color: "black" }}
                        className="w-full px-4 py-3 rounded-xl border text-sm font-bold outline-none focus:ring-2 focus:ring-orange-500/20 shadow-sm"
                      >
                        <option
                          value=""
                          style={{ color: "black", backgroundColor: "white" }}
                        >
                          -- Status --
                        </option>
                        {statuses
                          .filter(
                            (s) => s.status_name?.toLowerCase() !== "done",
                          )
                          .filter(
                            (s) =>
                              !s.dept_id ||
                              Number(s.dept_id) ===
                              Number(
                                selectedLetter?.dept_id?.id ??
                                selectedLetter?.dept_id,
                              ),
                          )
                          .map((s) => {
                            const dept = departments.find(
                              (d) => Number(d.id) === Number(s.dept_id),
                            );
                            const label = dept
                              ? `${dept.dept_code}: ${s.status_name}`
                              : s.status_name;
                            return (
                              <option
                                key={s.id}
                                value={s.id}
                                style={{
                                  color: "black",
                                  backgroundColor: "white",
                                }}
                              >
                                {label}
                              </option>
                            );
                          })}
                      </select>
                    </div>
                  )}
                  
                  {/* Resolved Checkbox */}
                  <div className="pt-2">
                    <label className="flex items-center gap-3 p-3 rounded-xl border-2 transition-all cursor-pointer group bg-emerald-50 border-transparent dark:bg-emerald-900/5 hover:border-emerald-500/50">
                      <input
                        type="checkbox"
                        checked={selectedLetter.is_resolved || false}
                        onChange={(e) =>
                          setSelectedLetter({
                            ...selectedLetter,
                            is_resolved: e.target.checked,
                          })
                        }
                        className="w-4 h-4 text-emerald-500 focus:ring-emerald-500 border-gray-300 rounded"
                      />
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black uppercase tracking-tight text-emerald-700 dark:text-emerald-400">
                          Resolved / Done
                        </span>
                        <span className="text-[8px] font-bold text-emerald-600/60 uppercase tracking-widest">
                          Mark letter as completed
                        </span>
                      </div>
                    </label>
                  </div>

                  {/* Kind Dropdown */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      Kind
                    </label>
                    <select
                      value={selectedLetter.kind || ""}
                      onChange={(e) =>
                        setSelectedLetter({
                          ...selectedLetter,
                          kind:
                            e.target.value === ""
                              ? null
                              : parseInt(e.target.value),
                        })
                      }
                      style={{ backgroundColor: "white", color: "black" }}
                      className="w-full px-4 py-3 rounded-xl border text-sm font-bold outline-none focus:ring-2 focus:ring-orange-500/20 shadow-sm"
                    >
                      <option
                        value=""
                        style={{ color: "black", backgroundColor: "white" }}
                      >
                        -- Kind --
                      </option>
                      {letterKinds.map((k) => (
                        <option
                          key={k.id}
                          value={k.id}
                          style={{ color: "black", backgroundColor: "white" }}
                        >
                          {k.kind_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      Sender
                    </label>
                    <input
                      type="text"
                      className={`w-full px-4 py-3 rounded-xl border text-sm font-bold ${"bg-slate-50 dark:bg-[#1a1a1a] border-gray-100 dark:border-[#333] text-slate-900 dark:text-white"}`}
                      value={selectedLetter.sender || ""}
                      onChange={(e) =>
                        setSelectedLetter({
                          ...selectedLetter,
                          sender: e.target.value,
                        })
                      }
                    />
                  </div>

                  {/* Assign This Letter To (Endorsement) */}
                  {canEndorse && (
                    <div
                      className="space-y-1 p-4 rounded-2xl bg-orange-50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-900/20"
                      ref={endorseRef}
                    >
                      <label className="text-[10px] font-black text-orange-500 uppercase tracking-widest flex items-center gap-1.5">
                        <Send className="w-3 h-3" /> Endorse
                      </label>
                      <p className="text-[9px] text-orange-400/80 font-medium mb-2">
                        Search person.
                      </p>
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Type name to search..."
                          value={selectedLetter.endorse_to || ""}
                          onChange={(e) => {
                            setSelectedLetter({
                              ...selectedLetter,
                              endorse_to: e.target.value,
                            });
                            fetchEndorseSuggestions(e.target.value);
                          }}
                          onKeyDown={handleEndorseKeyDown}
                          onFocus={() => {
                            if (selectedLetter.endorse_to?.length >= 2) fetchEndorseSuggestions(selectedLetter.endorse_to);
                          }}
                          className="w-full px-4 py-3 rounded-xl border text-sm font-bold outline-none focus:ring-2 focus:ring-orange-400/30 bg-white border-orange-100 text-gray-900 shadow-sm"
                        />
                        {showEndorseSuggestions &&
                          endorseSuggestions.length > 0 && (
                            <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white dark:bg-[#141414] border border-gray-100 dark:border-[#333] rounded-xl shadow-xl overflow-hidden max-h-40 overflow-y-auto">
                              {endorseSuggestions.map((p, idx) => (
                                <button
                                  key={p.id}
                                  type="button"
                                  onClick={() => {
                                    setSelectedLetter({
                                      ...selectedLetter,
                                      endorse_to: p.name,
                                    });
                                    setShowEndorseSuggestions(false);
                                  }}
                                  onMouseEnter={() => setHighlightedEndorseIndex(idx)}
                                  className={`w-full text-left px-4 py-2.5 text-sm font-bold transition-colors ${idx === highlightedEndorseIndex ? "bg-orange-50 text-orange-600 dark:bg-orange-900/10" : "text-gray-900 dark:text-white hover:bg-orange-50 dark:hover:bg-orange-900/10"}`}
                                >
                                  {p.name}
                                </button>
                              ))}
                            </div>
                          )}
                      </div>

                      {/* Endorsement History */}
                      {(selectedLetter.endorsements || []).length > 0 && (
                        <div className="mt-4 pt-4 border-t border-orange-100/50 dark:border-orange-900/20">
                          <p className="text-[9px] font-black uppercase tracking-widest text-orange-400 mb-2">Previous Endorsers:</p>
                          <div className="flex flex-wrap gap-2">
                            {(selectedLetter.endorsements || [])
                              .slice()
                              .sort((a, b) => b.id - a.id)
                              .map((e, idx) => (
                                <div
                                  key={e.id}
                                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-bold ${idx === 0 ? "bg-orange-500 text-white border-orange-500 shadow-sm" : "bg-white dark:bg-white/5 border-orange-100 dark:border-orange-900/20 text-orange-600 dark:text-orange-400"}`}
                                >
                                  <span>{e.endorsed_to}</span>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteEndorsement(e.id)}
                                    className={`p-0.5 rounded-md transition-colors ${idx === 0 ? "hover:bg-white/20 text-white" : "hover:bg-orange-50 text-orange-400"}`}
                                    title="Delete Endorsement"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      Summary
                    </label>
                    <textarea
                      rows="4"
                      className={`w-full px-4 py-3 rounded-xl border text-sm font-bold resize-none ${"bg-slate-50 dark:bg-[#1a1a1a] border-gray-100 dark:border-[#333] text-slate-900 dark:text-white"}`}
                      value={selectedLetter.summary || ""}
                      onChange={(e) =>
                        setSelectedLetter({
                          ...selectedLetter,
                          summary: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      Security
                    </label>
                    <select
                      value={selectedLetter.letter_type || "Non-Confidential"}
                      onChange={(e) =>
                        setSelectedLetter({
                          ...selectedLetter,
                          letter_type: e.target.value,
                        })
                      }
                      className={`w-full px-4 py-3 rounded-xl border text-sm font-bold outline-none focus:ring-2 focus:ring-orange-500/20 ${"bg-slate-50 dark:bg-[#1a1a1a] border-gray-100 dark:border-[#333] text-slate-900 dark:text-white"}`}
                    >
                      <option value="Confidential">Confidential</option>
                      <option value="Non-Confidential">Non-Confidential</option>
                    </select>
                  </div>

                  <div className="pt-4 border-t border-dashed border-gray-100 dark:border-[#222] space-y-4">
                    <label className="flex items-center gap-3 p-3 rounded-xl border-2 transition-all cursor-pointer group bg-gray-50 border-transparent dark:bg-[#1a1a1a] hover:border-orange-500/50">
                      <input
                        type="checkbox"
                        checked={selectedLetter.is_hidden || false}
                        onChange={(e) =>
                          setSelectedLetter({
                            ...selectedLetter,
                            is_hidden: e.target.checked,
                          })
                        }
                        className="w-4 h-4 text-orange-500 focus:ring-orange-500 border-gray-300 rounded"
                      />
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black uppercase tracking-tight text-gray-700 dark:text-gray-300">
                          Hidden Letter
                        </span>
                        <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">
                          Restricted visibility
                        </span>
                      </div>
                    </label>

                    <div className={`space-y-1 transition-all duration-300 ${!selectedLetter.is_hidden ? "opacity-50" : "opacity-100"}`}>
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                        Authorized Users
                      </label>
                      <div className="relative" ref={authorizedRef}>
                        <input
                          type="text"
                          disabled={!selectedLetter.is_hidden}
                          placeholder={selectedLetter.is_hidden ? "Search users to authorize..." : "Check 'Hidden Letter' to assign viewers"}
                          value={selectedLetter.authorized_users || ""}
                          onChange={(e) => {
                            setSelectedLetter({
                              ...selectedLetter,
                              authorized_users: e.target.value,
                            });
                            const parts = e.target.value.split(";");
                            const lastPart = parts[parts.length - 1].trim();
                            fetchAuthorizedSuggestions(lastPart);
                          }}
                          onKeyDown={handleAuthorizedKeyDown}
                          onFocus={() => {
                            if (authorizedSuggestions.length > 0)
                              setShowAuthorizedSuggestions(true);
                          }}
                          className="w-full px-4 py-3 rounded-xl border text-sm font-bold outline-none border-gray-100 dark:border-[#333] bg-slate-50 dark:bg-[#1a1a1a] text-slate-900 dark:text-white focus:ring-2 focus:ring-orange-500"
                        />
                        {showAuthorizedSuggestions && (
                          <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white dark:bg-[#141414] border border-gray-100 dark:border-[#333] rounded-xl shadow-xl overflow-hidden max-h-40 overflow-y-auto">
                            {authorizedSuggestions.map((person, idx) => (
                              <div
                                key={person.id}
                                onClick={() =>
                                  selectAuthorizedSuggestion(person.name)
                                }
                                className={`px-4 py-3 text-xs font-bold uppercase tracking-wider cursor-pointer border-b last:border-0 border-gray-50 dark:border-white/5 flex items-center gap-3 ${idx === highlightedAuthIndex ? "bg-orange-50 dark:bg-orange-900/10 text-orange-600" : "text-gray-900 dark:text-white"}`}
                              >
                                <span>{person.name}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      VEM Number
                    </label>
                    <input
                      type="text"
                      className={`w-full px-4 py-3 rounded-xl border text-sm font-bold ${"bg-slate-50 dark:bg-[#1a1a1a] border-gray-100 dark:border-[#333] text-slate-900 dark:text-white"}`}
                      value={selectedLetter.vemcode || ""}
                      onChange={(e) =>
                        setSelectedLetter({
                          ...selectedLetter,
                          vemcode: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      AEVM Number
                    </label>
                    <input
                      type="text"
                      className={`w-full px-4 py-3 rounded-xl border text-sm font-bold ${"bg-slate-50 dark:bg-[#1a1a1a] border-gray-100 dark:border-[#333] text-slate-900 dark:text-white"}`}
                      value={selectedLetter.aevm_number || ""}
                      onChange={(e) =>
                        setSelectedLetter({
                          ...selectedLetter,
                          aevm_number: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-indigo-500 uppercase tracking-wides">
                      EVM Marginal Note
                    </label>
                    <input
                      type="text"
                      className={`w-full px-4 py-3 rounded-xl border text-sm font-bold ${"bg-slate-50 dark:bg-[#1a1a1a] border-gray-100 dark:border-[#333] text-slate-900 dark:text-white"}`}
                      value={selectedLetter.evemnote || ""}
                      onChange={(e) =>
                        setSelectedLetter({
                          ...selectedLetter,
                          evemnote: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-indigo-500 uppercase tracking-wides">
                      AEVM Marginal Note
                    </label>
                    <textarea
                      rows="2"
                      className={`w-full px-4 py-3 rounded-xl border text-sm font-bold resize-none ${"bg-slate-50 dark:bg-[#1a1a1a] border-gray-100 dark:border-[#333] text-slate-900 dark:text-white"}`}
                      value={selectedLetter.aevmnote || ""}
                      onChange={(e) =>
                        setSelectedLetter({
                          ...selectedLetter,
                          aevmnote: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">
                      ATG Marginal Note
                    </label>
                    <textarea
                      rows="3"
                      className={`w-full px-4 py-3 rounded-xl border text-sm font-bold resize-none ${"bg-indigo-50 dark:bg-indigo-900/5 border-indigo-100 dark:border-indigo-900/20 text-slate-900 dark:text-white"}`}
                      value={selectedLetter.atgnote || ""}
                      onChange={(e) =>
                        setSelectedLetter({
                          ...selectedLetter,
                          atgnote: e.target.value,
                        })
                      }
                    />
                  </div>

                  {/* Attachment Section */}
                  {canAttachmentUpload && (
                    <div className="space-y-4 pt-4 px-2">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                          <Paperclip className="w-3 h-3" /> Digital Attachment
                        </label>

                        {/* Combine Checkbox */}
                        {(selectedLetter.attachment_id || selectedLetter.scanned_copy) && (
                          <label className="flex items-center gap-2 cursor-pointer bg-indigo-50 dark:bg-indigo-900/20 px-3 py-1.5 rounded-lg border border-indigo-100 dark:border-indigo-900/30 transition-all hover:bg-indigo-100 dark:hover:bg-indigo-900/40">
                            <input
                              type="checkbox"
                              checked={isCombining}
                              onChange={(e) => setIsCombining(e.target.checked)}
                              className="w-3.5 h-3.5 text-indigo-500 rounded border-gray-300 focus:ring-indigo-500"
                            />
                            <span className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
                              Combine PDF
                            </span>
                          </label>
                        )}
                      </div>

                      <div
                        className={`p-6 rounded-[2rem] border-2 border-dashed transition-all ${isDragging ? "border-orange-500 bg-orange-500/10 scale-[1.02]" : newFile ? "border-orange-500 bg-orange-500/5" : "border-gray-200 dark:border-[#222] hover:border-orange-500/50"} flex flex-col items-center justify-center gap-4 group relative`}
                        onDragOver={(e) => {
                          e.preventDefault();
                          setIsDragging(true);
                        }}
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
                        <div
                          className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${newFile ? "bg-orange-500 text-white shadow-xl shadow-orange-500/20" : "bg-gray-100 dark:bg-white/5 text-gray-400 group-hover:scale-110"}`}
                        >
                          <Upload className="w-7 h-7" />
                        </div>
                        <div className="text-center">
                          <p
                            className={`text-xs font-black uppercase tracking-tight ${textColor}`}
                          >
                            {newFile ? newFile.name : (isCombining ? "Select PDF to Merge" : "Select PDF to Replace")}
                          </p>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                            {newFile
                              ? (newFile.size / 1024 / 1024).toFixed(2) + " MB"
                              : "Drag or click to upload document"}
                          </p>
                        </div>
                      </div>

                      {/* Uploaded Files List */}
                      {(selectedLetter.scanned_copy || selectedLetter.attachment_id) && (
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 block">
                            Uploaded Files
                          </label>

                          {/* Primary File (Scanned Copy) */}
                          {selectedLetter.scanned_copy && (
                            <div className={`p-4 rounded-2xl border ${"bg-blue-50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/20"} flex items-center justify-between`}>
                              <div className="flex items-center gap-3 truncate pr-4">
                                <div className="w-10 h-10 shrink-0 rounded-xl bg-blue-500 text-white flex items-center justify-center shadow-lg shadow-blue-500/20">
                                  <FileText className="w-5 h-5" />
                                </div>
                                <div className="truncate">
                                  <div className="flex items-center gap-2">
                                    <p className={`text-xs font-black uppercase tracking-tight truncate ${textColor}`}>
                                      {selectedLetter.scanned_copy.split(/[\\/]/).pop()}
                                    </p>
                                    <span className="text-[8px] font-bold text-blue-500 bg-blue-100 dark:bg-blue-900/30 px-1.5 py-0.5 rounded uppercase tracking-widest shrink-0">
                                      Primary
                                    </span>
                                  </div>
                                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest truncate mt-0.5">
                                    Main Letter Document
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                {canPdf && (
                                  <button
                                    onClick={(e) => { e.preventDefault(); handleViewPDF(selectedLetter); }}
                                    className="p-2.5 rounded-xl bg-white dark:bg-white/5 text-blue-500 hover:bg-blue-500 hover:text-white border border-blue-100 dark:border-white/10 transition-all shadow-sm"
                                    title="View Scan"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </button>
                                )}
                                {canDelete && (
                                  <button
                                    onClick={(e) => { e.preventDefault(); handleDeleteFile('primary', null); }}
                                    className="p-2.5 rounded-xl bg-white dark:bg-white/5 text-red-500 hover:bg-red-500 hover:text-white border border-red-100 dark:border-white/10 transition-all shadow-sm"
                                    title="Delete Primary File"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Secondary Files (Attachment ID - comma separated) */}
                          {selectedLetter.attachment_id && String(selectedLetter.attachment_id).split(',').map((id) => {
                            const aid = id.trim();
                            if (!aid) return null;
                            const att = attachments.find((a) => String(a.id) === aid);
                            return (
                              <div key={aid} className={`p-4 rounded-2xl border ${"bg-orange-50 dark:bg-orange-900/10 border-orange-100 dark:border-orange-900/20"} flex items-center justify-between`}>
                                <div className="flex items-center gap-3 truncate pr-4">
                                  <div className="w-10 h-10 shrink-0 rounded-xl bg-orange-500 text-white flex items-center justify-center shadow-lg shadow-orange-500/20">
                                    <FileText className="w-5 h-5" />
                                  </div>
                                  <div className="truncate">
                                    <div className="flex items-center gap-2">
                                      <p className={`text-xs font-black uppercase tracking-tight truncate ${textColor}`}>
                                        {att?.attachment_name || `Attachment ID: ${aid}`}
                                      </p>
                                      <span className="text-[8px] font-bold text-orange-500 bg-orange-100 dark:bg-orange-900/30 px-1.5 py-0.5 rounded uppercase tracking-widest shrink-0">
                                        Secondary
                                      </span>
                                    </div>
                                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest truncate mt-0.5">
                                      {att?.description || "Reference Content"}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  {canPdf && (
                                    <button
                                      onClick={(e) => {
                                        e.preventDefault();
                                        const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
                                        window.open(`${apiBase}/attachments/view/${aid}`, '_blank');
                                      }}
                                      className="p-2.5 rounded-xl bg-white dark:bg-white/5 text-orange-500 hover:bg-orange-500 hover:text-white border border-orange-100 dark:border-white/10 transition-all shadow-sm"
                                      title="View Secondary Document"
                                    >
                                      <Eye className="w-4 h-4" />
                                    </button>
                                  )}
                                  {canDelete && (
                                    <button
                                      onClick={(e) => { e.preventDefault(); handleDeleteFile('secondary', aid); }}
                                      className="p-2.5 rounded-xl bg-white dark:bg-white/5 text-red-500 hover:bg-red-500 hover:text-white border border-red-100 dark:border-white/10 transition-all shadow-sm"
                                      title="Delete Secondary File"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      <div className="flex flex-col gap-2 pt-2 border-t border-dashed border-gray-100 dark:border-[#222]">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                          Link Reference File
                        </label>
                        <select
                          value={selectedLetter.attachment_id || ""}
                          onChange={(e) =>
                            setSelectedLetter({
                              ...selectedLetter,
                              attachment_id:
                                e.target.value === ""
                                  ? null
                                  : parseInt(e.target.value),
                            })
                          }
                          style={{ backgroundColor: "white", color: "black" }}
                          className="w-full px-4 py-3 rounded-xl border text-sm font-bold outline-none focus:ring-2 focus:ring-orange-500/20 shadow-sm"
                        >
                          <option
                            value=""
                            style={{ color: "black", backgroundColor: "white" }}
                          >
                            -- No Reference File --
                          </option>
                          {attachments.map((att) => (
                            <option
                              key={att.id}
                              value={att.id}
                              style={{
                                color: "black",
                                backgroundColor: "white",
                              }}
                            >
                              {att.attachment_name}{" "}
                              {att.description
                                ? `- ${att.description.substring(0, 40)}`
                                : ""}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}
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
            <div
              className={`p-8 border-t ${"border-gray-50 dark:border-[#222]"} flex items-center gap-3`}
            >
              {canSave && (
                <button
                  onClick={() => handleUpdateDetails(false)}
                  disabled={loading}
                  className="flex-1 py-4 px-6 rounded-2xl bg-orange-500 text-white text-xs font-black uppercase tracking-widest shadow-xl shadow-orange-500/20 hover:bg-orange-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading && <Loader2 className="w-3 h-3 animate-spin" />}
                  Save
                </button>
              )}
              {canSave && canEndorse && (
                <button
                  onClick={() => handleSaveAndEndorse(false)}
                  disabled={loading}
                  className="flex-1 py-4 px-6 rounded-2xl bg-emerald-600 text-white text-xs font-black uppercase tracking-widest shadow-xl shadow-emerald-600/20 hover:bg-emerald-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading && <Loader2 className="w-3 h-3 animate-spin" />}
                  Save &amp; Endorse
                </button>
              )}
              {canEndorse && (
                <button
                  onClick={handleEndorseOnly}
                  disabled={loading}
                  className="flex-1 py-4 px-6 rounded-2xl bg-white dark:bg-white/5 border border-emerald-200 dark:border-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-xs font-black uppercase tracking-widest hover:bg-emerald-50 dark:hover:bg-emerald-900/10 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading && <Loader2 className="w-3 h-3 animate-spin" />}
                  Endorse
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TRACKING DRAWER - Activity Log Timeline */}
      {isTrackDrawerOpen && (
        <div className="fixed inset-0 z-[100] flex justify-start">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300"
            onClick={() => setIsTrackDrawerOpen(false)}
          />
          <div className="w-full max-w-sm bg-white dark:bg-[#141414] shadow-2xl h-full relative z-10 animate-in slide-in-from-left duration-500 flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-gray-100 dark:border-[#222] flex items-center justify-between">
              <div>
                <span className="text-lg font-black text-orange-500 uppercase tracking-tight">
                  {trackingLetter?.lms_id}
                </span>
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-0.5">
                  Activity Tracking
                </p>
              </div>
              <button
                onClick={() => setIsTrackDrawerOpen(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* Timeline Content */}
            <div className="flex-1 overflow-y-auto px-4 py-8 custom-scrollbar">
              {!trackingLetter?.logs || trackingLetter.logs.length === 0 ? (
                <p className="text-center text-gray-400 py-20 uppercase font-black tracking-widest text-[10px]">
                  No activity recorded yet.
                </p>
              ) : (
                <div className="relative">
                  {(() => {
                    // 1. Sort ASCENDING (oldest to newest) to process progression
                    const sorted = [...trackingLetter.logs].sort(
                      (a, b) =>
                        new Date(a.timestamp || a.log_date || 0) -
                        new Date(b.timestamp || b.log_date || 0),
                    );

                    // 2. Map and Filter Redundant Consecutive States
                    const uniqueSequence = [];
                    let lastStateKey = "";

                    sorted.forEach((log) => {
                      const statusComp = (log.status?.status_name || "")
                        .trim()
                        .toUpperCase();
                      const stepComp = (log.step?.step_name || "")
                        .trim()
                        .toUpperCase();
                      const actionType = (log.action_type || "")
                        .trim()
                        .toUpperCase();
                      const deptComp = (log.department?.dept_code || "")
                        .trim()
                        .toUpperCase();
                      const logDetails = log.log_details || "";

                      let displayHeading = "";
                      let displaySubheading = "";

                      // Priority Status Checks (Bypass workflow matrix)
                      const isPriority =
                        statusComp.includes("FILED") ||
                        actionType.includes("FILED") ||
                        statusComp.includes("HOLD") ||
                        actionType.includes("HOLD") ||
                        actionType.includes("ENDORSE");

                      // Strictly followed User Mapping Logic
                      if (actionType.includes("ENDORSE") || statusComp.includes("ENDORSE")) {
                        const userName = log.user ? `${log.user.first_name || ""} ${log.user.last_name || ""}`.trim() : "";
                        displayHeading = userName || "Endorsed";
                        displaySubheading = ""; // Strictly empty as requested
                      } else if (statusComp === "INCOMING" || statusComp === "PENDING") {
                        displayHeading = "Processing";
                        displaySubheading = "For Incoming";
                      } else if (statusComp.includes("REVIEW") || stepComp.includes("REVIEW")) {
                        displayHeading = "ATG Office";
                        displaySubheading = trackingLetter?.atgnote || "";
                      } else if (stepComp === "VEM LETTER" || (deptComp === "EVM" && statusComp.includes("FORWARD"))) {
                        displayHeading = "Office of the Executive Minister";
                        displaySubheading = trackingLetter?.evemnote || "";
                      } else if (stepComp === "AEVM LETTER" || stepComp === "AEVEM LETTER" || (deptComp === "AEVM" && statusComp.includes("FORWARD"))) {
                        displayHeading = "Office of the Deputy Executive Minister";
                        displaySubheading = trackingLetter?.aevmnote || "";
                      } else if (isPriority) {
                        displayHeading = log.status?.status_name || log.action_type || actionType;
                        displaySubheading = log.metadata?.location || "";
                      } else {
                        // Remove if not matching any specified step or correct it
                        displayHeading = log.department?.dept_code || log.step?.step_name || "Activity";
                        displaySubheading = ""; 
                      }

                      // Detect Duplicate State
                      const currentStateKey =
                        `${displayHeading}-${displaySubheading}`.toUpperCase();
                      if (currentStateKey !== lastStateKey || isPriority) {
                        uniqueSequence.push({
                          ...log,
                          displayHeading,
                          displaySubheading,
                        });
                        lastStateKey = currentStateKey;
                      }
                    });

                    // 3. Newest at bottom: do NOT reverse
                    return uniqueSequence.map((log, i, arr) => {
                      const logDate = new Date(log.timestamp || log.log_date);
                      const isLastItem = i === arr.length - 1;
                      const isResolved = trackingLetter?.is_resolved;

                      return (
                        <div
                          key={i}
                          className="relative grid grid-cols-[90px_auto_1fr] items-start gap-3 mb-8"
                        >
                          <div className="text-right pt-0.5">
                            <p className="text-xs font-black text-slate-800 dark:text-slate-200">
                              {logDate.toLocaleDateString("en-PH", {
                                day: "numeric",
                                month: "short",
                                timeZone: "Asia/Manila",
                              })}
                            </p>
                            <p className="text-[10px] font-medium text-gray-400">
                              {logDate.toLocaleTimeString("en-PH", {
                                hour: "2-digit",
                                minute: "2-digit",
                                hour12: false,
                                timeZone: "Asia/Manila",
                              })}
                            </p>
                          </div>

                          <div className="flex flex-col items-center">
                            <div className={`w-5 h-5 rounded-full border-2 ${isResolved && isLastItem ? "border-red-500 bg-red-500 shadow-lg shadow-red-500/30" : "border-orange-400 bg-white dark:bg-[#141414]"} z-10 flex items-center justify-center shrink-0`}>
                              {!isLastItem || !isResolved ? (
                                <div className="w-2 h-2 rounded-full bg-orange-400" />
                              ) : null}
                            </div>
                            {!isLastItem && (
                              <div className="flex flex-col items-center flex-1">
                                <div className="w-px flex-1 border-l-2 border-dashed border-gray-200 dark:border-[#333] min-h-[1.5rem]" />
                                <ChevronDown className="w-3 h-3 text-gray-300 -mt-1 mb-1" />
                              </div>
                            )}
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
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsStatusManagerOpen(false)}
          />
          <div className="relative z-10 w-full max-w-lg bg-white dark:bg-[#141414] rounded-[2rem] shadow-2xl flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-100 dark:border-[#222] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-orange-50 dark:bg-orange-900/10 flex items-center justify-center text-orange-500">
                  <Settings className="w-5 h-5" />
                </div>
                <div>
                  <h2
                    className={`text-sm font-black uppercase tracking-tight ${textColor}`}
                  >
                    Manage Statuses
                  </h2>
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                    Add, Edit or Remove
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsStatusManagerOpen(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* Form */}
            <div className="p-6 border-b border-gray-100 dark:border-[#222]">
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-3">
                {editingStatus
                  ? "Editing: " + editingStatus.status_name
                  : "Add New Status"}
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Status name..."
                  value={statusForm.status_name}
                  onChange={(e) =>
                    setStatusForm((f) => ({
                      ...f,
                      status_name: e.target.value,
                    }))
                  }
                  className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-[#333] text-sm font-bold bg-white dark:bg-[#1a1a1a] text-slate-900 dark:text-white focus:ring-2 focus:ring-orange-500/20 outline-none"
                />
                <select
                  value={statusForm.dept_id}
                  onChange={(e) =>
                    setStatusForm((f) => ({ ...f, dept_id: e.target.value }))
                  }
                  style={{ backgroundColor: "white", color: "black" }}
                  className="px-3 py-2.5 rounded-xl border border-gray-200 text-sm font-bold outline-none focus:ring-2 focus:ring-orange-500/20"
                >
                  <option value="">Global</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.dept_code || d.dept_name}
                    </option>
                  ))}
                </select>
                <button
                  onClick={
                    editingStatus ? handleUpdateStatus : handleCreateStatus
                  }
                  className="px-4 py-2.5 bg-orange-500 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/20"
                >
                  {editingStatus ? "Update" : "Add"}
                </button>
                {editingStatus && (
                  <button
                    onClick={() => {
                      setEditingStatus(null);
                      setStatusForm({ status_name: "", dept_id: "" });
                    }}
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
                <p className="text-center py-8 text-gray-400 text-[10px] font-black uppercase tracking-widest">
                  No statuses found
                </p>
              ) : (
                statuses.map((s) => {
                  const dept = departments.find(
                    (d) => Number(d.id) === Number(s.dept_id),
                  );
                  return (
                    <div
                      key={s.id}
                      className="flex items-center justify-between p-3 rounded-2xl border border-gray-100 dark:border-[#222] bg-gray-50 dark:bg-white/5 group"
                    >
                      <div>
                        <p
                          className={`text-xs font-black uppercase tracking-tight ${textColor}`}
                        >
                          {s.status_name}
                        </p>
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                          {dept ? dept.dept_code || dept.dept_name : "Global"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => {
                            setEditingStatus(s);
                            setStatusForm({
                              status_name: s.status_name,
                              dept_id: s.dept_id ? String(s.dept_id) : "",
                            });
                          }}
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
      {/* Overwrite Confirmation Modal */}
      {showOverwriteConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-[#0D0D0D] w-full max-w-md rounded-[2.5rem] shadow-2xl border border-gray-100 dark:border-white/5 overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8">
              <div className="w-16 h-16 rounded-3xl bg-orange-50 dark:bg-orange-500/10 flex items-center justify-center mx-auto mb-6">
                <AlertCircle className="w-8 h-8 text-orange-500" />
              </div>
              <h3 className={`text-xl font-black uppercase tracking-tight text-center mb-2 ${textColor}`}>
                Existing Files Detected
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center leading-relaxed mb-8">
                This record already has attached documents. Would you like to replace all existing files with the new one, or merge it into the current collection?
              </p>

              <div className="space-y-3">
                <button
                  onClick={() => {
                    if (pendingAction === 'save-endorse') handleSaveAndEndorse(true, false);
                    else handleUpdateDetails(true, false);
                  }}
                  className="w-full py-4 rounded-2xl bg-red-500 text-white font-black uppercase tracking-widest text-xs hover:bg-red-600 transition-all shadow-lg shadow-red-500/20 active:scale-[0.98]"
                >
                  Replace All Files
                </button>
                <button
                  onClick={() => {
                    if (pendingAction === 'save-endorse') handleSaveAndEndorse(true, true);
                    else handleUpdateDetails(true, true);
                  }}
                  className="w-full py-4 rounded-2xl bg-[#064e3b] text-white font-black uppercase tracking-widest text-xs hover:bg-[#064e3b]/90 transition-all shadow-lg shadow-[#064e3b]/20 active:scale-[0.98]"
                >
                  Merge with Existing
                </button>
                <button
                  onClick={() => {
                    setShowOverwriteConfirm(false);
                    setPendingAction(null);
                  }}
                  className="w-full py-4 rounded-2xl bg-gray-50 dark:bg-white/5 text-gray-500 dark:text-gray-400 font-black uppercase tracking-widest text-xs hover:bg-gray-100 dark:hover:bg-white/10 transition-all active:scale-[0.98]"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}