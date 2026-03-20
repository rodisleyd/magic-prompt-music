import React, { useState, useEffect, useRef } from 'react';
import { Headphones, Sparkles, Upload, Save, Copy, History, Share2, Trash2, Loader2, Check, X, ArrowLeft, ChevronDown, ChevronUp, Mic2, Activity, Zap, Waves, Music2, Cpu, Wind, HelpCircle, BookOpen, Lightbulb, PlayCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { generateMusicPrompt } from './services/gemini';
import { SavedPrompt, VocalSettings } from './types';
import { audioEngine } from './services/audioEngine';

const INITIAL_VOCAL_SETTINGS: VocalSettings = {
  raspy: 0,
  tension: 0,
  expressiveness: 50,
  imperfection: 20,
  breathiness: 10,
  brightness: 50,
  polish: 80,
  archetype: 'Modern Pop',
  ambience: 'normal',
  analogWarmth: true,
};

const ARCHETYPES = [
  // Suave / Intimista
  { id: 'Intimate Folk', label: 'Intimate Folk', icon: <Wind size={16}/>, desc: 'Suave e acústico', category: 'Suave', presets: { breathiness: 80, polish: 30, imperfection: 40, expressiveness: 60 } },
  { id: 'Dreamy Pop', label: 'Dreamy Pop', icon: <Waves size={16}/>, desc: 'Etéreo e com ar', category: 'Suave', presets: { breathiness: 90, brightness: 70, polish: 85 } },
  { id: 'Lo-fi Chill', label: 'Lo-fi Chill', icon: <Headphones size={16}/>, desc: 'Relaxada e simples', category: 'Suave', presets: { breathiness: 50, polish: 20, imperfection: 60 } },
  
  // Intenso / Emocional
  { id: 'Deep Soul', label: 'Deep Soul', icon: <Mic2 size={16}/>, desc: 'Grave e emotivo', category: 'Intenso', presets: { tension: 70, expressiveness: 90, raspy: 30 } },
  { id: 'Raw Blues', label: 'Raw Blues', icon: <Activity size={16}/>, desc: 'Cru e rasgado', category: 'Intenso', presets: { raspy: 80, tension: 60, imperfection: 80, polish: 20 } },
  { id: 'Power Ballad', label: 'Power Ballad', icon: <Zap size={16}/>, desc: 'Grande alcance', category: 'Intenso', presets: { tension: 90, expressiveness: 80, brightness: 70 } },

  // Energia / Rock
  { id: 'Rock Grit', label: 'Rock Grit', icon: <Zap size={16}/>, desc: 'Energia e drive', category: 'Energia', presets: { raspy: 70, tension: 80, expressiveness: 70 } },
  { id: 'Classic Rock', label: 'Classic Rock', icon: <Music2 size={16}/>, desc: 'Potente e aberta', category: 'Energia', presets: { brightness: 80, tension: 60, raspy: 40 } },
  { id: 'Aggressive Alt', label: 'Aggressive Alt', icon: <Activity size={16}/>, desc: 'Intensa e grunge', category: 'Energia', presets: { raspy: 90, tension: 90, imperfection: 70, polish: 30 } },

  // Interpretação
  { id: 'Storyteller', label: 'Storyteller', icon: <Mic2 size={16}/>, desc: 'Foco na letra', category: 'Interpretação', presets: { expressiveness: 95, imperfection: 50, breathiness: 40 } },
  { id: 'Dark Atmospheric', label: 'Dark Atmospheric', icon: <Wind size={16}/>, desc: 'Sombria / Trilhas', category: 'Interpretação', presets: { brightness: 20, breathiness: 70, tension: 40 } },

  // Moderno / Limpo
  { id: 'Modern Pop', label: 'Modern Pop', icon: <Sparkles size={16}/>, desc: 'Limpo e produzido', category: 'Moderno', presets: { polish: 100, brightness: 80, imperfection: 5, raspy: 0 } },
  { id: 'Clean R&B', label: 'Clean R&B', icon: <Headphones size={16}/>, desc: 'Refinada e moderna', category: 'Moderno', presets: { polish: 95, brightness: 60, expressiveness: 80 } },
];

const CATEGORIES = ['Suave', 'Intenso', 'Energia', 'Interpretação', 'Moderno'];

const VOICE_TEMPLATES = [
  { id: 'max-thunder', name: 'Max Thunder', gender: 'M', genre: 'Rock', desc: 'Voz potente e rasgada', timbre: 'Powerful, gravelly male rock vocals with high-energy grit and aggressive drive', presets: { raspy: 85, tension: 90, expressiveness: 80, imperfecton: 40, breathiness: 10, brightness: 75, polish: 60, archetype: 'Rock Grit' } },
  { id: 'roxy-storm', name: 'Roxy Storm', gender: 'F', genre: 'Rock', desc: 'Voz visceral e cortante', timbre: 'Sharp, visceral female rock vocals with intense distortion and powerful projection', presets: { raspy: 80, tension: 95, expressiveness: 85, imperfection: 50, breathiness: 20, brightness: 85, polish: 65, archetype: 'Rock Grit' } },
  { id: 'nara-luz', name: 'Nara Luz', gender: 'F', genre: 'MPB / Bossa', desc: 'Suave e intimista', timbre: 'Soft, intimate female bossa nova vocals with a breathy, velvety texture and delicate delivery', presets: { raspy: 10, tension: 20, expressiveness: 70, imperfection: 30, breathiness: 85, brightness: 40, polish: 80, archetype: 'Intimate Folk' } },
  { id: 'zeca-mar', name: 'Zeca Mar', gender: 'M', genre: 'MPB', desc: 'Quente e narrativa', timbre: 'Warm, narrative male MPB vocals with a rich baritone depth and relaxed emotive flow', presets: { raspy: 25, tension: 30, expressiveness: 80, imperfection: 45, breathiness: 40, brightness: 30, polish: 75, archetype: 'Storyteller' } },
  { id: 'leo-jazz', name: 'Léo Jazz', gender: 'M', genre: 'Blues / Soul', desc: 'Grave e soulful', timbre: 'Deep, soulful male blues vocals with a smoky grit and intense emotional resonance', presets: { raspy: 65, tension: 70, expressiveness: 90, imperfection: 60, breathiness: 30, brightness: 25, polish: 50, archetype: 'Deep Soul' } },
  { id: 'luma-soul', name: 'Luma Soul', gender: 'F', genre: 'Blues / Soul', desc: 'Poderosa e vibrante', timbre: 'Powerful, vibrant female soul vocals with wide dynamic range and soulful rasp', presets: { raspy: 55, tension: 80, expressiveness: 95, imperfection: 40, breathiness: 25, brightness: 70, polish: 75, archetype: 'Deep Soul' } },
  { id: 'neo-star', name: 'Neo Star', gender: 'M', genre: 'Modern Pop', desc: 'Limpo e autotunado', timbre: 'Crystal clean male modern pop vocals with high polish and digital precision', presets: { raspy: 0, tension: 40, expressiveness: 75, imperfection: 5, breathiness: 10, brightness: 80, polish: 100, archetype: 'Modern Pop' } },
  { id: 'mira-pop', name: 'Mira Pop', gender: 'F', genre: 'Modern Pop', desc: 'Brilhante e comercial', timbre: 'Bright, commercial female pop vocals with pristine clarity and polished production', presets: { raspy: 0, tension: 45, expressiveness: 80, imperfection: 10, breathiness: 15, brightness: 90, polish: 100, archetype: 'Modern Pop' } },
  { id: 'dark-vitor', name: 'Vitor Dark', gender: 'M', genre: 'Dark Alt', desc: 'Sombrio e profundo', timbre: 'Deep, dark male alternative vocals with an atmospheric, haunting quality and low brightness', presets: { raspy: 40, tension: 50, expressiveness: 65, imperfection: 55, breathiness: 60, brightness: 15, polish: 40, archetype: 'Dark Atmospheric' } },
  { id: 'luna-mist', name: 'Luna Mist', gender: 'F', genre: 'Dark Alt', desc: 'Etérea e misteriosa', timbre: 'Ethereal, mysterious female alternative vocals with heavy breathiness and haunting echoes', presets: { raspy: 20, tension: 35, expressiveness: 70, imperfection: 45, breathiness: 95, brightness: 25, polish: 55, archetype: 'Dark Atmospheric' } },
];

const ORCHESTRATOR_GROUPS = [
  {
    id: 'guitarras',
    label: 'Guitarras & Efeitos',
    items: [
      { id: 'guitar-solo', label: 'Solo de Guitarra', icon: '🎸' },
      { id: 'overdrive', label: 'Overdrive', icon: '🔥' },
      { id: 'distortion', label: 'Distortion', icon: '⚡' },
      { id: 'chorus', label: 'Chorus', icon: '🌊' },
      { id: 'delay', label: 'Delay/Echo', icon: '🔁' },
      { id: 'wah-wah', label: 'Wah-wah', icon: '👽' },
      { id: 'tapping', label: 'Tapping', icon: '👆' },
    ]
  },
  {
    id: 'baixo',
    label: 'Contrabaixo & Groove',
    items: [
      { id: 'slap-bass', label: 'Slap Bass', icon: '🤜' },
      { id: 'fretless', label: 'Fretless Bass', icon: '🎻' },
      { id: 'bass-solo', label: 'Solo de Baixo', icon: '🎸' },
      { id: 'fingered', label: 'Fingered (Dedo)', icon: '🖐️' },
      { id: 'picked', label: 'Picked (Palheta)', icon: '📐' },
      { id: 'synth-bass', label: 'Synth Bass', icon: '🎹' },
    ]
  },
  {
    id: 'bateria',
    label: 'Bateria & Ritmo',
    items: [
      { id: 'drum-solo', label: 'Solo de Bateria', icon: '🥁' },
      { id: 'drum-fills', label: 'Drum Fills', icon: '💥' },
      { id: 'double-kick', label: 'Bumbo Duplo', icon: '👣' },
      { id: 'brushes', label: 'Jazz Brushes', icon: '🧹' },
      { id: 'blast-beat', label: 'Blast Beat', icon: '💣' },
      { id: 'percussion-solo', label: 'Percussão Solo', icon: '🪘' },
      { id: 'samba-perc', label: 'Samba Percussion', icon: '🎊' },
    ]
  },
  {
    id: 'brasil-extras',
    label: 'Brasil & Extras',
    items: [
      { id: 'cavaquinho', label: 'Cavaquinho', icon: '🪕' },
      { id: 'flute-solo', label: 'Solo de Flauta', icon: '🎶' },
      { id: 'sax-solo', label: 'Solo de Sax', icon: '🎷' },
      { id: 'harmonica', label: 'Gaita Blues', icon: '🎷' },
      { id: 'claps', label: 'Palmas', icon: '👏' },
      { id: 'screams', label: 'Gritos/Crowd', icon: '🗣️' },
    ]
  }
];

export default function App() {
  const [songName, setSongName] = useState('');
  const [artistName, setArtistName] = useState('');
  const [voiceTimbre, setVoiceTimbre] = useState('');
  const [vocalSettings, setVocalSettings] = useState<VocalSettings>(INITIAL_VOCAL_SETTINGS);
  const [showStudio, setShowStudio] = useState(false);
  const [showOrchestrator, setShowOrchestrator] = useState(false);
  const [studioTab, setStudioTab] = useState<'dna' | 'templates'>('dna');
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [savedPrompts, setSavedPrompts] = useState<SavedPrompt[]>([]);
  const [view, setView] = useState<'main' | 'saved' | 'help'>('main');
  const [audioFile, setAudioFile] = useState<{ data: string; mimeType: string } | null>(null);
  const [fileName, setFileName] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [selectedInstruments, setSelectedInstruments] = useState<string[]>([]);
  const [analysisData, setAnalysisData] = useState<{ bpm?: string, scale?: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem('magic_prompts');
    if (stored) {
      setSavedPrompts(JSON.parse(stored));
    }
  }, []);

  const saveToLocalStorage = (prompts: SavedPrompt[]) => {
    localStorage.setItem('magic_prompts', JSON.stringify(prompts));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(',')[1];
        setAudioFile({ data: base64, mimeType: file.type });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = async () => {
    if (!audioFile && (!songName || !artistName)) {
      alert('Por favor, insira o nome da música e do artista OU anexe um arquivo de áudio.');
      return;
    }

    setIsGenerating(true);
    setGeneratedPrompt('');
    try {
      const result = await generateMusicPrompt(
        songName, 
        artistName, 
        audioFile || undefined, 
        fileName, 
        voiceTimbre,
        showStudio ? vocalSettings : undefined,
        selectedInstruments
      );
      
      if (!songName && result.songName) setSongName(result.songName);
      setGeneratedPrompt(result.finalPrompt);
      setAnalysisData({ bpm: result.bpm, scale: result.scale });
    } catch (error: any) {
      console.error(error);
      const msg = error.message || 'Ops! Algo deu errado na análise. Verifique sua conexão e tente novamente.';
      alert(msg);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = () => {
    if (!generatedPrompt) return;
    
    const newPrompt: SavedPrompt = {
      id: crypto.randomUUID(),
      songName,
      artistName,
      voiceTimbre,
      vocalSettings: showStudio ? vocalSettings : undefined,
      prompt: generatedPrompt,
      createdAt: new Date().toLocaleString('pt-BR'),
    };

    const updated = [newPrompt, ...savedPrompts];
    setSavedPrompts(updated);
    saveToLocalStorage(updated);
    setSaveSuccess(true);

    setSongName('');
    setArtistName('');
    setVoiceTimbre('');
    setGeneratedPrompt('');
    setAudioFile(null);
    setFileName('');
    setVocalSettings(INITIAL_VOCAL_SETTINGS);
    setShowStudio(false);
    setShowOrchestrator(false);
    setSelectedTemplate(null);
    setStudioTab('dna');
    setSelectedInstruments([]);
    setAnalysisData(null);

    setTimeout(() => setSaveSuccess(false), 2000);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const handlePreview = async (gender: 'male' | 'female') => {
    setIsPlayingPreview(true);
    try {
      await audioEngine.playPreview(gender, vocalSettings);
      setTimeout(() => setIsPlayingPreview(false), 2000);
    } catch (e) {
      console.error(e);
      setIsPlayingPreview(false);
    }
  };

  const handleDelete = (id: string) => {
    const updated = savedPrompts.filter(p => p.id !== id);
    setSavedPrompts(updated);
    saveToLocalStorage(updated);
  };

  const handleShare = (prompt: SavedPrompt) => {
    const text = `Magic Prompt Music 🪄\n\nMúsica: ${prompt.songName}\nArtista: ${prompt.artistName}${prompt.voiceTimbre ? `\nTimbre: ${prompt.voiceTimbre}` : ''}\n\nPrompt Suno AI:\n${prompt.prompt}`;
    if (navigator.share) {
      navigator.share({
        title: 'Magic Prompt Music',
        text: text,
      }).catch(console.error);
    } else {
      handleCopy(text);
      alert('Copiado para a área de transferência!');
    }
  };

  if (view === 'help') {
    return (
      <div className="min-h-screen bg-white p-6 md:p-12 max-w-4xl mx-auto pb-24">
        <header className="flex items-center justify-between mb-16">
          <button onClick={() => setView('main')} className="flex items-center gap-2 text-zinc-500 hover:text-zinc-900 transition-colors font-bold uppercase text-[10px] tracking-widest">
            <ArrowLeft size={16} />
            Voltar ao Studio
          </button>
          <div className="text-center">
            <h2 className="text-2xl font-black uppercase tracking-tighter">Magic Masterclass</h2>
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Domine a Engenharia de Prompt Musical</p>
          </div>
          <div className="w-20" />
        </header>

        <div className="space-y-20">
          {/* Section 1: Início */}
          <section className="relative">
            <div className="absolute -left-4 top-0 w-1 h-full bg-zinc-900 rounded-full" />
            <div className="flex items-center gap-4 mb-6">
              <div className="w-10 h-10 bg-zinc-900 text-white rounded-2xl flex items-center justify-center font-black">01</div>
              <h3 className="text-xl font-black uppercase tracking-tight">A Base de Tudo</h3>
            </div>
            <p className="text-zinc-500 leading-relaxed mb-8">
              O segredo para um prompt matador no Suno AI começa com a <strong>referência certa</strong>. Você tem três caminhos:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-6 bg-zinc-50 rounded-3xl border border-zinc-100 transition-all hover:bg-white hover:shadow-xl group">
                <Music2 className="mb-4 text-zinc-400 group-hover:text-zinc-900 transition-colors" size={24} />
                <h4 className="font-black uppercase text-xs mb-2">Música + Artista</h4>
                <p className="text-[11px] text-zinc-400 leading-normal">O método clássico. Nossa IA analisa a estrutura, BPM e instrumentação da música de referência.</p>
              </div>
              <div className="p-6 bg-zinc-50 rounded-3xl border border-zinc-100 transition-all hover:bg-white hover:shadow-xl group">
                <Upload className="mb-4 text-zinc-400 group-hover:text-zinc-900 transition-colors" size={24} />
                <h4 className="font-black uppercase text-xs mb-2">Upload de MP3</h4>
                <p className="text-[11px] text-zinc-400 leading-normal">O nível avançado. Anexe um áudio real e extrairemos o "mood" exato daquela gravação.</p>
              </div>
            </div>
          </section>

          {/* Section 2: Vocal Studio DNA */}
          <section className="relative">
            <div className="absolute -left-4 top-0 w-1 h-full bg-zinc-100 rounded-full" />
            <div className="flex items-center gap-4 mb-8">
              <div className="w-10 h-10 bg-zinc-100 text-zinc-400 rounded-2xl flex items-center justify-center font-black group-hover:bg-zinc-900 group-hover:text-white transition-all">02</div>
              <h3 className="text-xl font-black uppercase tracking-tight">Vocal Studio & DNA</h3>
            </div>
            <p className="text-zinc-500 leading-relaxed mb-10">
              O Vocal Studio 2.0 permite esculpir a voz. Aqui está o que cada controle do <strong>DNA Vocal</strong> faz:
            </p>
            
            <div className="space-y-4">
              {[
                { label: 'Raspy (Rouquidão)', desc: 'Adiciona granulação e "drive" à voz. Essencial para Rock e Blues.', icon: <Waves size={16}/> },
                { label: 'Tension (Tensão)', desc: 'Simula o esforço das cordas vocais. Valores altos geram vozes mais agudas e intensas.', icon: <Activity size={16}/> },
                { label: 'Expressiveness', desc: 'Controla o vibrato e a variação dinâmica. Ideal para Soul e MPB.', icon: <Zap size={16}/> },
                { label: 'Breathiness (Ar)', desc: 'O famoso "sopro" na voz. Dá um ar intimista e sensual.', icon: <Wind size={16}/> },
                { label: 'Brightness (Brilho)', desc: 'Controla a clareza. Valores baixos geram vozes sombrias e profundas.', icon: <Sparkles size={16}/> },
                { label: 'Polish (Polimento)', desc: 'Define se a voz soa crua (lo-fi) ou super produzida (pop moderno).', icon: <Cpu size={16}/> },
              ].map((item, i) => (
                <div key={i} className="flex gap-4 p-5 rounded-2xl bg-zinc-50/50 border border-zinc-100/50 hover:bg-white hover:shadow-lg transition-all items-start group">
                  <div className="p-3 bg-white rounded-xl shadow-sm group-hover:scale-110 transition-transform">{item.icon}</div>
                  <div>
                    <h5 className="font-black uppercase text-[10px] tracking-widest mb-1">{item.label}</h5>
                    <p className="text-[11px] text-zinc-400 leading-normal">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Section 3: Pro Tips */}
          <section className="p-10 bg-zinc-900 text-white rounded-[40px] shadow-2xl relative overflow-hidden">
            <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/5 blur-3xl rounded-full" />
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-8">
                <Lightbulb className="text-yellow-400" size={24} />
                <h3 className="text-xl font-black uppercase tracking-tight">Dicas de Mestre</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">Vibe Indie / Alt</h4>
                  <p className="text-xs text-zinc-400 leading-relaxed italic">
                    "Use alto **Breathiness** (80%+) e baixo **Polish** (20-40%). Isso cria aquela voz 'cool' e orgânica de quarto."
                  </p>
                </div>
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">Poder do MP3</h4>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Ao fazer upload, não precisa digitar o timbre. Nossa IA vai "ouvir" a gravação e injetar as características no prompt.
                  </p>
                </div>
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">O Segredo do Brilho</h4>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Para um som de **Jazz ou Blues Antigo**, abaixe o **Brightness** para 20%. Isso remove as frequências digitais modernas.
                  </p>
                </div>
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">Voz Elza Soares</h4>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Quer aquele timbre icônico? Combine **Raspy (90%)** + **Expressiveness (100%)** + **Tension (60%)**.
                  </p>
                </div>
              </div>


              <button 
                onClick={() => setView('main')}
                className="mt-12 w-full py-5 bg-white text-zinc-900 font-black uppercase text-[11px] tracking-widest rounded-2xl hover:scale-[1.02] transition-all flex items-center justify-center gap-3 active:scale-95"
              >
                <PlayCircle size={18} /> COMEÇAR A CRIAR AGORA
              </button>
            </div>
          </section>
        </div>
      </div>
    );
  }

  if (view === 'saved') {
    return (
      <div className="min-h-screen bg-white p-6 md:p-12 max-w-4xl mx-auto">
        <header className="flex items-center justify-between mb-12">
          <button onClick={() => setView('main')} className="flex items-center gap-2 text-zinc-500 hover:text-zinc-900 transition-colors font-bold uppercase text-[10px] tracking-widest">
            <ArrowLeft size={16} />
            Voltar
          </button>
          <div className="text-center">
            <h2 className="text-2xl font-black uppercase tracking-tighter">Prompts Salvos</h2>
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Sua biblioteca de inspiração</p>
          </div>
          <div className="w-16" />
        </header>

        <div className="space-y-6">
          {savedPrompts.length === 0 ? (
            <div className="text-center py-20 text-zinc-300">
              <History size={48} className="mx-auto mb-4 opacity-20" />
              <p className="font-bold uppercase tracking-widest text-xs">Nenhum prompt salvo ainda.</p>
            </div>
          ) : (
            savedPrompts.map((p) => (
              <div key={p.id} className="p-8 border border-zinc-100 rounded-3xl bg-zinc-50/50 hover:bg-white hover:shadow-xl transition-all duration-300 group">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-black text-lg uppercase tracking-tight">{p.songName}</h3>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">{p.artistName} • {p.createdAt}</p>
                    {p.voiceTimbre && (
                      <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mt-1">Timbre: {p.voiceTimbre}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleShare(p)} className="p-2 text-zinc-400 hover:text-zinc-900 transition-colors"><Share2 size={16} /></button>
                    <button onClick={() => handleDelete(p.id)} className="p-2 text-zinc-400 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                  </div>
                </div>
                <p className="text-zinc-500 text-sm italic mb-6 line-clamp-3">"{p.prompt}"</p>
                <button 
                  onClick={() => {
                    setSongName(p.songName);
                    setArtistName(p.artistName);
                    setVoiceTimbre(p.voiceTimbre || '');
                    if (p.vocalSettings) {
                      setVocalSettings(p.vocalSettings);
                      setShowStudio(true);
                      setStudioTab('dna');
                    } else {
                      setShowStudio(false);
                    }
                    setGeneratedPrompt(p.prompt);
                    setView('main');
                  }}
                  className="w-full py-3 border border-zinc-200 text-zinc-600 font-bold uppercase text-[10px] tracking-widest rounded-xl hover:border-zinc-900 hover:text-zinc-900 transition-all"
                >
                  REUTILIZAR PROMPT
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white py-12 px-6 md:px-12 max-w-4xl mx-auto flex flex-col items-center relative">
      <div className="flex items-center justify-between w-full mb-16">
        <div className="w-10" /> {/* Spacer */}
        <img src="/logo_magic_prompt.png" alt="Magic Prompt Music" className="w-24 h-auto" />
        <button 
          onClick={() => setView('help')}
          className="p-2.5 bg-zinc-50 rounded-full border border-zinc-100 text-zinc-400 hover:text-zinc-900 hover:bg-white hover:shadow-lg transition-all"
          title="Magic Masterclass"
        >
          <HelpCircle size={20} />
        </button>
      </div>

      <AnimatePresence>
        {analysisData && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full flex justify-center gap-4 mb-8"
          >
            <div className="px-6 py-2 bg-zinc-900 text-white rounded-full flex items-center gap-3 shadow-lg border border-white/10">
              <Activity size={14} className="text-zinc-400" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">{analysisData.bpm} BPM</span>
            </div>
            {analysisData.scale && (
              <div className="px-6 py-2 bg-zinc-900 text-white rounded-full flex items-center gap-3 shadow-lg border border-white/10">
                <Music2 size={14} className="text-zinc-400" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">{analysisData.scale}</span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="w-full flex flex-col gap-6 mb-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="input-label">Música Base</label>
            <input type="text" value={songName} onChange={(e) => setSongName(e.target.value)} className="input-field" placeholder="Ex: Nascente" />
          </div>
          <div>
            <label className="input-label">Artista Referência</label>
            <input type="text" value={artistName} onChange={(e) => setArtistName(e.target.value)} className="input-field" placeholder="Ex: Flavio Venturini" />
          </div>
        </div>
        
        <div className="relative">
          <label className="input-label">Timbre / DNA Vocal</label>
          <div className="flex gap-2">
            <input 
              type="text" 
              value={voiceTimbre} 
              onChange={(e) => setVoiceTimbre(e.target.value)} 
              className="input-field" 
              placeholder="Ex: Voz da Oleta Adams, Timbre rouco..." 
            />
            <div className="flex gap-2">
              <button 
                onClick={() => setShowStudio(!showStudio)}
                className={`px-4 rounded-xl border transition-all flex items-center gap-2 group ${showStudio ? 'bg-zinc-900 border-zinc-900 text-white' : 'bg-white border-zinc-200 text-zinc-500 hover:border-zinc-400'}`}
              >
                <Sparkles size={16} className={showStudio ? 'text-yellow-400' : 'group-hover:text-zinc-900'} />
                <span className="text-[10px] font-black uppercase tracking-widest whitespace-nowrap">Studio</span>
                {showStudio ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
              <button 
                onClick={() => setShowOrchestrator(!showOrchestrator)}
                className={`px-4 rounded-xl border transition-all flex items-center gap-2 group ${showOrchestrator ? 'bg-zinc-900 border-zinc-900 text-white' : 'bg-white border-zinc-200 text-zinc-500 hover:border-zinc-400'}`}
              >
                <Mic2 size={16} className={showOrchestrator ? 'text-zinc-400' : 'group-hover:text-zinc-900'} />
                <span className="text-[10px] font-black uppercase tracking-widest whitespace-nowrap">Orquestrador</span>
                {selectedInstruments.length > 0 && <span className="bg-zinc-800 text-[8px] px-1.5 py-0.5 rounded-full text-white font-black">{selectedInstruments.length}</span>}
                {showOrchestrator ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
            </div>
          </div>
        </div>

        <AnimatePresence>
          {showStudio && (
            <motion.div 
              initial={{ opacity: 0, y: -20, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -20, height: 0 }}
              className="overflow-hidden"
            >
              <div className="p-8 bg-zinc-50 rounded-[32px] border border-zinc-100 shadow-xl mt-2 relative">
                {/* Internal Tabs */}
                <div className="flex gap-4 mb-8 border-b border-zinc-200/60 pb-4">
                  <button 
                    onClick={() => setStudioTab('dna')}
                    className={`text-[10px] font-black uppercase tracking-[0.2em] transition-all pb-2 relative ${studioTab === 'dna' ? 'text-zinc-900' : 'text-zinc-400 hover:text-zinc-600'}`}
                  >
                    DNA Vocal
                    {studioTab === 'dna' && <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-zinc-900" />}
                  </button>
                  <button 
                    onClick={() => setStudioTab('templates')}
                    className={`text-[10px] font-black uppercase tracking-[0.2em] transition-all pb-2 relative ${studioTab === 'templates' ? 'text-zinc-900' : 'text-zinc-400 hover:text-zinc-600'}`}
                  >
                    Modelos de Voz
                    {studioTab === 'templates' && <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-zinc-900" />}
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                  {studioTab === 'dna' ? (
                    <>
                      {/* DNA Left Column */}
                      <div className="space-y-6">
                        <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400 mb-4 flex items-center gap-2">
                          <Cpu size={14} /> CONTROLES DNA
                        </h4>
                        
                        <div className="grid grid-cols-1 gap-5">
                          {[
                            { id: 'raspy', label: 'Rouquidão', icon: <Waves size={14}/>, val: vocalSettings.raspy },
                            { id: 'tension', label: 'Tensão Vocal', icon: <Activity size={14}/>, val: vocalSettings.tension },
                            { id: 'expressiveness', label: 'Expressividade', icon: <Zap size={14}/>, val: vocalSettings.expressiveness },
                            { id: 'imperfection', label: 'Imperfeição', icon: <Activity size={14}/>, val: vocalSettings.imperfection },
                            { id: 'breathiness', label: 'Ar / Sopro', icon: <Wind size={14}/>, val: vocalSettings.breathiness },
                            { id: 'brightness', label: 'Brilho', icon: <Sparkles size={14}/>, val: vocalSettings.brightness },
                            { id: 'polish', label: 'Polimento', icon: <Mic2 size={14}/>, val: vocalSettings.polish },
                          ].map((s) => (
                            <div key={s.id} className="space-y-2">
                              <div className="flex justify-between items-center">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 flex items-center gap-2">
                                  {s.icon} {s.label}
                                </label>
                                <span className="text-[10px] font-black text-zinc-400">{s.val}%</span>
                              </div>
                              <input 
                                type="range" 
                                min="0" max="100" 
                                value={s.val}
                                onChange={(e) => {
                                  setVocalSettings({...vocalSettings, [s.id]: parseInt(e.target.value)});
                                  setSelectedTemplate(null);
                                }}
                                className="w-full h-1 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-zinc-900 border-none"
                              />
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* DNA Right Column */}
                      <div className="space-y-8">
                        <div>
                          <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400 mb-6 flex items-center gap-2">
                            <Sparkles size={14} /> ARQUÉTIPOS
                          </h4>
                          
                          <div className="space-y-6 max-h-[380px] overflow-y-auto pr-2 custom-scrollbar">
                            {CATEGORIES.map(cat => (
                              <div key={cat} className="space-y-3">
                                <h5 className="text-[9px] font-black uppercase tracking-widest text-zinc-300 border-b border-zinc-100 pb-1">{cat}</h5>
                                <div className="grid grid-cols-2 gap-2">
                                  {ARCHETYPES.filter(a => a.category === cat).map((a) => (
                                    <button
                                      key={a.id}
                                      onClick={() => {
                                        const newSettings = { ...vocalSettings, archetype: a.id, ...(a.presets || {}) };
                                        setVocalSettings(newSettings);
                                        setSelectedTemplate(null);
                                      }}
                                      className={`p-3 rounded-xl border transition-all text-left ${vocalSettings.archetype === a.id ? 'bg-white border-zinc-900 shadow-md ring-1 ring-zinc-900' : 'bg-white border-zinc-100 hover:border-zinc-300'}`}
                                    >
                                      <div className="flex items-center gap-2 mb-0.5">
                                        {a.icon}
                                        <span className="text-[10px] font-black uppercase tracking-tight line-clamp-1">{a.label}</span>
                                      </div>
                                      <p className="text-[8px] text-zinc-400 font-bold uppercase line-clamp-1">{a.desc}</p>
                                    </button>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="pt-4 mt-4 border-t border-zinc-200/40">
                          <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400 mb-4 flex items-center gap-2">
                             TESTE O timbre
                          </h4>
                          <div className="grid grid-cols-2 gap-3">
                            <button 
                              onClick={() => handlePreview('male')}
                              disabled={isPlayingPreview}
                              className="py-3 px-4 bg-white border border-zinc-200 rounded-2xl text-[9px] font-black uppercase tracking-widest text-zinc-600 hover:border-zinc-900 hover:text-zinc-900 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                              {isPlayingPreview ? <Loader2 size={12} className="animate-spin" /> : <PlayCircle size={14} />}
                              OUVIR MASCULINO
                            </button>
                            <button 
                              onClick={() => handlePreview('female')}
                              disabled={isPlayingPreview}
                              className="py-3 px-4 bg-white border border-zinc-200 rounded-2xl text-[9px] font-black uppercase tracking-widest text-zinc-600 hover:border-zinc-900 hover:text-zinc-900 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                              {isPlayingPreview ? <Loader2 size={12} className="animate-spin" /> : <PlayCircle size={14} />}
                              OUVIR FEMININO
                            </button>
                          </div>
                          <p className="text-[8px] text-zinc-400 font-bold uppercase mt-3 text-center opacity-60">Amostra sintética de processamento (2s)</p>
                        </div>

                        <div>
                          <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400 mb-6 flex items-center gap-2">
                            <Music2 size={14} /> CAMADA DE PRODUÇÃO
                          </h4>
                          <div className="space-y-4">
                            <div className="flex flex-wrap gap-2">
                              {['dry', 'intimate', 'normal', 'wet', 'stadium'].map((am) => (
                                <button
                                  key={am}
                                  onClick={() => setVocalSettings({...vocalSettings, ambience: am as any})}
                                  className={`px-4 py-2 rounded-full border text-[9px] font-black uppercase tracking-widest transition-all ${vocalSettings.ambience === am ? 'bg-zinc-900 border-zinc-900 text-white' : 'bg-white border-zinc-200 text-zinc-500 hover:border-zinc-400'}`}
                                >
                                  {am}
                                </button>
                              ))}
                            </div>
                            <label className="flex items-center gap-3 cursor-pointer group">
                              <div className="relative flex items-center">
                                <input 
                                  type="checkbox" 
                                  className="sr-only peer" 
                                  checked={vocalSettings.analogWarmth}
                                  onChange={(e) => setVocalSettings({...vocalSettings, analogWarmth: e.target.checked})}
                                />
                                <div className="w-10 h-5 bg-zinc-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-zinc-900"></div>
                              </div>
                              <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 group-hover:text-zinc-900">Analog Saturation</span>
                            </label>
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    /* Templates View */
                    <div className="col-span-1 lg:col-span-2 space-y-8">
                      <div className="flex items-center justify-between">
                        <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400 flex items-center gap-2">
                          <Mic2 size={14} /> BIBLIOTECA DE MODELOS
                        </h4>
                        <p className="text-[8px] font-black uppercase tracking-widest text-zinc-300">Selecione uma base pronta</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                        {VOICE_TEMPLATES.map((t) => (
                          <button
                            key={t.id}
                            onClick={() => {
                              setSelectedTemplate(t.id);
                              setVoiceTimbre(t.timbre);
                              setVocalSettings({ ...vocalSettings, ...t.presets });
                            }}
                            className={`p-5 rounded-3xl border transition-all text-left group relative overflow-hidden ${selectedTemplate === t.id ? 'bg-white border-zinc-900 shadow-xl ring-2 ring-zinc-900/10' : 'bg-white border-zinc-100 hover:border-zinc-300'}`}
                          >
                            <div className="flex justify-between items-start mb-3">
                              <div className={`p-2 rounded-xl text-white ${t.gender === 'M' ? 'bg-blue-500' : 'bg-rose-500'}`}>
                                {t.gender === 'M' ? <Mic2 size={12} /> : <Mic2 size={12} className="rotate-180" />}
                              </div>
                              <span className="text-[8px] font-black uppercase tracking-widest text-zinc-400 bg-zinc-50 px-2 py-1 rounded-full group-hover:bg-zinc-100 transition-colors">{t.genre}</span>
                            </div>
                            <h5 className="font-black text-xs uppercase tracking-tight mb-1">{t.name}</h5>
                            <p className="text-[9px] text-zinc-400 font-bold uppercase mb-3">{t.desc}</p>
                            <div className="space-y-2 mt-auto">
                              <div className="flex items-center gap-2">
                                <span className="text-[7px] font-black uppercase tracking-widest text-zinc-700 w-10">Raspy</span>
                                <div className="h-1 flex-1 bg-zinc-200 rounded-full overflow-hidden">
                                  <motion.div animate={{ width: `${t.presets.raspy}%` }} className="h-full bg-zinc-800" />
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[7px] font-black uppercase tracking-widest text-zinc-700 w-10">Expr</span>
                                <div className="h-1 flex-1 bg-zinc-200 rounded-full overflow-hidden">
                                  <motion.div animate={{ width: `${t.presets.expressiveness}%` }} className="h-full bg-zinc-800" />
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[7px] font-black uppercase tracking-widest text-zinc-700 w-10">Air</span>
                                <div className="h-1 flex-1 bg-zinc-200 rounded-full overflow-hidden">
                                  <motion.div animate={{ width: `${t.presets.breathiness}%` }} className="h-full bg-zinc-800" />
                                </div>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showOrchestrator && (
            <motion.div 
              initial={{ opacity: 0, y: -20, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -20, height: 0 }}
              className="overflow-hidden"
            >
              {/* Orchestrator Section */}
              <div className="p-8 bg-zinc-50 rounded-[32px] border border-zinc-100 mt-2">
                <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400 mb-8 flex items-center gap-2">
                  <Mic2 size={14} /> ORQUESTRADOR DE INSTRUMENTOS & TÉCNICAS
                </h4>
                
                <div className="space-y-10">
                  {ORCHESTRATOR_GROUPS.map(group => (
                    <div key={group.id}>
                      <p className="text-[9px] font-black uppercase tracking-widest text-zinc-300 mb-4 ml-1 flex items-center gap-2">
                         <div className="w-1.5 h-1.5 bg-zinc-200 rounded-full" /> {group.label}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {group.items.map(item => (
                          <button
                            key={item.id}
                            onClick={() => {
                              setSelectedInstruments(prev => 
                                prev.includes(item.label) ? prev.filter(i => i !== item.label) : [...prev, item.label]
                              );
                            }}
                            className={`px-4 py-2.5 rounded-xl border text-[10px] font-bold uppercase transition-all flex items-center gap-2 ${selectedInstruments.includes(item.label) ? 'bg-zinc-900 border-zinc-900 text-white shadow-md' : 'bg-white border-zinc-200 text-zinc-500 hover:border-zinc-400'}`}
                          >
                            <span className="text-sm">{item.icon}</span>
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="w-full max-w-md ml-auto flex flex-col gap-4 mb-20">
        <button onClick={() => fileInputRef.current?.click()} className="btn-gray">
          <Upload size={16} />
          {fileName ? fileName : 'ANEXAR REFERÊNCIA .MP3'}
        </button>
        <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="audio/*" className="hidden" />
        
        <div className="grid grid-cols-2 gap-4">
          <button onClick={() => setView('saved')} className="btn-gray w-full">
            <History size={16} /> PROMPTS
          </button>
          <button 
            onClick={handleGenerate} 
            disabled={isGenerating} 
            className="w-full py-5 bg-zinc-900 text-white font-black uppercase tracking-[0.2em] text-[11px] rounded-2xl hover:bg-black transition-all flex items-center justify-center gap-3 shadow-xl disabled:opacity-50"
          >
            {isGenerating ? <Loader2 className="animate-spin" size={18} /> : 'CRIAR MÁGICA'}
          </button>
        </div>
      </div>

      <div className="w-full mb-8">
        <div className="flex justify-between items-end mb-2">
          <label className="input-label mb-0">Prompt Master</label>
          <span className={`text-[10px] font-black tracking-widest ${generatedPrompt.length > 1000 ? 'text-red-500' : 'text-zinc-400'}`}>
            {generatedPrompt.length} / 1000
          </span>
        </div>
        <div className="relative group">
          <textarea value={generatedPrompt} readOnly className="output-area" placeholder="O prompt aparecerá aqui..." />
          <AnimatePresence>
            {isGenerating && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center rounded-3xl z-10">
                <div className="flex flex-col items-center gap-4">
                  <div className="flex gap-1.5">
                    {[0, 1, 2].map((i) => (
                      <motion.div key={i} animate={{ height: [12, 32, 12], backgroundColor: ['#d1d5db', '#000', '#d1d5db'] }} transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.15 }} className="w-1 rounded-full" />
                    ))}
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-500 animate-pulse">Engenharia de Prompt</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="flex gap-4">
        <button onClick={handleSave} disabled={!generatedPrompt || isGenerating} className="btn-outline flex items-center gap-2 disabled:opacity-50">
          {saveSuccess ? <Check size={14} className="text-green-500" /> : <Save size={14} />}
          {saveSuccess ? 'SALVO!' : 'SALVAR'}
        </button>
        <button onClick={() => handleCopy(generatedPrompt)} disabled={!generatedPrompt || isGenerating} className="btn-outline flex items-center gap-2 disabled:opacity-50">
          {copySuccess ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
          {copySuccess ? 'COPIADO!' : 'COPIAR'}
        </button>
      </div>
    </div>
  );
}

