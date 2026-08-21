/* =============================================
   RECEITAS DA ISA — Taxonomy Manager
   ============================================= */

let allRecipes = [];
let categoryRecipes = [];
let activeCuisines = [];
let activeDifficulties = [];
let activeCalMax = null;
let activeTags = [];
let activeIngredients = [];
let globalIngredients = [];
let categoryTags = [];

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

function cleanIngredientName(raw) {
  if (!raw) return '';
  let str = raw.toString().trim();
  const lower = str.toLowerCase();
  if (lower.includes('sal e pimenta') || lower.includes('sal e pimenta-do-reino') || lower.includes('sal e pimenta do reino')) return '';
  
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

function getIngredientIcon(name) {
  const n = name.toLowerCase();
  if (n.includes('azeite')) return '🫒';
  if (n.includes('óleo')) return '🌻';
  if (n.includes('alho')) return '🧄';
  if (n.includes('cebola')) return '🧅';
  if (n.includes('tomate')) return '🍅';
  if (n.includes('manjericão') || n.includes('salsinha') || n.includes('coentro') || n.includes('alecrim') || n.includes('ervas') || n.includes('hortelã') || n.includes('cebolinha') || n.includes('tomilho') || n.includes('louro')) return '🌿';
  if (n.includes('arroz')) return '🌾';
  if (n.includes('frango')) return '🍗';
  if (n.includes('ovo') || n.includes('gema')) return '🥚';
  if (n.includes('manteiga')) return '🧈';
  if (n.includes('limão')) return '🍋';
  if (n.includes('laranja')) return '🍊';
  if (n.includes('banana')) return '🍌';
  if (n.includes('abacate') || n.includes('avocado')) return '🥑';
  if (n.includes('abacaxi')) return '🍍';
  if (n.includes('fruta') || n.includes('morango')) return '🍓';
  if (n.includes('espinafre') || n.includes('alface') || n.includes('rúcula') || n.includes('couve') || n.includes('repolho') || n.includes('berinjela')) return '🥬';
  if (n.includes('queijo') || n.includes('parmesão') || n.includes('pecorino') || n.includes('mozzarella') || n.includes('mussarela')) return '🧀';
  if (n.includes('batata')) return '🥔';
  if (n.includes('cenoura')) return '🥕';
  if (n.includes('leite') || n.includes('iogurte') || n.includes('creme') || n.includes('maionese')) return '🥛';
  if (n.includes('farinha') || n.includes('trigo') || n.includes('tapioca')) return '🌾';
  if (n.includes('carne') || n.includes('pancetta') || n.includes('guanciale') || n.includes('acém') || n.includes('bacon') || n.includes('linguiça') || n.includes('porco') || n.includes('lombo') || n.includes('picanha')) return '🥩';
  if (n.includes('pimenta')) return '🌶️';
  if (n.includes('cogumelo') || n.includes('shimeji') || n.includes('shiitake')) return '🍄';
  if (n.includes('salmão') || n.includes('peixe') || n.includes('atum') || n.includes('lula') || n.includes('mexilhão')) return '🐟';
  if (n.includes('camarão')) return '🦐';
  if (n.includes('massa') || n.includes('espaguete') || n.includes('macarrão')) return '🍝';
  if (n.includes('pão') || n.includes('torrada') || n.includes('rap10') || n.includes('tortilha')) return '🍞';
  if (n.includes('abóbora')) return '🎃';
  if (n.includes('gengibre')) return '🫚';
  if (n.includes('chocolate') || n.includes('cacau')) return '🍫';
  if (n.includes('castanha') || n.includes('amendoim') || n.includes('noses') || n.includes('nozes')) return '🥜';
  if (n.includes('mel')) return '🍯';
  if (n.includes('açúcar')) return '🍬';
  if (n.includes('vinho')) return '🍷';
  if (n.includes('sal') || n.includes('canela') || n.includes('curry') || n.includes('cardamomo') || n.includes('açafrão') || n.includes('páprica')) return '🧂';
  return '🥘';
}

async function loadIndexLocal() {
  const res = await fetch('../data/index.json?v=' + Date.now());
  if (!res.ok) throw new Error('Não foi possível carregar o índice de receitas.');
  return res.json();
}

async function initTaxonomyPage() {
  const grid = document.getElementById('recipe-grid');
  const countEl = document.getElementById('category-count');

  if (!currentType || !currentValue) return;

  try {
    const fetchIndex = window.loadIndex || (typeof loadIndex !== 'undefined' ? loadIndex : async () => {
      const res = await fetch('../data/index.json?v=' + Date.now());
      return res.json();
    });
    const data = await fetchIndex();
    allRecipes = data.recipes;
    
    // Filter recipes based on the detected taxonomy
    categoryRecipes = allRecipes.filter(r => {
      const itemValue = r[currentType];
      if (Array.isArray(itemValue)) {
        return itemValue.includes(currentValue);
      }
      return itemValue === currentValue;
    });
    
    // Extract ingredients for modal
    const ingSet = new Set();
    if (data.allIngredients && Array.isArray(data.allIngredients)) {
      data.allIngredients.forEach(i => {
        const cleaned = cleanIngredientName(i);
        if (cleaned) ingSet.add(cleaned);
      });
    }
    categoryRecipes.forEach(r => {
      if (r.ingredients && Array.isArray(r.ingredients)) {
        r.ingredients.forEach(item => {
          const name = typeof item === 'string' ? item : (item.item || item.name || '');
          const cleaned = cleanIngredientName(name);
          if (cleaned) ingSet.add(cleaned);
        });
      }
    });

    // Fallback robusto se a lista estiver vazia por cache ou assincronismo
    if (ingSet.size === 0) {
      const fallbackIngredients = [
        'Abacate', 'Abacaxi', 'Abóbora', 'Abobrinha', 'Açúcar', 'Açúcar mascavo', 'Agrião', 'Água', 'Alecrim', 'Alface', 'Alho', 'Alho-poró', 'Amendoim', 'Amido de milho', 'Arroz', 'Atum', 'Aveia', 'Azeite', 'Azeitona', 'Bacon', 'Banana', 'Batata', 'Batata-doce', 'Batata-baroa', 'Berinjela', 'Brócolis', 'Cacau em pó', 'Café', 'Caldo de carne', 'Caldo de galinha', 'Caldo de legumes', 'Camarão', 'Canela', 'Carne moída', 'Castanha-de-caju', 'Cebola', 'Cebola roxa', 'Cebolinha', 'Cenoura', 'Chocolate', 'Chocolate meio amargo', 'Chocolate branco', 'Clara de ovo', 'Coentro', 'Cogumelo', 'Creme de leite', 'Ervilha', 'Espaguete', 'Espinafre', 'Farinha de mandioca', 'Farinha de rosca', 'Farinha de trigo', 'Feijão', 'Fermento em pó', 'Gema de ovo', 'Gengibre', 'Hortelã', 'Iogurte natural', 'Laranja', 'Leite', 'Leite condensado', 'Leite de coco', 'Limão', 'Linguiça', 'Louro', 'Maçã', 'Macarrão', 'Maionese', 'Mandioca', 'Manteiga', 'Manjericão', 'Mel', 'Milho', 'Molho de soja', 'Molho de tomate', 'Morango', 'Nozes', 'Óleo', 'Orégano', 'Ovo', 'Pão', 'Pancetta', 'Páprica', 'Peito de frango', 'Pepino', 'Pimenta-calabresa', 'Pimenta-dedo-de-moça', 'Pimenta-do-reino', 'Pimentão', 'Pimentão amarelo', 'Pimentão vermelho', 'Pimentão verde', 'Presunto', 'Queijo mussarela', 'Queijo Parmesão', 'Queijo provolone', 'Queijo ricota', 'Rabanete', 'Repolho', 'Requeijão', 'Rúcula', 'Sal', 'Salmão', 'Salsinha', 'Shoyu', 'Tapioca', 'Tomate', 'Tomate-cereja', 'Tomilho', 'Vinagre', 'Vinho tinto', 'Vinho branco'
      ];
      fallbackIngredients.forEach(ing => ingSet.add(ing));
    }

    globalIngredients = Array.from(ingSet).sort((a, b) => a.localeCompare(b, 'pt-BR'));

    // Extract tags
    const tagSet = new Set();
    categoryRecipes.forEach(r => (r.tags || []).forEach(t => tagSet.add(t)));
    categoryTags = [...tagSet];

    // Populate cuisine options
    const cuisines = [...new Set(categoryRecipes.map(r => r.cuisine))];
    const panel = document.getElementById('dd-cuisine-options');
    if (panel) {
      panel.innerHTML = cuisines.map(c => `
        <button class="dd-option" onclick="toggleCuisineFilter('${c.replace(/'/g, "\\'")}')" id="ddopt-cuisine-${c.replace(/\s/g,'-')}" style="display:flex; align-items:center; gap:10px; padding:10px 12px; border-radius:10px; border:none; background:transparent; font-family:inherit; font-size:14px; font-weight:600; color:#14110d; cursor:pointer; text-align:left; width:100%; transition:background 0.15s;">
          <span class="dd-check" style="width:18px; height:18px; border-radius:6px; border:2px solid #e5ded2; flex-shrink:0; display:flex; align-items:center; justify-content:center;"></span> ${c}
        </button>`).join('');
    }

    renderTagChips();
    applyFilters();

  } catch (e) {
    if (grid) grid.innerHTML = `<p class="error-msg">Erro ao carregar receitas: ${e.message}</p>`;
  }
}

function toggleDropdown(id) {
  const panel = document.getElementById(id + '-panel');
  if (!panel) return;
  const isOpen = panel.style.display !== 'none';
  document.querySelectorAll('.dropdown-panel').forEach(p => p.style.display = 'none');
  if (!isOpen) panel.style.display = 'block';
}

document.addEventListener('click', e => {
  if (!e.target.closest('.custom-dropdown')) {
    document.querySelectorAll('.dropdown-panel').forEach(p => p.style.display = 'none');
  }
});

function toggleCuisineFilter(val) {
  const idx = activeCuisines.indexOf(val);
  if (idx === -1) activeCuisines.push(val); else activeCuisines.splice(idx, 1);
  updateDropdownUI('cuisine', activeCuisines, 'Culinária');
  applyFilters();
}

function toggleDiffFilter(val) {
  const idx = activeDifficulties.indexOf(val);
  if (idx === -1) activeDifficulties.push(val); else activeDifficulties.splice(idx, 1);
  updateDropdownUI('diff', activeDifficulties, 'Dificuldade');
  applyFilters();
}

function setCalFilter(val) {
  activeCalMax = activeCalMax === val ? null : val;
  [300,500,700,900].forEach(v => {
    const btn = document.getElementById('ddopt-cal-' + v);
    if (btn) updateCheckbox(btn, activeCalMax === v);
  });
  const label = document.getElementById('dd-cal-label');
  if (label) label.textContent = activeCalMax ? `Até ${activeCalMax} kcal` : 'Calorias';
  const calBtn = document.getElementById('dd-cal-btn');
  if (calBtn) calBtn.style.background = activeCalMax ? '#fff6d9' : '#fff';
  applyFilters();
}

function updateCheckbox(btn, active) {
  const check = btn.querySelector('.dd-check');
  if (!check) return;
  check.style.background = active ? '#ffbf00' : '';
  check.style.border = active ? '2px solid #ffbf00' : '2px solid #e5ded2';
  check.innerHTML = active ? '<svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.8 7L9 1" stroke="#14110d" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>' : '';
  btn.style.background = active ? '#fff6d9' : '';
}

function updateDropdownUI(ddId, activeArr, defaultLabel) {
  const options = document.querySelectorAll(`#dd-${ddId}-options .dd-option`);
  options.forEach(btn => {
    const val = btn.textContent.trim();
    updateCheckbox(btn, activeArr.includes(val));
  });
  const label = document.getElementById(`dd-${ddId}-label`);
  if (label) label.textContent = activeArr.length ? activeArr.join(', ') : defaultLabel;
  const pill = document.getElementById(`dd-${ddId}-btn`);
  if (pill) pill.style.background = activeArr.length ? '#fff6d9' : '#fff';
}

function renderTagChips() {
  const container = document.getElementById('tags-filter');
  if (!container) return;
  if (categoryTags.length === 0) { container.style.display = 'none'; return; }
  container.style.display = 'flex';
  container.innerHTML = categoryTags.map(t => {
    const active = activeTags.includes(t);
    return `<button onclick="window.toggleTag('${t.replace(/'/g, "\\'")}')"
      style="padding:8px 16px; border-radius:999px; border:2px solid ${active ? '#ffbf00' : '#e5ded2'}; background:${active ? '#fff6d9' : '#fff'}; font-family:inherit; font-size:13px; font-weight:700; color:${active ? '#8a6a00' : '#6b6459'}; cursor:pointer; white-space:nowrap; transition:all 0.18s;">${t}${active ? ' <span style="font-size:11px;">✕</span>' : ''}</button>`;
  }).join('');
}

function toggleTag(tag) {
  const idx = activeTags.indexOf(tag);
  if (idx === -1) activeTags.push(tag); else activeTags.splice(idx, 1);
  renderTagChips();
  applyFilters();
}

function openIngredientsModal() {
  const modal = document.getElementById('ingredients-modal-overlay');
  if (modal) {
    modal.style.display = 'flex';
    renderModalIngredientsGrid('');
    renderModalSelectedChips();
  }
}

function closeIngredientsModal() {
  const modal = document.getElementById('ingredients-modal-overlay');
  if (modal) modal.style.display = 'none';
}

function toggleModalIngredient(name) {
  const idx = activeIngredients.indexOf(name);
  if (idx >= 0) {
    activeIngredients.splice(idx, 1);
  } else {
    activeIngredients.push(name);
  }
  const searchVal = document.getElementById('modal-ingredient-search') ? document.getElementById('modal-ingredient-search').value : '';
  renderModalIngredientsGrid(searchVal);
  renderModalSelectedChips();
}

function renderModalIngredientsGrid(filterTerm = '') {
  const grid = document.getElementById('modal-ingredients-grid');
  if (!grid) return;

  const term = filterTerm.toLowerCase().trim();
  let list = globalIngredients;

  if (term) {
    list = globalIngredients.filter(ing => ing.toLowerCase().includes(term));
  }

  if (list.length === 0) {
    grid.innerHTML = `<div style="grid-column: span 6; text-align:center; padding:20px; color:#a39a8c; font-size:14px; font-weight:600;">Nenhum ingrediente encontrado para "${filterTerm}"</div>`;
    return;
  }

  grid.innerHTML = list.map(name => {
    const isSelected = activeIngredients.includes(name);
    const icon = getIngredientIcon(name);
    const safeName = name.replace(/'/g, "\\'");
    return `
      <div onclick="toggleModalIngredient('${safeName}')" style="display:flex; flex-direction:column; align-items:center; gap:8px; padding:12px 6px; border-radius:18px; border:2px solid ${isSelected ? '#ffbf00' : '#f0ebe3'}; background:${isSelected ? '#fff6d9' : '#fff'}; cursor:pointer; transition:all 0.2s; text-align:center;">
        <div style="width:46px; height:46px; border-radius:14px; background:${isSelected ? '#fff' : '#f7f4ee'}; display:flex; align-items:center; justify-content:center; font-size:22px;">${icon}</div>
        <span style="font-size:12px; font-weight:700; color:#14110d; line-height:1.2; word-break:break-word;">${name}</span>
      </div>
    `;
  }).join('');
}

function renderModalSelectedChips() {
  const chipsContainer = document.getElementById('modal-selected-ingredients-chips');
  const countText = document.getElementById('modal-selected-count-text');
  const btnLabel = document.getElementById('ingredients-btn-label');
  const btn = document.getElementById('open-ingredients-modal-btn');
  const dot = document.getElementById('ingredients-btn-dot');

  if (chipsContainer) {
    chipsContainer.innerHTML = activeIngredients.map(ing => `
      <span style="display:inline-flex; align-items:center; gap:6px; background:#fff6d9; border:1px solid #ffbf00; color:#14110d; border-radius:999px; padding:6px 14px; font-size:13px; font-weight:700;">
        ${ing}
        <span onclick="toggleModalIngredient('${ing.replace(/'/g, "\\'")}')" style="cursor:pointer; font-weight:800; color:#d99f00; margin-left:2px;">✕</span>
      </span>
    `).join('');
  }

  if (countText) {
    countText.textContent = activeIngredients.length === 0 
      ? 'Nenhum ingrediente selecionado'
      : `${activeIngredients.length} ingrediente${activeIngredients.length !== 1 ? 's' : ''} selecionado${activeIngredients.length !== 1 ? 's' : ''}`;
  }

  if (btn) {
    if (activeIngredients.length > 0) {
      btn.style.border = '2px solid #ffbf00';
      btn.style.background = '#fff6d9';
      if (dot) dot.style.display = 'inline-block';
      if (btnLabel) btnLabel.textContent = `Ingredientes da geladeira (${activeIngredients.length})`;
    } else {
      btn.style.border = 'none';
      btn.style.background = '#fff';
      if (dot) dot.style.display = 'none';
      if (btnLabel) btnLabel.textContent = 'Ingredientes da geladeira';
    }
  }
}

function applyFilters() {
  const searchElem = document.getElementById('filter-search');
  const filters = {
    cuisines: activeCuisines,
    difficulties: activeDifficulties,
    search: searchElem ? searchElem.value.trim() : '',
    maxCalories: activeCalMax,
    tags: activeTags,
    ingredients: activeIngredients,
  };

  const filterFn = window.filterRecipes || filterRecipes;
  const filtered = filterFn(categoryRecipes, filters);
  renderGrid(filtered);

  const countEl = document.getElementById('category-count');
  if (countEl) {
    countEl.textContent = `(${filtered.length} receita${filtered.length !== 1 ? 's' : ''})`;
  }
}

function renderGrid(recipes) {
  const grid = document.getElementById('recipe-grid');
  if (!grid) return;

  if (recipes.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🔍</div>
        <h3 class="empty-state-title">Nenhuma receita encontrada</h3>
        <p class="empty-state-text">Tente ajustar os filtros.</p>
      </div>`;
    return;
  }
  
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

document.addEventListener('DOMContentLoaded', () => {
  initTaxonomyPage();

  const searchInput = document.getElementById('filter-search');
  if (searchInput) searchInput.addEventListener('input', () => applyFilters());

  const openModalBtn = document.getElementById('open-ingredients-modal-btn');
  if (openModalBtn) openModalBtn.addEventListener('click', openIngredientsModal);

  const closeModalBtn = document.getElementById('close-ingredients-modal-btn');
  if (closeModalBtn) closeModalBtn.addEventListener('click', closeIngredientsModal);

  const confirmModalBtn = document.getElementById('modal-confirm-ingredients-btn');
  if (confirmModalBtn) confirmModalBtn.addEventListener('click', () => { closeIngredientsModal(); applyFilters(); });

  const clearModalBtn = document.getElementById('modal-clear-ingredients-btn');
  if (clearModalBtn) clearModalBtn.addEventListener('click', () => {
    activeIngredients = [];
    renderModalIngredientsGrid('');
    renderModalSelectedChips();
    applyFilters();
  });

  const modalSearch = document.getElementById('modal-ingredient-search');
  if (modalSearch) modalSearch.addEventListener('input', e => renderModalIngredientsGrid(e.target.value));

  const resetBtn = document.getElementById('filter-reset-btn');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      const s = document.getElementById('filter-search'); if (s) s.value = '';
      activeCuisines = [];
      activeDifficulties = [];
      activeCalMax = null;
      activeTags = [];
      activeIngredients = [];
      updateDropdownUI('cuisine', [], 'Culinária');
      updateDropdownUI('diff', [], 'Dificuldade');
      [300,500,700,900].forEach(v => { const b = document.getElementById('ddopt-cal-'+v); if(b) updateCheckbox(b, false); });
      const calLabel = document.getElementById('dd-cal-label'); if(calLabel) calLabel.textContent = 'Calorias';
      const calBtn = document.getElementById('dd-cal-btn'); if(calBtn) calBtn.style.background = '#fff';
      renderTagChips();
      renderModalSelectedChips();
      applyFilters();
      if (window.showToast) showToast('Filtros limpos ✓');
    });
  }
});

window.toggleDropdown = toggleDropdown;
window.toggleCuisineFilter = toggleCuisineFilter;
window.toggleDiffFilter = toggleDiffFilter;
window.setCalFilter = setCalFilter;
window.toggleTag = toggleTag;
window.openIngredientsModal = openIngredientsModal;
window.closeIngredientsModal = closeIngredientsModal;
window.toggleModalIngredient = toggleModalIngredient;

