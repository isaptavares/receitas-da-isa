/* =============================================
   RECEITAS DA ISA — Taxonomy Manager
   ============================================= */

let allRecipes = [];
let filteredRecipes = [];
let displayedCount = 12;

// Detect taxonomy from body data attributes
const { category, tag, difficulty } = document.body.dataset;
let currentType = '';
let currentValue = '';

if (category) {
  currentType = 'categories';
  currentValue = category;
} else if (tag) {
  currentType = 'tags';
  currentValue = tag;
} else if (difficulty) {
  currentType = 'difficulty';
  currentValue = difficulty;
}

const CATEGORY = currentValue; // For backward compatibility if needed

async function loadIndexLocal() {
  const res = await fetch('../data/index.json?v=' + Date.now());
  if (!res.ok) throw new Error('Não foi possível carregar o índice de receitas.');
  return res.json();
}

async function initTaxonomyPage() {
  const grid = document.getElementById('recipe-grid');
  const countEl = document.getElementById('category-count');
  const loadMoreBtn = document.getElementById('load-more-btn');
  const sortSelect = document.getElementById('sort-select');

  if (!currentType || !currentValue) return;

  try {
    const data = await loadIndexLocal();
    allRecipes = data.recipes;
    
    // Filter recipes based on the detected taxonomy
    filteredRecipes = allRecipes.filter(r => {
      const itemValue = r[currentType];
      if (Array.isArray(itemValue)) {
        return itemValue.includes(currentValue);
      }
      return itemValue === currentValue;
    });
    
    // Update count
    if (countEl) {
        countEl.textContent = `(${filteredRecipes.length} receita${filteredRecipes.length !== 1 ? 's' : ''})`;
    }
    
    // Initial render
    applySortAndRender();

    // Event Listeners
    if (sortSelect) {
        sortSelect.addEventListener('change', () => {
          displayedCount = 12;
          applySortAndRender();
        });
    }

    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', () => {
          displayedCount += 12;
          applySortAndRender();
        });
    }

  } catch (e) {
    if (grid) grid.innerHTML = `<p class="error-msg">Erro ao carregar receitas: ${e.message}</p>`;
  }
}

function applySortAndRender() {
  const sortSelect = document.getElementById('sort-select');
  const sortVal = sortSelect ? sortSelect.value : 'padrao';
  let sorted = [...filteredRecipes];

  if (sortVal === 'recentes') {
    sorted.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  } else if (sortVal === 'tempo') {
    sorted.sort((a, b) => (a.totalTime || 0) - (b.totalTime || 0));
  } else if (sortVal === 'calorias') {
    sorted.sort((a, b) => (a.calories || 0) - (b.calories || 0));
  }

  renderGrid(sorted.slice(0, displayedCount));

  // Toggle load more button
  const loadMoreBtn = document.getElementById('load-more-btn');
  if (loadMoreBtn) {
      if (displayedCount >= sorted.length) {
        loadMoreBtn.style.display = 'none';
      } else {
        loadMoreBtn.style.display = 'block';
      }
  }
}

function renderGrid(recipes) {
  const grid = document.getElementById('recipe-grid');
  if (!grid) return;

  if (recipes.length === 0) {
    grid.innerHTML = '<p class="empty-msg">Nenhuma receita encontrada.</p>';
    return;
  }
  
  // Use the global renderRecipeCard function from recipes.js (ensure window prefix if it's a module)
  const renderFn = window.renderRecipeCard || (typeof renderRecipeCard !== 'undefined' ? renderRecipeCard : null);
  
  if (!renderFn) {
      console.error('renderRecipeCard not found!');
      return;
  }

  grid.innerHTML = recipes.map(r => renderFn(r, { 
      targetPage: '../recipe.html',
      imagePrefix: '../' 
  })).join('');
}

// ES modules execute in document order after the DOM is ready.
// recipes.js (loaded before this file) already set window.renderRecipeCard,
// so we can call initTaxonomyPage directly without any polling.
initTaxonomyPage();
