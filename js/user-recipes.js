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
    {"item": "frango", "amount": "500g"},
    {"item": "azeite de oliva", "amount": "2 colheres de sopa"}
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
- REGRA CRUCIAL DE FIDELIDADE: Seja extremamente fiel e literal à receita fornecida na fonte (imagem, PDF, vídeo ou texto). NÃO invente ingredientes, NÃO altere as quantidades ou medidas fornecidas, e NÃO crie nem modifique os passos do modo de preparo. Não faça improvisos.
- Dica para sites como TudoGostoso: o número de rendimento/porções (servings) geralmente vem indicado no cabeçalho ou título da seção de ingredientes (ex: "Ingredientes (8 porções)", "Ingredientes - 8 porções" ou similar). Fique atento a essa informação no texto para preencher o campo "servings" corretamente.
- cuisine: use uma de: Brasileira, Italiana, Japonesa, Mexicana, Francesa, Tailandesa, Americana, Indiana, Espanhola, Grega
- difficulty: Fácil, Médio ou Difícil
- categories: use uma ou mais de: Café da Manhã, Almoço, Lanche, Jantar, Sobremesa, Acompanhamento
- Transcreva fielmente as instruções originais do modo de preparo dividindo em passos claros
- SEMPRE inclua estimativas de macronutrientes, estimando de forma realista apenas com base nos ingredientes fornecidos na receita
- Os ingredientes devem ter item e amount separados
- totalTime = prepTime + cookTime`;

// ---- Gemini AI ----

export async function extractRecipeFromYouTube(youtubeUrl) {
  const body = {
    contents: [{
      parts: [
        { text: RECIPE_PROMPT },
        { fileData: { mimeType: 'video/youtube', fileUri: youtubeUrl } }
      ]
    }],
    generationConfig: { temperature: 0.1 }
  };
  return callGemini(body);
}

export async function extractRecipeFromText(text) {
  const body = {
    contents: [{
      parts: [{ text: RECIPE_PROMPT + '\n\nConteúdo para analisar:\n' + text }]
    }],
    generationConfig: { temperature: 0.1 }
  };
  return callGemini(body);
}

export async function extractRecipeFromVercelServer(videoUrl) {
  const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const apiUrl = isLocal ? '/api/extract-video' : 'https://receitas-da-isa.vercel.app/api/extract-video';

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
    throw new Error(data.error || `Erro ${response.status} ao conectar à API Vercel`);
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
    throw new Error(err.error?.message || `Erro ${response.status} na API Gemini`);
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

// ---- Firestore CRUD ----

function getMyRecipesCollection() {
  const user = getUser();
  if (!user) throw new Error('Não logado');
  return collection(db, 'users', user.uid, 'my_recipes');
}

export async function saveUserRecipe(recipeData) {
  const col = getMyRecipesCollection();
  const docRef = await addDoc(col, {
    ...recipeData,
    isUserCreated: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  return docRef.id;
}

export async function getUserRecipes() {
  const user = getUser();
  if (!user) return [];
  try {
    const col = collection(db, 'users', user.uid, 'my_recipes');
    const q = query(col, orderBy('createdAt', 'desc'));
    const snapshotPromise = getDocs(q);
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout Firestore')), 3000));
    const snapshot = await Promise.race([snapshotPromise, timeoutPromise]);
    return snapshot.docs.map(d => ({
      ...d.data(),
      id: d.id,
      firestoreId: d.id,
      isUserCreated: true
    }));
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
    return {
      ...data,
      id: docResult.snap.id,
      firestoreId: docResult.snap.id,
      isUserCreated: true
    };
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
      }
    } catch (e) {
      console.error("Erro ao atualizar no Firestore:", e);
      throw e;
    }
  }
  const localRecipes = JSON.parse(localStorage.getItem('receitas_isa_user_recipes')) || [];
  const idx = localRecipes.findIndex(r => r.id === id || r.firestoreId === id);
  if (idx !== -1) {
    localRecipes[idx] = { ...localRecipes[idx], ...recipeData };
    localStorage.setItem('receitas_isa_user_recipes', JSON.stringify(localRecipes));
  }
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

Retorne APENAS o objeto JSON completo atualizado (sem markdown, sem backticks, sem texto adicional).`;

  const body = {
    contents: [{
      parts: [{ text: prompt }]
    }],
    generationConfig: { temperature: 0.1 }
  };
  
  return callGemini(body);
}

export async function extractRecipeFromFile(base64Data, mimeType) {
  const prompt = RECIPE_PROMPT;
  const body = {
    contents: [{
      parts: [
        { text: prompt },
        { inlineData: { mimeType: mimeType, data: base64Data } }
      ]
    }],
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
