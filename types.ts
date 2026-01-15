export interface SubtitleChunk {
  id: number;
  startTime: string; // Format: HH:MM:SS,mmm
  endTime: string;   // Format: HH:MM:SS,mmm
  text: string;
}

export interface GenerationState {
  status: 'idle' | 'uploading' | 'transcribing' | 'formatting' | 'success' | 'error';
  message?: string;
}

export interface HistoryItem {
  id: string;
  fileName: string;
  timestamp: number;
  subtitles: SubtitleChunk[];
}
