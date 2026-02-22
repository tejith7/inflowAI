'use server';

import { generateEmbedding } from '@/ai/embedding';

interface SearchDocument {
    title: string;
    content: string;
}

/**
 * Compute cosine similarity between two vectors.
 */
function cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
        dotProduct += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }
    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    if (denominator === 0) return 0;
    return dotProduct / denominator;
}

/**
 * Simple TF-IDF-style keyword scorer.
 */
function tfidfScore(query: string, document: string): number {
    const tokenize = (text: string): string[] =>
        text
            .toLowerCase()
            .replace(/[^\w\s]/g, '')
            .split(/\s+/)
            .filter((t) => t.length > 2);

    const queryTokens = tokenize(query);
    const docTokens = tokenize(document);

    if (queryTokens.length === 0 || docTokens.length === 0) return 0;

    const docTf = new Map<string, number>();
    for (const token of docTokens) {
        docTf.set(token, (docTf.get(token) || 0) + 1);
    }

    let score = 0;
    for (const qToken of queryTokens) {
        const tf = docTf.get(qToken) || 0;
        if (tf > 0) {
            score += 1 + Math.log(tf);
        }
    }

    return score / Math.sqrt(docTokens.length);
}

/**
 * Reciprocal Rank Fusion (RRF) to merge two ranked lists.
 */
function reciprocalRankFusion(
    semanticRanks: Map<number, number>,
    keywordRanks: Map<number, number>,
    k: number = 60
): Map<number, number> {
    const fusedScores = new Map<number, number>();

    for (const [idx, rank] of semanticRanks) {
        fusedScores.set(idx, (fusedScores.get(idx) || 0) + 1 / (k + rank + 1));
    }

    for (const [idx, rank] of keywordRanks) {
        fusedScores.set(idx, (fusedScores.get(idx) || 0) + 1 / (k + rank + 1));
    }

    return fusedScores;
}

/**
 * Hybrid search: combines semantic (embedding) similarity with keyword (TF-IDF) scoring
 * using Reciprocal Rank Fusion to return the topK most relevant documents.
 */
export async function hybridSearch(
    query: string,
    documents: SearchDocument[],
    topK: number = 5
): Promise<SearchDocument[]> {
    if (documents.length === 0) return [];
    if (documents.length <= topK) return documents;

    // 1. Semantic scoring via embeddings
    const queryEmbedding = await generateEmbedding(query);

    const semanticScores: { index: number; score: number }[] = await Promise.all(
        documents.map(async (doc, index) => {
            const docText = `${doc.title}. ${doc.content}`.slice(0, 2000);
            const docEmbedding = await generateEmbedding(docText);
            return { index, score: cosineSimilarity(queryEmbedding, docEmbedding) };
        })
    );

    // 2. Keyword scoring via TF-IDF
    const keywordScores = documents.map((doc, index) => ({
        index,
        score: tfidfScore(query, `${doc.title} ${doc.content}`),
    }));

    // 3. Sort both lists to get ranks
    const semanticSorted = [...semanticScores].sort((a, b) => b.score - a.score);
    const keywordSorted = [...keywordScores].sort((a, b) => b.score - a.score);

    const semanticRanks = new Map<number, number>();
    semanticSorted.forEach((item, rank) => semanticRanks.set(item.index, rank));

    const keywordRanks = new Map<number, number>();
    keywordSorted.forEach((item, rank) => keywordRanks.set(item.index, rank));

    // 4. Fuse rankings
    const fusedScores = reciprocalRankFusion(semanticRanks, keywordRanks);

    // 5. Sort by fused score and return topK
    const sortedIndices = [...fusedScores.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, topK)
        .map(([index]) => index);

    return sortedIndices.map((i) => documents[i]);
}
