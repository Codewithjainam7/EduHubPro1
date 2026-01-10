
import { v4 as uuidv4 } from 'uuid';
import { 
  DocumentChunk, 
  IngestedDocument, 
  RagConfig, 
  SearchResult, 
  RetrievalStrategy 
} from '../types';
import { geminiService } from './geminiService';

export class RagEngine {
  private documents: IngestedDocument[] = [];
  private vectorStore: DocumentChunk[] = [];

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
    config: RagConfig
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
    return doc;
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
