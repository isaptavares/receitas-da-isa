/**
 * RECEITAS DA ISA - Quick Navigation & Global Recipe Search Modal
 * Enables quick navigation shortcut modal for all recipes across the site.
 */

(function () {
  'use strict';

  // Determine path relative prefix if inside a subfolder like /categories/
  const isSubFolder = window.location.pathname.includes('/categories/');
  const pathPrefix = isSubFolder ? '../' : '';

  let allRecipes = [];
  let isLoaded = false;
  let selectedIndex = -1;
  let activeCategory = 'TODAS';

  let backdrop, input, closeBtn, resultsContainer, countEl, pillsContainer;

  // 1. Inject Styles
  function injectStyles() {
    if (document.getElementById('qs-styles')) return;
    const style = document.createElement('style');
    style.id = 'qs-styles';
    style.textContent = `
      .qs-backdrop {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(20, 17, 13, 0.55);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        z-index: 999999;
        display: flex;
        align-items: flex-start;
        justify-content: center;
        padding-top: max(40px, 8vh);
        padding-left: 16px;
        padding-right: 16px;
        opacity: 0;
        visibility: hidden;
        transition: opacity 0.25s cubic-bezier(0.16, 1, 0.3, 1), visibility 0.25s;
        box-sizing: border-box;
      }
      .qs-backdrop.qs-active {
        opacity: 1;
        visibility: visible;
      }
      .qs-modal {
        background: #ffffff;
        width: 100%;
        max-width: 680px;
        border-radius: 24px;
        box-shadow: 0 25px 60px -15px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(0, 0, 0, 0.06);
        overflow: hidden;
        display: flex;
        flex-direction: column;
        max-height: 84vh;
        transform: translateY(-12px) scale(0.98);
        transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        box-sizing: border-box;
      }
      .qs-backdrop.qs-active .qs-modal {
        transform: translateY(0) scale(1);
      }
      .qs-header {
        padding: 16px 20px;
        display: flex;
        align-items: center;
        gap: 12px;
        border-bottom: 1px solid #f2ede4;
        background: #fcfbfa;
      }
      .qs-search-icon {
        flex-shrink: 0;
        color: #ffbf00;
      }
      .qs-input {
        border: none;
        background: transparent;
        outline: none;
        font-family: inherit;
        font-size: 16px;
        font-weight: 600;
        color: #14110d;
        width: 100%;
      }
      .qs-input::placeholder {
        color: #9e978e;
        font-weight: 500;
      }
      .qs-shortcut-badge {
        background: #f2ece1;
        color: #6b6459;
        font-size: 11px;
        font-weight: 700;
        padding: 5px 10px;
        border-radius: 8px;
        white-space: nowrap;
        letter-spacing: 0.03em;
        flex-shrink: 0;
      }
      .qs-close-btn {
        background: #f4efe6;
        border: none;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #6b6459;
        transition: all 0.15s ease;
        flex-shrink: 0;
        font-size: 13px;
        font-weight: bold;
        line-height: 1;
      }
      .qs-close-btn:hover {
        background: #e6dfd1;
        color: #14110d;
      }
      /* CATEGORY BAR FIX & PREMIUM REDESIGN */
      .qs-pills-wrapper {
        background: #fcfbfa;
        border-bottom: 1px solid #f2ede4;
        padding: 10px 16px;
      }
      .qs-pills {
        display: flex;
        align-items: center;
        gap: 8px;
        overflow-x: auto;
        padding: 2px 4px;
        scrollbar-width: none;
        -ms-overflow-style: none;
      }
      .qs-pills::-webkit-scrollbar {
        display: none;
      }
      .qs-pill {
        border: none;
        outline: none;
        background: #f4efe6;
        color: #6b6459;
        font-family: inherit;
        font-size: 13px;
        font-weight: 700;
        line-height: 1;
        padding: 9px 16px;
        border-radius: 999px;
        cursor: pointer;
        white-space: nowrap;
        flex-shrink: 0;
        box-sizing: border-box;
        transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }
      .qs-pill:hover {
        background: #e9e2d5;
        color: #14110d;
      }
      .qs-pill.qs-pill-active {
        background: #ffbf00;
        color: #14110d;
        box-shadow: 0 4px 14px rgba(255, 191, 0, 0.35);
        transform: translateY(-1px);
      }
      .qs-results {
        flex: 1;
        overflow-y: auto;
        padding: 12px 16px;
      }
      .qs-item {
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 12px 14px;
        border-radius: 16px;
        text-decoration: none;
        color: inherit;
        transition: background 0.15s ease, transform 0.15s ease;
        cursor: pointer;
        user-select: none;
      }
      .qs-item:hover, .qs-item.qs-selected {
        background: #fff8e6;
      }
      .qs-item-img {
        width: 56px;
        height: 56px;
        border-radius: 12px;
        object-fit: cover;
        background: #f4efe6;
        flex-shrink: 0;
        box-shadow: 0 2px 8px rgba(0,0,0,0.06);
      }
      .qs-item-info {
        flex: 1;
        min-width: 0;
      }
      .qs-item-title {
        font-size: 15px;
        font-weight: 700;
        color: #14110d;
        margin-bottom: 3px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .qs-item-sub {
        font-size: 13px;
        color: #7a7368;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        margin-bottom: 6px;
      }
      .qs-item-tags {
        display: flex;
        align-items: center;
        gap: 6px;
        flex-wrap: wrap;
      }
      .qs-tag {
        font-size: 11px;
        font-weight: 600;
        padding: 2px 8px;
        border-radius: 999px;
        background: #f2ece1;
        color: #6b6459;
      }
      .qs-tag-cuisine {
        background: #fff1c6;
        color: #8a6a00;
      }
      .qs-arrow {
        color: #d1c8b8;
        transition: transform 0.15s ease, color 0.15s ease;
        flex-shrink: 0;
      }
      .qs-item:hover .qs-arrow, .qs-item.qs-selected .qs-arrow {
        transform: translateX(4px);
        color: #ffbf00;
      }
      .qs-empty {
        padding: 40px 24px;
        text-align: center;
        color: #8c857b;
        font-size: 14px;
        font-weight: 500;
      }
      .qs-footer {
        padding: 14px 20px;
        background: #fcfbfa;
        border-top: 1px solid #f2ede4;
        display: flex;
        align-items: center;
        justify-content: space-between;
        font-size: 12px;
        color: #8c857b;
        font-weight: 500;
      }
    `;
    document.head.appendChild(style);
  }

  // 2. Inject Modal HTML
  function initDOM() {
    if (document.getElementById('qs-backdrop')) return;
    injectStyles();

    const modalHTML = `
      <div class="qs-backdrop" id="qs-backdrop">
        <div class="qs-modal" role="dialog" aria-modal="true" aria-label="Atalho de busca de receitas">
          <div class="qs-header">
            <svg class="qs-search-icon" width="20" height="20" viewBox="0 0 16 16" fill="none">
              <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" stroke-width="2.2" />
              <path d="M10 10L14 14" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" />
            </svg>
            <input type="text" class="qs-input" id="qs-input" placeholder="Buscar receitas, ingredientes ou categorias..." />
            <span class="qs-shortcut-badge">ESC para sair</span>
            <button class="qs-close-btn" id="qs-close" title="Fechar (Esc)">✕</button>
          </div>
          <div class="qs-pills-wrapper">
            <div class="qs-pills" id="qs-pills">
              <button type="button" class="qs-pill qs-pill-active" data-category="TODAS">Todas</button>
              <button type="button" class="qs-pill" data-category="Café da Manhã">Café da Manhã</button>
              <button type="button" class="qs-pill" data-category="Almoço">Almoço</button>
              <button type="button" class="qs-pill" data-category="Lanche">Lanche</button>
              <button type="button" class="qs-pill" data-category="Jantar">Jantar</button>
              <button type="button" class="qs-pill" data-category="Sobremesa">Sobremesa</button>
              <button type="button" class="qs-pill" data-category="Acompanhamento">Acompanhamento</button>
            </div>
          </div>
          <div class="qs-results" id="qs-results"></div>
          <div class="qs-footer">
            <span id="qs-count">Carregando receitas...</span>
            <span>Use <b>↑ ↓</b> para navegar, <b>Enter</b> para abrir</span>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    backdrop = document.getElementById('qs-backdrop');
    input = document.getElementById('qs-input');
    closeBtn = document.getElementById('qs-close');
    resultsContainer = document.getElementById('qs-results');
    countEl = document.getElementById('qs-count');
    pillsContainer = document.getElementById('qs-pills');

    // Attach Event Listeners
    input.addEventListener('input', () => {
      selectedIndex = 0;
      renderResults();
    });

    closeBtn.addEventListener('click', closeModal);

    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) closeModal();
    });

    pillsContainer.addEventListener('click', (e) => {
      const btn = e.target.closest('.qs-pill');
      if (!btn) return;

      pillsContainer.querySelectorAll('.qs-pill').forEach(p => p.classList.remove('qs-pill-active'));
      btn.classList.add('qs-pill-active');
      activeCategory = btn.dataset.category;
      selectedIndex = 0;
      renderResults();
    });
  }

  // 3. Load Recipes
  async function loadRecipes() {
    if (isLoaded) return;
    try {
      const resp = await fetch(pathPrefix + 'data/index.json');
      const data = await resp.json();
      let staticRecipes = data.recipes || [];

      // Remove deleted static recipes
      const deletedStatic = JSON.parse(localStorage.getItem('receitas_isa_deleted_static')) || [];
      staticRecipes = staticRecipes.filter(r => !deletedStatic.includes(r.id));

      // Get user custom recipes from localStorage
      const userRecipes = JSON.parse(localStorage.getItem('receitas_isa_user_recipes')) || [];

      allRecipes = [...staticRecipes, ...userRecipes];
      isLoaded = true;
    } catch (e) {
      console.error('Erro ao carregar receitas para o atalho de navegação:', e);
      allRecipes = [];
    }
  }

  // 4. Render Results
  function renderResults() {
    if (!input || !resultsContainer) return;
    const query = input.value.trim().toLowerCase();

    const filtered = allRecipes.filter(r => {
      const matchesCategory = activeCategory === 'TODAS' ||
        (r.categories && r.categories.includes(activeCategory)) ||
        (r.category && r.category === activeCategory);

      if (!matchesCategory) return false;
      if (!query) return true;

      const titleMatch = r.title && r.title.toLowerCase().includes(query);
      const subMatch = r.subtitle && r.subtitle.toLowerCase().includes(query);
      const cuisineMatch = r.cuisine && r.cuisine.toLowerCase().includes(query);
      const tagsMatch = r.tags && r.tags.some(t => t.toLowerCase().includes(query));
      const catMatch = r.categories && r.categories.some(c => c.toLowerCase().includes(query));

      return titleMatch || subMatch || cuisineMatch || tagsMatch || catMatch;
    });

    if (countEl) {
      countEl.textContent = `${filtered.length} receita${filtered.length === 1 ? '' : 's'} encontrada${filtered.length === 1 ? '' : 's'}`;
    }

    if (filtered.length === 0) {
      resultsContainer.innerHTML = `
        <div class="qs-empty">
          <div style="font-size: 32px; margin-bottom: 8px;">🔍</div>
          Nenhuma receita encontrada para "${query}".
        </div>
      `;
      selectedIndex = -1;
      return;
    }

    selectedIndex = Math.min(Math.max(0, selectedIndex), filtered.length - 1);

    resultsContainer.innerHTML = filtered.map((r, index) => {
      let imgPath = r.image || 'images/carbonara.png';
      if (!imgPath.startsWith('http') && !imgPath.startsWith('data:')) {
        imgPath = pathPrefix + imgPath;
      }

      const recipeUrl = pathPrefix + 'recipe.html?id=' + encodeURIComponent(r.id);
      const cuisine = r.cuisine ? `<span class="qs-tag qs-tag-cuisine">${r.cuisine}</span>` : '';
      const difficulty = r.difficulty ? `<span class="qs-tag">${r.difficulty}</span>` : '';
      const totalTime = r.totalTime ? `<span class="qs-tag">⏱️ ${r.totalTime} min</span>` : '';
      const isSelected = index === selectedIndex ? 'qs-selected' : '';

      return `
        <a href="${recipeUrl}" class="qs-item ${isSelected}" data-index="${index}">
          <img src="${imgPath}" alt="${r.title}" class="qs-item-img" onerror="this.src='https://images.unsplash.com/photo-1495521821757-a1efb6729352?w=100&auto=format&fit=crop'" />
          <div class="qs-item-info">
            <div class="qs-item-title">${r.title}</div>
            <div class="qs-item-sub">${r.subtitle || r.cuisine || ''}</div>
            <div class="qs-item-tags">
              ${cuisine}
              ${difficulty}
              ${totalTime}
            </div>
          </div>
          <svg class="qs-arrow" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </a>
      `;
    }).join('');
  }

  // 5. Open & Close Modal
  async function openModal(initialSearch = '') {
    initDOM();
    await loadRecipes();
    backdrop.classList.add('qs-active');
    document.body.style.overflow = 'hidden';
    input.value = initialSearch;
    selectedIndex = -1;
    renderResults();
    setTimeout(() => input.focus(), 50);
  }

  function closeModal() {
    if (!backdrop) return;
    backdrop.classList.remove('qs-active');
    document.body.style.overflow = '';
  }

  // 6. Bind Input Triggers
  function attachTriggerHandlers() {
    document.addEventListener('click', (e) => {
      const searchInput = e.target.closest('input[placeholder*="Procurar receitas"]');
      if (searchInput) {
        e.preventDefault();
        e.stopPropagation();
        openModal(searchInput.value);
      }
    });

    document.addEventListener('focusin', (e) => {
      if (e.target && e.target.tagName === 'INPUT' && e.target.getAttribute('placeholder')?.includes('Procurar receitas')) {
        e.target.blur();
        openModal(e.target.value);
      }
    });
  }

  // Initialize
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initDOM();
      attachTriggerHandlers();
    });
  } else {
    initDOM();
    attachTriggerHandlers();
  }

  // 7. Global Keyboard Listeners
  document.addEventListener('keydown', (e) => {
    // Ctrl + K or Cmd + K shortcut to toggle
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      if (backdrop && backdrop.classList.contains('qs-active')) {
        closeModal();
      } else {
        openModal();
      }
      return;
    }

    if (!backdrop || !backdrop.classList.contains('qs-active')) return;

    if (e.key === 'Escape') {
      closeModal();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const items = resultsContainer.querySelectorAll('.qs-item');
      if (items.length > 0) {
        selectedIndex = (selectedIndex + 1) % items.length;
        renderResults();
        const selectedEl = resultsContainer.querySelector('.qs-selected');
        if (selectedEl) selectedEl.scrollIntoView({ block: 'nearest' });
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const items = resultsContainer.querySelectorAll('.qs-item');
      if (items.length > 0) {
        selectedIndex = (selectedIndex - 1 + items.length) % items.length;
        renderResults();
        const selectedEl = resultsContainer.querySelector('.qs-selected');
        if (selectedEl) selectedEl.scrollIntoView({ block: 'nearest' });
      }
    } else if (e.key === 'Enter') {
      const selectedEl = resultsContainer.querySelector('.qs-selected');
      if (selectedEl) {
        e.preventDefault();
        window.location.href = selectedEl.getAttribute('href');
      }
    }
  });

  window.ReceitasQuickSearch = { open: openModal, close: closeModal };
})();
