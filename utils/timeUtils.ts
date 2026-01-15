import { SubtitleChunk } from '../types';

// Helper to convert seconds to HH:MM:SS,mmm format if needed, 
// though the AI usually gives us the string directly.
// We might need to convert HH:MM:SS,mmm to seconds for the audio player seeking.

export const timeStringToSeconds = (timeString: string): number => {
  // Expected format: HH:MM:SS,mmm
  const parts = timeString.split(':');
  if (parts.length < 3) return 0;

  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  const secondsParts = parts[2].split(',');
  const seconds = parseInt(secondsParts[0], 10);
  const milliseconds = parseInt(secondsParts[1] || '0', 10);

  return (hours * 3600) + (minutes * 60) + seconds + (milliseconds / 1000);
};

export const secondsToTimeString = (totalSeconds: number): string => {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const milliseconds = Math.round((totalSeconds % 1) * 1000);

  const pad = (num: number, size: number = 2) => num.toString().padStart(size, '0');
  
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)},${pad(milliseconds, 3)}`;
};

export const generateSRT = (subtitles: SubtitleChunk[]): string => {
  return subtitles.map((sub, index) => {
    return `${index + 1}\n${sub.startTime} --> ${sub.endTime}\n${sub.text}\n`;
  }).join('\n');
};

export const downloadSRT = (content: string, filename: string = 'subtitles.srt') => {
  const blob = new Blob([content], { type: 'text/srt' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
