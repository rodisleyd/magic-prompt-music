import React, { useState, useEffect, useRef } from 'react';
import { Headphones, Sparkles, Upload, Save, Copy, History, Share2, Trash2, Loader2, Check, X, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { generateMusicPrompt } from './services/gemini';
import { SavedPrompt } from './types';

export default function App() {
  const [songName, setSongName] = useState('');
  const [artistName, setArtistName] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [savedPrompts, setSavedPrompts] = useState<SavedPrompt[]>([]);
  const [view, setView] = useState<'main' | 'saved'>('main');
  const [audioFile, setAudioFile] = useState<{ data: string; mimeType: string } | null>(null);
  const [fileName, setFileName] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

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
    setGeneratedPrompt(''); // Limpar prompt anterior antes de começar
    try {
      const result = await generateMusicPrompt(songName, artistName, audioFile || undefined, fileName);
      
      // Se o usuário não forneceu o nome da música e a IA identificou, preencher automaticamente
      if (!songName && result.songName) setSongName(result.songName);
      
      setGeneratedPrompt(result.finalPrompt);
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
      prompt: generatedPrompt,
      createdAt: new Date().toLocaleString('pt-BR'),
    };

    const updated = [newPrompt, ...savedPrompts];
    setSavedPrompts(updated);
    saveToLocalStorage(updated);
    setSaveSuccess(true);

    // Limpar campos após salvar
    setSongName('');
    setArtistName('');
    setGeneratedPrompt('');
    setAudioFile(null);
    setFileName('');

    setTimeout(() => setSaveSuccess(false), 2000);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const handleDelete = (id: string) => {
    const updated = savedPrompts.filter(p => p.id !== id);
    setSavedPrompts(updated);
    saveToLocalStorage(updated);
  };

  const handleShare = (prompt: SavedPrompt) => {
    const text = `Magic Prompt Music 🪄\n\nMúsica: ${prompt.songName}\nArtista: ${prompt.artistName}\n\nPrompt Suno AI:\n${prompt.prompt}`;
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
          <div className="w-16" /> {/* Spacer */}
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
    <div className="min-h-screen bg-white py-12 px-6 md:px-12 max-w-4xl mx-auto flex flex-col items-center">
      {/* Logo */}
      <div className="flex flex-col items-center mb-16">
        <img 
          src="/logo_magic_prompt.png" 
          alt="Magic Prompt Music" 
          className="w-24 h-auto mb-4"
        />
      </div>

      {/* Inputs Section */}
      <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div>
          <label className="input-label">Nome da Música</label>
          <input 
            type="text" 
            value={songName}
            onChange={(e) => setSongName(e.target.value)}
            className="input-field"
            placeholder="Digite o nome..."
          />
        </div>
        <div>
          <label className="input-label">Banda / Cantor</label>
          <input 
            type="text" 
            value={artistName}
            onChange={(e) => setArtistName(e.target.value)}
            className="input-field"
            placeholder="Digite o artista..."
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="w-full max-w-md ml-auto flex flex-col gap-4 mb-16">
        <button 
          onClick={() => fileInputRef.current?.click()}
          className="btn-gray"
        >
          <Upload size={16} />
          {fileName ? fileName : 'ANEXAR ARQUIVO .MP3'}
        </button>
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileUpload} 
          accept="audio/*" 
          className="hidden" 
        />
        
        <button 
          onClick={() => setView('saved')}
          className="btn-gray"
        >
          <History size={16} />
          PROMPTS SALVOS
        </button>

        <button 
          onClick={handleGenerate}
          disabled={isGenerating}
          className="w-full py-5 bg-zinc-900 text-white font-black uppercase tracking-[0.3em] text-[11px] rounded-xl hover:bg-black transition-all flex items-center justify-center gap-3 shadow-xl disabled:opacity-50"
        >
          {isGenerating ? (
            <>
              <Loader2 className="animate-spin" size={18} />
              ANALISANDO...
            </>
          ) : 'GERAR PROMPT MÁGICO'}
        </button>
      </div>

      {/* Output Section */}
      <div className="w-full mb-8">
        <label className="input-label">Prompt Gerado</label>
        <div className="relative group">
          <div className="relative">
            <textarea 
              value={generatedPrompt}
              readOnly
              className="output-area"
              placeholder="Aguardando geração..."
            />
            <div className="absolute bottom-4 right-6 flex items-center gap-2 pointer-events-none">
              <span className={`text-[10px] font-bold tracking-widest ${generatedPrompt.length > 1000 ? 'text-red-500' : 'text-zinc-400'}`}>
                {generatedPrompt.length} / 1000
              </span>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {isGenerating && (
              <motion.div 
                key="loading-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center rounded-3xl z-10"
              >
                <div className="flex flex-col items-center gap-4">
                  <div className="flex gap-1.5">
                    {[0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        animate={{ height: [12, 32, 12], backgroundColor: ['#d1d5db', '#000', '#d1d5db'] }}
                        transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.15 }}
                        className="w-1 rounded-full"
                      />
                    ))}
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-500 animate-pulse">Sintonizando frequências</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Footer Buttons */}
      <div className="flex gap-4">
        <button 
          onClick={handleSave}
          disabled={!generatedPrompt || isGenerating}
          className="btn-outline flex items-center gap-2 disabled:opacity-50"
        >
          {saveSuccess ? <Check size={14} className="text-green-500" /> : <Save size={14} />}
          {saveSuccess ? 'SALVO!' : 'SALVAR'}
        </button>
        <button 
          onClick={() => handleCopy(generatedPrompt)}
          disabled={!generatedPrompt || isGenerating}
          className="btn-outline flex items-center gap-2 disabled:opacity-50"
        >
          {copySuccess ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
          {copySuccess ? 'COPIADO!' : 'COPIAR'}
        </button>
      </div>
    </div>
  );
}

