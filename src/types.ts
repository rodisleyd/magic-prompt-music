export interface VocalSettings {
  raspy: number; // 0-100 (Rouquidão)
  tension: number; // 0-100 (Tensão Vocal)
  expressiveness: number; // 0-100 (Expressividade)
  imperfection: number; // 0-100 (Imperfeição/Humanização)
  breathiness: number; // 0-100 (Ar / Sopro)
  brightness: number; // 0-100 (Brilho)
  polish: number; // 0-100 (Polimento)
  archetype: string;
  ambience: 'dry' | 'intimate' | 'normal' | 'wet' | 'stadium';
  analogWarmth: boolean;
}

export interface SavedPrompt {
  id: string;
  songName: string;
  artistName: string;
  voiceTimbre?: string;
  vocalSettings?: VocalSettings;
  prompt: string;
  createdAt: string;
}

export interface MusicAnalysis {
  songName?: string;
  artistName?: string;
  bpm: string;
  scale?: string; // New field for Musical Scale
  drums: string;
  drumsSummary: string;
  bass: string;
  harmony: string;
  vocals: string;
  production: string;
  vocalSettings?: VocalSettings;
  finalPrompt: string;
}
