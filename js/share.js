/* =============================================
   RECEITAS DA ISA — Share & Friends Module (Unificado)
   ============================================= */

import { db, collection, addDoc, getDocs, query, where, doc, updateDoc, serverTimestamp } from './firebase-config.js';
import { getUser, getAllRegisteredUsers, authReady } from './auth.js';

let sharedRecipesList = [];
let currentShareRecipeId = null;
let currentShareRecipeTitle = '';
let currentShareRecipeImage = '';

function triggerShareToast(message, type = 'success') {
  if (typeof window.showToast === 'function') {
    window.showToast(message);
  }

  // Notificação pop-up em primeiro plano absoluto (z-index 9999999) subindo na tela por cima de modais
  let container = document.getElementById('share-toast-notification');
  if (!container) {
    container = document.createElement('div');
    container.id = 'share-toast-notification';
    container.style.cssText = `
      position: fixed;
      bottom: 32px;
      left: 50%;
      transform: translateX(-50%) translateY(30px);
      background: #181410;
      border: 2px solid ${type === 'error' ? '#c0614a' : '#ffbf00'};
      color: ${type === 'error' ? '#ff8a75' : '#ffbf00'};
      font-family: inherit;
      font-size: 14px;
      font-weight: 800;
      padding: 14px 28px;
      border-radius: 999px;
      box-shadow: 0 16px 40px rgba(0,0,0,0.65);
      z-index: 9999999 !important;
      opacity: 0;
      transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
      pointer-events: none;
      display: flex;
      align-items: center;
      gap: 8px;
    `;
    document.body.appendChild(container);
  }

  container.style.borderColor = type === 'error' ? '#c0614a' : '#ffbf00';
  container.style.color = type === 'error' ? '#ff8a75' : '#ffbf00';
  container.innerHTML = `<span>${type === 'error' ? '❌' : '✦'}</span> <span>${message}</span>`;
  container.style.opacity = '1';
  container.style.transform = 'translateX(-50%) translateY(0)';

  clearTimeout(container._hideTimeout);
  container._hideTimeout = setTimeout(() => {
    container.style.opacity = '0';
    container.style.transform = 'translateX(-50%) translateY(30px)';
  }, 3200);
}

// --- CSS Styles Injetados para os Modais de Compartilhamento e Inbox ---
const shareStyles = `
  /* Estilos do Modal de Compartilhamento Unificado */
  .share-modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.78);
    backdrop-filter: blur(8px);
    z-index: 9999;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.3s ease;
  }
  .share-modal-overlay.active {
    opacity: 1;
    pointer-events: auto;
  }
  .share-modal {
    background: var(--clr-surface, #fcfaf6);
    border: 1px solid var(--clr-gold, #e8a838);
    border-radius: var(--radius-lg, 24px);
    width: 100%;
    max-width: 480px;
    padding: 1.8rem;
    box-shadow: 0 20px 50px rgba(0,0,0,0.3);
    color: var(--clr-text, #2c2218);
    transform: scale(0.9);
    transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    box-sizing: border-box;
  }
  .share-modal-overlay.active .share-modal {
    transform: scale(1);
  }
  .share-modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 1rem;
    border-bottom: 1px solid var(--clr-border, rgba(0,0,0,0.08));
    padding-bottom: 0.8rem;
  }
  .share-modal-title {
    font-family: var(--font-display, Georgia, serif);
    font-size: 1.3rem;
    font-weight: 700;
    color: var(--clr-gold, #e8a838);
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  .share-modal-close {
    background: none;
    border: none;
    color: var(--clr-text-muted, #908270);
    font-size: 1.6rem;
    cursor: pointer;
    line-height: 1;
    transition: color 0.2s;
  }
  .share-modal-close:hover { color: #2c2218; }
  
  /* Card de Preview da Receita */
  .share-recipe-preview {
    display: flex;
    align-items: center;
    gap: 0.8rem;
    background: rgba(232, 168, 56, 0.08);
    padding: 0.85rem;
    border-radius: 16px;
    margin-bottom: 1.2rem;
    border: 1.5px solid rgba(232, 168, 56, 0.22);
  }
  .share-recipe-img {
    width: 52px;
    height: 52px;
    border-radius: 12px;
    object-fit: cover;
    flex-shrink: 0;
  }
  .share-recipe-info { flex: 1; min-width: 0; }
  .share-recipe-name {
    font-weight: 700;
    font-size: 0.98rem;
    color: var(--clr-text, #2c2218);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .share-recipe-sub {
    font-size: 0.78rem;
    color: var(--clr-text-muted, #7a6e5d);
  }

  .share-section-label {
    font-size: 0.8rem;
    font-weight: 700;
    color: var(--clr-gold, #e8a838);
    margin-bottom: 0.6rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  /* LISTA ESTILO INSTAGRAM STORIES (CÍRCULOS DE FOTO) */
  .share-friends-list {
    display: flex;
    align-items: flex-start;
    gap: 16px;
    overflow-x: auto;
    padding: 8px 4px 14px;
    margin-bottom: 1.2rem;
    scrollbar-width: none;
  }
  .share-friends-list::-webkit-scrollbar {
    display: none;
  }
  .share-friend-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 6px;
    width: 84px;
    flex-shrink: 0;
    cursor: pointer;
    user-select: none;
  }
  .share-friend-avatar-wrap {
    position: relative;
    width: 62px;
    height: 62px;
    border-radius: 50%;
    padding: 2.5px;
    background: linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888);
    box-shadow: 0 4px 12px rgba(220, 39, 67, 0.22);
    transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    box-sizing: border-box;
  }
  .share-friend-card:hover .share-friend-avatar-wrap {
    transform: scale(1.08);
  }
  .share-friend-avatar {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    object-fit: cover;
    border: 2px solid #ffffff;
    background: #ffffff;
    box-sizing: border-box;
  }
  .share-friend-badge {
    position: absolute;
    bottom: -2px;
    right: -2px;
    background: #2e7d32;
    color: #ffffff;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    display: none;
    align-items: center;
    justify-content: center;
    font-size: 11px;
    font-weight: bold;
    border: 2px solid #ffffff;
    box-shadow: 0 2px 6px rgba(0,0,0,0.3);
  }
  .share-friend-name {
    font-weight: 700;
    font-size: 12px;
    color: var(--clr-text, #2c2218);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 80px;
    line-height: 1.2;
  }
  .btn-send-share {
    padding: 4px 10px;
    background: #e8a838;
    color: #1a0f00;
    border: none;
    border-radius: 999px;
    font-weight: 800;
    font-size: 11px;
    cursor: pointer;
    transition: all 0.2s ease;
    white-space: nowrap;
    box-shadow: 0 2px 8px rgba(232, 168, 56, 0.3);
  }
  .btn-send-share:hover {
    background: #ffd043;
    transform: translateY(-1px);
  }
  .btn-send-share.sent {
    background: #2e7d32 !important;
    color: #ffffff !important;
    box-shadow: none !important;
    cursor: default !important;
    transform: none !important;
  }

  /* BOTOES DE AÇÕES RAPIDAS COM ÍCONES SVG CLEAN */
  .share-actions-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.6rem;
    margin-bottom: 1rem;
  }
  .share-quick-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.85rem 0.5rem;
    background: rgba(0,0,0,0.03);
    border: 1.5px solid rgba(0,0,0,0.1);
    border-radius: 16px;
    color: var(--clr-text, #2c2218);
    font-size: 0.78rem;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.2s ease;
    text-align: center;
  }
  .share-quick-btn:hover {
    border-color: #e8a838;
    background: rgba(232, 168, 56, 0.08);
    color: #e8a838;
    transform: translateY(-2px);
  }
  .share-quick-svg {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  /* BARRA DE INPUT DO LINK */
  .share-copy-link-bar {
    display: flex;
    gap: 0.5rem;
  }
  .share-copy-input {
    flex: 1;
    background: rgba(0,0,0,0.04);
    border: 1.5px solid rgba(0,0,0,0.12);
    border-radius: 12px;
    padding: 0.6rem 0.9rem;
    color: #4a3e30;
    font-size: 0.8rem;
    font-weight: 600;
  }

  /* Badge de Notificação na Navbar */
  .nav-inbox-btn {
    position: relative;
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    background: none;
    border: none;
    cursor: pointer;
    font-family: inherit;
    color: inherit;
  }
  .nav-inbox-badge {
    background: var(--clr-terracotta, #c0614a);
    color: #ffffff;
    font-size: 0.7rem;
    font-weight: 700;
    padding: 0.1rem 0.45rem;
    border-radius: 999px;
    line-height: 1;
  }

  /* Cards no Modal de Inbox */
  .inbox-card {
    display: flex;
    align-items: center;
    gap: 0.8rem;
    padding: 0.85rem;
    background: #ffffff;
    border: 1px solid rgba(0,0,0,0.08);
    border-radius: 16px;
    margin-bottom: 0.8rem;
    transition: border-color 0.2s;
  }
  .inbox-card.unread {
    border-color: var(--clr-gold, #e8a838);
    background: rgba(232, 168, 56, 0.08);
  }
  .inbox-card-img {
    width: 60px;
    height: 60px;
    border-radius: 12px;
    object-fit: cover;
  }
  .inbox-card-content { flex: 1; min-width: 0; }
  .inbox-card-title {
    font-weight: 700;
    font-size: 0.95rem;
    margin-bottom: 0.25rem;
    color: #2c2218;
  }
  .inbox-card-sender {
    font-size: 0.78rem;
    color: var(--clr-gold, #e8a838);
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }
  .inbox-card-sender img {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    object-fit: cover;
  }
`;

const styleEl = document.createElement('style');
styleEl.textContent = shareStyles;
document.head.appendChild(styleEl);

// --- Injeção dos Modais no DOM ---
function injectModals() {
  if (document.getElementById('share-modal-overlay')) return;

  const modalHtml = `
    <!-- Modal de Compartilhamento Unificado -->
    <div class="share-modal-overlay" id="share-modal-overlay" onclick="closeShareModal(event)">
      <div class="share-modal" onclick="event.stopPropagation()">
        <div class="share-modal-header">
          <div class="share-modal-title">
            <span>📤</span> Compartilhar Receita
          </div>
          <button class="share-modal-close" onclick="closeShareModal()">&times;</button>
        </div>
        
        <div class="share-recipe-preview">
          <img id="share-preview-img" src="" alt="" class="share-recipe-img">
          <div class="share-recipe-info">
            <div id="share-preview-title" class="share-recipe-name">Carregando...</div>
            <div class="share-recipe-sub">Escolha como deseja compartilhar esta receita</div>
          </div>
        </div>

        <div class="share-section-label">👩‍🍳 Enviar para Amigos no App</div>
        <div class="share-friends-list" id="share-friends-list">
          <div style="text-align:center; padding: 1rem; color: var(--clr-text-muted);">Carregando amigas cadastradas...</div>
        </div>

        <div class="share-section-label">⚡ Outras Opções</div>
        <div class="share-actions-grid">
          <button class="share-quick-btn" onclick="shareToWhatsApp()">
            <div class="share-quick-svg">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#25D366" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
              </svg>
            </div>
            <span>WhatsApp</span>
          </button>
          <button class="share-quick-btn" onclick="sharePDF()">
            <div class="share-quick-svg">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#e8a838" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10 9 9 9 8 9"></polyline>
              </svg>
            </div>
            <span>Salvar PDF</span>
          </button>
          <button class="share-quick-btn" onclick="copyShareLink()">
            <div class="share-quick-svg">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
              </svg>
            </div>
            <span>Copiar Link</span>
          </button>
        </div>

        <div class="share-copy-link-bar">
          <input type="text" id="share-link-input" class="share-copy-input" readonly>
        </div>
      </div>
    </div>

    <!-- Modal Caixa de Entrada (Recebidas) -->
    <div class="share-modal-overlay" id="inbox-modal-overlay" onclick="closeInboxModal(event)">
      <div class="share-modal" onclick="event.stopPropagation()">
        <div class="share-modal-header">
          <div class="share-modal-title">
            <span>📩</span> Receitas Recebidas
          </div>
          <button class="share-modal-close" onclick="closeInboxModal()">&times;</button>
        </div>
        <div id="inbox-list" style="max-height: 360px; overflow-y: auto;">
          <div style="text-align:center; padding: 1.5rem; color: var(--clr-text-muted);">Buscando receitas recebidas...</div>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);
}

// --- Funções do Modal de Compartilhamento Unificado ---
export async function openShareModal(recipeId, recipeTitle, recipeImage) {
  injectModals();
  const overlay = document.getElementById('share-modal-overlay');
  const titleEl = document.getElementById('share-preview-title');
  const imgEl = document.getElementById('share-preview-img');
  const linkInput = document.getElementById('share-link-input');
  const friendsList = document.getElementById('share-friends-list');

  currentShareRecipeId = recipeId || '';
  currentShareRecipeTitle = recipeTitle || 'Receita';
  currentShareRecipeImage = recipeImage || 'images/hero_bg.png';

  titleEl.textContent = currentShareRecipeTitle;
  imgEl.src = currentShareRecipeImage;
  
  const PROD_BASE_URL = 'https://isaptavares.github.io/receitas-da-isa/';
  const recipeUrl = currentShareRecipeId 
    ? `${PROD_BASE_URL}recipe.html?id=${currentShareRecipeId}`
    : `${PROD_BASE_URL}index.html`;
  linkInput.value = recipeUrl;

  overlay.classList.add('active');

  const user = getUser();
  if (!user) {
    friendsList.innerHTML = `
      <div style="text-align:center; padding: 0.8rem; color: var(--clr-text-muted); font-size:0.85rem;">
        🔒 <a href="#" onclick="document.getElementById('login-btn')?.click(); return false;" style="color:var(--clr-gold); text-decoration:underline;">Faça login com sua conta Google</a> para enviar diretamente para suas amigas no app!
      </div>
    `;
    return;
  }

  // Buscar lista de usuários (amigos)
  friendsList.innerHTML = `<div style="text-align:center; padding: 0.8rem; color: var(--clr-text-muted); font-size:0.85rem;">Carregando amigas...</div>`;
  const allUsers = await getAllRegisteredUsers();
  
  // Excluir o próprio usuário logado
  const friends = allUsers.filter(u => u.uid !== user.uid && u.email !== user.email);

  if (friends.length === 0) {
    friendsList.innerHTML = `
      <div style="text-align:center; padding: 0.8rem; color: var(--clr-text-muted); font-size:0.85rem;">
        Nenhum outro perfil cadastrado ainda no app.
      </div>
    `;
    return;
  }

  // Renderizar avatares circulares no formato Instagram Stories
  friendsList.innerHTML = friends.map(friend => {
    const avatar = friend.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(friend.displayName || friend.email)}`;
    const firstName = (friend.displayName || friend.email || 'Amigo').split(' ')[0];
    return `
      <div class="share-friend-card" onclick="sendRecipeTo('${friend.uid}', '${currentShareRecipeId}', '${escapeJsStr(currentShareRecipeTitle)}', '${escapeJsStr(currentShareRecipeImage)}', '${escapeJsStr(friend.email)}', '${escapeJsStr(friend.displayName || friend.email)}')">
        <div class="share-friend-avatar-wrap">
          <img src="${avatar}" alt="${friend.displayName}" class="share-friend-avatar">
          <div class="share-friend-badge" id="badge-${friend.uid}">✓</div>
        </div>
        <div class="share-friend-name" title="${friend.displayName || friend.email}">${firstName}</div>
        <button type="button" class="btn-send-share" id="btn-send-${friend.uid}" onclick="event.stopPropagation(); sendRecipeTo('${friend.uid}', '${currentShareRecipeId}', '${escapeJsStr(currentShareRecipeTitle)}', '${escapeJsStr(currentShareRecipeImage)}', '${escapeJsStr(friend.email)}', '${escapeJsStr(friend.displayName || friend.email)}')">
          Enviar 📤
        </button>
      </div>
    `;
  }).join('');
}

function escapeJsStr(str) {
  return (str || '').replace(/'/g, "\\'").replace(/"/g, '\\"');
}

export async function sendRecipeTo(recipientUid, recipeId, recipeTitle, recipeImage, recipientEmail = '', recipientName = '') {
  const user = getUser();
  if (!user) {
    alert("Por favor, faça login para enviar receitas aos amigos!");
    return;
  }

  const btn = document.getElementById(`btn-send-${recipientUid}`);
  const badge = document.getElementById(`badge-${recipientUid}`);

  if (btn) {
    btn.disabled = true;
    btn.textContent = "Enviando...";
    btn.style.opacity = "0.7";
  }

  const shareData = {
    senderUid: user.uid,
    senderName: user.displayName || user.email || 'Amigo',
    senderPhoto: user.photoURL || '',
    recipientUid: recipientUid || '',
    recipientEmail: (recipientEmail || '').toLowerCase(),
    recipeId: recipeId || '',
    recipeTitle: recipeTitle || 'Receita',
    recipeImage: recipeImage || 'images/hero_bg.png',
    sentAt: new Date().toISOString(),
    read: false
  };

  let success = false;

  // 1. Grava na subcoleção outbox do próprio usuário remetente (NUNCA é bloqueado por regras do Firestore)
  try {
    await addDoc(collection(db, 'users', user.uid, 'outbox'), {
      ...shareData,
      createdAt: serverTimestamp()
    });
    success = true;
  } catch (errOutbox) {
    console.warn("Aviso outbox:", errOutbox);
  }

  // 2. Grava na coleção compartilhada global se tiver permissão
  try {
    await addDoc(collection(db, 'shared_recipes'), {
      ...shareData,
      createdAt: serverTimestamp()
    });
    success = true;
  } catch (errShared) {}

  // 3. Grava na subcoleção do amigo se tiver permissão
  try {
    if (recipientUid) {
      await addDoc(collection(db, 'users', recipientUid, 'received_recipes'), {
        ...shareData,
        createdAt: new Date().toISOString()
      });
      success = true;
    }
  } catch (errRecipient) {}

  if (success) {
    if (btn) {
      btn.disabled = true;
      btn.textContent = "Enviado! ✓";
      btn.classList.add('sent');
      btn.style.opacity = "1";
    }

    if (badge) {
      badge.style.display = "flex";
    }

    const friendDisplay = recipientName || recipientEmail || 'amigo';
    triggerShareToast(`📤 Receita enviada para ${friendDisplay}! 🎉`, 'success');
  } else {
    triggerShareToast("❌ Não foi possível enviar a receita no momento. Tente novamente.", 'error');
    if (btn) {
      btn.disabled = false;
      btn.textContent = "Enviar 📤";
      btn.style.opacity = "1";
    }
  }
}

export function shareToWhatsApp() {
  const recipeUrl = document.getElementById('share-link-input')?.value || window.location.href;
  const text = encodeURIComponent(`Confira essa receita incrível no Receitas da Isa: "${currentShareRecipeTitle}"! 😋\n${recipeUrl}`);
  window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
}

export function sharePDF() {
  if (window.location.pathname.includes('recipe.html')) {
    window.print();
  } else if (currentShareRecipeId) {
    window.location.href = `recipe.html?id=${currentShareRecipeId}#print`;
  } else {
    window.print();
  }
}

export function copyShareLink() {
  const input = document.getElementById('share-link-input');
  if (input) {
    input.select();
    navigator.clipboard.writeText(input.value);
    triggerShareToast("🔗 Link copiado para a área de transferência!", 'success');
  }
}

export function closeShareModal(event) {
  if (!event || event.target.id === 'share-modal-overlay' || !event.target.closest('.share-modal')) {
    const overlay = document.getElementById('share-modal-overlay');
    if (overlay) overlay.classList.remove('active');
  }
}

// --- Funções da Caixa de Entrada (Recebidas) ---
export async function checkInboxNotifications() {
  await authReady;
  const user = getUser();
  if (!user) return;

  try {
    const itemsMap = new Map();

    // Query 1: por UID em shared_recipes
    try {
      const q1 = query(collection(db, 'shared_recipes'), where('recipientUid', '==', user.uid));
      const snap1 = await getDocs(q1);
      snap1.forEach(docSnap => itemsMap.set(docSnap.id, { id: docSnap.id, ...docSnap.data() }));
    } catch(e) {}

    // Query 2: por Email em shared_recipes
    if (user.email) {
      try {
        const q2 = query(collection(db, 'shared_recipes'), where('recipientEmail', '==', user.email.toLowerCase()));
        const snap2 = await getDocs(q2);
        snap2.forEach(docSnap => itemsMap.set(docSnap.id, { id: docSnap.id, ...docSnap.data() }));
      } catch(e) {}
    }

    // Query 3: subcoleção do próprio usuário users/{uid}/received_recipes
    try {
      const snap3 = await getDocs(collection(db, 'users', user.uid, 'received_recipes'));
      snap3.forEach(docSnap => itemsMap.set(docSnap.id, { id: docSnap.id, ...docSnap.data() }));
    } catch(e) {}

    // Query 4: busca de envios cruzados nas outboxes de amigos
    try {
      const allUsers = await getAllRegisteredUsers();
      await Promise.all(allUsers.map(async (u) => {
        if (u.uid && u.uid !== user.uid) {
          try {
            const outSnap = await getDocs(collection(db, 'users', u.uid, 'outbox'));
            outSnap.forEach(docSnap => {
              const data = docSnap.data();
              if (data.recipientUid === user.uid || (user.email && data.recipientEmail === user.email.toLowerCase())) {
                itemsMap.set(docSnap.id, { id: docSnap.id, ...data });
              }
            });
          } catch(e) {}
        }
      }));
    } catch(e) {}

    sharedRecipesList = Array.from(itemsMap.values());
    let unreadCount = sharedRecipesList.filter(item => !item.read).length;

    // Atualizar indicador na navbar
    const inboxBadge = document.getElementById('inbox-badge');
    if (inboxBadge) {
      if (unreadCount > 0) {
        inboxBadge.textContent = unreadCount;
        inboxBadge.style.display = 'inline-block';
      } else {
        inboxBadge.style.display = 'none';
      }
    }
  } catch (err) {
    console.error("Erro ao checar caixa de entrada:", err);
  }
}

export async function openInboxModal(event) {
  if (event && event.preventDefault) {
    event.preventDefault();
    event.stopPropagation();
  }

  injectModals();
  const overlay = document.getElementById('inbox-modal-overlay');
  const inboxList = document.getElementById('inbox-list');
  overlay.classList.add('active');

  const user = getUser();
  if (!user) {
    inboxList.innerHTML = `<div style="text-align:center; padding:1.5rem; color:var(--clr-text-muted);">Faça login para ver receitas compartilhadas com você.</div>`;
    return;
  }

  await checkInboxNotifications();

  if (sharedRecipesList.length === 0) {
    inboxList.innerHTML = `<div style="text-align:center; padding:1.5rem; color:var(--clr-text-muted);">Nenhuma receita recebida ainda.</div>`;
    return;
  }

  inboxList.innerHTML = sharedRecipesList.map(item => `
    <div class="inbox-card ${!item.read ? 'unread' : ''}" style="display:flex; flex-direction:column; gap:10px; padding:14px; background:#fff; border:2px solid #f0ebe3; border-radius:18px; margin-bottom:12px;">
      <div style="display:flex; align-items:center; gap:12px;">
        <img src="${item.recipeImage || 'images/hero_bg.png'}" alt="${item.recipeTitle}" class="inbox-card-img" style="width:54px; height:54px; border-radius:12px; object-fit:cover; flex-shrink:0;">
        <div class="inbox-card-content" style="flex:1; min-width:0;">
          <div class="inbox-card-title" style="font-size:15px; font-weight:800; color:#14110d; margin-bottom:2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${item.recipeTitle}</div>
          <div class="inbox-card-sender" style="display:flex; align-items:center; gap:6px; font-size:12px; color:#8c857b; font-weight:600;">
            <img src="${item.senderPhoto || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + encodeURIComponent(item.senderName)}" alt="" style="width:20px; height:20px; border-radius:50%; object-fit:cover;">
            <span>Enviada por <b>${item.senderName}</b></span>
          </div>
        </div>
      </div>
      <div style="display:flex; align-items:center; gap:8px; justify-content:flex-end; border-top:1px solid #f5f0e8; padding-top:10px;">
        <a href="recipe.html?id=${item.recipeId}" onclick="openSharedRecipe('${item.recipeId}', '${item.id}')" style="background:#f4efe6; color:#14110d; text-decoration:none; padding:8px 14px; border-radius:999px; font-size:12px; font-weight:700; display:inline-flex; align-items:center; gap:4px;">Ver 🍽️</a>
        <button type="button" id="btn-add-myrec-${item.id}" onclick="addToMyRecipes('${item.recipeId}', '${escapeJsStr(item.recipeTitle)}', '${escapeJsStr(item.recipeImage)}', '${escapeJsStr(item.senderName)}', '${item.id}', event)" style="background:#ffbf00; color:#14110d; border:none; padding:8px 16px; border-radius:999px; font-size:12px; font-weight:800; cursor:pointer; display:inline-flex; align-items:center; gap:4px; box-shadow:0 3px 10px rgba(255,191,0,0.3); transition:all 0.15s;">➕ Adicionar às Minhas Receitas</button>
      </div>
    </div>
  `).join('');
}

export async function addToMyRecipes(recipeId, recipeTitle, recipeImage, senderName, shareDocId, event) {
  if (event) {
    event.stopPropagation();
    event.preventDefault();
  }

  const user = getUser();
  const btnId = `btn-add-myrec-${shareDocId || recipeId}`;
  const btn = document.getElementById(btnId);

  if (btn) {
    btn.disabled = true;
    btn.textContent = "Adicionando...";
  }

  try {
    let fullRecipe = null;
    try {
      const resp = await fetch('data/index.json');
      const data = await resp.json();
      fullRecipe = (data.recipes || []).find(r => r.id === recipeId);
    } catch(e) {}

    const newId = 'received_' + Date.now() + '_' + recipeId;

    const recipeToSave = fullRecipe ? {
      ...fullRecipe,
      id: newId,
      title: fullRecipe.title,
      subtitle: `Recebida de ${senderName || 'Amigo'} • ${fullRecipe.subtitle || ''}`,
      createdAt: new Date().toISOString()
    } : {
      id: newId,
      title: recipeTitle || 'Receita Compartilhada',
      subtitle: `Recebida de ${senderName || 'Amigo'}`,
      image: recipeImage || 'images/hero_bg.png',
      cuisine: 'Brasileira',
      difficulty: 'Médio',
      totalTime: 30,
      categories: ['Almoço'],
      tags: ['Gostosão'],
      ingredients: [],
      steps: [],
      createdAt: new Date().toISOString()
    };

    // Salvar no localStorage receitas_isa_user_recipes
    const localRecipes = JSON.parse(localStorage.getItem('receitas_isa_user_recipes')) || [];
    localRecipes.unshift(recipeToSave);
    localStorage.setItem('receitas_isa_user_recipes', JSON.stringify(localRecipes));

    // Salvar no Firestore se logado
    if (user) {
      try {
        const col = collection(db, 'users', user.uid, 'my_recipes');
        await addDoc(col, {
          ...recipeToSave,
          isUserCreated: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      } catch(e) {
        console.warn("Erro ao salvar no Firestore my_recipes:", e);
      }
    }

    // Marcar compartilhamento como lido
    if (shareDocId) {
      try {
        await updateDoc(doc(db, 'shared_recipes', shareDocId), { read: true });
      } catch(e) {}
    }

    if (btn) {
      btn.textContent = "Adicionada! ✓";
      btn.style.background = "#2e7d32";
      btn.style.color = "#ffffff";
      btn.style.borderColor = "#2e7d32";
    }

    triggerShareToast(`✨ "${recipeTitle}" foi adicionada às Suas Receitas!`, 'success');
  } catch (err) {
    console.error("Erro ao adicionar às minhas receitas:", err);
    if (btn) {
      btn.disabled = false;
      btn.textContent = "➕ Adicionar às Minhas Receitas";
    }
  }
}

export async function openSharedRecipe(recipeId, shareDocId) {
  try {
    if (shareDocId) {
      await updateDoc(doc(db, 'shared_recipes', shareDocId), { read: true });
    }
  } catch (e) {}
  window.location.href = `recipe.html?id=${recipeId}`;
}

export function closeInboxModal(event) {
  if (!event || event.target.id === 'inbox-modal-overlay' || !event.target.closest('.share-modal')) {
    const overlay = document.getElementById('inbox-modal-overlay');
    if (overlay) overlay.classList.remove('active');
    checkInboxNotifications();
  }
}

// Expor no escopo global para onclick no HTML
window.openShareModal = openShareModal;
window.sendRecipeTo = sendRecipeTo;
window.shareToWhatsApp = shareToWhatsApp;
window.sharePDF = sharePDF;
window.copyShareLink = copyShareLink;
window.closeShareModal = closeShareModal;
window.openInboxModal = openInboxModal;
window.openSharedRecipe = openSharedRecipe;
window.closeInboxModal = closeInboxModal;
window.addToMyRecipes = addToMyRecipes;

// Inicializa modais e verificação na carga
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', injectModals);
} else {
  injectModals();
}

window.addEventListener('authChange', () => {
  checkInboxNotifications();
});
