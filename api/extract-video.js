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
Você é um chef especialista e nutricionista. Analise ESTRITAMENTE o vídeo ou texto do Instagram/TikTok fornecido e extraia a receita completa com todos os detalhes.

Retorne APENAS um objeto JSON válido (sem markdown, sem backticks) exatamente neste formato:

{
  "title": "Nome exato da receita",
  "subtitle": "Descrição curta e apetitosa em uma linha",
  "cuisine": "Brasileira",
  "difficulty": "Médio",
  "categories": ["Sobremesa"],
  "tags": ["Saudável"],
  "prepTime": 15,
  "cookTime": 30,
  "totalTime": 45,
  "servings": 4,
  "ingredients": [
    {"item": "nome do ingrediente", "amount": "quantidade de medida"}
  ],
  "steps": [
    "Descrição do primeiro passo...",
    "Descrição do segundo passo..."
  ],
  "nutrition": {
    "calories": "350 kcal",
    "protein": "28g",
    "carbs": "30g",
    "fat": "12g"
  },
  "imageUrl": "${mediaData.imageUrl || ''}",
  "videoUrl": "${url}"
}

Regras Estritas:
1. IDIOMA (OBRIGATÓRIO): Escreva TODOS os campos (título, subtítulo, ingredientes, passos, categorias, tags) EXCLUSIVAMENTE em Português do Brasil (pt-BR). Traduza qualquer termo que esteja em inglês.
2. FIDELIDADE ABSOLUTA: Seja extremamente fiel ao vídeo/texto. NÃO invente receitas de bolo de chocolate ou qualquer outra se o post não contiver uma receita clara.
3. SE NÃO FOR UMA RECEITA OU NÃO HOUVER INFORMAÇÕES SUFICIENTES: Retorne EXATAMENTE o JSON: {"error": "Não foi possível extrair os ingredientes e o modo de preparo desta publicação."}
4. cuisine: use uma de: Brasileira, Italiana, Japonesa, Mexicana, Francesa, Tailandesa, Americana, Indiana, Espanhola, Grega, Saudável, Outras
5. difficulty: Fácil, Médio ou Difícil
6. categories: use APENAS uma ou mais de: Café da Manhã, Almoço, Lanche, Jantar, Sobremesa, Acompanhamento
7. tags: use APENAS uma ou mais das seguintes tags permitidas: ["1 Panela", "Dia a Dia", "Falta Checar", "Fritura", "Gostosão", "Pouco Calórico", "Proteico", "Saudável"]. PROIBIDO criar ou inventar qualquer tag fora desta lista.
8. ingrediente deve ter "item" (nome) e "amount" (quantidade) separados.
9. Estime valores realistas de nutrição (calories, protein, carbs, fat) com base nos ingredientes.
`;

    let result;

    if (!mediaData.videoBuffer && !mediaData.description && !mediaData.title) {
      return res.status(400).json({
        success: false,
        error: 'Não foi possível ler as informações deste post. Verifique se o perfil é público e se o post contém texto/vídeo acessível.'
      });
    }

    if (mediaData.videoBuffer && mediaData.mimeType) {
      try {
        console.log(`[Vercel Serverless] Enviando vídeo (${mediaData.videoBuffer.length} bytes) para o Gemini...`);
        const videoPart = {
          inlineData: {
            data: mediaData.videoBuffer.toString('base64'),
            mimeType: mediaData.mimeType
          }
        };

        const contentPrompt = `${systemPrompt}\n\nAnalise o vídeo anexado, o áudio do preparo e qualquer legenda adicional: "${mediaData.description || ''}".\nATENÇÃO: Se não for uma receita, responda com "title": "Não é uma receita".`;
        result = await model.generateContent([contentPrompt, videoPart]);
      } catch (videoErr) {
        console.warn('[Vercel Serverless] Envio de vídeo em linha falhou/excedeu limite do Gemini. Tentando processar pela legenda:', videoErr.message);
        const contentPrompt = `${systemPrompt}\n\nConteúdo extraído da postagem:\nTítulo/Legenda: ${mediaData.title || ''}\nDescrição Completa: ${mediaData.description || ''}\nURL do Post: ${url}`;
        result = await model.generateContent(contentPrompt);
      }
    } else {
      console.log(`[Vercel Serverless] Enviando metadados (e JSON-LD) para o Gemini...`);
      const contentPrompt = `${systemPrompt}\n\nConteúdo extraído da postagem:\nTítulo/Legenda: ${mediaData.title || ''}\nDescrição Completa: ${mediaData.description || ''}\n\nDados Estruturados da Receita (JSON-LD):\n${mediaData.jsonLd || 'N/A'}\n\nTexto adicional extraído da página:\n${mediaData.rawParagraphs || 'N/A'}\n\nURL do Post: ${url}`;
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

    // Filtragem Estrita de Tags Permitidas
    const ALLOWED_TAGS = ['1 Panela', 'Dia a Dia', 'Falta Checar', 'Fritura', 'Gostosão', 'Pouco Calórico', 'Proteico', 'Saudável'];
    if (Array.isArray(recipeData.tags)) {
      recipeData.tags = recipeData.tags.filter(t => ALLOWED_TAGS.includes(t));
    } else {
      recipeData.tags = [];
    }

    // Garantir prioridade da foto real extraída sobre placeholders da IA
    const isPlaceholder = (imgUrl) => !imgUrl || imgUrl.includes('placeholder') || imgUrl.includes('unsplash') || imgUrl.trim() === '';
    
    const finalCover = (!isPlaceholder(mediaData.imageUrl) ? mediaData.imageUrl : null) ||
                       (!isPlaceholder(recipeData.imageUrl) ? recipeData.imageUrl : null) ||
                       (!isPlaceholder(recipeData.image) ? recipeData.image : null) ||
                       'https://images.unsplash.com/photo-1495521821757-a1efb6729352?auto=format&fit=crop&w=800&q=80';

    recipeData.imageUrl = finalCover;
    recipeData.image = finalCover;
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
  // 0. Resolver links curtos do TikTok (vt.tiktok.com / vm.tiktok.com)
  if (url.includes('vt.tiktok.com') || url.includes('vm.tiktok.com')) {
    try {
      console.log(`[Vercel Serverless] Resolvendo URL curta do TikTok: ${url}`);
      const shortRes = await fetch(url, { method: 'GET', redirect: 'manual' });
      const locHeader = shortRes.headers.get('location');
      if (locHeader && locHeader.includes('tiktok.com')) {
        url = locHeader.split('?')[0]; // URL limpa expandida
        console.log(`[Vercel Serverless] URL expandida via Location header: ${url}`);
      } else {
        const followRes = await fetch(url, { redirect: 'follow' });
        if (followRes.url && followRes.url.includes('/video/')) {
          url = followRes.url;
          console.log(`[Vercel Serverless] URL expandida via followRes: ${url}`);
        }
      }
    } catch (sErr) {
      console.warn('[Vercel Serverless] Não foi possível expandir URL curta:', sErr.message);
    }
  }

  const isInstagram = url.includes('instagram.com');
  const isTikTok = url.includes('tiktok.com');

  const headers = {
    'User-Agent': isInstagram 
      ? 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)' 
      : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
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
            // origin_cover é a capa estática limpa sem ícones de player
            result.imageUrl = tikJson.data.origin_cover || tikJson.data.cover || '';
            if (tikJson.data.play) {
              result.videoUrl = tikJson.data.play;
              console.log(`[Vercel Serverless] Link direto do MP4 do TikTok capturado! ${result.videoUrl.substring(0, 60)}...`);
            }
          }
        }
      } catch (tErr) {
        console.warn('[Vercel Serverless] Erro ao extrair MP4 do TikTok via TikWM:', tErr.message);
      }

      // Fallback oEmbed se TikWM não tiver retornado capa/legenda
      if (!result.imageUrl || !result.description) {
        try {
          const oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`;
          const oRes = await fetch(oembedUrl, { headers });
          if (oRes.ok) {
            const oJson = await oRes.json();
            result.title = result.title || oJson.title || '';
            result.description = result.description || oJson.title || '';
            result.imageUrl = oJson.thumbnail_url || result.imageUrl;
          }
        } catch (e) {}
      }
    }

    let targetUrls = [];
    if (isInstagram) {
      const cleanUrl = url.split('?')[0].replace(/\/$/, '');
      targetUrls.push({ url: `${cleanUrl}/embed/captioned/`, ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1' });
      targetUrls.push({ url: url, ua: 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)' });
    } else {
      targetUrls.push({ url: url, ua: headers['User-Agent'] });
    }

    for (const item of targetUrls) {
      try {
        console.log(`[Vercel Serverless] Buscando mídia de vídeo em: ${item.url}`);
        const customHeaders = { ...headers, 'User-Agent': item.ua };
        const response = await fetch(item.url, { headers: customHeaders, redirect: 'follow' });
        const html = await response.text();

        const title = extractMeta(html, 'og:title') || extractMeta(html, 'twitter:title') || '';
        let description = extractMeta(html, 'og:description') || extractMeta(html, 'twitter:description') || '';
        
        const ldMatches = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi);
        if (ldMatches) {
          result.jsonLd = ldMatches.map(m => {
            const match = m.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/i);
            return match ? match[1].trim() : '';
          }).join('\n\n');
        }
        
        const pMatches = html.match(/<(p|li)[^>]*>([\s\S]*?)<\/\1>/gi);
        if (pMatches) {
          result.rawParagraphs = pMatches.map(m => m.replace(/<[^>]+>/g, '').trim()).join('\n').replace(/\s+/g, ' ').substring(0, 3000);
        }

        // 1. Extração direta de vídeo MP4 do JSON do Instagram (video_url)
        const videoUrlMatch = html.match(/"video_url"\s*:\s*"([^"]+)"/);
        if (videoUrlMatch) {
          const directVideo = videoUrlMatch[1].replace(/\\/g, '');
          result.videoUrl = directVideo;
          console.log(`[Vercel Serverless] URL do vídeo MP4 capturada do JSON do Instagram! ${directVideo.substring(0, 60)}...`);
        } else {
          const metaVid = extractMeta(html, 'og:video') || extractMeta(html, 'og:video:secure_url') || extractMeta(html, 'og:video:url') || '';
          if (metaVid) result.videoUrl = metaVid;
        }

        // 2. Extração de imagem de capa limpa (JSON do Instagram / oEmbed ou meta tags / Schema.org do site)
        const displayUrlMatch = html.match(/"display_url"\s*:\s*"([^"]+)"/) || html.match(/"display_resources"\s*:\s*\[\s*\{\s*"src"\s*:\s*"([^"]+)"/);
        if (displayUrlMatch) {
          const cleanImg = (displayUrlMatch[1] || displayUrlMatch[2]).replace(/\\/g, '');
          result.imageUrl = cleanImg;
          console.log(`[Vercel Serverless] Capa limpa do Instagram capturada do JSON! ${cleanImg.substring(0, 60)}...`);
        } else if (!result.imageUrl) {
          let pageImg = extractMeta(html, 'og:image') || extractMeta(html, 'twitter:image') || extractMeta(html, 'image');
          if (!pageImg) {
            const jsonLdMatch = html.match(/"image"\s*:\s*\[?\s*"([^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"/i) || html.match(/"image"\s*:\s*"([^"]+)"/i);
            if (jsonLdMatch) pageImg = jsonLdMatch[1].replace(/\\/g, '');
          }
          if (pageImg) {
            result.imageUrl = pageImg;
            console.log(`[Vercel Serverless] Capa capturada do site da web: ${pageImg.substring(0, 60)}...`);
          }
        }

        // 3. Extração da legenda completa do JSON (edge_media_to_caption)
        const textMatch = html.match(/"text"\s*:\s*"((?:[^"\\]|\\.)*)"/);
        if (textMatch) {
          try {
            const cleanText = JSON.parse(`"${textMatch[1]}"`);
            if (cleanText && cleanText.length > description.length) {
              description = cleanText;
            }
          } catch (e) {}
        }

        if (description || title) {
          result.title = result.title || title;
          result.description = description || result.description;
        }

        if (result.videoUrl && result.description) break;
      } catch (e) {
        console.warn(`[Vercel Serverless] Erro ao buscar ${item.url}:`, e.message);
      }
    }

    // Fallback de texto se oEmbed puder complementar a legenda
    if (isInstagram && !result.description) {
      try {
        const instaOembedUrl = `https://www.instagram.com/oembed/?url=${encodeURIComponent(url)}`;
        const oRes = await fetch(instaOembedUrl, { headers });
        if (oRes.ok) {
          const oJson = await oRes.json();
          result.title = result.title || oJson.title || '';
          result.description = result.description || oJson.title || '';
          result.imageUrl = result.imageUrl || oJson.thumbnail_url || '';
        }
      } catch (iErr) {}
    }

    // Se encontramos uma URL direta de MP4, tentamos baixar o buffer
    if (result.videoUrl) {
      try {
        console.log(`[Vercel Serverless] Baixando streaming de vídeo: ${result.videoUrl.substring(0, 80)}...`);
        const vidRes = await fetch(result.videoUrl, { headers });
        if (vidRes.ok) {
          const arrayBuffer = await vidRes.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          if (buffer.length <= 18 * 1024 * 1024) {
            result.videoBuffer = buffer;
            result.mimeType = vidRes.headers.get('content-type') || 'video/mp4';
          } else {
            console.log(`[Vercel Serverless] Vídeo muito grande (${(buffer.length/1024/1024).toFixed(1)}MB). Usando metadados/legenda para economizar payload.`);
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
