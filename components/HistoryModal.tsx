import React from 'react';
import { HistoryItem } from '../types';
import { Trash2, X, Clock, FileText } from 'lucide-react';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  history: HistoryItem[];
  onLoad: (item: HistoryItem) => void;
  onDelete: (id: string) => void;
}

const HistoryModal: React.FC<HistoryModalProps> = ({ isOpen, onClose, history, onLoad, onDelete }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-xl shadow-2xl flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Clock className="text-indigo-400" size={24} />
            <h2 className="text-xl font-bold text-white">Generation History</h2>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors p-1"
          >
            <X size={24} />
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
          {history.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Clock size={48} className="mx-auto mb-4 opacity-20" />
              <p>No history found.</p>
              <p className="text-sm">Generate some subtitles to see them here.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((item) => (
                <div 
                  key={item.id} 
                  className="bg-slate-950 border border-slate-800 rounded-lg p-4 flex items-center justify-between hover:border-indigo-500/50 transition-colors group"
                >
                  <div className="flex items-center gap-4 overflow-hidden">
                    <div className="p-2 bg-slate-900 rounded-md">
                        <FileText size={20} className="text-indigo-400" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-medium text-slate-200 truncate">{item.fileName}</h3>
                      <p className="text-xs text-slate-500">
                        {new Date(item.timestamp).toLocaleDateString()} at {new Date(item.timestamp).toLocaleTimeString()} • {item.subtitles.length} lines
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => { onLoad(item); onClose(); }}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-md transition-colors"
                    >
                      Load
                    </button>
                    <button
                      onClick={() => onDelete(item.id)}
                      className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-900/10 rounded-md transition-colors"
                      title="Delete from history"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950/50 border-t border-slate-800 rounded-b-xl text-xs text-center text-slate-500">
          History is saved in your browser's local storage.
        </div>
      </div>
    </div>
  );
};

export default HistoryModal;
