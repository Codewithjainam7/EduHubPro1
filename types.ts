
export type AppPage = 'Workspace' | 'Explorer' | 'Flashcards' | 'Security' | 'Audit';

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

export interface AuditLog {
  id: string;
  timestamp: number;
  event: string;
  status: 'SUCCESS' | 'WARNING' | 'ERROR';
  details: string;
}

export interface Flashcard {
  id: string;
  question: string;
  answer: string;
  sourceDoc: string;
  timestamp: number;
}

export type RetrievalStrategy = 'semantic' | 'keyword' | 'hybrid' | 'summary' | 'analytical';
export type QueryScope = 'narrow' | 'broad' | 'exploratory';

export interface ChunkMetadata {
  id: string;
  documentId: string;
  chunkIndex: number;
  sourceFileName: string;
  pageNumber?: number;
  startChar: number;
  endChar: number;
  trustScore: number;
  freshness: number;
}

export interface DocumentChunk {
  id: string;
  text: string;
  embedding?: number[];
  metadata: ChunkMetadata;
  weight: number;
}

export interface IngestedDocument {
  id: string;
  fileName: string;
  fileType: string;
  rawText: string;
  chunks: DocumentChunk[];
  ingestedAt: number;
  status: 'processing' | 'indexed' | 'error';
  hash: string;
}

export interface RagConfig {
  chunkSize: number;
  chunkOverlap: number;
  topK: number;
  modelName: string;
  embeddingModel: string;
  temperature: number;
  strictness: 'factual' | 'balanced' | 'creative';
  answerDepth: 'concise' | 'standard' | 'detailed';
  simulationMode?: boolean;
}

export interface SearchResult {
  chunk: DocumentChunk;
  score: number;
  strategyUsed: RetrievalStrategy;
}

export interface AiResponse {
  answer: string;
  confidence: number;
  reasoning: string;
  followUps: string[];
  assumptions: string[];
  scope: QueryScope;
  inconsistencyDetected: boolean;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  citations?: SearchResult[];
  confidence?: number;
  reasoning?: string;
  followUps?: string[];
  assumptions?: string[];
  scope?: QueryScope;
  strategy?: RetrievalStrategy;
}
