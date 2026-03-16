export interface SavedPrompt {
  id: string;
  songName: string;
  artistName: string;
  prompt: string;
  createdAt: string;
}

export interface MusicAnalysis {
  songName?: string;
  artistName?: string;
  bpm: string;
  drums: string;
  drumsSummary: string;
  bass: string;
  harmony: string;
  vocals: string;
  production: string;
  finalPrompt: string;
}
