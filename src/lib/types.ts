export interface SimilarRepo {
  name: string;
  similarity: number;
  stars?: number;
  language?: string;
}

export interface AnalysisResult {
  score: number;
  summary: string;
  repo: string;
  confidence: number;
  similarRepos: SimilarRepo[];
  scannedAt: string;
}
