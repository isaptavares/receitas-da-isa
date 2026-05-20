/* =============================================
   RECEITAS DA ISA — User Recipes Module
   Handles: CRUD no Firestore + extração via Gemini AI
   ============================================= */

import {
  db, storage,
  collection, addDoc, getDocs, deleteDoc, doc, getDoc,
  query, orderBy, serverTimestamp,
  storageRef, uploadBytes, getDownloadURL
} from './firebase-config.js';
import { getUser } from './auth.js';

const GEMINI_KEY = 'AIzaSyAY0N43COoHw-h3ogfTLX_qsJwJ6L0CjXg';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`;

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
- cuisine: use uma de: Brasileira, Italiana, Japonesa, Mexicana, Francesa, Tailandesa, Americana, Indiana, Espanhola, Grega
- difficulty: Fácil, Médio ou Difícil
- categories: use uma ou mais de: Café da Manhã, Almoço, Lanche, Jantar, Sobremesa, Acompanhamento
- Seja MUITO detalhado nos passos (mínimo 4 passos)
- SEMPRE inclua estimativas de macronutrientes, mesmo que não explicitamente mencionados
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
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({
      ...d.data(),
      id: d.id,
      firestoreId: d.id,
      isUserCreated: true
    }));
  } catch (e) {
    console.error('Erro ao buscar receitas:', e);
    return [];
  }
}

export async function getUserRecipeById(firestoreId) {
  const user = getUser();
  if (!user) return null;
  const ref = doc(db, 'users', user.uid, 'my_recipes', firestoreId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { ...snap.data(), id: snap.id, firestoreId: snap.id, isUserCreated: true };
}

export async function deleteUserRecipe(firestoreId) {
  const user = getUser();
  if (!user) return;
  const ref = doc(db, 'users', user.uid, 'my_recipes', firestoreId);
  await deleteDoc(ref);
}

// Expose globally
window.getUserRecipes = getUserRecipes;
window.getUserRecipeById = getUserRecipeById;
window.deleteUserRecipe = deleteUserRecipe;
window.saveUserRecipe = saveUserRecipe;
window.extractRecipeFromYouTube = extractRecipeFromYouTube;
window.extractRecipeFromText = extractRecipeFromText;
window.uploadRecipeImage = uploadRecipeImage;
