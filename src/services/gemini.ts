import { GoogleGenerativeAI } from "@google/generative-ai";
import { MusicAnalysis, VocalSettings } from "../types";

const apiKey = process.env.GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(apiKey);

export async function generateMusicPrompt(
  songName: string,
  artistName: string,
  audioFile?: { data: string; mimeType: string },
  fileName?: string,
  voiceTimbre?: string,
  vocalSettings?: VocalSettings,
  additionalInstruments?: string[]
): Promise<MusicAnalysis> {
  console.log("Generating prompt for:", songName, artistName, fileName, voiceTimbre, vocalSettings);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    generationConfig: {
      responseMimeType: "application/json",
    },
    systemInstruction: `Você é um Engenheiro de Prompts especialista para Suno AI e Udio.
    Sua missão é realizar uma análise profunda e emocional de uma música para gerar um "Master Prompt" que capture não apenas sua técnica, mas sua "alma" e progressão.

    DIRETRIZES DO PROMPT FINAL (campo "finalPrompt"):
    1. IDIOMA: Deve ser inteiramente em INGLÊS, em um único parágrafo fluido.
    2. NARRATIVA E ESTRUTURA: Descreva a JORNADA da música. Comece descrevendo como ela se inicia (ex: "Starts with a soft acoustic intro"), como ela evolui (ex: "gradually builds tension"), e como é o seu clímax.
    3. ESSÊNCIA E MOOD: Use adjetivos que descrevam a atmosfera (ex: nostalgic, aggressive, ethereal, melancholic, anthemic, raw).
    4. DETALHES TÉCNICOS INTEGRADOS: Insira naturalmente detalhes de BPM, escala, estilo de bateria, baixo e produção, mas como parte da descrição musical, não como uma lista isolada.
    5. VOZ E DNA: Se houver configurações de voz (DNA Vocal), use-as para descrever a performance vocal com precisão emocional (ex: "strained, high-intensity vocals" para alta tensão).
    6. INSTRUMENTAÇÃO: Dê destaque a técnicas específicas (Slap bass, fingerstyle guitar, power chords) se elas definirem a música.
    7. REGRAS CRÍTICAS: 
       - NUNCA mencione o nome do artista, da banda ou o título da música no "finalPrompt".
       - NÃO use tópicos ou listas; mantenha um fluxo contínuo e descritivo.
       - Foque na DINÂMICA (o que muda ao longo da música).

    REGRAS DE RETORNO:
    Retorne estritamente um JSON com os campos: songName, artistName, bpm, scale, drums, drumsSummary, bass, harmony, vocals, production, finalPrompt.`,
  });

  const settingsPrompt = vocalSettings ? `
    Vocal Studio Settings:
    - Archetype: ${vocalSettings.archetype}
    - Raspy: ${vocalSettings.raspy}/100
    - Tension: ${vocalSettings.tension}/100
    - Expressiveness: ${vocalSettings.expressiveness}/100
    - Imperfection: ${vocalSettings.imperfection}/100
    - Breathiness: ${vocalSettings.breathiness}/100
    - Brightness: ${vocalSettings.brightness}/100
    - Polish: ${vocalSettings.polish}/100
    - Ambience: ${vocalSettings.ambience}
    - Analog Warmth: ${vocalSettings.analogWarmth ? 'Yes' : 'No'}
  ` : '';

  const extraPrompt = `
    Additional Instruments & Techniques to Include: ${additionalInstruments?.length ? additionalInstruments.join(", ") : "None"}
  `;

  const generateResult = await model.generateContent([
    { text: `Música: ${songName}\nArtista: ${artistName}\nTimbre de Voz Desejado: ${voiceTimbre || "Não especificado"}${settingsPrompt}${extraPrompt}\nArquivo: ${fileName || "Nenhum"}` },
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
