/* =============================================
   RECEITAS DA ISA — Recipe Data Manager (Module)
   ============================================= */

import { getUser, getCloudFavorites, cloudToggleFavorite } from './auth.js';

const FAVORITES_KEY = 'receitas_isa_favorites';

const CUISINE_META = {
  'Italiana':   { flag: '🇮🇹', emoji: '🍝' },
  'Japonesa':   { flag: '🇯🇵', emoji: '🍣' },
  'Mexicana':   { flag: '🇲🇽', emoji: '🌮' },
  'Francesa':   { flag: '🇫🇷', emoji: '🍷' },
  'Tailandesa': { flag: '🇹🇭', emoji: '🍜' },
  'Brasileira': { flag: '🇧🇷', emoji: '🍖' },
  'Americana':  { flag: '🇺🇸', emoji: '🍔' },
  'Indiana':    { flag: '🇮🇳', emoji: '🍛' },
  'Espanhola':  { flag: '🇪🇸', emoji: '🥘' },
  'Grega':      { flag: '🇬🇷', emoji: '🫒' },
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

// ---- Data Loading ----

async function loadIndex() {
  const res = await fetch('data/index.json?v=' + Date.now());
  if (!res.ok) throw new Error('Não foi possível carregar o índice de receitas.');
  return res.json();
}

async function loadRecipe(id) {
  const res = await fetch(`data/recipes/${id}.json?v=` + Date.now());
  if (!res.ok) throw new Error(`Receita "${id}" não encontrada.`);
  return res.json();
}

// ---- Filter Logic ----

function filterRecipes(recipes, filters) {
  return recipes.filter(r => {
    if (filters.cuisine && filters.cuisine !== 'todas' && r.cuisine !== filters.cuisine) return false;
    if (filters.maxCalories && r.calories > filters.maxCalories) return false;
    if (filters.difficulty && filters.difficulty !== 'todas' && r.difficulty !== filters.difficulty) return false;
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
      const rIngs = (r.ingredients || []).map(i => i.toLowerCase());
      if (!filters.ingredients.every(i => rIngs.includes(i.toLowerCase()))) return false;
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

function renderRecipeCard(recipe, { featured = false, targetPage = 'recipe.html', imagePrefix = '' } = {}) {
  const fav = isFavorite(recipe.id);
  const meta = getCuisineMeta(recipe.cuisine);
  const diffClass = getDifficultyClass(recipe.difficulty);

  const tagsHtml = (recipe.tags || []).slice(0, 3).map(t =>
    `<span class="card-tag">${t}</span>`
  ).join('');

  return `
    <article class="recipe-card ${featured ? 'featured' : ''}" 
             data-id="${recipe.id}"
             id="card-${recipe.id}"
             onclick="window.location='${targetPage}?id=${recipe.id}'"
             role="article"
             aria-label="Ver receita: ${recipe.title}">

      <div class="card-image-wrap">
        <img class="card-image" src="${imagePrefix}${recipe.image}" alt="${recipe.title}" loading="lazy">
        <div class="card-image-overlay"></div>

        <div class="card-cuisine">
          <span class="cuisine-flag">${meta.flag}</span>
          ${recipe.cuisine}
        </div>

        <button class="card-fav-btn ${fav ? 'is-fav' : ''}"
                id="fav-btn-${recipe.id}"
                aria-label="${fav ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}"
                onclick="event.stopPropagation(); handleFavToggle('${recipe.id}')">
          ${fav ? '♥' : '♡'}
        </button>
      </div>

      <div class="card-body">
        <h3 class="card-title">${recipe.title}</h3>
        <p class="card-subtitle">${recipe.subtitle}</p>

        <div class="card-meta">
          <span class="card-meta-item">
            <span class="card-meta-icon">⏱</span>
            <strong>${recipe.totalTime} min</strong>
          </span>
          <span class="card-meta-item">
            <span class="card-meta-icon">🔥</span>
            <strong>${recipe.calories} kcal</strong>
          </span>
          <span class="card-meta-item">
            <span class="card-meta-icon">👤</span>
            <strong>${recipe.servings} porções</strong>
          </span>
        </div>

        <div class="card-footer">
          <div class="card-tags">
            <span class="card-difficulty ${diffClass}">${recipe.difficulty}</span>
            ${tagsHtml}
          </div>
          <span class="card-cta">Ver receita →</span>
        </div>
      </div>
    </article>
  `;
}

// ---- Favorite toggle handler (global compat) ----

async function handleFavToggle(id) {
  const nowFav = await toggleFavorite(id);
  document.querySelectorAll(`#fav-btn-${id}`).forEach(btn => {
    btn.textContent = nowFav ? '♥' : '♡';
    btn.classList.toggle('is-fav', nowFav);
    btn.setAttribute('aria-label', nowFav ? 'Remover dos favoritos' : 'Adicionar aos favoritos');
  });
  
  // Se houver contador na hero, atualiza
  const statFavs = document.getElementById('stat-favs');
  if (statFavs) statFavs.textContent = getFavorites().length;
}

// ---- UI Helpers ----

function showToast(msg, duration = 2800) {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `<span class="toast-icon">✦</span> ${msg}`;
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
}

// ---- Expor para escopo global (para compatibilidade com HTML legados) ----
window.loadIndex = loadIndex;
window.loadRecipe = loadRecipe;
window.filterRecipes = filterRecipes;
window.renderRecipeCard = renderRecipeCard;
window.handleFavToggle = handleFavToggle;
window.getFavorites = getFavorites;
window.isFavorite = isFavorite;
window.initNavbar = initNavbar;
window.getCuisineMeta = getCuisineMeta;
window.getDifficultyClass = getDifficultyClass;
window.showToast = showToast;

// Listen for auth changes to re-render or update state if needed
window.addEventListener('authChange', () => {
    // Força atualização de ícones de favoritos na tela atual se houver grid
    const grid = document.getElementById('recipe-grid');
    if (grid && window.applyFilters) {
        window.applyFilters(); 
    }
});
