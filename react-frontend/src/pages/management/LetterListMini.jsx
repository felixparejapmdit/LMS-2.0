import React, { useEffect, useState } from "react";
import axios from "axios";
import { Loader2, FileText, ChevronRight, Inbox } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function LetterListMini({ deptId }) {
  const { user } = useAuth();
  const [letters, setLetters] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLetters = async () => {
      setLoading(true);
      try {
        const userRole = user?.role?.name || user?.role || "";
        const userId = user?.id || "";

        // Fetch letters for this specific department
        const response = await axios.get(
          `${import.meta.env.VITE_API_URL || "http://localhost:5000/api"}/letters?dept_id=${deptId}&limit=5&role=${userRole}&user_id=${userId}`,
        );
        setLetters(response.data.data || []);
      } catch (error) {
        console.error("Failed to fetch mini letters:", error);
      } finally {
        setLoading(false);
      }
    };

    if (deptId && user) fetchLetters();
  }, [deptId, user]);

  if (loading)
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="w-5 h-5 text-emerald-500 animate-spin" />
      </div>
    );

  if (letters.length === 0)
    return (
      <div className="py-10 text-center flex flex-col items-center gap-2">
        <Inbox className="w-8 h-8 text-slate-200 dark:text-slate-800" />
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
          No active letters in this unit
        </p>
      </div>
    );

  return (
    <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
      <div className="flex items-center justify-between px-2 mb-4 border-b border-gray-100 dark:border-white/5 pb-2">
        <span className="text-[9px] font-black uppercase tracking-widest text-emerald-500">
          Assigned Correspondence
        </span>
        <Link
          to={`/departments/${deptId}/letters`}
          className="text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-emerald-500 transition-colors flex items-center gap-1"
        >
          Deep Dive <ChevronRight className="w-2 h-2" />
        </Link>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-50 dark:border-white/5 bg-slate-50/50 dark:bg-black/20">
        <table className="w-full text-left">
          <thead className="bg-slate-100 dark:bg-white/5 border-b border-gray-50 dark:border-white/5">
            <tr>
              <th className="px-4 py-2 text-[8px] font-black uppercase tracking-widest text-slate-500">
                LMS ID
              </th>
              <th className="px-4 py-2 text-[8px] font-black uppercase tracking-widest text-slate-500">
                Sender
              </th>
              <th className="px-4 py-2 text-[8px] font-black uppercase tracking-widest text-slate-500 text-right">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-white/5">
            {letters.map((letter) => (
              <tr
                key={letter.id}
                className="hover:bg-white dark:hover:bg-white/5 transition-colors group"
              >
                <td className="px-4 py-2 text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-tighter">
                  {letter.lms_id}
                </td>
                <td className="px-4 py-2 text-[10px] font-bold text-slate-500 dark:text-slate-400 truncate max-w-[120px]">
                  {letter.sender}
                </td>
                <td className="px-4 py-2 text-right">
                  <Link
                    to={`/letter/${letter.id}`}
                    className="inline-flex items-center gap-1 text-[8px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 hover:underline"
                  >
                    Inspect <ChevronRight className="w-2 h-2" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
