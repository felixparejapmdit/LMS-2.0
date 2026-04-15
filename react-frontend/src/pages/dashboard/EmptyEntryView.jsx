
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { 
  FileEdit, 
  MinusCircle, 
  FileText, 
  Clock, 
  Loader2,
  AlertCircle
} from "lucide-react";

export default function EmptyEntryView({ assignments, onRefresh, user }) {
  const navigate = useNavigate();
  const [count, setCount] = useState("1");
  const [adding, setAdding] = useState(false);

  const handleAddEntries = async () => {
    const num = parseInt(count);
    if (isNaN(num) || num <= 0) return;

    setAdding(true);
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      await axios.post(`${API_URL}/letters/bulk-create-empty`, {
        count: num,
        encoder_id: user?.id,
        dept_id: user?.dept_id?.id || user?.dept_id
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
          onClick={handleAddEntries}
          disabled={adding}
          className="px-8 py-2.5 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white text-[11px] font-black rounded-xl uppercase tracking-widest shadow-sm hover:shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
        >
          {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add'}
        </button>
      </div>

      {/* Table Content */}
      <div className="bg-white dark:bg-[#141414] border border-[#E5E5E5] dark:border-[#222] rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#E0F2F1]/50 dark:bg-teal-900/10 border-b border-[#E5E5E5] dark:border-[#222]">
                <th className="px-6 py-4 w-16"></th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[#737373] text-center">Edit/Delete</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[#737373]">Date & Time</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[#737373]">ATG ID</th>
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
    </div>
  );
}
