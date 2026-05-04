import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import {
  FileEdit,
  MinusCircle,
  FileText,
  Clock,
  Loader2,
  AlertCircle,
  Search,
  Building2,
  X,
  CheckCircle2
} from "lucide-react";
import departmentService from "../../services/departmentService";

export default function EmptyEntryView({ assignments, onRefresh, user }) {
  const navigate = useNavigate();
  const [count, setCount] = useState("1");
  const [adding, setAdding] = useState(false);

  const [departments, setDepartments] = useState([]);
  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
  const [deptSearch, setDeptSearch] = useState("");

  useEffect(() => {
    const fetchDepts = async () => {
      try {
        const data = await departmentService.getAll();
        setDepartments(data);
      } catch (err) {
        console.error("Error fetching departments:", err);
      }
    };
    fetchDepts();
  }, []);

  const handleAddEntries = async (deptId) => {
    const num = parseInt(count);
    if (isNaN(num) || num <= 0) return;

    setAdding(true);
    setIsDeptModalOpen(false);
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      await axios.post(`${API_URL}/letters/bulk-create-empty`, {
        count: num,
        encoder_id: user?.id,
        dept_id: deptId
      });
      onRefresh();
    } catch (error) {
      console.error("Error creating entries:", error);
      alert("Failed to create entries");
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this entry?")) return;
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      await axios.delete(`${API_URL}/letters/${id}`);
      onRefresh();
    } catch (error) {
      console.error("Error deleting letter:", error);
      alert("Delete failed");
    }
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return (
      <div className="flex flex-col text-[10px] font-medium text-slate-500 uppercase">
        <span>{date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })}</span>
        <span>{date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase()}</span>
      </div>
    );
  };

  const filteredDepts = departments.filter(d =>
    (d.dept_name || "").toLowerCase().includes(deptSearch.toLowerCase()) ||
    (d.dept_code || "").toLowerCase().includes(deptSearch.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Control Bar */}
      <div className="flex items-center gap-3">
        <input
          type="number"
          min="1"
          max="50"
          value={count}
          onChange={(e) => setCount(e.target.value)}
          className="w-48 px-4 py-2 bg-white dark:bg-[#111] border border-slate-200 dark:border-[#333] rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold"
          placeholder="Number of entries"
        />
        <button
          onClick={() => setIsDeptModalOpen(true)}
          disabled={adding}
          className="px-8 py-2.5 bg-blue-600 border border-blue-700 text-white text-[11px] font-black rounded-xl uppercase tracking-widest shadow-sm hover:shadow-md hover:bg-blue-700 transition-all flex items-center gap-2 disabled:opacity-50"
        >
          {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add'}
        </button>
      </div>

      {/* Table Content */}
      <div className="bg-white dark:bg-[#141414] border border-[#E5E5E5] dark:border-[#222] rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-white/5 border-b border-[#E5E5E5] dark:border-[#222]">
                <th className="px-6 py-4 w-16"></th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[#737373] text-center">Edit/Delete</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[#737373]">Date & Time</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[#737373]">Reference Code</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[#737373]">Sender</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[#737373]">Letter Summary</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[#737373] text-center">File</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#222]">
              {assignments.map((a) => {
                const letter = a.letter || {};
                return (
                  <tr key={a.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors group">
                    <th className="px-6 py-4 text-center">
                      <div className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" defaultChecked />
                        <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-[#333] peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:after:border-gray-600 peer-checked:bg-blue-600"></div>
                      </div>
                    </th>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <Link
                          to={`/new-letter?ref_code=${letter.lms_id}`}
                          className="p-2 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-blue-500 hover:text-white hover:bg-blue-500 transition-all shadow-sm"
                        >
                          <FileEdit className="w-3.5 h-3.5" />
                        </Link>
                        <button
                          onClick={() => handleDelete(letter.id)}
                          className="p-2 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-red-500 hover:text-white hover:bg-red-500 transition-all shadow-sm"
                        >
                          <MinusCircle className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {formatDateTime(letter.created_at || letter.date_received)}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[11px] font-black text-[#1A1A1B] dark:text-white tracking-tight">{letter.lms_id}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[11px] text-slate-500">{letter.sender || '-'}</span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-[11px] text-slate-500 italic max-w-xs">{letter.summary || '-'}</p>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex justify-center">
                        <div className="p-2 bg-red-50 dark:bg-red-900/10 rounded-lg text-red-500 opacity-60">
                          <FileText className="w-4 h-4" />
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {assignments.length === 0 && (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-[#A3A3A3] text-[10px] font-black uppercase tracking-widest">
                    No empty entries available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Department Selection Modal */}
      {isDeptModalOpen && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-md" onClick={() => setIsDeptModalOpen(false)} />
          <div className="bg-white dark:bg-[#141414] w-full max-w-lg rounded-[2.5rem] border border-white/20 shadow-2xl relative z-10 animate-in zoom-in-95 duration-200 overflow-hidden">
            <div className="p-8">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white">Select Department</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Assign entries to a specific office</p>
                </div>
                <button onClick={() => setIsDeptModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition-all">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              <div className="relative mb-6 group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                <input
                  type="text"
                  placeholder="Find department..."
                  value={deptSearch}
                  onChange={(e) => setDeptSearch(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                  autoFocus
                />
              </div>

              <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                {filteredDepts.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 font-bold italic">No departments found</div>
                ) : (
                  filteredDepts.map(dept => (
                    <button
                      key={dept.id}
                      onClick={() => handleAddEntries(dept.id)}
                      className="w-full flex items-center justify-between p-4 rounded-2xl border border-slate-50 dark:border-white/5 bg-slate-50/50 dark:bg-white/5 hover:bg-blue-50 dark:hover:bg-blue-900/10 hover:border-blue-500/30 transition-all group"
                    >
                      <div className="flex items-center gap-4 text-left">
                        <div className="w-10 h-10 rounded-xl bg-white dark:bg-white/5 flex items-center justify-center text-slate-400 group-hover:text-blue-500 transition-all shadow-sm relative">
                          <Building2 className="w-5 h-5" />
                          {dept.activeRegistrySection && (
                            <div className="absolute -top-1 -right-1 px-1.5 py-0.5 bg-orange-500 text-white text-[8px] font-black rounded-md shadow-sm border border-white dark:border-black">
                              {dept.activeRegistrySection.section_code}
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="text-xs font-black uppercase tracking-tight text-slate-700 dark:text-slate-300 flex items-center gap-2">
                            {dept.dept_name}
                            {dept.assignedSections && dept.assignedSections.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {dept.assignedSections.map(s => (
                                  <span key={s.section_code} className={`text-[9px] font-black px-1.5 py-0.5 rounded-md border ${s.status === 'ACTIVE' ? 'text-orange-500 bg-orange-50 border-orange-100' : 'text-slate-400 bg-slate-50 border-slate-100'}`}>
                                    {s.section_code}
                                  </span>
                                ))}
                              </div>
                            )}
                          </p>
                          <p className="text-[10px] font-bold text-gray-400">{dept.dept_code}</p>
                        </div>
                      </div>
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 opacity-0 group-hover:opacity-100 transition-all" />
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
