import { GoogleGenerativeAI } from '@google/generative-ai';

export default async function handler(req, res) {
  // CORS Preflight
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Método não permitido. Use POST.' });
  }

  try {
    const { url, apiKey } = req.body || {};

    if (!url) {
      return res.status(400).json({ success: false, error: 'URL do vídeo é obrigatória.' });
    }

    const geminiKey = apiKey || process.env.GEMINI_API_KEY;
    if (!geminiKey) {
      return res.status(400).json({ success: false, error: 'Chave de API do Gemini não fornecida.' });
    }

    console.log(`[Vercel Serverless] Processando URL: ${url}`);

    // Extrair mídia ou metadados da página (Instagram / TikTok)
    const mediaData = await fetchMediaFromUrl(url);

    // Inicializar Gemini AI
    const genAI = new GoogleGenerativeAI(geminiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const systemPrompt = `
Você é um assistente culinário especialista. Sua tarefa é analisar as informações fornecidas (vídeo, imagem ou texto de postagem do Instagram/TikTok) e extrair a receita completa em formato JSON ESTRITO.

Responda APENAS com um objeto JSON válido no seguinte esquema, sem marcação markdown como \`\`\`json:

{
  "title": "Nome da Receita",
  "category": "Sobremesas | Almoço & Jantar | Lanches & Salgados | Bebidas & Drinks | Saudável | Outros",
  "prepTime": "Ex: 15 min",
  "cookTime": "Ex: 30 min",
  "servings": "Ex: 4 porções",
  "ingredients": [
    "1 xícara de açúcar",
    "2 ovos"
  ],
  "steps": [
    "Misture os ingredientes em uma tigela.",
    "Leve ao forno a 180°C por 30 minutos."
  ],
  "imageUrl": "${mediaData.imageUrl || ''}",
  "videoUrl": "${url}"
}
`;

    let result;

    if (mediaData.videoBuffer && mediaData.mimeType) {
      console.log(`[Vercel Serverless] Enviando vídeo (${mediaData.videoBuffer.length} bytes) para o Gemini...`);
      const videoPart = {
        inlineData: {
          data: mediaData.videoBuffer.toString('base64'),
          mimeType: mediaData.mimeType
        }
      };

      const contentPrompt = `${systemPrompt}\n\nAnalise o vídeo anexado, o áudio do preparo e qualquer legenda adicional: "${mediaData.description || ''}".`;
      result = await model.generateContent([contentPrompt, videoPart]);
    } else {
      console.log(`[Vercel Serverless] Enviando metadados e legenda para o Gemini...`);
      const contentPrompt = `${systemPrompt}\n\nConteúdo extraído da postagem:\nTítulo/Legenda: ${mediaData.title || ''}\nDescrição Completa: ${mediaData.description || ''}\nURL do Post: ${url}`;
      result = await model.generateContent(contentPrompt);
    }

    const rawText = result.response.text();
    console.log(`[Vercel Serverless] Resposta bruta do Gemini:`, rawText);

    let cleanJson = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
    const jsonMatch = cleanJson.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      cleanJson = jsonMatch[0];
    }
    const recipeData = JSON.parse(cleanJson);

    // Garantir valores padrão caso algum campo falhe
    recipeData.imageUrl = recipeData.imageUrl || mediaData.imageUrl || 'https://images.unsplash.com/photo-1495521821757-a1efb6729352?auto=format&fit=crop&w=800&q=80';
    recipeData.videoUrl = url;

    return res.status(200).json({
      success: true,
      recipe: recipeData
    });

  } catch (err) {
    console.error('[Vercel Serverless Error]:', err);
    return res.status(500).json({
      success: false,
      error: `Falha ao processar vídeo: ${err.message}`
    });
  }
}

/**
 * Tenta extrair metadados e links de vídeo de uma URL pública do Instagram ou TikTok
 */
async function fetchMediaFromUrl(url) {
  const isInstagram = url.includes('instagram.com');
  const isTikTok = url.includes('tiktok.com');

  const headers = {
    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7'
  };

  try {
    const response = await fetch(url, { headers, redirect: 'follow' });
    const html = await response.text();

    const result = {
      title: extractMeta(html, 'og:title') || extractMeta(html, 'twitter:title') || '',
      description: extractMeta(html, 'og:description') || extractMeta(html, 'twitter:description') || '',
      imageUrl: extractMeta(html, 'og:image') || extractMeta(html, 'twitter:image') || '',
      videoUrl: extractMeta(html, 'og:video') || extractMeta(html, 'og:video:secure_url') || '',
      videoBuffer: null,
      mimeType: null
    };

    // Se encontramos uma URL direta de MP4, tentamos baixar o buffer
    if (result.videoUrl) {
      try {
        console.log(`[Vercel Serverless] Baixando streaming de vídeo: ${result.videoUrl.substring(0, 80)}...`);
        const vidRes = await fetch(result.videoUrl, { headers });
        if (vidRes.ok) {
          const arrayBuffer = await vidRes.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          // Limitar a 10MB para não estourar o limite inline do Gemini Serverless
          if (buffer.length <= 10 * 1024 * 1024) {
            result.videoBuffer = buffer;
            result.mimeType = vidRes.headers.get('content-type') || 'video/mp4';
          }
        }
      } catch (vidErr) {
        console.warn('[Vercel Serverless] Não foi possível baixar o buffer do vídeo:', vidErr.message);
      }
    }

    return result;
  } catch (err) {
    console.error('[Vercel Serverless] Erro ao buscar HTML da página:', err.message);
    return { title: '', description: '', imageUrl: '', videoUrl: '', videoBuffer: null, mimeType: null };
  }
}

function extractMeta(html, property) {
  const reg1 = new RegExp(`<meta[^>]*property=["']${property}["'][^>]*content=["']([^"']*)["']`, 'i');
  const reg2 = new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*property=["']${property}["']`, 'i');
  const reg3 = new RegExp(`<meta[^>]*name=["']${property}["'][^>]*content=["']([^"']*)["']`, 'i');

  const match = html.match(reg1) || html.match(reg2) || html.match(reg3);
  return match ? match[1] : null;
}
