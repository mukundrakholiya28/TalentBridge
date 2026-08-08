/**
 * embedding.js
 *
 * Utility module responsible for generating vector embeddings
 * using @xenova/transformers (local HuggingFace model).
 *
 * These embeddings are used for semantic search in TalentBridge.
 */

// Singleton pipeline instance to avoid loading the model multiple times
let embedderPipeline = null;

// Use a fast, small, and proven embedding model suitable for local Node.js execution
// all-MiniLM-L6-v2 produces 384-dimensional embeddings
const MODEL_NAME = "Xenova/all-MiniLM-L6-v2";

/**
 * Ensures the embedding model is loaded and ready
 */
async function getEmbedder() {
    if (!embedderPipeline) {
        console.log(`Loading local embedding model (${MODEL_NAME})...`);
        const { pipeline } = await import("@xenova/transformers");
        embedderPipeline = await pipeline("feature-extraction", MODEL_NAME, {
            // Optional: specify a cache directory if needed, defaults to ~/.cache/huggingface/
        });
        console.log("Local embedding model loaded successfully.");
    }
    return embedderPipeline;
}

/**
 * Generate embedding for given text
 *
 * @param {string} text - Input text to convert into vector embedding
 * @returns {Promise<number[]>} - Vector representation of the text (384 dimensions)
 */
async function createEmbedding(text) {
    try {
        // Basic validation
        if (!text || text.trim().length === 0) {
            throw new Error("Text for embedding cannot be empty");
        }

        // Clean text
        const cleanedText = text
            .replace(/\s+/g, " ")
            .replace(/\n/g, " ")
            .trim();

        // Get the singleton embedder
        const embedder = await getEmbedder();

        // Generate embedding
        // Options:
        // - pooling: 'mean' is standard for sentence-transformers
        // - normalize: true ensures cosine similarity works perfectly
        const output = await embedder(cleanedText, { pooling: 'mean', normalize: true });

        // Convert the Float32Array to a standard JavaScript Array
        const embeddingArray = Array.from(output.data);

        return embeddingArray;

    } catch (error) {
        console.error("Local embedding generation error:", error.message);
        throw new Error("Embedding generation failed");
    }
}

module.exports = {
    createEmbedding
};