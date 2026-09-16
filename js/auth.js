/* =============================================
   RECEITAS DA ISA — Authentication Logic
   ============================================= */

import { 
  auth, db, provider, 
  signInWithPopup, signOut, onAuthStateChanged,
  doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove,
  getDocs, collection
} from './firebase-config.js';

// --- State ---
let currentUser = null;
let userFavorites = [];
let userPlanner = {};
let userSchedule = {};

// --- UI Elements ---
const authContainer = document.getElementById('nav-auth-container');

// Resolve na primeira vez que o Firebase confirma o estado de login (logado ou não).
// Em todo carregamento de página, currentUser começa null até essa confirmação chegar —
// código que depende de getUser() logo no início (ex: carregar receita) deve aguardar isso
// para não tratar um usuário logado como deslogado por causa da corrida assíncrona.
let resolveAuthReady;
export const authReady = new Promise(resolve => { resolveAuthReady = resolve; });
window.authReady = authReady;

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
      userSchedule = {};
      updateAuthUI(false);
    }

    // Notifica outros scripts que o estado mudou
    window.dispatchEvent(new CustomEvent('authChange', { detail: { user: currentUser, favorites: userFavorites, planner: userPlanner, schedule: userSchedule } }));

    if (resolveAuthReady) {
      resolveAuthReady();
      resolveAuthReady = null;
    }
  });
}

async function fetchUserData(uid) {
  try {
    const userRef = doc(db, 'users', uid);
    const userDoc = await getDoc(userRef);
    const profileData = {
      uid: uid,
      displayName: currentUser?.displayName || currentUser?.email || 'Amigo',
      email: currentUser?.email || '',
      photoURL: currentUser?.photoURL || '',
      lastLogin: new Date().toISOString()
    };
    if (userDoc.exists()) {
      const data = userDoc.data();
      userFavorites = data.favorites || [];
      userPlanner = data.planner || {};
      userSchedule = data.schedule || {};
      updateDoc(userRef, profileData).catch(e => console.warn("Aviso ao atualizar perfil:", e));
    } else {
      setDoc(userRef, {
        ...profileData,
        favorites: [],
        planner: {},
        schedule: {}
      }).catch(e => console.warn("Aviso ao criar perfil:", e));
      userFavorites = [];
      userPlanner = {};
      userSchedule = {};
    }

    // Gravação assíncrona em segundo plano no repositório de perfis públicos
    setDoc(doc(db, 'public_profiles', uid), profileData, { merge: true }).catch(pubErr => {
      console.warn("Aviso ao atualizar perfil público:", pubErr);
    });
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

const PREDEFINED_FRIENDS = [
  {
    uid: 'Q86H7miEjoMPyNs0vfHWd0',
    displayName: 'Guilherme Cardoso',
    email: 'gmccardoso01@gmail.com',
    photoURL: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Guilherme'
  }
];

export async function getAllRegisteredUsers() {
  const usersMap = new Map();

  // 1. Adiciona amigos pré-definidos
  PREDEFINED_FRIENDS.forEach(u => usersMap.set(u.email.toLowerCase(), u));

  // 2. Busca no diretório público public_profiles
  try {
    const pubSnap = await getDocs(collection(db, 'public_profiles'));
    pubSnap.forEach(docSnap => {
      const data = docSnap.data() || {};
      const uid = data.uid || docSnap.id;
      const email = (data.email || '').toLowerCase();
      if (email || uid) {
        usersMap.set(email || uid, {
          uid: uid,
          displayName: data.displayName || data.email || 'Amigo',
          email: data.email || '',
          photoURL: data.photoURL || ''
        });
      }
    });
  } catch (e) {}

  // 3. Busca na coleção users (com fallback)
  try {
    const querySnapshot = await getDocs(collection(db, 'users'));
    querySnapshot.forEach(docSnap => {
      const data = docSnap.data() || {};
      const uid = data.uid || docSnap.id;
      const email = (data.email || '').toLowerCase();
      if (email || uid) {
        const existing = usersMap.get(email) || {};
        usersMap.set(email || uid, {
          uid: uid || existing.uid,
          displayName: data.displayName || existing.displayName || data.email || 'Amigo',
          email: data.email || existing.email || '',
          photoURL: data.photoURL || existing.photoURL || ''
        });
      }
    });
  } catch (err) {
    console.warn("Consulta na coleção de usuários do Firestore restrita, usando perfis públicos:", err);
  }

  return Array.from(usersMap.values());
}

export async function cloudUpdateSchedule(newSchedule) {
  if (!currentUser) return false;
  const userRef = doc(db, 'users', currentUser.uid);
  try {
    userSchedule = newSchedule || {};
    await updateDoc(userRef, { schedule: userSchedule });
    return true;
  } catch (err) {
    console.error("Erro ao atualizar schedule na nuvem:", err);
    return false;
  }
}

export function getUser() { return currentUser; }
export function getCloudFavorites() { return userFavorites; }
export function getCloudPlanner() { return userPlanner; }
export function getCloudSchedule() { return userSchedule; }

window.getUser = getUser;
window.getCloudFavorites = getCloudFavorites;
window.getCloudPlanner = getCloudPlanner;
window.getCloudSchedule = getCloudSchedule;
window.cloudUpdateSchedule = cloudUpdateSchedule;

// Sempre pedir para escolher conta ao fazer login
provider.setCustomParameters({ prompt: 'select_account' });

// Inicia o processo
initAuth();
