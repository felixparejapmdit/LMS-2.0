import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Dashboard from '../dashboard/Dashboard';
import { ChevronLeft } from 'lucide-react';

export default function DepartmentLetters() {
    const { deptId } = useParams();
    const navigate = useNavigate();

    return (
        <div className="relative">
            {/* Back Button for Admins */}
            <button
                onClick={() => navigate('/setup/departments')}
                className="fixed top-20 left-72 z-[60] hidden xl:flex items-center gap-2 px-4 py-2 bg-white dark:bg-[#1a1a1a] border border-gray-100 dark:border-[#333] rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-emerald-500 shadow-sm transition-all animate-in slide-in-from-left-4"
            >
                <ChevronLeft className="w-3 h-3" /> Back to Departments
            </button>
            <Dashboard view="inbox" forcedDeptId={deptId} />
        </div>
    );
}
