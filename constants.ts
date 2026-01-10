
import { RagConfig } from './types';
import { Type } from "@google/genai";

export const DEFAULT_CONFIG: RagConfig = {
  chunkSize: 1000,
  chunkOverlap: 200,
  topK: 6,
  modelName: 'gemini-3-flash-preview',
  embeddingModel: 'text-embedding-004',
  temperature: 0.3,
  strictness: 'factual',
  answerDepth: 'standard',
  simulationMode: false,
};

export const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    answer: { type: Type.STRING, description: "The grounded answer based strictly on context shards." },
    confidence: { type: Type.NUMBER, description: "Scale 0-1 of evidence strength." },
    reasoning: { type: Type.STRING, description: "Brief internal logic for chunk usage." },
    assumptions: { 
      type: Type.ARRAY, 
      items: { type: Type.STRING },
      description: "Any inferences or assumptions made that weren't explicitly in the text."
    },
    scope: { 
      type: Type.STRING, 
      enum: ["narrow", "broad", "exploratory"],
      description: "Detected scope of the user query."
    },
    inconsistencyDetected: {
      type: Type.BOOLEAN,
      description: "Whether the provided chunks contain contradictory information."
    },
    followUps: { 
      type: Type.ARRAY, 
      items: { type: Type.STRING },
      description: "3 highly relevant follow-up queries."
    }
  },
  required: ["answer", "confidence", "reasoning", "assumptions", "scope", "inconsistencyDetected", "followUps"]
};

export const SYSTEM_PROMPT = `You are the ArchiRAG Principal Architect. You provide high-fidelity, grounded answers based ONLY on the provided document context.

INTELLIGENCE PROTOCOLS:
1. ASSUMPTION TRACKING: Explicitly list any logical leaps or inferences you had to make to connect shards. Separate "Direct Facts" from "Derived Inferences".
2. SCOPE DETECTION: Categorize the query as Narrow (specific fact), Broad (summary/overview), or Exploratory (asking for connections).
3. INCONSISTENCY MONITOR: If two chunks contradict each other, flag it in the metadata and state it clearly in the answer.
4. HALLUCINATION CONTROL: Say "Information missing from index" if not supported by chunks.

FORMATTING:
- Professional, structured markdown.
- Use bullet points for readability.
- Cite sources: [Source: filename, Chunk: index]`;
