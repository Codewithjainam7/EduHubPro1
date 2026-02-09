
import { v4 as uuidv4 } from 'uuid';
import {
  DocumentChunk,
  IngestedDocument,
  RagConfig,
  SearchResult,
  RetrievalStrategy,
  PageContent
} from '../types';
import { geminiService } from './geminiService';
import { storageService } from './storageService';

export class RagEngine {
  private documents: IngestedDocument[] = [];
  private vectorStore: DocumentChunk[] = [];
  private isInitialized = false;

  constructor() {
    this.loadState();
  }

  private async saveState() {
    try {
      await storageService.saveDocuments(this.documents);
      await storageService.saveChunks(this.vectorStore);
      console.log('State saved to IndexedDB successfully');
    } catch (e) {
      console.error('Failed to save state to IndexedDB:', e);
    }
  }

  private async loadState() {
    try {
      const docs = await storageService.loadDocuments();
      const chunks = await storageService.loadChunks();

      // Reconstruct documents with their chunks
      this.documents = docs.map(doc => ({
        ...doc,
        chunks: chunks.filter(c => c.metadata.documentId === doc.id)
      }));
      this.vectorStore = chunks;
      this.isInitialized = true;

      if (docs.length > 0) {
        console.log(`Loaded ${docs.length} documents from IndexedDB`);
      }
    } catch (e) {
      console.error('Failed to load state from IndexedDB:', e);
      this.isInitialized = true;
    }
  }

  private normalizeText(text: string): string {
    return text
      .replace(/\r\n/g, '\n')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  /**
   * Simple hash for redundancy detection (Feature 5)
   */
  private generateHash(text: string): string {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = ((hash << 5) - hash) + text.charCodeAt(i);
      hash |= 0;
    }
    return hash.toString();
  }

  private createChunks(
    text: string,
    docId: string,
    fileName: string,
    config: RagConfig,
    pageNumber?: number
  ): DocumentChunk[] {
    const { chunkSize, chunkOverlap } = config;
    const chunks: DocumentChunk[] = [];
    const words = text.split(' ');
    let currentWordIndex = 0;
    let chunkIndex = 0;

    const wordsPerChunk = Math.floor(chunkSize / 6);
    const overlapWords = Math.floor(chunkOverlap / 6);

    while (currentWordIndex < words.length) {
      const endWordIndex = Math.min(currentWordIndex + wordsPerChunk, words.length);
      const chunkText = words.slice(currentWordIndex, endWordIndex).join(' ');

      if (chunkText.trim().length > 0) {
        // Feature 3: Initial Weighting
        const weight = 1.0;

        chunks.push({
          id: uuidv4(),
          text: chunkText,
          weight,
          metadata: {
            id: uuidv4(),
            documentId: docId,
            chunkIndex,
            sourceFileName: fileName,
            pageNumber: pageNumber, // Track page number
            startChar: currentWordIndex,
            endChar: endWordIndex,
            trustScore: 1.0,
            freshness: Date.now()
          }
        });
      }

      currentWordIndex += (wordsPerChunk - overlapWords);
      if (currentWordIndex >= words.length || wordsPerChunk <= overlapWords) break;
      chunkIndex++;
    }

    return chunks;
  }

  // New method for ingesting PDFs with page-level tracking
  async ingestDocumentWithPages(
    name: string,
    type: string,
    pages: PageContent[],
    config: RagConfig
  ): Promise<IngestedDocument> {
    const fullText = pages.map(p => p.text).join('\n');
    const cleanText = this.normalizeText(fullText);
    const hash = this.generateHash(cleanText);

    // Feature 5: Redundancy Detection
    const duplicate = this.documents.find(d => d.hash === hash);
    if (duplicate) {
      throw new Error(`Conflict Detected: Document ${name} is identical to an existing asset.`);
    }

    const docId = uuidv4();

    // Create chunks for each page, preserving page numbers
    let allChunks: DocumentChunk[] = [];
    for (const page of pages) {
      const pageChunks = this.createChunks(
        this.normalizeText(page.text),
        docId,
        name,
        config,
        page.pageNumber
      );
      allChunks = allChunks.concat(pageChunks);
    }

    // Re-index chunk indices globally
    allChunks.forEach((chunk, i) => {
      chunk.metadata.chunkIndex = i;
    });

    await Promise.all(allChunks.map(async (chunk) => {
      chunk.embedding = await geminiService.getEmbedding(chunk.text, config.embeddingModel);
    }));

    const doc: IngestedDocument = {
      id: docId,
      fileName: name,
      fileType: type,
      rawText: cleanText,
      chunks: allChunks,
      ingestedAt: Date.now(),
      status: 'indexed',
      hash
    };

    this.documents.push(doc);
    this.vectorStore.push(...allChunks);
    await this.saveState();
    return doc;
  }

  async ingestDocument(
    name: string,
    type: string,
    rawContent: string,
    config: RagConfig
  ): Promise<IngestedDocument> {
    const cleanText = this.normalizeText(rawContent);
    const hash = this.generateHash(cleanText);

    // Feature 5: Redundancy Detection
    const duplicate = this.documents.find(d => d.hash === hash);
    if (duplicate) {
      throw new Error(`Conflict Detected: Document ${name} is identical to an existing asset.`);
    }

    const docId = uuidv4();
    const chunks = this.createChunks(cleanText, docId, name, config);

    await Promise.all(chunks.map(async (chunk) => {
      chunk.embedding = await geminiService.getEmbedding(chunk.text, config.embeddingModel);
    }));

    const doc: IngestedDocument = {
      id: docId,
      fileName: name,
      fileType: type,
      rawText: cleanText,
      chunks,
      ingestedAt: Date.now(),
      status: 'indexed',
      hash
    };

    this.documents.push(doc);
    this.vectorStore.push(...chunks);
    await this.saveState();
    return doc;
  }

  /**
   * Remove a document and its chunks from the store
   */
  async removeDocument(id: string): Promise<void> {
    this.documents = this.documents.filter(d => d.id !== id);
    this.vectorStore = this.vectorStore.filter(c => c.metadata.documentId !== id);
    await this.saveState();
  }

  /**
   * Feature 2: Retrieval Strategy Auto-Selection
   */
  private determineStrategy(query: string): RetrievalStrategy {
    const q = query.toLowerCase();
    if (q.length < 20) return 'keyword';
    if (q.includes('summary') || q.includes('overall') || q.includes('how many')) return 'summary';
    if (q.includes('explain') || q.includes('relationship')) return 'analytical';
    return 'hybrid';
  }

  async search(query: string, config: RagConfig): Promise<SearchResult[]> {
    const strategy = this.determineStrategy(query);
    const queryEmbedding = await geminiService.getEmbedding(query, config.embeddingModel);
    const keywords = query.toLowerCase().split(/\W+/).filter(w => w.length > 3);

    return this.vectorStore
      .map(chunk => {
        let score = 0;

        // Semantic component
        if (chunk.embedding) {
          score += queryEmbedding.reduce((acc, val, i) => acc + val * (chunk.embedding![i] || 0), 0);
        }

        // Feature 2: Keyword Boosting for specific queries
        if (strategy === 'keyword' || strategy === 'hybrid') {
          const chunkLower = chunk.text.toLowerCase();
          const keywordMatches = keywords.filter(k => chunkLower.includes(k)).length;
          score += (keywordMatches * 0.1);
        }

        // Feature 3: Weighting by trust and metadata
        score *= (chunk.weight * chunk.metadata.trustScore);

        return { chunk, score, strategyUsed: strategy };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, config.topK);
  }

  getDocuments() {
    return this.documents;
  }
}

export const ragEngine = new RagEngine();
