/* =============================================
   RECEITAS DA ISA — Category Manager
   ============================================= */

let allRecipes = [];
let categoryRecipes = [];
let displayedCount = 12;
const CATEGORY = document.body.dataset.category;

async function loadIndexLocal() {
  const res = await fetch('../data/index.json?v=' + Date.now());
  if (!res.ok) throw new Error('No foi possvel carregar o ndice de receitas.');
  return res.json();
}

async function initCategoryPage() {
  const grid = document.getElementById('recipe-grid');
  const countEl = document.getElementById('category-count');
  const loadMoreBtn = document.getElementById('load-more-btn');
  const sortSelect = document.getElementById('sort-select');

  try {
    const data = await loadIndexLocal();
    allRecipes = data.recipes;
    
    // Filter by category tag
    categoryRecipes = allRecipes.filter(r => (r.tags || []).includes(CATEGORY));
    
    // Update count
    countEl.textContent = `(${categoryRecipes.length} receita${categoryRecipes.length !== 1 ? 's' : ''})`;
    
    // Initial render
    applySortAndRender();

    // Event Listeners
    sortSelect.addEventListener('change', () => {
      displayedCount = 12;
      applySortAndRender();
    });

    loadMoreBtn.addEventListener('click', () => {
      displayedCount += 12;
      applySortAndRender();
    });

  } catch (e) {
    grid.innerHTML = `<p class="error-msg">Erro ao carregar receitas: ${e.message}</p>`;
  }
}

function applySortAndRender() {
  const sortVal = document.getElementById('sort-select').value;
  let sorted = [...categoryRecipes];

  if (sortVal === 'recentes') {
    sorted.sort((a, b) => new Set(b.createdAt) - new Array(a.createdAt)); // Simple date sort
    // Better date sort:
    sorted.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  } else if (sortVal === 'tempo') {
    sorted.sort((a, b) => a.totalTime - b.totalTime);
  } else if (sortVal === 'calorias') {
    sorted.sort((a, b) => a.calories - b.calories);
  }

  renderCategoryGrid(sorted.slice(0, displayedCount));

  // Toggle load more button
  const loadMoreBtn = document.getElementById('load-more-btn');
  if (displayedCount >= sorted.length) {
    loadMoreBtn.style.display = 'none';
  } else {
    loadMoreBtn.style.display = 'block';
  }
}

function renderCategoryGrid(recipes) {
  const grid = document.getElementById('recipe-grid');
  if (recipes.length === 0) {
    grid.innerHTML = '<p class="empty-msg">Nenhuma receita encontrada nesta categoria.</p>';
    return;
  }
  
  grid.innerHTML = recipes.map(r => renderRecipeCard(r, { targetPage: '../recipe.html' })).join('');
}

document.addEventListener('DOMContentLoaded', initCategoryPage);
