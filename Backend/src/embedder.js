import { pipeline } from '@xenova/transformers';

let embedderInstance = null;
const embeddingCache = new Map();

/**
 * Initialize or get the feature extraction pipeline.
 */
export async function getEmbedderInstance() {
  if (!embedderInstance) {
    console.log('Loading Xenova/all-MiniLM-L6-v2 embedding model...');
    embedderInstance = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    console.log('Xenova embedding model loaded successfully.');
  }
  return embedderInstance;
}

/**
 * Generate 384-dimension vector embedding for text.
 * @param {string} text 
 * @param {boolean} useCache 
 * @returns {Promise<number[]>}
 */
export async function embedText(text, useCache = true) {
  const cleanText = String(text || '').trim();
  if (!cleanText) {
    return new Array(384).fill(0);
  }

  if (useCache && embeddingCache.has(cleanText)) {
    return embeddingCache.get(cleanText);
  }

  try {
    const embedder = await getEmbedderInstance();
    const output = await embedder(cleanText, { pooling: 'mean', normalize: true });
    const vector = Array.from(output.data);

    if (useCache) {
      embeddingCache.set(cleanText, vector);
      // Keep cache size bounded
      if (embeddingCache.size > 2048) {
        const firstKey = embeddingCache.keys().next().value;
        embeddingCache.delete(firstKey);
      }
    }

    return vector;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw error;
  }
}
