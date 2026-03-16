import { GoogleGenerativeAI } from "@google/generative-ai";
import { MusicAnalysis } from "./types";

const apiKey = process.env.GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(apiKey);

export async function generateMusicPrompt(
  songName: string,
  artistName: string,
  audioFile?: { data: string; mimeType: string },
  fileName?: string
): Promise<MusicAnalysis> {
  console.log("Generating prompt for:", songName, artistName, fileName);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    generationConfig: {
      responseMimeType: "application/json",
    },
    systemInstruction: `Você é um Engenheiro de Prompts especialista para Suno AI e Udio.
    Sua missão é realizar uma análise técnica de uma música e gerar um prompt mestre seguir estas diretrizes:

    1. O resultado final (campo "finalPrompt") deve ser um ÚNICO PARÁGRAFO fluido, inteiramente em INGLÊS.
    2. Este parágrafo deve sintetizar: BPM, estilo da bateria/ritmo, tipo de baixo, instrumentos harmônicos, estilo vocal e detalhes de produção/mixagem.
    3. CRÍTICO: Nunca mencione o nome do artista, da banda ou o título da música DENTRO do "finalPrompt".
    4. NÃO USE numeração ou marcadores.
    5. O arquivo de áudio MP3 é SUFICIENTE por si só para a geração. Não é obrigatório que o usuário forneça o nome da música ou artista. 
    6. Se o nome da música (songName) vier vazio e houver um nome de arquivo fornecido, use o nome do arquivo (removendo a extensão .mp3) como título da música.
    7. Se tanto o nome da música quanto o nome do arquivo estiverem ausentes, use o áudio para tentar identificá-lo.
    8. CRÍTICO: Nunca tente identificar, adivinhar ou preencher o nome do artista/banda (artistName) a partir do áudio. Deixe este campo vazio ou use "" se o usuário não o forneceu. 

    Campos a preencher no JSON:
    - songName: Nome da música identificado ou extraído do nome do arquivo (se não fornecido pelo usuário).
    - artistName: DEIXAR VAZIO ("") a menos que o usuário tenha fornecido este nome no texto de entrada.
    - bpm: BPM da música (apenas número/texto curto).
    - drums: Descrição da bateria.
    - drumsSummary: Resumo curto.
    - bass: Descrição do baixo.
    - harmony: Descrição da harmonia.
    - vocals: Descrição da voz.
    - production: Ambiência e mix.
    - finalPrompt: O parágrafo mestre em INGLÊS sintetizando tudo acima (sem nomes próprios).

    Retorne estritamente um JSON com esses campos.`,
  });

  const generateResult = await model.generateContent([
    { text: `Música: ${songName}\nArtista: ${artistName}\nArquivo: ${fileName || "Nenhum"}` },
    ...(audioFile ? [{ inlineData: audioFile }] : []),
  ]);

  const response = await generateResult.response;
  try {
    let text = response.text();
    
    // Extração robusta: procura o primeiro '{' e o último '}'
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("A IA não retornou um formato válido. Tente novamente.");
    }
    
    const parsed = JSON.parse(jsonMatch[0]);
    const data = Array.isArray(parsed) ? parsed[0] : parsed;
    
    if (!data.finalPrompt) {
      throw new Error("Ocorreu um erro ao gerar o prompt final.");
    }
    
    return data as MusicAnalysis;
  } catch (e) {
    console.error("Failed to parse AI response or API error", e);
    let errorText = "";
    try {
      errorText = response.text();
    } catch (ignore) {}
    
    if (errorText.includes("API_KEY_INVALID")) {
      throw new Error("Chave de API inválida. Por favor, verifique suas configurações.");
    }
    throw new Error("Erro ao processar a análise da música. Tente novamente.");
  }
}
