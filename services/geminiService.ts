
import { GoogleGenAI, Type } from "@google/genai";
import { PDFPagePreview } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const suggestPagesByQuery = async (query: string, pages: PDFPagePreview[]): Promise<number[]> => {
  const pageData = pages.map(p => ({
    index: p.index,
    content: p.textContent.substring(0, 500) // Truncate for token efficiency
  }));

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Analyze the following PDF page contents and identify the page indices (0-based) that best match the user's search query: "${query}". 
    Return only a JSON array of indices.
    
    Data: ${JSON.stringify(pageData)}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.INTEGER
        }
      }
    }
  });

  // Ensure response.text is available and handle potential JSON parsing issues robustly.
  // This prevents 'unknown' types from propagating into the application state.
  const text = response.text;
  if (!text) {
    return [];
  }

  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) {
      // Validate that all items are indeed numbers to satisfy the Promise<number[]> return type.
      return parsed.filter((item): item is number => typeof item === 'number');
    }
    return [];
  } catch (e) {
    console.error("Failed to parse AI response", e);
    return [];
  }
};
