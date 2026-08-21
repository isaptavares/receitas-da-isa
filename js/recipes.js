/* =============================================
   RECEITAS DA ISA — Recipe Data Manager (Module)
   ============================================= */

import { getUser, getCloudFavorites, cloudToggleFavorite, getCloudPlanner, cloudUpdatePlanner, cloudRemoveFromPlanner, cloudClearPlanner, authReady } from './auth.js';
import { getUserRecipes, getUserRecipeById } from './user-recipes.js?v=9';

const FAVORITES_KEY = 'receitas_isa_favorites';
const PLANNER_KEY = 'receitas_isa_planner';

const CUISINE_META = {
  'Italiana': { flag: '🇮🇹', code: 'it', emoji: '🍝' },
  'Japonesa': { flag: '🇯🇵', code: 'jp', emoji: '🍣' },
  'Mexicana': { flag: '🇲🇽', code: 'mx', emoji: '🌮' },
  'Francesa': { flag: '🇫🇷', code: 'fr', emoji: '🍷' },
  'Tailandesa': { flag: '🇹🇭', code: 'th', emoji: '🍜' },
  'Brasileira': { flag: '🇧🇷', code: 'br', emoji: '🍖' },
  'Americana': { flag: '🇺🇸', code: 'us', emoji: '🍔' },
  'Indiana': { flag: '🇮🇳', code: 'in', emoji: '🍛' },
  'Espanhola': { flag: '🇪🇸', code: 'es', emoji: '🥘' },
  'Grega': { flag: '🇬🇷', code: 'gr', emoji: '🫒' },
};

// ---- Favorites Logic ----

function getFavorites() {
  const user = getUser();
  if (user) {
    return getCloudFavorites();
  }
  try {
    return JSON.parse(localStorage.getItem(FAVORITES_KEY)) || [];
  } catch { return []; }
}

function isFavorite(id) {
  return getFavorites().includes(id);
}

async function toggleFavorite(id) {
  const user = getUser();

  if (user) {
    const nowFav = await cloudToggleFavorite(id);
    if (nowFav) showToast('♥ Salvo na sua conta!');
    else showToast('🤍 Removido da sua conta');
    return nowFav;
  }

  // Local Storage fallback
  const favs = getFavorites();
  const idx = favs.indexOf(id);
  if (idx === -1) {
    favs.push(id);
    showToast('♥ Adicionado aos favoritos locais!');
  } else {
    favs.splice(idx, 1);
    showToast('🤍 Removido dos favoritos locais');
  }
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(favs));
  return idx === -1;
}

// ---- Local Storage Fallbacks for Planner ----

export function getPlanner() {
  let localPlanner = {};
  try {
    localPlanner = JSON.parse(localStorage.getItem(PLANNER_KEY)) || {};
  } catch { }

  const user = getUser();
  let merged = {};

  if (user) {
    const cloudPlanner = getCloudPlanner() || {};
    merged = { ...cloudPlanner };
    // Preserva apenas itens locais > 0 que não estejam na nuvem
    for (const key in localPlanner) {
      if (localPlanner[key] > 0 && !(key in cloudPlanner)) {
        merged[key] = localPlanner[key];
      }
    }
  } else {
    merged = localPlanner;
  }

  const finalPlanner = {};
  for (const key in merged) {
    if (merged[key] > 0) finalPlanner[key] = merged[key];
  }
  return finalPlanner;
}

export async function updatePlanner(id, servings) {
  const user = getUser();
  let success = false;
  if (user) {
    success = await cloudUpdatePlanner(id, servings);
    if (success) showToast('📅 Receita adicionada ao Planejador!');
  }

  if (!success) {
    let planner = {};
    try { planner = JSON.parse(localStorage.getItem(PLANNER_KEY)) || {}; } catch { }
    planner[id] = servings;
    localStorage.setItem(PLANNER_KEY, JSON.stringify(planner));
    showToast('📅 Receita adicionada ao Planejador!');
  }
  return true;
}

export async function removeFromPlanner(id) {
  const user = getUser();
  let success = false;
  if (user) {
    success = await cloudRemoveFromPlanner(id);
    if (success) showToast('Removido do Planejador');
  }

  let planner = {};
  try { planner = JSON.parse(localStorage.getItem(PLANNER_KEY)) || {}; } catch { }

  planner[id] = 0; // Soft delete local para não ser revivido pela nuvem
  localStorage.setItem(PLANNER_KEY, JSON.stringify(planner));
  if (!success) showToast('Removido do Planejador');
  return true;
}

export async function clearPlanner() {
  const user = getUser();
  let success = false;
  if (user) {
    success = await cloudClearPlanner();
    if (success) showToast('Planejador limpo! Nova semana começando.');
  }

  // Soft delete de tudo localmente para não reviver
  let localPlanner = {};
  try { localPlanner = JSON.parse(localStorage.getItem(PLANNER_KEY)) || {}; } catch { }
  const cloudPlanner = user ? getCloudPlanner() : {};

  const allKeys = new Set([...Object.keys(localPlanner), ...Object.keys(cloudPlanner)]);
  const clearedPlanner = {};
  allKeys.forEach(k => clearedPlanner[k] = 0);

  localStorage.setItem(PLANNER_KEY, JSON.stringify(clearedPlanner));
  if (!success) showToast('Planejador limpo! Nova semana começando.');
  return true;
}

// ---- Data Loading ----

async function waitForAuth() {
  try {
    await Promise.race([
      authReady,
      new Promise(resolve => setTimeout(resolve, 2500))
    ]);
  } catch (e) { }
}

export async function loadIndex(pathPrefix = '') {
  // Se chamado de dentro da pasta categories/, ajusta o prefixo se necessário
  let prefix = pathPrefix;
  if (!prefix && window.location.pathname.includes('/categories/')) {
    prefix = '../';
  }
  const res = await fetch(`${prefix}data/index.json?v=` + Date.now());
  if (!res.ok) throw new Error('Não foi possível carregar o índice de receitas.');
  const index = await res.json();

  // Aguarda o Firebase confirmar login (com timeout de 1.5s para não travar a tela)
  await waitForAuth();

  // Buscar receitas do usuário no Firestore se logado
  let userRecipes = [];
  const user = getUser();
  if (user) {
    try {
      userRecipes = await getUserRecipes();
    } catch (e) {
      console.warn("Erro ao buscar receitas do usuário:", e);
    }
  }

  // Buscar receitas do usuário locais no LocalStorage
  let localUserRecipes = [];
  try {
    localUserRecipes = JSON.parse(localStorage.getItem('receitas_isa_user_recipes')) || [];
  } catch (e) {
    console.warn("Erro ao buscar receitas locais:", e);
  }

  // Pre-load ingredientes em segundo plano para não travar o carregamento inicial da página
  Promise.all((index.recipes || []).map(async (r) => {
    if (!r.ingredients && r.file) {
      try {
        const filePath = prefix ? (r.file.startsWith('/') ? r.file : prefix + r.file) : r.file;
        const rRes = await Promise.race([
          fetch(filePath),
          new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 600))
        ]);
        if (rRes && rRes.ok) {
          const detail = await rRes.json();
          r.ingredients = detail.ingredients || [];
        }
      } catch (e) { }
    }
  })).catch(() => {});

  // Merge user recipes and built-in recipes, giving precedence to user edits
  const recipeMap = new Map();
  index.recipes.forEach(r => recipeMap.set(r.id, r));
  localUserRecipes.forEach(r => recipeMap.set(r.id, { ...recipeMap.get(r.id), ...r }));
  userRecipes.forEach(r => recipeMap.set(r.id, { ...recipeMap.get(r.id), ...r }));

  const deletedStatic = JSON.parse(localStorage.getItem('receitas_isa_deleted_static')) || [];
  const mergedRecipes = Array.from(recipeMap.values()).filter(r => !deletedStatic.includes(r.id) && !deletedStatic.includes(r.firestoreId));
  index.recipes = mergedRecipes;
  index.totalRecipes = mergedRecipes.length;

  return index;
}

export async function loadRecipe(id) {
  // Aguarda o Firebase confirmar login (com timeout de 1.5s para não travar a tela)
  await waitForAuth();

  let userRecipeData = null;

  // 1. Tenta carregar das receitas criadas pelo usuário (Firestore)
  const user = getUser();
  if (user) {
    try {
      userRecipeData = await getUserRecipeById(id);
    } catch (e) {
      console.warn("Erro ao buscar receita do usuário no Firestore:", e);
    }
  }

  // 2. Tenta carregar das receitas locais em LocalStorage
  if (!userRecipeData) {
    try {
      const localUserRecipes = JSON.parse(localStorage.getItem('receitas_isa_user_recipes')) || [];
      userRecipeData = localUserRecipes.find(r => r.id === id || r.firestoreId === id);
    } catch (e) {
      console.warn("Erro ao buscar receita local no LocalStorage:", e);
    }
  }

  // 3. Tenta carregar do JSON estático se existir
  let staticData = null;
  try {
    const res = await fetch(`data/recipes/${id}.json?v=` + Date.now());
    if (res.ok) {
      staticData = await res.json();
    }
  } catch (e) { }

  if (userRecipeData && staticData) {
    // Mescla dados salvos do usuário por cima da receita base estática
    return { ...staticData, ...userRecipeData };
  }

  if (userRecipeData) return userRecipeData;
  if (staticData) return staticData;

  throw new Error(`Receita "${id}" não encontrada.`);
}

// ---- Filter Logic ----

export function filterRecipes(recipes, filters) {
  return recipes.filter(r => {
    // Multi-select cuisines
    if (filters.cuisines && filters.cuisines.length > 0) {
      if (!filters.cuisines.includes(r.cuisine)) return false;
    } else if (filters.cuisine && filters.cuisine !== 'todas' && r.cuisine !== filters.cuisine) {
      return false; // backwards compat
    }
    // Multi-select difficulties
    if (filters.difficulties && filters.difficulties.length > 0) {
      if (!filters.difficulties.includes(r.difficulty)) return false;
    } else if (filters.difficulty && filters.difficulty !== 'todas' && r.difficulty !== filters.difficulty) {
      return false; // backwards compat
    }
    if (filters.maxCalories && r.calories > filters.maxCalories) return false;
    if (filters.tags && filters.tags.length > 0) {
      if (!filters.tags.every(t => r.tags.includes(t))) return false;
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      const haystack = [
        r.title,
        r.subtitle,
        r.cuisine,
        ...(r.tags || []),
        ...(r.categories || [])
      ].join(' ').toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    if (filters.ingredients && filters.ingredients.length > 0) {
      const rIngs = (r.ingredients || []).map(i => (typeof i === 'string' ? i : (i.item || '')).toLowerCase());
      if (!filters.ingredients.every(reqIng =>
        rIngs.some(rIng => rIng.includes(reqIng.toLowerCase()))
      )) return false;
    }
    return true;
  });
}

// ---- Card Rendering ----

function getDifficultyClass(diff) {
  const map = { 'Fácil': 'diff-facil', 'Médio': 'diff-medio', 'Difícil': 'diff-dificil' };
  return map[diff] || 'diff-medio';
}

function getCuisineMeta(cuisine) {
  return CUISINE_META[cuisine] || { flag: '🌍', emoji: '🍽️' };
}

export function renderRecipeCard(recipe, { featured = false, targetPage = 'recipe.html', imagePrefix = '', plannerServings = null, isBulkSelect = false, isSelected = false } = {}) {
  const fav = isFavorite(recipe.id);
  const totalTime = recipe.totalTime || recipe.prepTime || 15;
  const calories = recipe.calories || 300;

  const cardOnClick = isBulkSelect
    ? `window.toggleRecipeSelection('${recipe.id}')`
    : `window.location='${targetPage}?id=${recipe.id}'`;

  const checkboxHtml = isBulkSelect ? `
    <div style="position:absolute; top:12px; left:12px; z-index:30; width:30px; height:30px; border-radius:50%; background:${isSelected ? '#ffbf00' : 'rgba(255,255,255,0.95)'}; border:2.5px solid ${isSelected ? '#14110d' : '#d0c8b8'}; display:flex; align-items:center; justify-content:center; font-size:15px; font-weight:900; color:#14110d; box-shadow:0 4px 14px rgba(0,0,0,0.25); pointer-events:none;">
      ${isSelected ? '✓' : ''}
    </div>
  ` : '';

  const imageOutline = (isBulkSelect && isSelected) ? 'outline:3.5px solid #ffbf00; outline-offset:-2px;' : '';

  return `
    <article class="recipe-card ${featured ? 'featured' : ''} ${isSelected ? 'selected' : ''}" 
             data-id="${recipe.id}"
             id="card-${recipe.id}"
             onclick="${cardOnClick}"
             role="article"
             aria-label="Ver receita: ${recipe.title || 'Receita'}"
             style="display:flex; flex-direction:column; cursor:pointer; text-decoration:none; border-radius:20px; overflow:visible; background:transparent; border:none; box-shadow:none;">

      <div style="position:relative; border-radius:18px; overflow:hidden; aspect-ratio:1/1; background:repeating-linear-gradient(135deg,#f0ebe0 0 14px,#e8e0d0 14px 28px); display:flex; align-items:center; justify-content:center; flex-shrink:0; ${imageOutline}">
        <img src="${(recipe.image && (recipe.image.startsWith('http') || recipe.image.startsWith('data:') || recipe.image.startsWith('blob:'))) ? recipe.image : imagePrefix + (recipe.image || 'images/placeholder_recipe.png')}" alt="${recipe.title || ''}" loading="lazy" style="position:absolute; inset:0; width:100%; height:100%; object-fit:cover; z-index:1; border-radius:18px;">
        ${checkboxHtml}
        
        <!-- Action buttons top-right -->
        ${!isBulkSelect ? `
        <div style="position:absolute; top:10px; right:10px; display:flex; gap:5px; z-index:10;" onclick="event.stopPropagation();">
          <button title="${fav ? 'Remover dos favoritos' : 'Favoritar'}" id="fav-btn-${recipe.id}" onclick="handleFavToggle('${recipe.id}')" style="width:30px; height:30px; border-radius:50%; border:none; background:#fff; color:${fav ? '#e14b3f' : '#6b6b6b'}; cursor:pointer; display:flex; align-items:center; justify-content:center; padding:0; box-shadow:0 2px 8px rgba(0,0,0,0.10);">
            <svg width="15" height="15" viewBox="0 0 18 18" fill="${fav ? '#e14b3f' : 'none'}" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 15S3 11.4 3 7.6A2.9 2.9 0 0 1 9 6a2.9 2.9 0 0 1 6 1.6C15 11.4 9 15 9 15Z"></path></svg>
          </button>
          <button title="Editar" onclick="window.location='${imagePrefix}add-recipe-manual.html?edit=${recipe.id}'" style="width:30px; height:30px; border-radius:50%; border:none; background:#fff; color:#6b6b6b; cursor:pointer; display:flex; align-items:center; justify-content:center; padding:0; box-shadow:0 2px 8px rgba(0,0,0,0.10);">
            <svg width="15" height="15" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11.6 3.9l2.5 2.5M4 14h2.6l7.5-7.5-2.6-2.6L4 11.4V14Z"></path></svg>
          </button>
          <button title="Apagar" onclick="handleCardDelete('${recipe.id}')" style="width:30px; height:30px; border-radius:50%; border:none; background:#fff; color:#6b6b6b; cursor:pointer; display:flex; align-items:center; justify-content:center; padding:0; box-shadow:0 2px 8px rgba(0,0,0,0.10);">
            <svg width="15" height="15" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3.6 5.4h10.8M7.4 5.4V3.8h3.2v1.6M5.4 5.4l.7 8.4h5.8l.7-8.4"></path></svg>
          </button>
          <button title="Adicionar ao planejador" onclick="openPlannerModal('${recipe.id}')" style="width:30px; height:30px; border-radius:50%; border:none; background:#fff; color:#6b6b6b; cursor:pointer; display:flex; align-items:center; justify-content:center; padding:0; box-shadow:0 2px 8px rgba(0,0,0,0.10);">
            <svg width="15" height="15" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="14" height="13" rx="2"/><path d="M6 2v2M12 2v2M2 7h14"/></svg>
          </button>
          <button title="Compartilhar" onclick="openShareModal('${recipe.id}', '${(recipe.title || '').replace(/'/g, "\\'")}', '${recipe.image || ''}')" style="width:30px; height:30px; border-radius:50%; border:none; background:#fff; color:#6b6b6b; cursor:pointer; display:flex; align-items:center; justify-content:center; padding:0; box-shadow:0 2px 8px rgba(0,0,0,0.10);">
            <svg width="15" height="15" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 12V3.6M9 3.6 6.2 6.4M9 3.6l2.8 2.8M4.2 10.4v3.4a.8.8 0 0 0 .8.8h8a.8.8 0 0 0 .8-.8v-3.4"></path></svg>
          </button>
        </div>
        ` : ''}

        <!-- Cuisine badge bottom-left -->
        <div style="position:absolute; bottom:10px; left:10px; background:#fff; border-radius:999px; padding:4px 11px; font-size:10px; font-weight:800; letter-spacing:0.07em; text-transform:uppercase; z-index:10; color:#14110d;">${recipe.cuisine || 'Brasileira'}</div>
      </div>

      <div style="padding:12px 4px 0">
        <div style="font-size:16px; font-weight:800; letter-spacing:-0.02em; color:#14110d; line-height:1.25;">${recipe.title || 'Sem título'}</div>
        <div style="display:flex; align-items:center; gap:12px; margin-top:7px; font-size:12px; font-weight:600; color:#a39a8c;">
          <span style="display:flex; align-items:center; gap:5px;"><span style="width:7px; height:7px; border-radius:50%; background:#ffbf00; flex-shrink:0;"></span>${totalTime} min</span>
          <span style="display:flex; align-items:center; gap:5px;"><span style="width:7px; height:7px; border-radius:50%; background:#2f8f7d; flex-shrink:0;"></span>${recipe.difficulty || 'Médio'}</span>
          <span>${calories} kcal</span>
        </div>
      </div>
    </article>
  `;
}

// ---- Favorite toggle handler (global compat) ----

async function handleFavToggle(id) {
  const nowFav = await toggleFavorite(id);
  document.querySelectorAll(`#fav-btn-${id}`).forEach(btn => {
    btn.classList.toggle('is-fav', nowFav);
    btn.setAttribute('title', nowFav ? 'Remover dos favoritos' : 'Favoritar');
    btn.style.color = nowFav ? '#e14b3f' : '#6b6b6b';
    const svg = btn.querySelector('svg');
    if (svg) {
      svg.setAttribute('fill', nowFav ? '#e14b3f' : 'none');
    }
  });

  // Se houver contador na hero, atualiza
  const statFavs = document.getElementById('stat-favs');
  if (statFavs) statFavs.textContent = getFavorites().length;
}

// ---- UI Helpers ----

function showToast(msg, duration = 2800, actionHtml = '') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `<span class="toast-icon">✦</span> <span class="toast-msg">${msg}</span>${actionHtml}`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('removing');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

function initNavbar() {
  const nav = document.querySelector('.navbar');
  if (!nav) return;
  const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 20);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const path = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-link').forEach(link => {
    const href = link.getAttribute('href') || '';
    link.classList.toggle('active', href.includes(path) || (path === '' && href.includes('index')));
  });

  // Configura a funcionalidade da barra de pesquisa no navbar
  setupNavSearch();

  // Injetar menu mobile se não existir
  if (!document.getElementById('mobile-menu-btn')) {
    const navLinksList = nav.querySelector('.nav-links');
    if (navLinksList) {
      const liBtn = document.createElement('li');
      liBtn.className = 'mobile-menu-container';
      liBtn.innerHTML = `<button class="mobile-menu-btn" id="mobile-menu-btn" aria-label="Abrir menu">☰</button>`;
      navLinksList.appendChild(liBtn);

      const mobileMenu = document.createElement('div');
      mobileMenu.className = 'mobile-dropdown';
      mobileMenu.id = 'mobile-dropdown';
      // Adjust path for links if inside a subdirectory (categories, tags)
      const isSubdir = window.location.pathname.includes('/categories/') || window.location.pathname.includes('/tags/') || window.location.pathname.includes('/difficulties/');
      const prefix = isSubdir ? '../' : '';

      mobileMenu.innerHTML = `
        <a class="mobile-nav-link" href="${prefix}index.html"><span>🏠</span> Início</a>
        <a class="mobile-nav-link" href="${prefix}favorites.html"><span>♥</span> Favoritas</a>
        <a class="mobile-nav-link" href="${prefix}planner.html"><span>📅</span> Planejador</a>
      `;
      nav.appendChild(mobileMenu);

      mobileMenu.querySelectorAll('.mobile-nav-link').forEach(link => {
        const href = link.getAttribute('href') || '';
        const hrefBase = href.split('/').pop();
        link.classList.toggle('active', hrefBase.includes(path) || (path === '' && hrefBase.includes('index')));
      });

      const btn = liBtn.querySelector('#mobile-menu-btn');
      btn.onclick = (e) => {
        e.stopPropagation();
        mobileMenu.classList.toggle('active');
      };

      document.addEventListener('click', (e) => {
        if (!liBtn.contains(e.target) && !mobileMenu.contains(e.target)) {
          mobileMenu.classList.remove('active');
        }
      });
    }
  }
}

// Cache de receitas para busca rápida no navbar
let cachedQuickSearchRecipes = null;

async function getQuickSearchRecipes(prefix = '') {
  if (cachedQuickSearchRecipes) return cachedQuickSearchRecipes;
  try {
    const res = await fetch(`${prefix}data/recipes.json?v=` + Date.now());
    if (res.ok) {
      const data = await res.json();
      const localUserRecipes = JSON.parse(localStorage.getItem('receitas_isa_user_recipes')) || [];
      const recipeMap = new Map();
      (data.recipes || []).forEach(r => recipeMap.set(r.id, r));
      localUserRecipes.forEach(r => recipeMap.set(r.id, { ...recipeMap.get(r.id), ...r }));
      cachedQuickSearchRecipes = Array.from(recipeMap.values());
      return cachedQuickSearchRecipes;
    }
  } catch (e) {
    console.warn("Erro ao carregar receitas para busca rápida:", e);
  }
  return [];
}

function escapeHtmlStr(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Configura busca no navbar em todas as páginas com container flutuante
function setupNavSearch() {
  const searchInputs = document.querySelectorAll('.navbar input[placeholder*="Procurar"], .nav-search-input');
  searchInputs.forEach(input => {
    if (input.dataset.searchBound) return;
    input.dataset.searchBound = "true";

    const isSubdir = window.location.pathname.includes('/categories/') || window.location.pathname.includes('/tags/') || window.location.pathname.includes('/difficulties/');
    const prefix = isSubdir ? '../' : '';

    const parentContainer = input.closest('div');
    if (parentContainer) {
      parentContainer.style.setProperty('position', 'relative', 'important');
      parentContainer.style.setProperty('overflow', 'visible', 'important');
    }

    let dropdown = parentContainer ? parentContainer.querySelector('.nav-search-dropdown') : null;
    if (!dropdown && parentContainer) {
      dropdown = document.createElement('div');
      dropdown.className = 'nav-search-dropdown';
      dropdown.style.cssText = `
        position: absolute;
        top: calc(100% + 10px);
        right: 0;
        width: 380px;
        max-width: calc(100vw - 32px);
        max-height: 460px;
        border-radius: 20px;
        background: #ffffff;
        border: 1.5px solid #ece5d9;
        box-shadow: 0 16px 40px rgba(20,17,13,0.14);
        z-index: 1000;
        overflow-y: auto;
        padding: 10px;
        display: none;
        box-sizing: border-box;
      `;
      parentContainer.appendChild(dropdown);
    }

    async function updateDropdown() {
      if (!dropdown) return;
      const recipes = await getQuickSearchRecipes(prefix);
      const query = input.value.trim().toLowerCase();

      let matches = [];
      if (query) {
        matches = recipes.filter(r => {
          const title = (r.title || '').toLowerCase();
          const sub = (r.subtitle || '').toLowerCase();
          const cuisine = (r.cuisine || '').toLowerCase();
          const tags = (r.tags || []).join(' ').toLowerCase();
          const cats = (r.categories || []).join(' ').toLowerCase();
          const ings = (r.ingredients || []).map(i => (typeof i === 'string' ? i : (i.item || '')).toLowerCase()).join(' ');
          return title.includes(query) || sub.includes(query) || cuisine.includes(query) || tags.includes(query) || cats.includes(query) || ings.includes(query);
        });
      } else {
        matches = recipes.slice(0, 5);
      }

      let html = '';
      if (query) {
        html += `<div style="padding: 6px 12px 8px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; color: #a39a8c;">Resultados (${matches.length})</div>`;
      } else {
        html += `<div style="padding: 6px 12px 8px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; color: #a39a8c;">Sugestões de receitas</div>`;
      }

      if (matches.length === 0) {
        html += `
          <div style="padding: 24px 16px; text-align: center; color: #6b6459; font-size: 14px; font-weight: 600;">
            🔍 Nenhuma receita encontrada para "<strong>${escapeHtmlStr(query)}</strong>"
          </div>
        `;
      } else {
        const displayList = matches.slice(0, 7);
        displayList.forEach(r => {
          const rawImg = r.image || '';
          let imgSrc = `${prefix}images/placeholder_recipe.png`;
          if (rawImg) {
            imgSrc = (rawImg.startsWith('http') || rawImg.startsWith('data:')) ? rawImg : `${prefix}${rawImg}`;
          }

          html += `
            <a href="${prefix}recipe.html?id=${r.id}" class="nav-search-item" style="display:flex; align-items:center; gap:12px; padding:10px 12px; border-radius:14px; text-decoration:none; color:inherit; transition:background 0.18s; cursor:pointer;" onmouseover="this.style.background='#f7f4ee'" onmouseout="this.style.background='transparent'">
              <img src="${imgSrc}" alt="${escapeHtmlStr(r.title)}" style="width:46px; height:46px; border-radius:12px; object-fit:cover; flex-shrink:0; background:#f4efe6; border:1px solid #efe8dc;" onError="this.src='${prefix}images/placeholder_recipe.png'">
              <div style="flex:1; min-width:0;">
                <div style="font-size:14px; font-weight:800; color:#14110d; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escapeHtmlStr(r.title)}</div>
                <div style="font-size:12px; color:#6b6459; font-weight:600; margin-top:2px; display:flex; align-items:center; gap:6px;">
                  <span>${r.cuisine || 'Geral'}</span>
                  <span>•</span>
                  <span>⏱️ ${r.totalTime || r.prepTime || 15} min</span>
                </div>
              </div>
              <span style="color:#a39a8c; font-size:15px; font-weight:700;">→</span>
            </a>
          `;
        });

        if (matches.length > 7 || query) {
          html += `
            <a href="${prefix}index.html?q=${encodeURIComponent(query)}#receitas" style="display:block; text-align:center; padding:10px; font-size:13px; font-weight:700; color:#7b4bd1; text-decoration:none; border-top:1px solid #f0ebe3; margin-top:6px;">
              Ver todas as ${matches.length} receitas em buscas →
            </a>
          `;
        }
      }

      dropdown.innerHTML = html;
      dropdown.style.display = 'block';
    }

    input.addEventListener('focus', () => {
      updateDropdown();
    });

    input.addEventListener('input', () => {
      updateDropdown();
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const val = input.value.trim();
        if (val) {
          window.location.href = `${prefix}index.html?q=${encodeURIComponent(val)}#receitas`;
        }
      } else if (e.key === 'Escape') {
        if (dropdown) dropdown.style.display = 'none';
      }
    });

    document.addEventListener('click', (e) => {
      if (parentContainer && !parentContainer.contains(e.target)) {
        if (dropdown) dropdown.style.display = 'none';
      }
    });
  });
}

// ---- Expor para escopo global (para compatibilidade com HTML legados) ----
async function handleCardDelete(id) {
  const card = document.getElementById(`card-${id}`);
  const title = card?.querySelector('.card-title')?.textContent || 'esta receita';
  if (confirm(`Tem certeza que deseja excluir a receita "${title}"?`)) {
    try {
      if (window.deleteUserRecipe) {
        await window.deleteUserRecipe(id);
      } else {
        const localRecipes = JSON.parse(localStorage.getItem('receitas_isa_user_recipes')) || [];
        const updated = localRecipes.filter(r => r.id !== id && r.firestoreId !== id);
        localStorage.setItem('receitas_isa_user_recipes', JSON.stringify(updated));
      }
      if (window.showToast) window.showToast("🗑️ Receita excluída com sucesso!", 3000);
      if (card) {
        card.style.transition = 'all 0.3s ease';
        card.style.opacity = '0';
        card.style.transform = 'scale(0.9)';
        setTimeout(() => card.remove(), 300);
      }
    } catch (err) {
      console.error("Erro ao excluir receita:", err);
      if (window.showToast) window.showToast("❌ Erro ao excluir receita.");
    }
  }
}

export function recordRecipeView(id) {
  if (!id) return;
  try {
    const views = JSON.parse(localStorage.getItem('idv_recipe_views') || '{}');
    views[id] = (views[id] || 0) + 1;
    localStorage.setItem('idv_recipe_views', JSON.stringify(views));
  } catch (e) {
    console.warn('Could not record recipe view', e);
  }
}

export function getRecipeViews(id) {
  if (!id) return 0;
  try {
    const views = JSON.parse(localStorage.getItem('idv_recipe_views') || '{}');
    return views[id] || 0;
  } catch (e) {
    return 0;
  }
}

export function getRecipeRanking() {
  try {
    const views = JSON.parse(localStorage.getItem('idv_recipe_views') || '{}');
    const entries = Object.entries(views).sort((a, b) => b[1] - a[1]);
    console.table(entries.map(([id, count]) => ({ 'Receita': id, 'Visualizações': count })));
    return entries;
  } catch (e) {
    return [];
  }
}

// ---- POPUP MODAL DO PLANEJADOR DE REFEIÇÕES ----
let activePlannerModalRecipe = null;
let modalWeekOffset = 0;
const SCHEDULE_KEY = 'receitas_isa_planner_schedule';

function getModalSchedule() {
  let localSchedule = {};
  try { localSchedule = JSON.parse(localStorage.getItem(SCHEDULE_KEY)) || {}; } catch { }
  const user = getUser();
  if (user) {
    const cloudSchedule = getCloudSchedule() || {};
    return { ...cloudSchedule, ...localSchedule };
  }
  return localSchedule;
}

async function saveModalSchedule(schedule) {
  localStorage.setItem(SCHEDULE_KEY, JSON.stringify(schedule));
  const user = getUser();
  if (user) {
    await cloudUpdateSchedule(schedule);
  }
}

function getModalMondayKey(offset) {
  const now = new Date();
  const todayDow = now.getDay() || 7;
  const monday = new Date(now);
  monday.setDate(now.getDate() - (todayDow - 1) + (offset * 7));
  return monday.toISOString().slice(0, 10);
}

function getModalWeekDays(offset) {
  const dayNames = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
  const now = new Date();
  const todayDow = now.getDay() || 7;
  const monday = new Date(now);
  monday.setDate(now.getDate() - (todayDow - 1) + (offset * 7));

  return dayNames.map((name, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const isToday = offset === 0 && d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    return { name, dateStr: `${dd}.${mm}`, isToday, date: d };
  });
}

export function openPlannerModal(recipeId) {
  activePlannerModalRecipe = recipeId;
  modalWeekOffset = 0;
  ensurePlannerModalHTML();
  renderPlannerModalContent();
  const overlay = document.getElementById('global-planner-modal-overlay');
  if (overlay) overlay.style.display = 'flex';
}

export function closePlannerModal() {
  const overlay = document.getElementById('global-planner-modal-overlay');
  if (overlay) overlay.style.display = 'none';
  activePlannerModalRecipe = null;
}

export function changeModalWeek(delta) {
  modalWeekOffset += delta;
  renderPlannerModalContent();
}

export async function togglePlannerModalSlot(dayIndex, meal) {
  if (!activePlannerModalRecipe) return;
  const schedule = getModalSchedule();
  const mondayKey = getModalMondayKey(modalWeekOffset);
  const slotKey = `${mondayKey}_${dayIndex}_${meal}`;

  let currentVal = schedule[slotKey];
  let ids = Array.isArray(currentVal) ? [...currentVal] : (currentVal ? [currentVal] : []);

  if (ids.includes(activePlannerModalRecipe)) {
    ids = ids.filter(id => id !== activePlannerModalRecipe);
    if (ids.length === 0) delete schedule[slotKey];
    else schedule[slotKey] = ids;
    showToast('Removido do planejador');
  } else {
    if (ids.length >= 2) {
      showToast('⚠️ Limite de 2 receitas por refeição atingido');
      return;
    }
    ids.push(activePlannerModalRecipe);
    schedule[slotKey] = ids;
    showToast('📅 Agendado no planejador!');
  }
  await saveModalSchedule(schedule);
  renderPlannerModalContent();
  if (typeof window.loadPlannerData === 'function') {
    window.loadPlannerData();
  }
}

function ensurePlannerModalHTML() {
  if (document.getElementById('global-planner-modal-overlay')) return;
  const modalDiv = document.createElement('div');
  modalDiv.id = 'global-planner-modal-overlay';
  modalDiv.style.cssText = 'display:none; position:fixed; inset:0; background:rgba(0,0,0,0.5); z-index:9999; align-items:center; justify-content:center; backdrop-filter:blur(4px);';
  modalDiv.onclick = (e) => { if (e.target === modalDiv) closePlannerModal(); };

  modalDiv.innerHTML = `
    <div style="background:#fff; border-radius:28px; width:min(640px,94vw); max-height:86vh; display:flex; flex-direction:column; overflow:hidden; box-shadow:0 24px 80px rgba(0,0,0,0.22); position:relative;">
      <!-- Header -->
      <div style="padding:22px 28px; border-bottom:2px solid #f0ebe3; display:flex; align-items:center; justify-content:space-between; background:#fff;">
        <div>
          <div style="font-size:11px; font-weight:800; letter-spacing:0.12em; text-transform:uppercase; color:#d99f00;">Agendar refeição</div>
          <h3 id="planner-modal-recipe-title" style="margin:4px 0 0; font-size:20px; font-weight:800; color:#14110d;">Adicionar ao planejador</h3>
        </div>
        <button type="button" onclick="closePlannerModal()" style="background:#f0ebe3; border:none; cursor:pointer; width:34px; height:34px; border-radius:50%; display:flex; align-items:center; justify-content:center; color:#14110d; font-size:16px; font-weight:800;">✕</button>
      </div>

      <!-- Seletor de Semana -->
      <div style="padding:14px 28px; background:#faf7f2; border-bottom:2px solid #f0ebe3; display:flex; align-items:center; justify-content:center;">
        <div style="display:inline-flex; align-items:center; gap:12px; background:#fff; border:2px solid #ece5d9; border-radius:999px; padding:6px 16px; height:38px; box-sizing:border-box;">
          <button type="button" onclick="changeModalWeek(-1)" style="background:none; border:none; cursor:pointer; font-size:16px; font-weight:800; color:#14110d; display:flex; align-items:center; padding:4px;">‹</button>
          <span id="planner-modal-week-label" style="font-size:14px; font-weight:800; color:#14110d; min-width:110px; text-align:center;">-- – --</span>
          <button type="button" onclick="changeModalWeek(1)" style="background:none; border:none; cursor:pointer; font-size:16px; font-weight:800; color:#14110d; display:flex; align-items:center; padding:4px;">›</button>
        </div>
      </div>

      <!-- Lista de Dias da Semana -->
      <div id="planner-modal-days-list" style="overflow-y:auto; flex:1; padding:20px 28px; display:flex; flex-direction:column; gap:12px;"></div>

      <!-- Footer com Botão de Confirmação -->
      <div style="padding:16px 28px; border-top:2px solid #f0ebe3; display:flex; justify-content:flex-end; background:#fff; flex-shrink:0;">
        <button type="button" onclick="closePlannerModal()" style="background:#ffbf00; border:none; font-family:inherit; font-size:14px; font-weight:800; padding:12px 28px; border-radius:999px; cursor:pointer; color:#14110d; box-shadow:0 4px 12px rgba(255,191,0,0.25);">Concluído</button>
      </div>
    </div>
  `;
  document.body.appendChild(modalDiv);
}

function renderPlannerModalContent() {
  const daysList = document.getElementById('planner-modal-days-list');
  const weekLabel = document.getElementById('planner-modal-week-label');
  if (!daysList) return;

  const DAYS = getModalWeekDays(modalWeekOffset);
  const now = new Date();
  const dayOfWeek = now.getDay() || 7;
  const monday = new Date(now);
  monday.setDate(now.getDate() - (dayOfWeek - 1) + (modalWeekOffset * 7));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const months = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

  if (weekLabel) {
    weekLabel.textContent = `${monday.getDate()} – ${sunday.getDate()} ${months[sunday.getMonth()]}`;
  }

  const schedule = getModalSchedule();
  const mondayKey = getModalMondayKey(modalWeekOffset);

  // Tentar pegar o título da receita de várias fontes
  let recipeTitle = 'Receita';
  if (window.allRecipes) {
    const found = window.allRecipes.find(r => r.id === activePlannerModalRecipe);
    if (found) recipeTitle = found.title;
  }
  if (recipeTitle === 'Receita') {
    const currentDetailTitle = document.querySelector('h1')?.textContent;
    if (currentDetailTitle) recipeTitle = currentDetailTitle;
  }

  const titleEl = document.getElementById('planner-modal-recipe-title');
  if (titleEl) titleEl.textContent = recipeTitle;

  daysList.innerHTML = DAYS.map((day, dayIndex) => {
    const lunchKey = `${mondayKey}_${dayIndex}_lunch`;
    const dinnerKey = `${mondayKey}_${dayIndex}_dinner`;

    const valLunch = schedule[lunchKey];
    const valDinner = schedule[dinnerKey];

    const idsLunch = Array.isArray(valLunch) ? valLunch : (valLunch ? [valLunch] : []);
    const idsDinner = Array.isArray(valDinner) ? valDinner : (valDinner ? [valDinner] : []);

    const isLunchActive = idsLunch.includes(activePlannerModalRecipe);
    const isDinnerActive = idsDinner.includes(activePlannerModalRecipe);

    const isLunchFull = !isLunchActive && idsLunch.length >= 2;
    const isDinnerFull = !isDinnerActive && idsDinner.length >= 2;

    const getBadge = (ids, isActive) => {
      if (ids.length === 0) return '';
      const bg = isActive ? 'rgba(255,255,255,0.3)' : '#ece5d9';
      const color = isActive ? '#fff' : '#6b6459';
      return `<span style="background:${bg}; color:${color}; border-radius:50%; width:18px; height:18px; display:flex; align-items:center; justify-content:center; font-size:10px; font-weight:800;">${ids.length}</span>`;
    };

    return `
      <div style="background:#f7f4ee; border:2px solid #ece5d9; border-radius:18px; padding:14px 18px; display:flex; align-items:center; justify-content:space-between; gap:16px; flex-wrap:wrap;">
        <div style="display:flex; align-items:center; gap:8px;">
          <span style="font-size:15px; font-weight:800; color:#14110d;">${day.name}</span>
          <span style="font-family:'JetBrains Mono', monospace; font-size:12px; color:#a39a8c; font-weight:600;">${day.dateStr}</span>
          ${day.isToday ? `<span style="background:#ffbf00; color:#14110d; border-radius:999px; padding:2px 8px; font-size:10px; font-weight:800;">HOJE</span>` : ''}
        </div>

        <div style="display:flex; align-items:center; gap:10px;">
          <button type="button" onclick="togglePlannerModalSlot(${dayIndex}, 'lunch')" style="padding:8px 16px; border-radius:999px; font-family:inherit; font-size:12px; font-weight:800; border:2px solid ${isLunchActive ? '#2f8f7d' : '#ece5d9'}; background:${isLunchActive ? '#2f8f7d' : '#fff'}; color:${isLunchActive ? '#fff' : '#6b6459'}; cursor:${isLunchFull ? 'not-allowed' : 'pointer'}; opacity:${isLunchFull ? '0.6' : '1'}; transition:all 0.15s; display:flex; align-items:center; gap:6px;">
            <span>☀️ Almoço</span>
            ${getBadge(idsLunch, isLunchActive)}
          </button>
          <button type="button" onclick="togglePlannerModalSlot(${dayIndex}, 'dinner')" style="padding:8px 16px; border-radius:999px; font-family:inherit; font-size:12px; font-weight:800; border:2px solid ${isDinnerActive ? '#2f8f7d' : '#ece5d9'}; background:${isDinnerActive ? '#2f8f7d' : '#fff'}; color:${isDinnerActive ? '#fff' : '#6b6459'}; cursor:${isDinnerFull ? 'not-allowed' : 'pointer'}; opacity:${isDinnerFull ? '0.6' : '1'}; transition:all 0.15s; display:flex; align-items:center; gap:6px;">
            <span>🌙 Jantar</span>
            ${getBadge(idsDinner, isDinnerActive)}
          </button>
        </div>
      </div>
    `;
  }).join('');
}
// ---- Error Modal ----

export function showErrorModal(title, message) {
  let modal = document.getElementById('error-modal-overlay');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'error-modal-overlay';
    modal.style.cssText = 'display:flex; position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(20,17,13,0.6); z-index:9999; align-items:center; justify-content:center; padding:20px; backdrop-filter:blur(4px); opacity:0; transition:opacity 0.2s;';
    
    modal.innerHTML = `
      <div style="background:#fff; width:100%; max-width:400px; border-radius:12px; box-shadow:0 10px 40px rgba(0,0,0,0.2); display:flex; flex-direction:column; overflow:hidden; transform:scale(0.95); transition:transform 0.2s; font-family:inherit;">
        <div style="display:flex; align-items:center; justify-content:space-between; padding:16px 20px; border-bottom:1px solid #eee;">
          <h3 id="error-modal-title" style="margin:0; font-size:18px; font-weight:700; color:#14110d;"></h3>
          <button onclick="document.getElementById('error-modal-overlay').style.opacity='0'; document.getElementById('error-modal-overlay').children[0].style.transform='scale(0.95)'; setTimeout(() => document.getElementById('error-modal-overlay').style.display='none', 200);" style="background:transparent; border:none; color:#a39a8c; font-size:18px; font-weight:bold; cursor:pointer; padding:0; line-height:1;">✕</button>
        </div>
        <div style="padding:24px 20px;">
          <p id="error-modal-message" style="margin:0; font-size:15px; color:#444; line-height:1.5;"></p>
        </div>
        <div style="padding:16px 20px; border-top:1px solid #eee; display:flex; justify-content:flex-end; background:#fafafa;">
          <button onclick="document.getElementById('error-modal-overlay').style.opacity='0'; document.getElementById('error-modal-overlay').children[0].style.transform='scale(0.95)'; setTimeout(() => document.getElementById('error-modal-overlay').style.display='none', 200);" style="background:#ffbf00; color:#14110d; border:none; border-radius:6px; padding:8px 20px; font-family:inherit; font-size:14px; font-weight:700; cursor:pointer; transition:background 0.2s;" onmouseover="this.style.background='#e6ac00'" onmouseout="this.style.background='#ffbf00'">OK</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }
  
  document.getElementById('error-modal-title').textContent = title;
  document.getElementById('error-modal-message').textContent = message;
  
  modal.style.display = 'flex';
  requestAnimationFrame(() => {
    modal.style.opacity = '1';
    modal.children[0].style.transform = 'scale(1)';
  });
}

// Expor globalmente para uso inline (onclick)
window.showErrorModal = showErrorModal;
window.loadIndex = loadIndex;
window.loadRecipe = loadRecipe;
window.filterRecipes = filterRecipes;
window.renderRecipeCard = renderRecipeCard;
window.handleFavToggle = handleFavToggle;
window.handleCardDelete = handleCardDelete;
window.getFavorites = getFavorites;
window.isFavorite = isFavorite;
window.getPlanner = getPlanner;
window.updatePlanner = updatePlanner;
window.removeFromPlanner = removeFromPlanner;
window.clearPlanner = clearPlanner;
window.initNavbar = initNavbar;
window.getCuisineMeta = getCuisineMeta;
window.getDifficultyClass = getDifficultyClass;
window.showToast = showToast;
window.recordRecipeView = recordRecipeView;
window.getRecipeViews = getRecipeViews;
window.getRecipeRanking = getRecipeRanking;
window.openPlannerModal = openPlannerModal;
window.closePlannerModal = closePlannerModal;
window.changeModalWeek = changeModalWeek;
window.togglePlannerModalSlot = togglePlannerModalSlot;

// Listen for auth changes to re-render or update state if needed
window.addEventListener('authChange', () => {
  // Força atualização de ícones de favoritos na tela atual se houver grid
  const grid = document.getElementById('recipe-grid');
  if (grid && window.applyFilters) {
    window.applyFilters();
  }
});
