
import { GoogleGenAI, Type } from "@google/genai";
import { RagConfig, SearchResult, AiResponse, Flashcard } from "../types";
import { SYSTEM_PROMPT, RESPONSE_SCHEMA } from "../constants";
import { v4 as uuidv4 } from 'uuid';

export class GeminiService {
  private getAI() {
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  async getEmbedding(text: string, model: string): Promise<number[]> {
    const size = 1024;
    const vector = new Array(size).fill(0);
    const words = text.toLowerCase().split(/\W+/);
    
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      for (let j = 0; j < word.length; j++) {
        const charCode = word.charCodeAt(j);
        const index = (charCode * (j + 1)) % size;
        vector[index] += 1 / (i + 1);
      }
    }
    
    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    return vector.map(v => (magnitude > 0 ? v / magnitude : 0));
  }

  async generateFlashcards(text: string): Promise<Flashcard[]> {
    const ai = this.getAI();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Extract 3-5 key concepts from this text and turn them into Flashcards (Question and Answer pairs). 
      Text: ${text}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              question: { type: Type.STRING },
              answer: { type: Type.STRING }
            },
            required: ["question", "answer"]
          }
        }
      }
    });

    try {
      const data = JSON.parse(response.text || '[]');
      return data.map((item: any) => ({
        id: uuidv4(),
        ...item,
        timestamp: Date.now(),
        sourceDoc: "Derived Knowledge"
      }));
    } catch (e) {
      return [];
    }
  }

  async generateAnswer(
    query: string, 
    context: SearchResult[], 
    config: RagConfig & { deviceType?: 'mobile' | 'desktop' }
  ): Promise<AiResponse> {
    const ai = this.getAI();
    
    const contextText = context
      .map((res, i) => `[CHUNK ${i}]\nSource: ${res.chunk.metadata.sourceFileName}\nContent: ${res.chunk.text}`)
      .join('\n\n');

    const deviceConstraint = config.deviceType === 'mobile' 
      ? "\nDEVICE: Mobile View. Concise delivery required."
      : "\nDEVICE: Desktop View. Full depth allowed.";

    const prompt = `QUERY: ${query}\n\nCONTEXT:\n${contextText}${deviceConstraint}`;

    const response = await ai.models.generateContent({
      model: config.modelName,
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        temperature: config.temperature,
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA as any,
      },
    });

    try {
      const rawText = response.text || '{}';
      return JSON.parse(rawText) as AiResponse;
    } catch (e) {
      return {
        answer: "Synthesis error.",
        confidence: 0,
        reasoning: "Error",
        followUps: [],
        assumptions: [],
        scope: 'narrow',
        inconsistencyDetected: false
      };
    }
  }
}

export const geminiService = new GeminiService();
