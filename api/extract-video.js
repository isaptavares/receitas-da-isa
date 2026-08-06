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
    const model = genAI.getGenerativeModel({ model: 'gemini-3.1-flash-lite' });

    const systemPrompt = `
Você é um assistente culinário especialista. Sua tarefa é analisar ESTRITAMENTE o conteúdo da legenda/texto/vídeo fornecido do Instagram ou TikTok e extrair a receita em formato JSON.

Responda APENAS com um objeto JSON válido no seguinte esquema:

{
  "title": "Nome exato da receita",
  "category": "Sobremesas | Almoço & Jantar | Lanches & Salgados | Bebidas & Drinks | Saudável | Outros",
  "prepTime": "15 min",
  "cookTime": "30 min",
  "servings": "4 porções",
  "ingredients": [
    "Ingrediente 1 extraído do texto",
    "Ingrediente 2 extraído do texto"
  ],
  "steps": [
    "Passo 1 extraído do texto",
    "Passo 2 extraído do texto"
  ],
  "imageUrl": "${mediaData.imageUrl || ''}",
  "videoUrl": "${url}"
}

REGRA DE SEGURANÇA ABSOLUTA: Extraia apenas os ingredientes e passos presentes no conteúdo fornecido. Nunca invente ingredientes de bolo de chocolate ou qualquer receita diferente se o texto fornecido não for sobre isso.
`;

    let result;

    if (!mediaData.videoBuffer && !mediaData.description && !mediaData.title) {
      return res.status(400).json({
        success: false,
        error: 'Não foi possível ler as informações deste post. Verifique se o perfil é público e se o post contém texto/vídeo acessível.'
      });
    }

    if (mediaData.videoBuffer && mediaData.mimeType) {
      console.log(`[Vercel Serverless] Enviando vídeo (${mediaData.videoBuffer.length} bytes) para o Gemini...`);
      const videoPart = {
        inlineData: {
          data: mediaData.videoBuffer.toString('base64'),
          mimeType: mediaData.mimeType
        }
      };

      const contentPrompt = `${systemPrompt}\n\nAnalise o vídeo anexado, o áudio do preparo e qualquer legenda adicional: "${mediaData.description || ''}".\nATENÇÃO: Se não for uma receita, responda com "title": "Não é uma receita".`;
      result = await model.generateContent([contentPrompt, videoPart]);
    } else {
      console.log(`[Vercel Serverless] Enviando metadados e legenda para o Gemini...`);
      const contentPrompt = `${systemPrompt}\n\nConteúdo extraído da postagem:\nTítulo/Legenda: ${mediaData.title || ''}\nDescrição Completa: ${mediaData.description || ''}\nURL do Post: ${url}\nATENÇÃO: Extraia a receita ESTRITAMENTE da descrição/legenda acima. Se a descrição não contiver os ingredientes ou preparo da receita, NÃO invente um bolo de chocolate nem nenhuma receita genérica.`;
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

    if (recipeData.error || recipeData.title === "Não é uma receita") {
      return res.status(400).json({
        success: false,
        error: recipeData.error || 'A legenda deste vídeo não contém a receita detalhada.'
      });
    }

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
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7'
  };

  try {
    let result = {
      title: '',
      description: '',
      imageUrl: '',
      videoUrl: '',
      videoBuffer: null,
      mimeType: null
    };

    // 1. Suporte Especial TikTok (Extrator de Vídeo MP4 sem marca d'água)
    if (isTikTok) {
      try {
        const tikwmUrl = `https://tikwm.com/api/?url=${encodeURIComponent(url)}`;
        console.log(`[Vercel Serverless] Extraindo vídeo MP4 do TikTok via TikWM: ${tikwmUrl}`);
        const tikRes = await fetch(tikwmUrl, { headers });
        if (tikRes.ok) {
          const tikJson = await tikRes.json();
          if (tikJson.code === 0 && tikJson.data) {
            result.title = tikJson.data.title || '';
            result.description = tikJson.data.title || '';
            result.imageUrl = tikJson.data.cover || '';
            if (tikJson.data.play) {
              result.videoUrl = tikJson.data.play;
              console.log(`[Vercel Serverless] Link direto do MP4 do TikTok capturado! ${result.videoUrl.substring(0, 60)}...`);
            }
          }
        }
      } catch (tErr) {
        console.warn('[Vercel Serverless] Erro ao extrair MP4 do TikTok via TikWM:', tErr.message);
      }

      // Fallback oEmbed se TikWM não tiver retornado legenda
      if (!result.description) {
        try {
          const oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`;
          const oRes = await fetch(oembedUrl, { headers });
          if (oRes.ok) {
            const oJson = await oRes.json();
            result.title = oJson.title || result.title;
            result.description = oJson.title || result.description;
            result.imageUrl = oJson.thumbnail_url || result.imageUrl;
          }
        } catch (e) {}
      }
    }

    let targetUrls = [url];
    if (isInstagram) {
      // Adicionar URL de embed público do Instagram (/embed/captioned/)
      const cleanUrl = url.split('?')[0].replace(/\/$/, '');
      targetUrls.unshift(`${cleanUrl}/embed/captioned/`);
    }

    for (const targetUrl of targetUrls) {
      try {
        console.log(`[Vercel Serverless] Buscando HTML de: ${targetUrl}`);
        const response = await fetch(targetUrl, { headers, redirect: 'follow' });
        const html = await response.text();

        const title = extractMeta(html, 'og:title') || extractMeta(html, 'twitter:title') || '';
        let description = extractMeta(html, 'og:description') || extractMeta(html, 'twitter:description') || '';

        // Tentar extrair a legenda direta do HTML de embed do Instagram se og:description não tiver tudo
        if (targetUrl.includes('/embed/captioned/')) {
          const captionMatch = html.match(/<div class="Caption"[^>]*>([\s\S]*?)<\/div>/i) || html.match(/<span class="CaptionComments"[^>]*>([\s\S]*?)<\/span>/i);
          if (captionMatch) {
            const cleanCaption = captionMatch[1].replace(/<[^>]+>/g, ' ').trim();
            if (cleanCaption.length > description.length) {
              description = cleanCaption;
            }
          }
        }

        const imageUrl = extractMeta(html, 'og:image') || extractMeta(html, 'twitter:image') || '';
        const videoUrl = extractMeta(html, 'og:video') || extractMeta(html, 'og:video:secure_url') || '';

        if (description || videoUrl || imageUrl) {
          result.title = title || result.title;
          result.description = description || result.description;
          result.imageUrl = imageUrl || result.imageUrl;
          result.videoUrl = videoUrl || result.videoUrl;
        }

        if (result.description.length > 30) break; // Já achamos uma descrição satisfatória
      } catch (e) {
        console.warn(`[Vercel Serverless] Erro ao buscar ${targetUrl}:`, e.message);
      }
    }

    // Se encontramos uma URL direta de MP4, tentamos baixar o buffer
    if (result.videoUrl) {
      try {
        console.log(`[Vercel Serverless] Baixando streaming de vídeo: ${result.videoUrl.substring(0, 80)}...`);
        const vidRes = await fetch(result.videoUrl, { headers });
        if (vidRes.ok) {
          const arrayBuffer = await vidRes.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
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
    console.error('[Vercel Serverless] Erro ao buscar mídias:', err.message);
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
