
import React from "react";
import { Link } from "react-router-dom";
import {
  Calendar,
  ChevronRight,
  MapPin,
  Tag,
  Clock,
  AlertCircle,
  FileText,
  User,
  MoreVertical,
  Hash,
  Paperclip
} from "lucide-react";

export default function LetterCard({
  id,
  letterId,
  atgId,
  sender,
  summary,
  status,
  step,
  dueDate,
  attachment,
  tray,
  layout = "modern",
  actions = null
}) {
  const isPastDue = dueDate && new Date(dueDate) < new Date();
  const formattedDate = dueDate ? new Date(dueDate).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  }) : 'No deadline';

  if (layout === 'linear') {
    return (
      <Link
        to={`/letter/${letterId}`}
        className="flex items-center gap-6 px-4 py-3 hover:bg-[#111] transition-all group border-l-2 border-transparent hover:border-indigo-500"
      >
        <div className="flex items-center gap-3 min-w-[120px]">
          <span className="text-[10px] font-bold text-[#444] group-hover:text-indigo-400 transition-colors uppercase tracking-widest">{atgId}</span>
        </div>

        <div className="flex-1 flex items-center gap-6 min-w-0">
          <div className="flex items-center gap-2 px-2 py-0.5 bg-[#1a1a1a] border border-[#222] rounded text-[9px] font-bold text-[#666] uppercase">
            {step || 'ACTIVE'}
          </div>
          <span className="text-sm font-bold text-[#eee] truncate w-48">{sender}</span>
          <div
            className="text-xs text-[#555] truncate flex-1"
            dangerouslySetInnerHTML={{ __html: summary?.substring(0, 80) + '...' }}
          />
        </div>

        <div className="flex items-center gap-6">
          <div className={`text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 ${isPastDue ? 'text-red-500/50' : 'text-[#444]'}`}>
            <Clock className="w-3 h-3" />
            {formattedDate}
          </div>
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#444] uppercase tracking-widest min-w-[80px]">
            <MapPin className="w-3 h-3" />
            {tray?.tray_no || 'No Tray'}
          </div>
          <div className="flex items-center gap-2">
            {actions}
            <div className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${status === 'Done' ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-orange-500/10 text-orange-500 border border-orange-500/20'
              }`}>
              {status}
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-[#222] group-hover:text-[#444] transition-colors" />
        </div>
      </Link>
    );
  }

  if (layout === 'grid') {
    return (
      <Link
        to={`/letter/${letterId}`}
        className="block bg-white dark:bg-[#0D0D0D] p-6 rounded-3xl border border-slate-100 dark:border-[#222] shadow-sm hover:shadow-xl hover:shadow-blue-200/20 hover:border-blue-100 dark:hover:border-blue-900/40 transition-all group relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-600 transform -translate-x-full group-hover:translate-x-0 transition-transform"></div>
        <div className="flex items-start justify-between">
          <div className="flex gap-4">
            <div className="w-12 h-12 bg-slate-50 dark:bg-white/5 rounded-2xl flex items-center justify-center text-blue-500 group-hover:bg-blue-600 group-hover:text-white transition-all">
              <FileText className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight truncate max-w-[200px]">
                  {sender || "Unknown Sender"}
                </h3>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black px-2 py-0.5 bg-blue-50 dark:bg-blue-900/10 text-blue-600 dark:text-blue-400 rounded-full border border-blue-100 dark:border-blue-900/20 uppercase tracking-widest">
                    {status || "New"}
                  </span>
                  {actions}
                </div>
              </div>
              <div
                className="text-xs text-slate-500 dark:text-slate-400 font-medium line-clamp-1 italic"
                dangerouslySetInnerHTML={{ __html: summary?.substring(0, 100) + '...' }}
              />
              <div className="flex items-center gap-3 pt-2">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3 h-3 text-slate-300 dark:text-slate-600" />
                  <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                    {formattedDate}
                  </span>
                </div>
                <div className="w-1 h-1 bg-slate-200 dark:bg-[#333] rounded-full"></div>
                <div className="flex items-center gap-1.5">
                  <Hash className="w-3 h-3 text-slate-300 dark:text-slate-600" />
                  <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                    {atgId || 'REF-N/A'}
                  </span>
                </div>
                <div className="w-1 h-1 bg-slate-200 dark:bg-[#333] rounded-full"></div>
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3 h-3 text-slate-300 dark:text-slate-600" />
                  <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                    {tray?.tray_no || 'N/A'}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="p-2 rounded-xl bg-slate-50 dark:bg-white/5 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20 transition-colors">
            <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-blue-500 dark:group-hover:text-blue-400" />
          </div>
        </div>
      </Link>
    );
  }

  if (layout === 'notion') {
    return (
      <Link
        to={`/letter/${letterId}`}
        className="flex items-center gap-4 px-2 py-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors group"
      >
        <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center text-gray-400 group-hover:text-gray-600 transition-colors">
          <FileText className="w-4 h-4" />
        </div>

        <div className="flex-1 min-w-0 flex items-center gap-4">
          <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate w-64">
            {sender}
          </span>
          <span className="text-xs text-gray-400 dark:text-gray-500 border border-gray-100 dark:border-[#222] px-1.5 py-0.5 rounded uppercase font-bold tracking-tight">
            {atgId}
          </span>
          <div className="flex-1 min-w-0">
            <div className="text-sm text-gray-500 dark:text-gray-400 truncate" dangerouslySetInnerHTML={{ __html: summary?.substring(0, 100) + '...' }}></div>
          </div>

          <div className="flex items-center gap-4">
            {actions}
            {status === 'Pending' && (
              <div className="w-2 h-2 rounded-full bg-orange-400"></div>
            )}
            <span className="text-xs font-medium text-gray-400 w-20 text-right">
              {formattedDate}
            </span>
            <ChevronRight className="w-3 h-3 text-gray-200 dark:text-[#333] opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link
      to={`/letter/${letterId}`}
      className="block group bg-white dark:bg-[#141414] border border-gray-100 dark:border-[#222] rounded-3xl p-6 hover:border-orange-200 dark:hover:border-orange-900/40 hover:shadow-xl hover:shadow-orange-100/20 transition-all active:scale-[0.99]"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-orange-50 dark:bg-orange-900/10 rounded-2xl group-hover:bg-orange-100 dark:group-hover:bg-orange-900/20 transition-colors text-orange-600 dark:text-orange-400">
            <Tag className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[10px] font-black text-orange-500 uppercase tracking-widest">{atgId}</span>
              <span className="px-2 py-0.5 bg-slate-50 dark:bg-white/5 text-slate-500 dark:text-slate-400 text-[9px] font-bold rounded-full uppercase tracking-tight border border-slate-100 dark:border-[#222]">
                {step || 'Inbox'}
              </span>
            </div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white truncate max-sm:max-w-[200px]">{sender}</h3>
            {attachment && (
              <div className="flex items-center gap-1.5 mt-1">
                <Paperclip className="w-3 h-3 text-emerald-500" />
                <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">{attachment.attachment_name}</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {actions}
          <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${status === 'Done' ? 'bg-green-50 dark:bg-green-900/10 text-green-600 dark:text-green-400' : 'bg-orange-50 dark:bg-orange-900/10 text-orange-600 dark:text-orange-400'
            }`}>
            <div className={`w-1.5 h-1.5 rounded-full ${status === 'Done' ? 'bg-green-600' : 'bg-orange-600'}`}></div>
            {status}
          </div>
        </div>
      </div>

      <div className="mb-5">
        <div
          className="text-gray-500 dark:text-gray-400 text-xs leading-relaxed line-clamp-2"
          dangerouslySetInnerHTML={{ __html: summary }}
        />
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-gray-50 dark:border-[#222]">
        <div className="flex items-center gap-4">
          <div className={`flex items-center gap-1.5 text-[10px] font-bold uppercase ${isPastDue ? 'text-red-500' : 'text-gray-400 dark:text-gray-500'}`}>
            <Clock className="w-3 h-3" />
            {formattedDate}
          </div>
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase">
            <MapPin className="w-3 h-3" />
            {tray?.tray_no || 'No Tray'}
          </div>
        </div>

        <div className="flex items-center gap-1 text-orange-600 dark:text-orange-400 text-[10px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all translate-x-1 group-hover:translate-x-0">
          Open Case
          <ChevronRight className="w-3 h-3" strokeWidth={3} />
        </div>
      </div>
    </Link>
  );
}
