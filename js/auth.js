/* =============================================
   RECEITAS DA ISA — Authentication Logic
   ============================================= */

import { 
  auth, db, provider, 
  signInWithPopup, signOut, onAuthStateChanged,
  doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove 
} from './firebase-config.js';

// --- State ---
let currentUser = null;
let userFavorites = [];
let userPlanner = {};

// --- UI Elements ---
const authContainer = document.getElementById('nav-auth-container');

// --- Initialization ---
function initAuth() {
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      currentUser = user;
      await fetchUserData(user.uid);
      updateAuthUI(true);
    } else {
      currentUser = null;
      userFavorites = [];
      userPlanner = {};
      updateAuthUI(false);
    }
    
    // Notifica outros scripts que o estado mudou
    window.dispatchEvent(new CustomEvent('authChange', { detail: { user: currentUser, favorites: userFavorites, planner: userPlanner } }));
  });
}

async function fetchUserData(uid) {
  try {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (userDoc.exists()) {
      const data = userDoc.data();
      userFavorites = data.favorites || [];
      userPlanner = data.planner || {};
    } else {
      // Cria o documento do usuário se não existir
      await setDoc(doc(db, 'users', uid), { favorites: [], planner: {} });
      userFavorites = [];
      userPlanner = {};
    }
  } catch (err) {
    console.error("Erro ao buscar dados do usuário:", err);
  }
}

function updateAuthUI(isLoggedIn) {
  if (!authContainer) return;

  if (isLoggedIn) {
    authContainer.innerHTML = `
      <div class="nav-user-avatar-btn" id="user-avatar-btn" title="Clique para sair">
        <img src="${currentUser.photoURL}" alt="${currentUser.displayName}" class="nav-user-avatar">
        <div class="nav-user-menu" id="user-menu">
          <button class="nav-user-menu-item logout" id="logout-btn">
            <span>🚪</span> Sair
          </button>
        </div>
      </div>
    `;

    const avatarBtn = document.getElementById('user-avatar-btn');
    const menu = document.getElementById('user-menu');
    avatarBtn.onclick = (e) => {
      e.stopPropagation();
      menu.classList.toggle('active');
    };

    document.getElementById('logout-btn').onclick = handleLogout;
    window.onclick = () => menu.classList.remove('active');

  } else {
    authContainer.innerHTML = `
      <button class="nav-login-btn" id="login-btn">
        <span>🔑</span> <span>Entrar</span>
      </button>
    `;
    document.getElementById('login-btn').onclick = handleLogin;
  }
}

async function handleLogin() {
  try {
    await signInWithPopup(auth, provider);
    if (typeof showToast === 'function') showToast('👋 Bem-vinda de volta, Isa!');
  } catch (err) {
    console.error("Login falhou:", err);
    if (typeof showToast === 'function') showToast('❌ Erro ao entrar');
  }
}

async function handleLogout() {
  try {
    await signOut(auth);
    if (typeof showToast === 'function') showToast('Até logo! 👋');
  } catch (err) {
    console.error("Logout falhou:", err);
  }
}

// --- Funções Exportadas para recipes.js ---

export async function cloudToggleFavorite(recipeId) {
  if (!currentUser) return false;
  
  const isNowFav = !userFavorites.includes(recipeId);
  const userRef = doc(db, 'users', currentUser.uid);

  try {
    if (isNowFav) {
      await updateDoc(userRef, { favorites: arrayUnion(recipeId) });
      userFavorites.push(recipeId);
    } else {
      await updateDoc(userRef, { favorites: arrayRemove(recipeId) });
      userFavorites = userFavorites.filter(id => id !== recipeId);
    }
    return isNowFav;
  } catch (err) {
    console.error("Erro ao atualizar favorito:", err);
    return !isNowFav; // reverte
  }
}

export async function cloudUpdatePlanner(recipeId, quantity) {
  if (!currentUser) return false;
  const userRef = doc(db, 'users', currentUser.uid);
  try {
    userPlanner[recipeId] = quantity;
    await updateDoc(userRef, { planner: userPlanner });
    return true;
  } catch (err) {
    console.error("Erro ao atualizar planner:", err);
    return false;
  }
}

export async function cloudRemoveFromPlanner(recipeId) {
  if (!currentUser) return false;
  const userRef = doc(db, 'users', currentUser.uid);
  try {
    delete userPlanner[recipeId];
    await updateDoc(userRef, { planner: userPlanner });
    return true;
  } catch (err) {
    console.error("Erro ao remover do planner:", err);
    return false;
  }
}

export async function cloudClearPlanner() {
  if (!currentUser) return false;
  const userRef = doc(db, 'users', currentUser.uid);
  try {
    userPlanner = {};
    await updateDoc(userRef, { planner: {} });
    return true;
  } catch (err) {
    console.error("Erro ao limpar planner:", err);
    return false;
  }
}

export function getUser() { return currentUser; }
export function getCloudFavorites() { return userFavorites; }
export function getCloudPlanner() { return userPlanner; }

// Sempre pedir para escolher conta ao fazer login
provider.setCustomParameters({ prompt: 'select_account' });

// Inicia o processo
initAuth();
