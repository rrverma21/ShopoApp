import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Minus, Plus, Trash2, StickyNote, Eraser, GripHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const FloatingNotepad = ({ isOpen, onClose }) => {
  const [notes, setNotes] = useState([]);
  const [currentNote, setCurrentNote] = useState('');
  const [isMinimized, setIsMinimized] = useState(false);
  const [size, setSize] = useState({ width: 320, height: 450 });
  const [isClearDialogOpen, setIsClearDialogOpen] = useState(false);
  
  // Persistence Keys
  const STORAGE_KEYS = {
    NOTES: 'floatingNotepadNotes',
    DRAFT: 'floatingNotepadDraft',
    POS: 'floatingNotepadPosition',
    SIZE: 'floatingNotepadSize',
    MINIMIZED: 'floatingNotepadMinimized'
  };

  // Load state from localStorage on mount
  useEffect(() => {
    try {
      const savedNotes = localStorage.getItem(STORAGE_KEYS.NOTES);
      if (savedNotes) setNotes(JSON.parse(savedNotes));

      const savedDraft = localStorage.getItem(STORAGE_KEYS.DRAFT);
      if (savedDraft) setCurrentNote(savedDraft);

      const savedSize = localStorage.getItem(STORAGE_KEYS.SIZE);
      if (savedSize) setSize(JSON.parse(savedSize));
      
      const savedMinimized = localStorage.getItem(STORAGE_KEYS.MINIMIZED);
      if (savedMinimized) setIsMinimized(JSON.parse(savedMinimized));
    } catch (e) {
      console.error("Error loading notepad state", e);
    }
  }, []);

  // Save state effects
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.NOTES, JSON.stringify(notes));
  }, [notes]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.DRAFT, currentNote);
  }, [currentNote]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.MINIMIZED, JSON.stringify(isMinimized));
  }, [isMinimized]);

  const handleAddNote = () => {
    if (!currentNote.trim()) return;
    const newNote = {
      id: Date.now(),
      text: currentNote.trim(),
      date: new Date().toISOString()
    };
    setNotes(prev => [newNote, ...prev]);
    setCurrentNote('');
  };

  const handleDeleteNote = (id) => {
    setNotes(prev => prev.filter(n => n.id !== id));
  };

  const handleClearAllClick = () => {
    setIsClearDialogOpen(true);
  };

  const confirmClearAll = () => {
    setNotes([]);
    setIsClearDialogOpen(false);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20, x: 0 }}
        animate={{ 
            opacity: 1, 
            scale: 1, 
            y: isMinimized ? 0 : 0,
            x: 0,
            height: isMinimized ? 'auto' : size.height,
            width: isMinimized ? 'auto' : size.width
        }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        drag={!isMinimized}
        dragMomentum={false}
        className={cn(
          "fixed z-[9999] bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200 dark:border-slate-700 shadow-2xl rounded-2xl overflow-hidden flex flex-col",
          isMinimized ? "bottom-24 right-20 w-auto rounded-full" : "bottom-24 right-20"
        )}
      >
        {isMinimized ? (
           <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsMinimized(false)}
              className="w-14 h-14 bg-amber-500 hover:bg-amber-600 text-white rounded-full flex items-center justify-center shadow-lg relative group"
           >
              <StickyNote className="w-6 h-6" />
              {notes.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-[10px] flex items-center justify-center border-2 border-slate-900">
                      {notes.length}
                  </span>
              )}
           </motion.button>
        ) : (
          <>
            {/* Header */}
            <div 
                className="h-10 bg-slate-100/50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-3 cursor-move select-none"
                onDoubleClick={() => setIsMinimized(true)}
            >
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                    <GripHorizontal className="w-4 h-4" />
                    <span>Notepad</span>
                </div>
                <div className="flex items-center gap-1">
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6 hover:bg-amber-100 text-amber-500" 
                        onClick={() => setIsMinimized(true)}
                        title="Minimize"
                    >
                        <Minus className="w-3 h-3" />
                    </Button>
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6 hover:bg-red-100 text-slate-400 hover:text-red-500" 
                        onClick={onClose}
                        title="Close"
                    >
                        <X className="w-3 h-3" />
                    </Button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 flex flex-col p-3 overflow-hidden h-full">
                <div className="flex gap-2 mb-3">
                    <Textarea 
                        placeholder="Type a note..." 
                        value={currentNote}
                        onChange={(e) => setCurrentNote(e.target.value)}
                        onKeyDown={(e) => {
                            if(e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleAddNote();
                            }
                        }}
                        className="min-h-[60px] resize-none bg-transparent border-slate-200 dark:border-slate-700 focus-visible:ring-1 text-sm"
                    />
                    <Button 
                        size="icon" 
                        className="h-[60px] w-[40px] shrink-0 bg-blue-600 hover:bg-blue-700 text-white"
                        onClick={handleAddNote}
                        disabled={!currentNote.trim()}
                    >
                        <Plus className="w-5 h-5" />
                    </Button>
                </div>
                
                <div className="flex items-center justify-between mb-2 px-1">
                    <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                        Saved Notes ({notes.length})
                    </span>
                    {notes.length > 0 && (
                        <button 
                            onClick={handleClearAllClick}
                            className="text-[10px] text-red-400 hover:text-red-500 flex items-center gap-1 transition-colors"
                        >
                            <Eraser className="w-3 h-3" /> Clear All
                        </button>
                    )}
                </div>

                <ScrollArea className="flex-1 -mr-2 pr-2">
                    <div className="space-y-2 pb-2">
                        <AnimatePresence mode="popLayout">
                            {notes.length === 0 && (
                                <motion.div 
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="text-center py-8 text-slate-400 text-xs italic"
                                >
                                    No notes yet. Type above to add one.
                                </motion.div>
                            )}
                            {notes.map((note) => (
                                <motion.div
                                    key={note.id}
                                    layout
                                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95, x: -10 }}
                                    className="group relative bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-100 dark:border-yellow-900/30 p-2.5 rounded-lg text-sm text-slate-700 dark:text-slate-300"
                                >
                                    <p className="whitespace-pre-wrap break-words pr-5 leading-relaxed">{note.text}</p>
                                    <span className="text-[9px] text-slate-400 mt-1 block">
                                        {new Date(note.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                    <button
                                        onClick={() => handleDeleteNote(note.id)}
                                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-red-500"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                </ScrollArea>
            </div>

            {/* Resize Handle */}
            <div 
                className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize flex items-center justify-center opacity-50 hover:opacity-100"
            >
                <div className="w-0 h-0 border-b-[6px] border-r-[6px] border-l-[6px] border-l-transparent border-t-transparent border-slate-400 rotate-45 transform translate-x-[-2px] translate-y-[-2px]" />
            </div>
          </>
        )}
      </motion.div>

      <AlertDialog open={isClearDialogOpen} onOpenChange={setIsClearDialogOpen}>
        <AlertDialogContent className="z-[10000]">
          <AlertDialogHeader>
            <AlertDialogTitle>Clear all notes?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete all your saved notes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmClearAll} className="bg-red-600 hover:bg-red-700">
              Clear All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AnimatePresence>
  );
};

export default FloatingNotepad;