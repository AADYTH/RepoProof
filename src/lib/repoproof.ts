import type { AnalysisResult, SimilarRepo } from './types';

const SAMPLE_REPOS: SimilarRepo[] = [
  { name: 'vercel/next.js', similarity: 0, stars: 130000, language: 'TypeScript' },
  { name: 'facebook/react', similarity: 0, stars: 235000, language: 'JavaScript' },
  { name: 'supabase/supabase', similarity: 0, stars: 84000, language: 'TypeScript' },
  { name: 'openai/openai-node', similarity: 0, stars: 11000, language: 'TypeScript' },
  { name: 'withastro/astro', similarity: 0, stars: 53000, language: 'TypeScript' },
  { name: 'fastapi/fastapi', similarity: 0, stars: 90000, language: 'Python' },
  { name: 'tailwindlabs/tailwindcss', similarity: 0, stars: 89000, language: 'TypeScript' },
  { name: 'microsoft/TypeScript', similarity: 0, stars: 105000, language: 'TypeScript' },
];

function hashString(input: string): number {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function extractRepoPath(url: string): string | null {
  try {
    const parsed = new URL(url.trim());
    if (parsed.hostname !== 'github.com') return null;
    const segments = parsed.pathname.split('/').filter(Boolean);
    if (segments.length < 2) return null;
    return `${segments[0]}/${segments[1]}`;
  } catch {
    return null;
  }
}

export function isValidGitHubRepoUrl(url: string): boolean {
  return Boolean(extractRepoPath(url));
}

export async function runMockAnalysis(repoUrl: string): Promise<AnalysisResult> {
  const repo = extractRepoPath(repoUrl) ?? 'unknown/repository';
  const repoHash = hashString(repo);
  const score = 68 + (repoHash % 28);
  const confidence = 78 + (repoHash % 20);

  const pool = [...SAMPLE_REPOS]
    .sort((a, b) => (hashString(`${repo}:${a.name}`) > hashString(`${repo}:${b.name}`) ? 1 : -1))
    .slice(0, 3)
    .map((item, idx) => {
      const similarity = Math.max(12, 34 - idx * 7 - (repoHash % 4));
      return {
        ...item,
        similarity,
      };
    });

  const summary =
    score > 86
      ? 'High originality signal. Architecture and naming patterns diverge from nearest clusters.'
      : 'Moderate overlap detected. Core structure resembles known starter templates.';

  await new Promise((resolve) => setTimeout(resolve, 1850));

  return {
    score,
    confidence,
    repo,
    summary,
    similarRepos: pool,
    scannedAt: new Date().toISOString(),
  };
}

export async function analyzeRepository(repoUrl: string): Promise<AnalysisResult> {
  const baseUrl = import.meta.env.VITE_API_BASE_URL?.trim();

  if (!baseUrl) {
    return runMockAnalysis(repoUrl);
  }

  const response = await fetch(`${baseUrl.replace(/\/$/, '')}/api/analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ repoUrl }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Analysis request failed. Is the backend running?');
  }

  const data = await response.json();
  
  // Map backend response to frontend AnalysisResult format
  return {
    score: data.score,
    confidence: data.confidence,
    repo: data.metadata?.name || extractRepoPath(repoUrl) || 'unknown/repo',
    summary: data.summary,
    similarRepos: data.similarRepos.map((repo: any) => ({
      name: repo.name,
      similarity: repo.similarity,
      stars: repo.stars,
      language: repo.language || data.metadata?.languages?.[0] || 'Unknown'
    })),
    scannedAt: new Date().toISOString(),
  };
}
