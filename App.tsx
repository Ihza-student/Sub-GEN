import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Upload, FileAudio, Download, Play, Pause, Loader2, Sparkles, AlertCircle, Wand2 } from 'lucide-react';
import { SubtitleChunk, GenerationState } from './types';
import { transcribeAudio, autoFormatSubtitles } from './services/geminiService';
import { generateSRT, downloadSRT, timeStringToSeconds, secondsToTimeString } from './utils/timeUtils';
import SubtitleItem from './components/SubtitleItem';

const App: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [subtitles, setSubtitles] = useState<SubtitleChunk[]>([]);
  const [genState, setGenState] = useState<GenerationState>({ status: 'idle' });
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeSubtitleId, setActiveSubtitleId] = useState<number | null>(null);

  const audioRef = useRef<HTMLAudioElement>(null);

  // Clean up object URL
  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  // Sync active subtitle with audio time
  useEffect(() => {
    if (!subtitles.length) return;

    const active = subtitles.find(sub => {
      const start = timeStringToSeconds(sub.startTime);
      const end = timeStringToSeconds(sub.endTime);
      return currentTime >= start && currentTime <= end;
    });

    if (active) {
      setActiveSubtitleId(active.id);
    } else {
      setActiveSubtitleId(null);
    }
  }, [currentTime, subtitles]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      setFile(selectedFile);
      setAudioUrl(URL.createObjectURL(selectedFile));
      setSubtitles([]);
      setGenState({ status: 'idle' });
    }
  };

  const handleTranscribe = async () => {
    if (!file) return;

    setGenState({ status: 'transcribing' });
    try {
      const data = await transcribeAudio(file);
      setSubtitles(data);
      setGenState({ status: 'success' });
    } catch (error) {
      console.error(error);
      setGenState({ status: 'error', message: 'Failed to transcribe audio. Please check your API key and file format.' });
    }
  };

  const handleAutoFormat = async () => {
    if (subtitles.length === 0) return;

    setGenState({ status: 'formatting' });
    try {
        const formatted = await autoFormatSubtitles(subtitles);
        setSubtitles(formatted);
        setGenState({ status: 'success' });
    } catch (error) {
        console.error(error);
        setGenState({ status: 'error', message: 'Failed to auto-format subtitles.' });
    }
  };

  const handleUpdateSubtitle = useCallback((id: number, field: keyof SubtitleChunk, value: string) => {
    setSubtitles(prev => prev.map(sub => 
      sub.id === id ? { ...sub, [field]: value } : sub
    ));
  }, []);

  const handleDeleteSubtitle = useCallback((id: number) => {
    setSubtitles(prev => prev.filter(sub => sub.id !== id));
  }, []);

  // Split subtitle based on cursor position using linear interpolation for time
  const handleSplitSubtitle = useCallback((id: number, cursorPosition: number) => {
    setSubtitles(prev => {
      const index = prev.findIndex(s => s.id === id);
      if (index === -1) return prev;

      const original = prev[index];
      const textLen = original.text.length;
      
      // Safety check to prevent division by zero or invalid splits
      if (textLen === 0 || cursorPosition <= 0 || cursorPosition >= textLen) {
        return prev; 
      }

      // Calculate new time
      const startTime = timeStringToSeconds(original.startTime);
      const endTime = timeStringToSeconds(original.endTime);
      const duration = endTime - startTime;
      
      // Proportional split
      const ratio = cursorPosition / textLen;
      const splitTimeSeconds = startTime + (duration * ratio);
      const splitTimeString = secondsToTimeString(splitTimeSeconds);

      // Create new chunks
      const firstChunkText = original.text.substring(0, cursorPosition).trim();
      const secondChunkText = original.text.substring(cursorPosition).trim();

      // Generate a unique ID (max existing ID + 1 to ensure uniqueness)
      const newId = Math.max(...prev.map(s => s.id), 0) + 1;

      const updatedOriginal: SubtitleChunk = {
        ...original,
        text: firstChunkText,
        endTime: splitTimeString
      };

      const newChunk: SubtitleChunk = {
        id: newId,
        startTime: splitTimeString,
        endTime: original.endTime,
        text: secondChunkText
      };

      // Insert new chunk after the original
      const newSubtitles = [...prev];
      newSubtitles[index] = updatedOriginal;
      newSubtitles.splice(index + 1, 0, newChunk);

      return newSubtitles;
    });
  }, []);

  const handleAddSubtitle = () => {
    const lastSub = subtitles[subtitles.length - 1];
    let newId = 1;
    let newStart = "00:00:00,000";
    let newEnd = "00:00:02,000";

    if (lastSub) {
      newId = Math.max(...subtitles.map(s => s.id), 0) + 1;
      // Simple logic to start where last ended
      newStart = lastSub.endTime; 
      // Add 2 seconds default
      const startSec = timeStringToSeconds(newStart);
      newEnd = secondsToTimeString(startSec + 2);
    }

    setSubtitles([...subtitles, {
      id: newId,
      startTime: newStart,
      endTime: newEnd,
      text: ""
    }]);
  };

  const handleDownload = () => {
    if (subtitles.length === 0) return;
    const srtContent = generateSRT(subtitles);
    downloadSRT(srtContent, file ? `${file.name.split('.')[0]}.srt` : 'subtitles.srt');
  };

  const handleSeek = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const onTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-200 font-sans">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-600 rounded-lg shadow-lg shadow-indigo-500/20">
            <Sparkles className="text-white w-5 h-5" />
          </div>
          <div>
             <h1 className="text-xl font-bold text-white tracking-tight">SubGen AI</h1>
             <p className="text-xs text-slate-400">Audio to SRT Generator</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
             {subtitles.length > 0 && (
                <>
                    <button
                        onClick={handleAutoFormat}
                        disabled={genState.status === 'formatting'}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-900/30 hover:bg-indigo-900/50 text-indigo-300 rounded-md transition-colors text-sm font-medium border border-indigo-500/30"
                        title="Automatically italicize English words in Indonesian subtitles (PUEBI)"
                    >
                        {genState.status === 'formatting' ? (
                            <Loader2 size={16} className="animate-spin" />
                        ) : (
                            <Wand2 size={16} />
                        )}
                        Auto PUEBI (Italicize English)
                    </button>
                    <button 
                    onClick={handleDownload}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-indigo-400 rounded-md transition-colors text-sm font-medium border border-slate-700"
                    >
                    <Download size={16} />
                    Export SRT
                    </button>
                </>
             )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden">
        
        {/* Left Panel: Upload & Player */}
        <div className="w-[400px] flex flex-col border-r border-slate-800 bg-slate-925 relative z-10 shadow-xl">
          <div className="p-6 flex-1 flex flex-col gap-6 overflow-y-auto">
            
            {/* Upload Area */}
            <div className={`
                border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center transition-all cursor-pointer relative group
                ${file ? 'border-indigo-500/30 bg-indigo-500/5' : 'border-slate-700 hover:border-slate-500 hover:bg-slate-900'}
            `}>
                <input 
                    type="file" 
                    accept="audio/*,video/*" 
                    onChange={handleFileUpload} 
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                {file ? (
                    <>
                        <FileAudio className="w-12 h-12 text-indigo-400 mb-3" />
                        <p className="font-medium text-slate-200 truncate max-w-full px-4">{file.name}</p>
                        <p className="text-xs text-slate-500 mt-1">Click to replace</p>
                    </>
                ) : (
                    <>
                        <Upload className="w-12 h-12 text-slate-600 mb-3 group-hover:text-slate-400 transition-colors" />
                        <p className="font-medium text-slate-300">Drop audio/video file here</p>
                        <p className="text-xs text-slate-500 mt-1">MP3, WAV, MP4, MKV</p>
                    </>
                )}
            </div>

            {/* Actions */}
            {file && (
                <div className="flex flex-col gap-4">
                    <button
                        onClick={handleTranscribe}
                        disabled={genState.status === 'transcribing' || genState.status === 'formatting'}
                        className={`
                            w-full py-3 px-4 rounded-lg font-semibold shadow-lg transition-all flex items-center justify-center gap-2
                            ${genState.status === 'transcribing' 
                                ? 'bg-indigo-900/50 text-indigo-300 cursor-not-allowed' 
                                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/25 hover:shadow-indigo-500/40'}
                        `}
                    >
                        {genState.status === 'transcribing' ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Transcribing...
                            </>
                        ) : (
                            <>
                                <Sparkles className="w-5 h-5" />
                                Generate Subtitles
                            </>
                        )}
                    </button>

                    {genState.status === 'error' && (
                        <div className="p-3 bg-red-900/20 border border-red-900/50 rounded-lg text-red-400 text-sm flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                            {genState.message}
                        </div>
                    )}
                </div>
            )}

            {/* Mini Player Info */}
            {audioUrl && (
                <div className="mt-auto bg-slate-900 p-4 rounded-lg border border-slate-800">
                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Audio Preview</h3>
                    <audio 
                        ref={audioRef}
                        src={audioUrl} 
                        className="w-full h-8" 
                        controls 
                        onTimeUpdate={onTimeUpdate}
                        onPlay={() => setIsPlaying(true)}
                        onPause={() => setIsPlaying(false)}
                    />
                    <div className="flex justify-between text-xs text-slate-500 mt-2 font-mono">
                        <span>{new Date(currentTime * 1000).toISOString().substr(11, 8)}</span>
                        <span>{audioRef.current?.duration ? new Date(audioRef.current.duration * 1000).toISOString().substr(11, 8) : '--:--:--'}</span>
                    </div>
                </div>
            )}
          </div>
        </div>

        {/* Right Panel: Subtitle Editor */}
        <div className="flex-1 flex flex-col bg-slate-950 overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/30">
                <h2 className="font-semibold text-slate-300">Subtitle Editor</h2>
                <div className="text-xs text-slate-500">
                    {subtitles.length} lines
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-0">
                {subtitles.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-600">
                        <div className="w-16 h-16 rounded-full bg-slate-900 flex items-center justify-center mb-4">
                            <FileAudio className="w-8 h-8 opacity-50" />
                        </div>
                        <p className="text-lg">No subtitles yet</p>
                        <p className="text-sm opacity-60">Upload a file and generate to start editing</p>
                    </div>
                ) : (
                    <div className="flex flex-col">
                        {subtitles.map((chunk) => (
                            <SubtitleItem
                                key={chunk.id}
                                chunk={chunk}
                                isActive={chunk.id === activeSubtitleId}
                                onUpdate={handleUpdateSubtitle}
                                onDelete={handleDeleteSubtitle}
                                onSeek={handleSeek}
                                onSplit={handleSplitSubtitle}
                            />
                        ))}
                        
                        <div className="p-8 flex justify-center">
                             <button
                                onClick={handleAddSubtitle}
                                className="text-sm text-slate-500 hover:text-indigo-400 flex items-center gap-2 transition-colors border border-dashed border-slate-700 hover:border-indigo-500 px-6 py-3 rounded-full"
                             >
                                + Add new subtitle line
                             </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
      </main>
    </div>
  );
};

export default App;
