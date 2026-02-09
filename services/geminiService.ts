
import { GoogleGenAI, Type } from "@google/genai";
import { RagConfig, SearchResult, AiResponse, Flashcard } from "../types";
import { SYSTEM_PROMPT, RESPONSE_SCHEMA } from "../constants";
import { v4 as uuidv4 } from 'uuid';

export class GeminiService {
  private getAI() {
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  /**
   * Retry wrapper with exponential backoff for handling 429 errors
   */
  private async withRetry<T>(
    operation: () => Promise<T>,
    operationName: string = 'API Call'
  ): Promise<T> {
    const maxRetries = 5;
    const baseDelay = 2000;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (e: any) {
        const is429 = e.message?.includes('429') || e.status === 429;
        const is503 = e.message?.includes('503') || e.status === 503;
        const isRetryable = is429 || is503;

        if (isRetryable && attempt < maxRetries) {
          const waitTime = baseDelay * Math.pow(2, attempt); // 2s, 4s, 8s, 16s, 32s
          console.warn(`[${operationName}] Rate limited (attempt ${attempt + 1}/${maxRetries}). Retrying in ${waitTime}ms...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }
        throw e;
      }
    }
    throw new Error(`[${operationName}] Max retries exceeded`);
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

    try {
      const response = await this.withRetry(
        () => ai.models.generateContent({
          model: "gemini-2.5-flash",
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
        }),
        'generateFlashcards'
      );

      const data = JSON.parse((response as any).text || '[]');
      return data.map((item: any) => ({
        id: uuidv4(),
        ...item,
        timestamp: Date.now(),
        sourceDoc: "Derived Knowledge"
      }));
    } catch (e) {
      console.error('Flashcard generation failed after retries:', e);
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
      .map((res, i) => {
        const pageInfo = res.chunk.metadata.pageNumber
          ? `, Page: ${res.chunk.metadata.pageNumber}`
          : '';
        return `[CHUNK ${i}]\nSource: ${res.chunk.metadata.sourceFileName}${pageInfo}\nContent: ${res.chunk.text}`;
      })
      .join('\n\n');

    const deviceConstraint = config.deviceType === 'mobile'
      ? "\nDEVICE: Mobile View. Concise delivery required."
      : "\nDEVICE: Desktop View. Full depth allowed.";

    const prompt = `QUERY: ${query}\n\nCONTEXT:\n${contextText}${deviceConstraint}`;

    try {
      const response = await this.withRetry(
        () => ai.models.generateContent({
          model: config.modelName,
          contents: prompt,
          config: {
            systemInstruction: SYSTEM_PROMPT,
            temperature: config.temperature,
            responseMimeType: "application/json",
            responseSchema: RESPONSE_SCHEMA as any,
          },
        }),
        'generateAnswer'
      );

      const rawText = (response as any).text || '{}';
      return JSON.parse(rawText) as AiResponse;

    } catch (e: any) {
      console.error("Gemini API Error after retries:", e);
      return {
        answer: `System Overload. Please try again in a moment.`,
        confidence: 0,
        reasoning: "API Rate Limit Exceeded",
        followUps: [],
        assumptions: [],
        scope: 'narrow',
        inconsistencyDetected: false
      };
    }
  }
}

export const geminiService = new GeminiService();
