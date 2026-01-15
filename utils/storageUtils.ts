import { HistoryItem, SubtitleChunk } from '../types';

const STORAGE_KEY = 'subgen_history_v1';

export const getHistory = (): HistoryItem[] => {
  try {
    const item = localStorage.getItem(STORAGE_KEY);
    return item ? JSON.parse(item) : [];
  } catch (e) {
    console.error("Failed to load history", e);
    return [];
  }
};

export const saveHistoryItem = (fileName: string, subtitles: SubtitleChunk[]) => {
  const history = getHistory();
  
  const newItem: HistoryItem = {
    id: crypto.randomUUID(),
    fileName,
    timestamp: Date.now(),
    subtitles
  };

  // Add to top
  const newHistory = [newItem, ...history];
  
  // Limit to 20 items to prevent storage overflow
  const trimmed = newHistory.slice(0, 20);
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  return trimmed;
};

export const deleteHistoryItem = (id: string): HistoryItem[] => {
  const history = getHistory();
  const newHistory = history.filter(item => item.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(newHistory));
  return newHistory;
};
