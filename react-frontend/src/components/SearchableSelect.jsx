import React, { useState, useRef, useEffect } from "react";
import { Search, ChevronDown, Check, X, Building2 } from "lucide-react";

/**
 * A premium searchable select component for department/option selection.
 */
export default function SearchableSelect({ 
    options = [], 
    value, 
    onChange, 
    placeholder = "Select an option...", 
    labelKey = "dept_name", 
    valueKey = "id",
    className = "",
    icon: Icon = Building2,
    allowClear = true,
    emptyMessage = "No results found."
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [dropDirection, setDropDirection] = useState("bottom");
    const containerRef = useRef(null);
    const searchInputRef = useRef(null);

    const selectedOption = options.find(opt => String(opt[valueKey]) === String(value));

    const filteredOptions = options.filter(opt => 
        String(opt[labelKey]).toLowerCase().includes(searchTerm.toLowerCase())
    );

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        if (isOpen) {
            // Check if there is enough space below
            if (containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                const spaceBelow = window.innerHeight - rect.bottom;
                if (spaceBelow < 300) {
                    setDropDirection("top");
                } else {
                    setDropDirection("bottom");
                }
            }
            if (searchInputRef.current) searchInputRef.current.focus();
        } else {
            setSearchTerm("");
        }
    }, [isOpen]);

    const handleSelect = (opt) => {
        onChange(opt ? opt[valueKey] : "");
        setIsOpen(false);
    };

    return (
        <div className={`relative ${className}`} ref={containerRef}>
            <div 
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center justify-between px-4 py-3 rounded-xl border bg-slate-50 dark:bg-white/5 border-gray-100 dark:border-[#333] cursor-pointer transition-all hover:border-blue-500/50 ${isOpen ? 'ring-2 ring-blue-500/10 border-blue-500' : ''}`}
            >
                <div className="flex items-center gap-3 overflow-hidden">
                    {Icon && <Icon className="w-4 h-4 text-slate-400 shrink-0" />}
                    <span className={`text-sm font-bold truncate ${selectedOption ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>
                        {selectedOption ? selectedOption[labelKey] : placeholder}
                    </span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                    {allowClear && selectedOption && (
                        <div 
                            className="p-1 hover:bg-slate-200 dark:hover:bg-white/10 rounded-lg transition-colors mr-1"
                            onClick={(e) => { e.stopPropagation(); handleSelect(null); }}
                        >
                            <X className="w-3 h-3 text-slate-400" />
                        </div>
                    )}
                    <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
                </div>
            </div>

            {isOpen && (
                <div className={`absolute left-0 z-[9999] w-full bg-white dark:bg-[#141414] border border-gray-100 dark:border-[#222] rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 ${dropDirection === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'}`}>
                    <div className="p-3 border-b border-gray-100 dark:border-white/5 bg-slate-50/50 dark:bg-black/20">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                            <input 
                                ref={searchInputRef}
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search..."
                                className="w-full pl-9 pr-4 py-2 bg-white dark:bg-[#0D0D0D] border border-gray-100 dark:border-white/5 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500/20"
                            />
                        </div>
                    </div>
                    <div className="max-h-60 overflow-y-auto custom-scrollbar p-1">
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map((opt) => (
                                <div 
                                    key={opt[valueKey]}
                                    onClick={() => handleSelect(opt)}
                                    className={`flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-all ${String(opt[valueKey]) === String(value) ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-slate-50 dark:hover:bg-white/5 text-slate-600 dark:text-slate-400'}`}
                                >
                                    <span className="text-xs font-bold truncate">{opt[labelKey]}</span>
                                    {String(opt[valueKey]) === String(value) && <Check className="w-3.5 h-3.5" />}
                                </div>
                            ))
                        ) : (
                            <div className="px-3 py-6 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">
                                {emptyMessage}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
