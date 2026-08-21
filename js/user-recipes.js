/* =============================================
   RECEITAS DA ISA — User Recipes Module
   Handles: CRUD no Firestore + extração via Gemini AI
   ============================================= */

import {
  db, storage,
  collection, addDoc, getDocs, deleteDoc, doc, getDoc, updateDoc,
  query, orderBy, serverTimestamp,
  storageRef, uploadBytes, getDownloadURL
} from './firebase-config.js';
import { getUser } from './auth.js';
import { GEMINI_KEY } from './api-key.js';

const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${GEMINI_KEY}`;

const RECIPE_PROMPT = `Você é um chef especialista e nutricionista. Analise este conteúdo e extraia a receita completa com todos os detalhes.

Retorne APENAS um objeto JSON válido (sem markdown, sem backticks, sem texto adicional) exatamente neste formato:
{
  "title": "Nome completo da receita",
  "subtitle": "Descrição curta e apetitosa em uma linha",
  "cuisine": "Brasileira",
  "difficulty": "Médio",
  "categories": ["Almoço"],
  "tags": ["Proteico"],
  "prepTime": 15,
  "cookTime": 30,
  "totalTime": 45,
  "servings": 4,
  "ingredients": [
    {"item": "Peito de frango", "amount": "500g"},
    {"item": "Azeite", "amount": "2 colheres de sopa"}
  ],
  "steps": [
    "Descrição detalhada do primeiro passo...",
    "Descrição detalhada do segundo passo..."
  ],
  "nutrition": {
    "calories": "350 kcal",
    "protein": "28g",
    "carbs": "30g",
    "fat": "12g"
  }
}

Regras:
- REGRA CRUCIAL DE FIDELIDADE ABSOLUTA: Seja 100% fiel e literal ao texto fornecido. NUNCA invente ou altere dados se já estiverem escritos. Se a receita trouxer uma medida exata de sal/tempero (ex: "½ colher (chá) de sal"), use obrigatoriamente "1/2 colher de chá". Se a receita trouxer apenas "sal" (sem medida especificada), aí sim use "a gosto" (ex: {"item": "Sal", "amount": "a gosto"}).
- RENDIMENTO E PORÇÕES (servings): O campo "servings" deve conter o número inteiro exato de porções/rendimento indicado na receita (ex: "Serve 2 pessoas", "Rendimento: 4 porções" -> servings: 2). PROIBIDO inventar ou adivinhar o rendimento se ele já estiver informado no texto!
- PRESERVAÇÃO E SUPORTE DE FRAÇÕES (CRÍTICO):
  Mantenha sempre a fração numérica pura (1/2, 1/3, 1/4, 3/4, ½, ⅓, ¾) no campo "amount".
  - EXEMPLO: "½ cebola" -> {"item": "Cebola", "amount": "1/2 unidade"} ✅
  - EXEMPLO: "raspas de ½ limão" -> {"item": "Raspas de limão", "amount": "1/2 unidade"} ✅
  - EXEMPLO: "¾ de xícara (chá) de risoni" -> {"item": "Macarrão", "amount": "3/4 xícaras de chá"} ✅
  - PROIBIDO reescrever frações em prosa (ex: NUNCA use "1 unidade dividida em duas metades", "metade de um limão"). Use sempre a fração numérica no amount (ex: "1/2 unidade").
- cuisine: use uma de: Brasileira, Italiana, Japonesa, Mexicana, Francesa, Tailandesa, Americana, Indiana, Espanhola, Grega
- difficulty: Fácil, Médio ou Difícil
- categories: use uma ou mais de: Café da Manhã, Almoço, Lanche, Jantar, Sobremesa, Acompanhamento
- tags: use APENAS uma ou mais das seguintes tags permitidas: "1 Panela", "Dia a Dia", "Falta Checar", "Fritura", "Gostosão", "Pouco Calórico", "Proteico", "Saudável". Proibido criar qualquer tag fora desta lista.
- Transcreva fielmente as instruções originais do modo de preparo dividindo em passos claros

*** REGRA DE OURO ABSOLUTA DOS INGREDIENTES ***
1. O campo "item" deve conter APENAS o nome limpo e no SINGULAR do ingrediente (ex: 'Pão', 'Cebola', 'Alho', 'Queijo mussarela', 'Raspas de limão').
2. O campo "amount" deve conter EXCLUSIVAMENTE a quantidade numérica/fracionária e a unidade de medida pura (ex: '1/2 unidade', '500g', '2 colheres de sopa', '1 xícara', '1/2 colher de chá', '2 dentes', 'a gosto').
3. PROIBIDO MÉTODOS DE PREPARO NOS INGREDIENTES:
   Palavras como "cortada ao meio", "picado", "ralado", "fatiado", "em cubos", "amassado", "derretido", "cozido", "desfiado", "moído", "grelhado", "descascado" NUNCA DEVEM ENTRAR no campo "item" nem no campo "amount".
   Qualquer instrução de preparo (como cortar a cebola em pedaços grandes ou ralar o limão) pertence EXCLUSIVAMENTE aos passos do modo de preparo ("steps").
- totalTime = prepTime + cookTime
- NUNCA retorne "Não informado" na seção de nutrição (nutrition). Se o vídeo ou texto original informar os valores nutricionais, extraia-os e use-os. Caso NÃO sejam informados, você DEVE obrigatoriamente estimar valores nutricionais realistas (calories, protein, carbs, fat) baseando-se nos ingredientes e quantidades.`;

export function sanitizeIngredients(ingredients) {
  if (!Array.isArray(ingredients)) return [];

  const methodPatterns = [
    /\b(cortad[ao]s?(\s+ao\s+meio|\s+em\s+[^\s,]+|\s+ao\s+comprido)?)\b/gi,
    /\b(picad[ao]s?(\s+finamente|\s+bem|\s+em\s+[^\s,]+)?)\b/gi,
    /\b(ralad[ao]s?(\s+bem|\s+no\s+ralo\s+[^\s,]+)?)\b/gi,
    /\b(fatiad[ao]s?)\b/gi,
    /\b(amassad[ao]s?)\b/gi,
    /\b(derretid[ao]s?)\b/gi,
    /\b(cozid[ao]s?)\b/gi,
    /\b(desfiad[ao]s?)\b/gi,
    /\b(moíd[ao]s?|moid[ao]s?)\b/gi,
    /\b(grelhad[ao]s?)\b/gi,
    /\b(descascad[ao]s?)\b/gi,
    /\b(triturad[ao]s?)\b/gi,
    /\b(refogad[ao]s?)\b/gi,
    /\b(assad[ao]s?)\b/gi,
    /\b(peneirad[ao]s?)\b/gi,
    /\b(polvilhad[ao]s?)\b/gi,
    /\b(pincelad[ao]s?)\b/gi,
    /\b(em\s+cubos?|em\s+rodelas?|em\s+tiras?|em\s+lascas?|em\s+pedaços?|em\s+gomos?|em\s+quadrados?|em\s+fatias?|em\s+ramos?)\b/gi,
    /\b(para\s+decorar|para\s+untar|para\s+polvilhar|para\s+servir)\b/gi
  ];

  return ingredients.map(ing => {
    if (!ing) return ing;
    if (typeof ing === 'object' && (ing.isHeader || ing.header || ing.section || ing.type === 'section')) {
      return ing;
    }
    const isObj = typeof ing === 'object';
    let item = isObj ? (ing.item || ing.name || '').trim() : String(ing).trim();
    let amount = isObj ? (ing.amount || '').trim() : '';

    methodPatterns.forEach(pattern => {
      item = item.replace(pattern, '');
      amount = amount.replace(pattern, '');
    });

    item = item.replace(/^[\s,.\-–—]+|[\s,.\-–—]+$/g, '').replace(/\s+/g, ' ');
    amount = amount.replace(/^[\s,.\-–—]+|[\s,.\-–—]+$/g, '').replace(/\s+/g, ' ');

    return isObj ? { ...ing, item, amount } : { item, amount: '' };
  });
}

// ---- Gemini AI ----

export async function extractRecipeFromYouTube(youtubeUrl) {
  let cleanUrl = youtubeUrl;
  let videoId = '';
  const match = youtubeUrl.match(/(?:shorts\/|v=|youtu\.be\/|embed\/|\/v\/)([a-zA-Z0-9_-]{11})/);
  if (match) {
    videoId = match[1];
    cleanUrl = `https://www.youtube.com/watch?v=${videoId}`;
  }

  const body = {
    contents: [{
      parts: [
        { text: RECIPE_PROMPT },
        { fileData: { mimeType: 'video/youtube', fileUri: cleanUrl } }
      ]
    }],
    generationConfig: { temperature: 0.1 }
  };

  const recipe = await callGemini(body);
  if (recipe) {
    if (Array.isArray(recipe.ingredients)) {
      recipe.ingredients = sanitizeIngredients(recipe.ingredients);
    }
    const isPlaceholder = (imgUrl) => !imgUrl || imgUrl.includes('placeholder') || imgUrl.includes('unsplash') || imgUrl.trim() === '';
    const ytThumb = videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : '';

    const finalImg = ytThumb ||
                     (!isPlaceholder(recipe.imageUrl) ? recipe.imageUrl : null) ||
                     (!isPlaceholder(recipe.image) ? recipe.image : null) ||
                     'images/placeholder_recipe.png';

    recipe.imageUrl = finalImg;
    recipe.image = finalImg;
  }
  return recipe;
}

export async function extractRecipeFromText(text) {
  const body = {
    contents: [{
      parts: [{ text: RECIPE_PROMPT + '\n\nConteúdo para analisar:\n' + text }]
    }],
    generationConfig: { temperature: 0.1 }
  };
  const recipe = await callGemini(body);
  if (recipe && Array.isArray(recipe.ingredients)) {
    recipe.ingredients = sanitizeIngredients(recipe.ingredients);
  }
  return recipe;
}

export async function extractRecipeFromVercelServer(videoUrl) {
  // Se estiver no Vercel production/preview use caminho relativo, se estiver no localhost/python use a URL de produção na Vercel
  const isVercelHost = window.location.hostname.includes('vercel.app');
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const apiUrl = isLocalhost ? 'http://localhost:3000/api/extract-video' : (isVercelHost ? '/api/extract-video' : 'https://receitas-da-isa.vercel.app/api/extract-video');

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: videoUrl,
      apiKey: GEMINI_KEY
    })
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data.success) {
    const rawErr = data.error || `Erro ${response.status} ao conectar à API Vercel`;
    if (/demand|quota|429|resource|rate limit|too many requests|overload/i.test(rawErr)) {
      throw new Error('O Gemini está cheio de demanda agora, você pode tentar de novo em 5 minutinhos? 💛');
    }
    throw new Error(rawErr);
  }

  if (data.recipe && Array.isArray(data.recipe.ingredients)) {
    data.recipe.ingredients = sanitizeIngredients(data.recipe.ingredients);
  }

  return data.recipe;
}

async function callGemini(body) {
  const response = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    const rawMsg = err.error?.message || `Erro ${response.status} na API Gemini`;
    if (/demand|quota|429|resource|rate limit|too many requests|overload/i.test(rawMsg)) {
      throw new Error('O Gemini está cheio de demanda agora, você pode tentar de novo em 5 minutinhos? 💛');
    }
    throw new Error(rawMsg);
  }

  const data = await response.json();
  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) throw new Error('Resposta vazia da IA');

  // Strip markdown fences if present
  const cleaned = rawText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    throw new Error('A IA retornou um formato inválido. Tente novamente.');
  }
}

// ---- Firebase Storage ----

export async function uploadRecipeImage(file, recipeId) {
  const user = getUser();
  if (!user) throw new Error('Não logado');
  const path = `user_recipes/${user.uid}/${recipeId}/image.${file.name.split('.').pop()}`;
  const ref = storageRef(storage, path);
  await uploadBytes(ref, file);
  return getDownloadURL(ref);
}

export function dataURLtoBlob(dataurl) {
  const arr = dataurl.split(',');
  const mime = arr[0].match(/:(.*?);/)[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}

// ---- Firestore CRUD ----

function getMyRecipesCollection() {
  const user = getUser();
  if (!user) throw new Error('Não logado');
  return collection(db, 'users', user.uid, 'my_recipes');
}

export async function saveUserRecipe(recipeData) {
  if (recipeData.nutrition && recipeData.nutrition.calories) {
    recipeData.nutrition.calories = String(recipeData.nutrition.calories).replace(/kcal/gi, '').replace(/cal/gi, '').trim();
  }
  if (recipeData.calories) {
    recipeData.calories = String(recipeData.calories).replace(/kcal/gi, '').replace(/cal/gi, '').trim();
  }
  sanitizeRecipeTags(recipeData);
  normalizeRecipeIngredients(recipeData);

  const base64Img = recipeData.imageBase64;
  delete recipeData.imageBase64;

  const col = getMyRecipesCollection();
  const docRef = await addDoc(col, {
    ...recipeData,
    isUserCreated: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  if (base64Img) {
    try {
      console.log('Fazendo upload da imagem base64 interceptada...');
      const blob = dataURLtoBlob(base64Img);
      const ext = blob.type.split('/')[1] || 'jpg';
      const file = new File([blob], `cover.${ext}`, { type: blob.type });
      const permanentUrl = await uploadRecipeImage(file, docRef.id);
      
      await updateDoc(docRef, {
        image: permanentUrl,
        imageUrl: permanentUrl
      });
      console.log('Imagem permanentizada com sucesso no Firebase Storage:', permanentUrl);
    } catch (e) {
      console.error('Falha ao fazer upload da imagem base64:', e);
    }
  }

  return docRef.id;
}

export function cleanIngredientName(raw) {
  if (!raw) return '';
  let str = raw.toString().trim();
  const lower = str.toLowerCase();
  if (lower.includes('sal e pimenta') || lower.includes('sal e pimenta-do-reino') || lower.includes('sal e pimenta do reino')) return 'Pimenta-do-reino';
  
  str = str.replace(/\([^)]*\)/g, '');
  str = str.replace(/\s*\b\d+\s*%?/gi, '');
  if (str.toLowerCase().includes(' ou ')) str = str.split(/\s+ou\s+/i)[0].trim();
  
  str = str.replace(/^\s*\b(?:escalope(?:s)?\s+de|filé(?:s)?\s+de|posta(?:s)?\s+de|pedaço(?:s)?\s+de|fatia(?:s)?\s+de|dente(?:s)?\s+de|dente(?:s)?|ramo(?:s)?\s+de|talo(?:s)?\s+de|punhado\s+de|suco\s+de|casca\s+de|raspas\s+de)\b\s*/i, '');
  str = str.replace(/^[\d\s\/\.,\:\-\+]+/i, '');
  str = str.replace(/^\s*a\s+(?=\d)/i, '');
  
  const unitsRegex = /^(?:g|kg|ml|l|colher(?:es)?|xícara(?:s)?|lata(?:s)?|pitada(?:s)?|pacote(?:s)?|unidade(?:s)?|copo(?:s)?|col\.?|chá|sopa|sobremesa|café|mãozada(?:s)?|caixinha(?:s)?|vidro(?:s)?|sachê(?:s)?|grama(?:s)?|kilo(?:s)?|quilo(?:s)?|xicara(?:s)?|xic\.?|colh\.?|xícaras?)\b\s*/i;
  str = str.replace(unitsRegex, '');
  str = str.replace(/^\s*\b(?:de|da|do|dos|das|em)\b\s*/i, '');
  
  const descriptorsRegex = /\b(?:fresc[oas]|picad[oas]|picadinh[oas]|bem\s+picad[oas]|ralad[oas]|moíd[oas]|defumad[oas]|esmagad[oas]|amassad[oas]|torrad[oas]|limp[oas]|maturad[oas]|cortad[oas]|congelad[oas]|fatiad[oas]|desfiad[oas]|cozid[oas]|madur[oas]|inteir[oas]|sec[oas]|desidratad[oas]|triturad[oas]|derretid[oas]|grelhad[oas]|médi[oas]|médio|média|médias|médios|grand[es]|pequen[oas]|light|diet|zero|em\s+cubos?|em\s+cubinhos?|em\s+tiras?|em\s+rodelas?|em\s+fatias?|em\s+pedaços?|em\s+lascas?|em\s+conserva|sem\s+sal|com\s+sal|sem\s+pele|sem\s+osso|a\s+gosto|para\s+servir|para\s+decorar|para\s+fritar|para\s+assar|para\s+untar|para\s+refogar|na\s+hora|caseir[oas])\b/gi;
  str = str.replace(descriptorsRegex, '');
  str = str.replace(/\s*\b(?:de|da|do|dos|das|em|ou|e)\b\s*$/gi, '');
  str = str.trim();
  if (!str) return '';

  let lstr = str.toLowerCase();

  const canonicalMap = {
    'batata': 'Batata',
    'batatas': 'Batata',
    'batata inglesa': 'Batata',
    'batata-inglesa': 'Batata',
    'batatas inglesas': 'Batata',
    'batata doce': 'Batata-doce',
    'batata-doce': 'Batata-doce',
    'batatas doces': 'Batata-doce',
    'batata baroa': 'Batata-baroa',
    'batata-baroa': 'Batata-baroa',
    'mandioquinha': 'Batata-baroa',
    'cebola': 'Cebola',
    'cebolas': 'Cebola',
    'cebola branca': 'Cebola',
    'cebola roxa': 'Cebola roxa',
    'cebolas roxas': 'Cebola roxa',
    'cebola pérola': 'Cebola',
    'cebolas pérola': 'Cebola',
    'cebolinha': 'Cebolinha',
    'cebolinhas': 'Cebolinha',
    'cebolinha verde': 'Cebolinha',
    'alho': 'Alho',
    'alhos': 'Alho',
    'dente de alho': 'Alho',
    'dentes de alho': 'Alho',
    'tomate': 'Tomate',
    'tomates': 'Tomate',
    'tomate cereja': 'Tomate-cereja',
    'tomates cereja': 'Tomate-cereja',
    'tomate-cereja': 'Tomate-cereja',
    'ovo': 'Ovo',
    'ovos': 'Ovo',
    'ovos inteiros': 'Ovo',
    'gema': 'Gema de ovo',
    'gemas': 'Gema de ovo',
    'gemas de ovo': 'Gema de ovo',
    'clara': 'Clara de ovo',
    'claras': 'Clara de ovo',
    'claras de ovo': 'Clara de ovo',
    'cenoura': 'Cenoura',
    'cenouras': 'Cenoura',
    'banana': 'Banana',
    'bananas': 'Banana',
    'limão': 'Limão',
    'limões': 'Limão',
    'limao': 'Limão',
    'limão tahiti': 'Limão',
    'suco de limão': 'Limão',
    'laranja': 'Laranja',
    'laranjas': 'Laranja',
    'maçã': 'Maçã',
    'maçãs': 'Maçã',
    'morango': 'Morango',
    'morangos': 'Morango',
    'camarão': 'Camarão',
    'camarões': 'Camarão',
    'pepino': 'Pepino',
    'pepinos': 'Pepino',
    'abobrinha': 'Abobrinha',
    'abobrinhas': 'Abobrinha',
    'berinjela': 'Berinjela',
    'berinjelas': 'Berinjela',
    'cogumelo': 'Cogumelo',
    'cogumelos': 'Cogumelo',
    'pimentão': 'Pimentão',
    'pimentões': 'Pimentão',
    'pimentão vermelho': 'Pimentão vermelho',
    'pimentão amarelo': 'Pimentão amarelo',
    'pimentão verde': 'Pimentão verde',
    'azeite': 'Azeite',
    'azeite de oliva': 'Azeite',
    'azeite de oliva extra virgem': 'Azeite',
    'azeite extravirgem': 'Azeite',
    'pimenta do reino': 'Pimenta-do-reino',
    'pimenta-do-reino': 'Pimenta-do-reino',
    'queijo parmesão': 'Queijo Parmesão',
    'parmesão': 'Queijo Parmesão',
    'queijo mussarela': 'Queijo mussarela',
    'mussarela': 'Queijo mussarela',
    'mozarela': 'Queijo mussarela',
    'queijo moçarela': 'Queijo mussarela',
    'farinha': 'Farinha de trigo',
    'farinha de trigo': 'Farinha de trigo',
    'maionese': 'Maionese',
    'maionese light': 'Maionese',
    'óleo': 'Óleo',
    'óleo vegetal': 'Óleo',
    'óleo de soja': 'Óleo',
    'óleo para fritar': 'Óleo',
    'manteiga': 'Manteiga',
    'manteiga sem sal': 'Manteiga',
    'manteiga com sal': 'Manteiga',
    'leite': 'Leite',
    'creme de leite': 'Creme de leite',
    'leite condensado': 'Leite condensado',
    'frango': 'Frango',
    'peito de frango': 'Peito de frango',
    'carne moída': 'Carne moída',
    'bacon': 'Bacon',
    'linguiça': 'Linguiça',
    'pancetta': 'Pancetta',
    'salmão': 'Salmão',
    'atum': 'Atum'
  };

  if (canonicalMap[lstr]) return canonicalMap[lstr];

  if (lstr.length > 3 && lstr.endsWith('s') && !lstr.endsWith('ss') && !lstr.endsWith('is') && !lstr.endsWith('us') && !lstr.endsWith('nozes')) {
    const singularAttempt = lstr.slice(0, -1);
    if (canonicalMap[singularAttempt]) return canonicalMap[singularAttempt];
    return singularAttempt.charAt(0).toUpperCase() + singularAttempt.slice(1);
  }

  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function normalizeRecipeIngredients(recipe) {
  if (!recipe || !Array.isArray(recipe.ingredients)) return recipe;
  recipe.ingredients = sanitizeIngredients(recipe.ingredients);
  recipe.ingredients = recipe.ingredients.map(ing => {
    if (!ing) return ing;
    const isObj = typeof ing === 'object' && ing !== null;
    let rawItem = isObj ? (ing.item || ing.name || ing.title || '') : String(ing);
    const upper = rawItem.trim().toUpperCase();

    if ((isObj && (ing.isHeader || ing.header || ing.section || ing.type === 'section')) ||
        upper.startsWith('PARA ') || upper.startsWith('MASSA') || upper.startsWith('MOLHO') || upper.startsWith('RECHEIO') || rawItem.trim().endsWith(':') ||
        (isObj && (!ing.amount || ing.amount.trim() === '') && (upper.includes('PARA O') || upper.includes('PARA A') || upper.includes('PARA AS') || upper.includes('PARA OS')))) {
      return { isHeader: true, title: rawItem.replace(/^[\s:]+|[\s:]+$/g, '') };
    }

    if (typeof ing === 'string') {
      const cleanItem = cleanIngredientName(ing);
      return { item: cleanItem || ing, amount: '' };
    } else if (ing && typeof ing === 'object') {
      const cleanItem = cleanIngredientName(rawItem);
      return { ...ing, item: cleanItem || rawItem };
    }
    return ing;
  });
  return recipe;
}

const ALLOWED_TAGS = ['1 Panela', 'Dia a Dia', 'Falta Checar', 'Fritura', 'Gostosão', 'Pouco Calórico', 'Proteico', 'Saudável'];

function sanitizeRecipeTags(recipe) {
  if (!recipe) return recipe;
  if (Array.isArray(recipe.tags)) {
    recipe.tags = recipe.tags.filter(t => ALLOWED_TAGS.includes(t));
  } else {
    recipe.tags = [];
  }
  return recipe;
}

export async function getUserRecipes() {
  const user = getUser();
  if (!user) return [];
  try {
    const col = collection(db, 'users', user.uid, 'my_recipes');
    const snapshotPromise = getDocs(col);
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout Firestore')), 5000));
    const snapshot = await Promise.race([snapshotPromise, timeoutPromise]);
    const recipes = snapshot.docs.map(d => sanitizeRecipeTags({
      ...d.data(),
      id: d.id,
      firestoreId: d.id,
      isUserCreated: true
    }));
    // Ordenar localmente por data de criação se disponível
    return recipes.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  } catch (e) {
    console.warn('Busca de receitas no Firestore excedeu tempo limite ou falhou:', e);
    return [];
  }
}

async function findUserRecipeDocRef(id) {
  const user = getUser();
  if (!user) return null;
  
  // 1. Tenta direto pelo ID do documento
  try {
    const directRef = doc(db, 'users', user.uid, 'my_recipes', id);
    const directSnap = await getDoc(directRef);
    if (directSnap.exists()) {
      return { ref: directRef, snap: directSnap };
    }
  } catch (e) {
    // Segue para busca em lote
  }

  // 2. Busca na coleção se id for slug ou data.id
  try {
    const col = collection(db, 'users', user.uid, 'my_recipes');
    const snapshot = await getDocs(col);
    const foundDoc = snapshot.docs.find(d => d.id === id || d.data().id === id);
    if (foundDoc) {
      return { ref: doc(db, 'users', user.uid, 'my_recipes', foundDoc.id), snap: foundDoc };
    }
  } catch (e) {
    console.warn("Erro ao buscar documento de receita no Firestore:", e);
  }

  return null;
}

export async function getUserRecipeById(id) {
  const docResult = await findUserRecipeDocRef(id);
  if (docResult && docResult.snap.exists()) {
    const data = docResult.snap.data();
    return sanitizeRecipeTags({
      ...data,
      id: docResult.snap.id,
      firestoreId: docResult.snap.id,
      isUserCreated: true
    });
  }
  return null;
}

export async function deleteUserRecipe(id) {
  const user = getUser();
  if (user) {
    try {
      const docResult = await findUserRecipeDocRef(id);
      if (docResult && docResult.ref) {
        await deleteDoc(docResult.ref);
      }
    } catch (e) {
      console.warn("Erro ao deletar no Firestore:", e);
    }
  }
  try {
    const localRecipes = JSON.parse(localStorage.getItem('receitas_isa_user_recipes')) || [];
    const updated = localRecipes.filter(r => r.id !== id && r.firestoreId !== id);
    localStorage.setItem('receitas_isa_user_recipes', JSON.stringify(updated));

    const deletedStatic = JSON.parse(localStorage.getItem('receitas_isa_deleted_static')) || [];
    if (!deletedStatic.includes(id)) {
      deletedStatic.push(id);
      localStorage.setItem('receitas_isa_deleted_static', JSON.stringify(deletedStatic));
    }
  } catch (e) {
    console.warn("Erro ao deletar localmente:", e);
  }
}

export async function updateUserRecipe(id, recipeData) {
  const user = getUser();
  if (user) {
    try {
      const docResult = await findUserRecipeDocRef(id);
      if (docResult && docResult.ref) {
        await updateDoc(docResult.ref, {
          ...recipeData,
          updatedAt: serverTimestamp()
        });
        return docResult.snap.id;
      } else {
        try {
          await saveUserRecipe({ ...recipeData, id });
        } catch (err) {
          console.warn("Erro ao salvar nova receita de usuário no Firestore:", err);
        }
      }
    } catch (e) {
      console.error("Erro ao atualizar no Firestore:", e);
    }
  }

  // Atualizar ou inserir localmente
  const localRecipes = JSON.parse(localStorage.getItem('receitas_isa_user_recipes')) || [];
  const idx = localRecipes.findIndex(r => r.id === id || r.firestoreId === id);
  if (idx !== -1) {
    localRecipes[idx] = { ...localRecipes[idx], ...recipeData };
  } else {
    localRecipes.push({ id, ...recipeData });
  }

  localStorage.setItem('receitas_isa_user_recipes', JSON.stringify(localRecipes));
  return id;
}

export async function autocompleteRecipeWithAI(partialRecipe) {
  const prompt = `Você é um chef especialista e nutricionista.
Recebemos uma receita parcialmente preenchida pelo usuário. Sua tarefa é preencher APENAS os campos opcionais que o usuário deixou em branco ou nulos, com base no título, ingredientes e modo de preparo fornecidos. Preserve exatamente as informações que o usuário já preencheu.

Aqui estão os dados atuais da receita (em JSON):
${JSON.stringify(partialRecipe, null, 2)}

Campos que você DEVE preencher se estiverem em branco ou nulos (se o usuário já preencheu, deixe como está):
- "subtitle": uma linha curta e atrativa descrevendo o prato.
- "cuisine": uma destas opções: Brasileira, Italiana, Japonesa, Mexicana, Francesa, Tailandesa, Americana, Indiana, Espanhola, Grega.
- "difficulty": Fácil, Médio ou Difícil.
- "categories": array com uma ou mais categorias apropriadas de: Café da Manhã, Almoço, Lanche, Jantar, Sobremesa, Acompanhamento.
- "tags": array de tags curtas (ex: "Saudável", "Rápido", "Low Carb", "Sem Glúten", etc).
- "prepTime": estimativa de tempo de preparo em minutos (número inteiro).
- "cookTime": estimativa de tempo de cozimento em minutos (número inteiro).
- "totalTime": soma de prepTime e cookTime (número inteiro).
- "calories": estimativa de calorias por porção (número inteiro).
- "servings": número de porções estimadas (número inteiro).
- "nutrition": objeto estimando a nutrição por porção:
  {
    "calories": número inteiro,
    "protein": "string (ex: 28g)",
    "carbs": "string (ex: 72g)",
    "fat": "string (ex: 24g)"
  }

REGRA CRÍTICA: NUNCA retorne "Não informado" nos campos de nutrição (calories, protein, carbs, fat). Se a receita não traz essas informações, você DEVE obrigatoriamente estimar valores nutricionais realistas baseando-se nos ingredientes e quantidades informados (ex: 250 kcal, 15g, 30g, 5g).

Retorne APENAS o objeto JSON completo atualizado (sem markdown, sem backticks, sem texto adicional).`;

  const body = {
    contents: [{
      parts: [{ text: prompt }]
    }],
    generationConfig: { temperature: 0.1 }
  };
  
  return callGemini(body);
}

export async function extractRecipeFromFile(fileOrFiles, mimeType) {
  const prompt = RECIPE_PROMPT;
  const parts = [{ text: prompt }];

  if (Array.isArray(fileOrFiles)) {
    fileOrFiles.forEach(item => {
      parts.push({
        inlineData: { mimeType: item.mimeType, data: item.base64Data }
      });
    });
  } else {
    parts.push({
      inlineData: { mimeType: mimeType, data: fileOrFiles }
    });
  }

  const body = {
    contents: [{ parts }],
    generationConfig: { temperature: 0.1 }
  };
  return callGemini(body);
}

// Expose globally
window.getUserRecipes = getUserRecipes;
window.getUserRecipeById = getUserRecipeById;
window.deleteUserRecipe = deleteUserRecipe;
window.updateUserRecipe = updateUserRecipe;
window.saveUserRecipe = saveUserRecipe;
window.extractRecipeFromYouTube = extractRecipeFromYouTube;
window.extractRecipeFromText = extractRecipeFromText;
window.uploadRecipeImage = uploadRecipeImage;
window.autocompleteRecipeWithAI = autocompleteRecipeWithAI;
window.extractRecipeFromFile = extractRecipeFromFile;

export function estimateNutritionFallback(title = '', ingredients = []) {
  const t = (title || '').toLowerCase();
  const ingStr = (Array.isArray(ingredients) ? ingredients.join(' ') : String(ingredients || '')).toLowerCase();
  
  let cal = 280;
  let p = 10, c = 25, f = 12;
  
  // Regras baseadas no título
  if (t.includes('bolo') || t.includes('torta doce') || t.includes('brownie') || t.includes('doce')) {
    cal = 340; p = 5; c = 48; f = 15;
  } else if (t.includes('salada') && !ingStr.includes('maionese')) {
    cal = 120; p = 4; c = 15; f = 6;
  } else if (t.includes('frango') || t.includes('carne') || t.includes('peixe') || t.includes('salmão') || t.includes('bife')) {
    cal = 320; p = 35; c = 8; f = 16;
  } else if (t.includes('massa') || t.includes('macarrão') || t.includes('lasanha') || t.includes('risoto')) {
    cal = 420; p = 15; c = 60; f = 12;
  } else if (t.includes('fubá') || t.includes('fuba')) {
    cal = 310; p = 6; c = 45; f = 12;
  } else if (t.includes('pão') || t.includes('pao')) {
    cal = 250; p = 8; c = 40; f = 6;
  } else if (t.includes('omelete') || t.includes('ovo')) {
    cal = 180; p = 14; c = 4; f = 12;
  }
  
  // Regras adicionais baseadas nos ingredientes
  if (ingStr.includes('queijo') || ingStr.includes('creme de leite') || ingStr.includes('manteiga') || ingStr.includes('bacon')) {
    cal += 90; f += 8; p += 4;
  }
  if (ingStr.includes('açúcar') || ingStr.includes('leite condensado') || ingStr.includes('chocolate')) {
    cal += 110; c += 22; f += 4;
  }
  if (ingStr.includes('azeite') || ingStr.includes('óleo')) {
    cal += 45; f += 5;
  }
  if (ingStr.includes('batata') || ingStr.includes('arroz')) {
    cal += 80; c += 18; p += 2;
  }
  
  return {
    calories: cal,
    protein: p + 'g',
    carbs: c + 'g',
    fat: f + 'g'
  };
}
window.estimateNutritionFallback = estimateNutritionFallback;
