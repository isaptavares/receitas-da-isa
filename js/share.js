/* =============================================
   RECEITAS DA ISA — Share & Friends Module (Unificado)
   ============================================= */

import { db, collection, addDoc, getDocs, query, where, doc, updateDoc, serverTimestamp } from './firebase-config.js';
import { getUser, getAllRegisteredUsers, authReady } from './auth.js';

let sharedRecipesList = [];
let currentShareRecipeId = null;
let currentShareRecipeTitle = '';
let currentShareRecipeImage = '';

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
    background: var(--clr-surface, #1a1612);
    border: 1px solid var(--clr-gold, #e8a838);
    border-radius: var(--radius-lg, 24px);
    width: 100%;
    max-width: 500px;
    padding: 1.8rem;
    box-shadow: 0 20px 50px rgba(0,0,0,0.8);
    color: var(--clr-text, #f0e8d8);
    transform: scale(0.9);
    transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  }
  .share-modal-overlay.active .share-modal {
    transform: scale(1);
  }
  .share-modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 1rem;
    border-bottom: 1px solid var(--clr-border, rgba(255,200,100,0.12));
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
    color: var(--clr-text-muted, #a09070);
    font-size: 1.6rem;
    cursor: pointer;
    line-height: 1;
    transition: color 0.2s;
  }
  .share-modal-close:hover { color: #ffffff; }
  
  .share-recipe-preview {
    display: flex;
    align-items: center;
    gap: 0.8rem;
    background: rgba(0,0,0,0.3);
    padding: 0.8rem;
    border-radius: var(--radius-md, 16px);
    margin-bottom: 1.2rem;
    border: 1px solid var(--clr-border, rgba(255,200,100,0.12));
  }
  .share-recipe-img {
    width: 52px;
    height: 52px;
    border-radius: var(--radius-sm, 8px);
    object-fit: cover;
  }
  .share-recipe-info { flex: 1; min-width: 0; }
  .share-recipe-name {
    font-weight: 600;
    font-size: 1rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .share-recipe-sub {
    font-size: 0.78rem;
    color: var(--clr-text-muted, #a09070);
  }

  .share-section-label {
    font-size: 0.82rem;
    font-weight: 600;
    color: var(--clr-gold, #e8a838);
    margin-bottom: 0.6rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .share-friends-list {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
    max-height: 180px;
    overflow-y: auto;
    margin-bottom: 1.2rem;
    padding-right: 4px;
  }
  .share-friend-card {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.6rem 0.9rem;
    background: var(--clr-surface-2, #231e18);
    border: 1px solid var(--clr-border, rgba(255,200,100,0.12));
    border-radius: var(--radius-md, 16px);
    transition: border-color 0.2s;
  }
  .share-friend-card:hover {
    border-color: var(--clr-gold, #e8a838);
  }
  .share-friend-info {
    display: flex;
    align-items: center;
    gap: 0.7rem;
  }
  .share-friend-avatar {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    object-fit: cover;
    border: 1.5px solid var(--clr-gold, #e8a838);
  }
  .share-friend-name {
    font-weight: 600;
    font-size: 0.88rem;
  }
  .share-friend-email {
    font-size: 0.72rem;
    color: var(--clr-text-muted, #a09070);
  }
  .btn-send-share {
    padding: 0.4rem 0.85rem;
    background: var(--clr-gold, #e8a838);
    color: #1a0f00;
    border: none;
    border-radius: var(--radius-sm, 8px);
    font-weight: 600;
    font-size: 0.8rem;
    cursor: pointer;
    transition: transform 0.2s, background 0.2s;
  }
  .btn-send-share:hover {
    background: var(--clr-gold-light, #f5c76a);
    transform: scale(1.04);
  }
  .btn-send-share.sent {
    background: var(--clr-sage, #7a9e7e);
    color: #ffffff;
    cursor: default;
    transform: none;
  }

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
    gap: 0.4rem;
    padding: 0.75rem 0.5rem;
    background: var(--clr-surface-2, #231e18);
    border: 1px solid var(--clr-border, rgba(255,200,100,0.15));
    border-radius: var(--radius-md, 16px);
    color: var(--clr-text, #f0e8d8);
    font-size: 0.78rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    text-align: center;
  }
  .share-quick-btn:hover {
    border-color: var(--clr-gold, #e8a838);
    background: rgba(232, 168, 56, 0.1);
    color: var(--clr-gold-light, #f5c76a);
    transform: translateY(-2px);
  }
  .share-quick-icon {
    font-size: 1.3rem;
  }

  .share-copy-link-bar {
    display: flex;
    gap: 0.5rem;
  }
  .share-copy-input {
    flex: 1;
    background: rgba(0,0,0,0.3);
    border: 1px solid var(--clr-border, rgba(255,200,100,0.12));
    border-radius: var(--radius-sm, 8px);
    padding: 0.5rem 0.8rem;
    color: var(--clr-text, #f0e8d8);
    font-size: 0.8rem;
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
    background: var(--clr-surface-2, #231e18);
    border: 1px solid var(--clr-border, rgba(255,200,100,0.12));
    border-radius: var(--radius-md, 16px);
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
    border-radius: var(--radius-sm, 8px);
    object-fit: cover;
  }
  .inbox-card-content { flex: 1; min-width: 0; }
  .inbox-card-title {
    font-weight: 600;
    font-size: 0.95rem;
    margin-bottom: 0.25rem;
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
            <span class="share-quick-icon">💬</span>
            <span>WhatsApp</span>
          </button>
          <button class="share-quick-btn" onclick="sharePDF()">
            <span class="share-quick-icon">📄</span>
            <span>Salvar PDF</span>
          </button>
          <button class="share-quick-btn" onclick="copyShareLink()">
            <span class="share-quick-icon">🔗</span>
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
        <div id="inbox-list" style="max-height: 340px; overflow-y: auto;">
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
  friendsList.innerHTML = `<div style="text-align:center; padding: 0.8rem; color: var(--clr-text-muted); font-size:0.85rem;">Carregando lista de amigas...</div>`;
  const allUsers = await getAllRegisteredUsers();
  
  // Excluir o próprio usuário logado
  const friends = allUsers.filter(u => u.uid !== user.uid);

  if (friends.length === 0) {
    friendsList.innerHTML = `
      <div style="text-align:center; padding: 0.8rem; color: var(--clr-text-muted); font-size:0.85rem;">
        Nenhum outro amigo logado no momento. Peça para suas amigas entrarem no app!
      </div>
    `;
    return;
  }

  friendsList.innerHTML = friends.map(friend => `
    <div class="share-friend-card">
      <div class="share-friend-info">
        <img src="${friend.photoURL || 'images/hero_bg.png'}" alt="${friend.displayName}" class="share-friend-avatar">
        <div>
          <div class="share-friend-name">${friend.displayName}</div>
          <div class="share-friend-email">${friend.email}</div>
        </div>
      </div>
      <button class="btn-send-share" id="btn-send-${friend.uid}" onclick="sendRecipeTo('${friend.uid}', '${currentShareRecipeId}', '${escapeJsStr(currentShareRecipeTitle)}', '${escapeJsStr(currentShareRecipeImage)}')">
        Enviar 📤
      </button>
    </div>
  `).join('');
}

function escapeJsStr(str) {
  return (str || '').replace(/'/g, "\\'").replace(/"/g, '\\"');
}

export async function sendRecipeTo(recipientUid, recipeId, recipeTitle, recipeImage) {
  const user = getUser();
  if (!user) {
    alert("Por favor, faça login para enviar receitas aos amigos!");
    return;
  }

  const btn = document.getElementById(`btn-send-${recipientUid}`);
  if (btn) {
    btn.disabled = true;
    btn.textContent = "Enviando...";
  }

  try {
    await addDoc(collection(db, 'shared_recipes'), {
      senderUid: user.uid,
      senderName: user.displayName || user.email,
      senderPhoto: user.photoURL || '',
      recipientUid: recipientUid,
      recipeId: recipeId,
      recipeTitle: recipeTitle,
      recipeImage: recipeImage || 'images/hero_bg.png',
      createdAt: serverTimestamp(),
      read: false
    });

    if (btn) {
      btn.textContent = "Enviado! ✓";
      btn.classList.add('sent');
    }
  } catch (err) {
    console.error("Erro ao enviar receita:", err);
    alert("Não foi possível enviar no momento. Tente novamente.");
    if (btn) {
      btn.disabled = false;
      btn.textContent = "Enviar 📤";
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
    alert("Link copiado para a área de transferência! Pode colar no WhatsApp ou mensagem. 🔗");
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
    const q = query(
      collection(db, 'shared_recipes'),
      where('recipientUid', '==', user.uid)
    );
    const querySnapshot = await getDocs(q);
    sharedRecipesList = [];
    let unreadCount = 0;

    querySnapshot.forEach(docSnap => {
      const data = docSnap.data();
      sharedRecipesList.push({ id: docSnap.id, ...data });
      if (!data.read) unreadCount++;
    });

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
    <div class="inbox-card ${!item.read ? 'unread' : ''}" onclick="openSharedRecipe('${item.recipeId}', '${item.id}')" style="cursor:pointer;">
      <img src="${item.recipeImage || 'images/hero_bg.png'}" alt="${item.recipeTitle}" class="inbox-card-img">
      <div class="inbox-card-content">
        <div class="inbox-card-title">${item.recipeTitle}</div>
        <div class="inbox-card-sender">
          <img src="${item.senderPhoto || 'images/hero_bg.png'}" alt="">
          <span>Enviada por ${item.senderName}</span>
        </div>
      </div>
      <a href="recipe.html?id=${item.recipeId}" class="btn btn-outline" style="padding: 0.4rem 0.8rem; font-size: 0.8rem;">Ver 🍽️</a>
    </div>
  `).join('');
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

// Inicializa modais e verificação na carga
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', injectModals);
} else {
  injectModals();
}

window.addEventListener('authChange', () => {
  checkInboxNotifications();
});
