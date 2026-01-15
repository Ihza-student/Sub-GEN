import React, { memo, useRef } from 'react';
import { SubtitleChunk } from '../types';
import { Trash2, PlayCircle, Italic, Bold, Split } from 'lucide-react';
import { timeStringToSeconds } from '../utils/timeUtils';

interface SubtitleItemProps {
  chunk: SubtitleChunk;
  isActive: boolean;
  onUpdate: (id: number, field: keyof SubtitleChunk, value: string) => void;
  onDelete: (id: number) => void;
  onSeek: (time: number) => void;
  onSplit: (id: number, cursorPosition: number) => void;
}

const SubtitleItem: React.FC<SubtitleItemProps> = ({ chunk, isActive, onUpdate, onDelete, onSeek, onSplit }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleFormat = (tag: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = chunk.text;

    if (start === end) return; // No selection

    const before = text.substring(0, start);
    const selected = text.substring(start, end);
    const after = text.substring(end);

    const newText = `${before}<${tag}>${selected}</${tag}>${after}`;
    
    // Update text
    onUpdate(chunk.id, 'text', newText);

    // Restore selection
    setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start, end + tag.length * 2 + 5); 
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const cursorPosition = e.currentTarget.selectionStart;
      onSplit(chunk.id, cursorPosition);
    }
  };

  return (
    <div 
      className={`group flex items-start gap-4 p-4 border-b border-slate-800 transition-colors ${
        isActive ? 'bg-indigo-900/20 border-indigo-500/50' : 'hover:bg-slate-900'
      }`}
    >
      <div className="flex flex-col gap-2 min-w-[140px]">
        {/* Time Inputs */}
        <div className="flex items-center gap-2">
            <div className="relative">
                <input
                    type="text"
                    value={chunk.startTime}
                    onChange={(e) => onUpdate(chunk.id, 'startTime', e.target.value)}
                    className="w-28 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs font-mono text-indigo-300 focus:outline-none focus:border-indigo-500 text-center"
                    placeholder="00:00:00,000"
                />
            </div>
        </div>
        <div className="flex items-center gap-2">
             <div className="relative">
                <input
                    type="text"
                    value={chunk.endTime}
                    onChange={(e) => onUpdate(chunk.id, 'endTime', e.target.value)}
                    className="w-28 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs font-mono text-slate-400 focus:outline-none focus:border-indigo-500 text-center"
                    placeholder="00:00:00,000"
                />
            </div>
        </div>
        
        <button 
          onClick={() => onSeek(timeStringToSeconds(chunk.startTime))}
          className="flex items-center justify-center gap-1 mt-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
        >
          <PlayCircle size={14} />
          <span>Play Segment</span>
        </button>
      </div>

      {/* Editor Area */}
      <div className="flex-1 flex flex-col gap-2">
        {/* Toolbar */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
            <button 
                onClick={() => handleFormat('i')}
                className="p-1 hover:bg-slate-800 text-slate-400 hover:text-indigo-400 rounded transition-colors"
                title="Italic (Ctrl+I)"
            >
                <Italic size={14} />
            </button>
            <button 
                onClick={() => handleFormat('b')}
                className="p-1 hover:bg-slate-800 text-slate-400 hover:text-indigo-400 rounded transition-colors"
                title="Bold (Ctrl+B)"
            >
                <Bold size={14} />
            </button>
            <div className="ml-auto text-[10px] text-slate-600 font-mono">
                Press Enter to split
            </div>
        </div>

        <textarea
            ref={textareaRef}
            value={chunk.text}
            onChange={(e) => onUpdate(chunk.id, 'text', e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full bg-transparent border border-transparent hover:border-slate-700 focus:border-indigo-500 rounded p-2 text-slate-200 resize-none outline-none min-h-[60px] leading-relaxed transition-all"
            placeholder="Subtitle text..."
        />
      </div>

      {/* Actions */}
      <button 
        onClick={() => onDelete(chunk.id)}
        className="p-2 text-slate-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
        title="Delete subtitle"
      >
        <Trash2 size={18} />
      </button>
    </div>
  );
};

export default memo(SubtitleItem);
