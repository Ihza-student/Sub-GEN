import { GoogleGenAI, Type } from "@google/genai";
import { SubtitleChunk } from "../types";

const API_KEY = process.env.API_KEY || '';

// Convert file to Base64
const fileToGenerativePart = async (file: File): Promise<{ inlineData: { data: string; mimeType: string } }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64Data = reader.result as string;
      const base64Content = base64Data.split(',')[1];
      resolve({
        inlineData: {
          data: base64Content,
          mimeType: file.type,
        },
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const transcribeAudio = async (file: File): Promise<SubtitleChunk[]> => {
  if (!API_KEY) {
    throw new Error("API Key is missing.");
  }

  const ai = new GoogleGenAI({ apiKey: API_KEY });
  
  // Using gemini-2.0-flash-exp for robust audio understanding
  const model = "gemini-2.0-flash-exp"; 

  const audioPart = await fileToGenerativePart(file);

  const prompt = `
    Listen to this audio carefully and transcribe it into subtitles.
    Return strictly a JSON array. 
    Do not include any markdown formatting or code blocks (like \`\`\`json). 
    Just return the raw JSON array.
    
    Each item in the array must be an object with these exact keys:
    - "id": number (sequential starting from 1)
    - "startTime": string (format "HH:MM:SS,mmm", e.g., "00:00:01,500")
    - "endTime": string (format "HH:MM:SS,mmm", e.g., "00:00:04,000")
    - "text": string (the transcribed text)

    Segment the subtitles naturally by sentences or phrases for good readability.
    Ensure timecodes are accurate.
  `;

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: {
        parts: [audioPart, { text: prompt }],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.INTEGER },
              startTime: { type: Type.STRING },
              endTime: { type: Type.STRING },
              text: { type: Type.STRING }
            },
            required: ["id", "startTime", "endTime", "text"]
          }
        }
      }
    });

    const textResponse = response.text;
    if (!textResponse) {
        throw new Error("No response from AI");
    }

    const cleanJson = textResponse.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsedData = JSON.parse(cleanJson) as SubtitleChunk[];
    return parsedData;

  } catch (error) {
    console.error("Error transcribing audio:", error);
    throw error;
  }
};

export const autoFormatSubtitles = async (subtitles: SubtitleChunk[]): Promise<SubtitleChunk[]> => {
  if (!API_KEY) throw new Error("API Key is missing.");

  const ai = new GoogleGenAI({ apiKey: API_KEY });
  const model = "gemini-3-flash-preview";

  // We only send ID and Text to save context and focus the model
  const simplifiedInput = subtitles.map(s => ({ id: s.id, text: s.text }));

  const prompt = `
    You are an expert Indonesian subtitle editor. 
    Your task is to apply PUEBI (Pedoman Umum Ejaan Bahasa Indonesia) standards to the following subtitles.
    
    Strict Rules:
    1. Identify words or phrases that are in a foreign language (specifically English) within the Indonesian text.
    2. Wrap these foreign words in <i> and </i> tags (e.g., "Saya suka <i>coding</i> di malam hari").
    3. Do NOT change the meaning, spelling (unless correcting typos), or structure of the sentence.
    4. Do NOT change the IDs.
    5. Return the result as a strictly valid JSON array of objects with "id" and "text" properties.
    
    Input Subtitles:
    ${JSON.stringify(simplifiedInput)}
  `;

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    id: { type: Type.INTEGER },
                    text: { type: Type.STRING }
                },
                required: ["id", "text"]
            }
        }
      }
    });

    const textResponse = response.text;
    if (!textResponse) throw new Error("No response from AI");

    const cleanJson = textResponse.replace(/```json/g, '').replace(/```/g, '').trim();
    const formattedTexts = JSON.parse(cleanJson) as { id: number; text: string }[];

    // Merge back with original timing data
    return subtitles.map(original => {
        const formatted = formattedTexts.find(f => f.id === original.id);
        return formatted ? { ...original, text: formatted.text } : original;
    });

  } catch (error) {
    console.error("Error formatting subtitles:", error);
    throw error;
  }
};
