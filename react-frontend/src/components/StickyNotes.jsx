import React, { useState, useEffect } from 'react';
import { StickyNote, Plus, X, Loader2, Trash2, Send } from 'lucide-react';
import axios from 'axios';
import API_BASE from '../config/apiConfig';
import { useSession } from '../context/AuthContext';

export default function StickyNotes() {
    const { user, isSuperAdmin } = useSession();
    const [notes, setNotes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    const [newNote, setNewNote] = useState({ content: '', priority: 'LOW' });
    const [submitting, setSubmitting] = useState(false);

    const fetchNotes = async () => {
        try {
            const response = await axios.get(`${API_BASE}/dashboard-notes`);
            setNotes(response.data);
        } catch (err) {
            console.error("Error fetching notes:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNotes();
    }, []);

    const handleAddNote = async (e) => {
        e.preventDefault();
        if (!newNote.content.trim()) return;
        setSubmitting(true);
        try {
            await axios.post(`${API_BASE}/dashboard-notes`, {
                ...newNote,
                created_by: user.id
            });
            setNewNote({ content: '', priority: 'LOW' });
            setIsAdding(false);
            fetchNotes();
        } catch (err) {
            console.error("Error adding note:", err);
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteNote = async (id) => {
        if (!window.confirm("Delete this note?")) return;
        try {
            await axios.delete(`${API_BASE}/dashboard-notes/${id}`);
            fetchNotes();
        } catch (err) {
            console.error("Error deleting note:", err);
        }
    };

    if (loading && notes.length === 0) return null;

    const getPriorityStyles = (priority) => {
        switch (priority) {
            case 'URGENT': return 'border-l-red-500 text-red-600';
            case 'HIGH': return 'border-l-orange-500 text-orange-600';
            case 'MEDIUM': return 'border-l-amber-500 text-amber-600';
            default: return 'border-l-slate-300 text-slate-500';
        }
    };

    return (
        <div className="space-y-6 font-sans">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                        <StickyNote className="w-4 h-4 text-amber-500" />
                    </div>
                    <div>
                        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-800 dark:text-white">Notice Board</h3>
                        <div className="h-0.5 w-6 bg-amber-500/30 mt-1 rounded-full"></div>
                    </div>
                </div>
                {isSuperAdmin && (
                    <button 
                        onClick={() => setIsAdding(!isAdding)}
                        className={`p-2 rounded-xl transition-all ${isAdding ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' : 'bg-white dark:bg-white/5 text-amber-500 border border-amber-100 dark:border-white/10 hover:scale-105 shadow-sm'}`}
                    >
                        {isAdding ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    </button>
                )}
            </div>

            {isAdding && (
                <div className="p-5 bg-white dark:bg-[#141414] rounded-3xl border border-amber-100 dark:border-white/5 shadow-2xl animate-in slide-in-from-top-2 duration-300">
                    <form onSubmit={handleAddNote} className="space-y-4">
                        <textarea 
                            autoFocus
                            placeholder="Type a message for everyone..."
                            className="w-full bg-slate-50 dark:bg-white/10 border-none rounded-2xl p-4 text-sm focus:ring-2 focus:ring-amber-500/20 outline-none resize-none h-28 text-slate-800 dark:text-white placeholder:text-slate-400"
                            value={newNote.content}
                            onChange={e => setNewNote({...newNote, content: e.target.value})}
                        />
                        <div className="flex items-center justify-between gap-4">
                            <select 
                                className="bg-slate-50 dark:bg-white/10 text-[10px] font-black uppercase tracking-widest rounded-xl px-4 py-2 border-none outline-none focus:ring-2 focus:ring-amber-500/20 text-slate-700 dark:text-slate-300"
                                value={newNote.priority}
                                onChange={e => setNewNote({...newNote, priority: e.target.value})}
                            >
                                <option value="LOW">Low Priority</option>
                                <option value="MEDIUM">Medium</option>
                                <option value="HIGH">High Priority</option>
                                <option value="URGENT">Urgent Alert</option>
                            </select>
                            <button 
                                disabled={submitting || !newNote.content.trim()}
                                className="flex items-center gap-2 px-6 py-2 bg-amber-500 text-white text-[10px] font-black rounded-xl uppercase tracking-widest hover:bg-amber-600 disabled:opacity-50 transition-all shadow-lg shadow-amber-500/20"
                            >
                                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                Post
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="space-y-4">
                {notes.length === 0 && !isAdding ? (
                    <div className="py-12 border-2 border-dashed border-slate-100 dark:border-white/5 rounded-[2rem] flex flex-col items-center justify-center opacity-40">
                        <StickyNote className="w-10 h-10 text-slate-200 dark:text-slate-700 mb-3" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">No active notices</span>
                    </div>
                ) : (
                    notes.map(note => (
                        <div 
                            key={note.id} 
                            className={`p-5 bg-white dark:bg-[#141414] rounded-2xl border border-slate-100 dark:border-white/5 border-l-4 ${getPriorityStyles(note.priority)} relative group transition-all hover:shadow-lg hover:translate-x-1`}
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2.5">
                                        <span className="text-[9px] font-black uppercase tracking-[0.25em] opacity-80">{note.priority} NOTICE</span>
                                    </div>
                                    <p className="text-sm font-medium text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                                        {note.content}
                                    </p>
                                    <div className="flex items-center gap-2 mt-4 opacity-50">
                                        <div className="w-1 h-1 rounded-full bg-slate-300"></div>
                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                            {new Date(note.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} at {new Date(note.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                </div>
                                {isSuperAdmin && (
                                    <button 
                                        onClick={() => handleDeleteNote(note.id)}
                                        className="p-2 text-slate-200 hover:text-red-500 dark:text-slate-800 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all rounded-lg hover:bg-red-50 dark:hover:bg-red-900/10"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
