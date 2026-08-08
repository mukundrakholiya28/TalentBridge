import { NextRequest } from 'next/server';
import { handleRouteError, successResponse, errorResponse } from '@/lib/api-response';
import { requireAuth } from '@/lib/auth';

const Job = require('@server/models/Job');
const { createEmbedding } = require('@server/utils/embedding');

export async function POST(request: NextRequest) {
  return handleRouteError(async () => {
    requireAuth(request);
    
    const body = await request.json();
    const { query, location } = body;

    if (!query) {
      return errorResponse("Search query required", 400);
    }

    const queryEmbedding = await createEmbedding(query);

    // Fetch jobs with optional location filter
    let filter: any = { embedding: { $exists: true, $ne: [] } };
    if (location && location.trim() !== '') {
      filter.location = new RegExp(location.trim(), 'i');
    }
    const jobs = await Job.find({ ...filter, isOpen: { $ne: false } })
      .populate('recruiter', 'avatarUrl name');

    // Cosine similarity
    const cosineSimilarity = (a: number[], b: number[]) => {
      if (!a || !b || a.length !== b.length) return 0;
      let dot = 0, normA = 0, normB = 0;
      for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
      }
      return dot / (Math.sqrt(normA) * Math.sqrt(normB));
    };

    let queryLower = query.toLowerCase();

    // Tech abbreviation synonym map
    const synonyms: Record<string, string> = {
      "ml": "machine learning",
      "ai": "artificial intelligence",
      "js": "javascript",
      "ts": "typescript",
      "aws": "amazon web services",
      "gcp": "google cloud",
      "nlp": "natural language processing",
      "cv": "computer vision",
      "ui": "user interface",
      "ux": "user experience",
      "devops": "development operations"
    };

    const searchTerms = [queryLower];
    queryLower.split(' ').forEach(word => {
      if (synonyms[word]) searchTerms.push(synonyms[word]);
    });

    const pattern = searchTerms.map(t => `\\b${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).join('|');
    const keywordRegex = new RegExp(pattern, 'i');

    const scored = jobs.map((job: any) => {
      const semanticScore = cosineSimilarity(queryEmbedding, job.embedding);

      let keywordBoost = 0;
      if (keywordRegex.test(job.title)) keywordBoost += 0.4;
      else if (job.requirements && job.requirements.some((r: string) => keywordRegex.test(r))) keywordBoost += 0.2;
      else if (keywordRegex.test(job.description || "")) keywordBoost += 0.1;

      return {
        ...job.toObject(),
        score: semanticScore + keywordBoost
      };
    });

    const filtered = scored.filter((j: any) => j.score > 0.15);
    filtered.sort((a: any, b: any) => b.score - a.score);

    const results = filtered.slice(0, 10).map(({ embedding, ...rest }: any) => rest);

    return successResponse({ results });
  });
}

export const dynamic = 'force-dynamic';
