
import { IngestedDocument, DocumentChunk } from '../types';

const DB_NAME = 'eduhub_rag_db';
const DB_VERSION = 1;
const DOCUMENTS_STORE = 'documents';
const CHUNKS_STORE = 'chunks';

class StorageService {
    private db: IDBDatabase | null = null;
    private initPromise: Promise<void> | null = null;

    async init(): Promise<void> {
        if (this.db) return;
        if (this.initPromise) return this.initPromise;

        this.initPromise = new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => {
                console.error('IndexedDB error:', request.error);
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                console.log('IndexedDB initialized successfully');
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;

                // Documents store
                if (!db.objectStoreNames.contains(DOCUMENTS_STORE)) {
                    const docStore = db.createObjectStore(DOCUMENTS_STORE, { keyPath: 'id' });
                    docStore.createIndex('fileName', 'fileName', { unique: false });
                }

                // Chunks store (for embeddings)
                if (!db.objectStoreNames.contains(CHUNKS_STORE)) {
                    const chunkStore = db.createObjectStore(CHUNKS_STORE, { keyPath: 'id' });
                    chunkStore.createIndex('documentId', 'metadata.documentId', { unique: false });
                }
            };
        });

        return this.initPromise;
    }

    async saveDocuments(documents: IngestedDocument[]): Promise<void> {
        await this.init();
        if (!this.db) throw new Error('Database not initialized');

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction([DOCUMENTS_STORE], 'readwrite');
            const store = transaction.objectStore(DOCUMENTS_STORE);

            // Clear existing and add new
            store.clear();
            documents.forEach(doc => {
                // Store document without chunks (chunks stored separately)
                const docWithoutChunks = { ...doc, chunks: [] };
                store.put(docWithoutChunks);
            });

            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
        });
    }

    async saveChunks(chunks: DocumentChunk[]): Promise<void> {
        await this.init();
        if (!this.db) throw new Error('Database not initialized');

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction([CHUNKS_STORE], 'readwrite');
            const store = transaction.objectStore(CHUNKS_STORE);

            store.clear();
            chunks.forEach(chunk => store.put(chunk));

            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
        });
    }

    async loadDocuments(): Promise<IngestedDocument[]> {
        await this.init();
        if (!this.db) throw new Error('Database not initialized');

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction([DOCUMENTS_STORE], 'readonly');
            const store = transaction.objectStore(DOCUMENTS_STORE);
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    }

    async loadChunks(): Promise<DocumentChunk[]> {
        await this.init();
        if (!this.db) throw new Error('Database not initialized');

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction([CHUNKS_STORE], 'readonly');
            const store = transaction.objectStore(CHUNKS_STORE);
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    }

    async deleteDocument(docId: string): Promise<void> {
        await this.init();
        if (!this.db) throw new Error('Database not initialized');

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction([DOCUMENTS_STORE, CHUNKS_STORE], 'readwrite');

            // Delete document
            transaction.objectStore(DOCUMENTS_STORE).delete(docId);

            // Delete associated chunks
            const chunkStore = transaction.objectStore(CHUNKS_STORE);
            const index = chunkStore.index('documentId');
            const request = index.openCursor(IDBKeyRange.only(docId));

            request.onsuccess = (event) => {
                const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
                if (cursor) {
                    cursor.delete();
                    cursor.continue();
                }
            };

            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
        });
    }

    async clearAll(): Promise<void> {
        await this.init();
        if (!this.db) throw new Error('Database not initialized');

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction([DOCUMENTS_STORE, CHUNKS_STORE], 'readwrite');
            transaction.objectStore(DOCUMENTS_STORE).clear();
            transaction.objectStore(CHUNKS_STORE).clear();

            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
        });
    }
}

export const storageService = new StorageService();
