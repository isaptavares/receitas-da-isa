/* =============================================
   RECEITAS DA ISA — Gemini Background Retry Queue ("Lista de Espera")
   Persiste tentativas no IndexedDB e reprocessa em segundo plano
   ============================================= */

import {
  extractRecipeFromYouTube,
  extractRecipeFromVercelServer,
  extractRecipeFromFile,
  autocompleteRecipeWithAI,
  saveUserRecipe,
  updateUserRecipe
} from './user-recipes.js?v=10';
import { authReady, getUser } from './auth.js';

const DB_NAME = 'receitas_isa_ai_queue_db';
const STORE_NAME = 'jobs';
const DB_VERSION = 1;
const RETRY_INTERVAL_MS = 30000; // 30 segundos entre tentativas
const MAX_ATTEMPTS = 60; // até ~30 minutos tentando

let workerStarted = false;
let isProcessing = false;
let pollTimer = null;

export function isGeminiBusyError(errOrMsg) {
  const msg = typeof errOrMsg === 'string' ? errOrMsg : (errOrMsg?.message || String(errOrMsg || ''));
  return /demand|quota|429|503|resource|rate limit|too many requests|overload|cheio de demanda|demorou/i.test(msg);
}

function openQueueDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function getAllJobs() {
  try {
    const db = await openQueueDB();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).getAll();
      req.onsuccess = () => resolve((req.result || []).sort((a, b) => b.createdAt - a.createdAt));
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    return [];
  }
}

async function putJob(job) {
  const db = await openQueueDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const req = tx.objectStore(STORE_NAME).put(job);
    req.onsuccess = () => resolve(job);
    req.onerror = () => reject(req.error);
  });
}

async function deleteJob(id) {
  const db = await openQueueDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const req = tx.objectStore(STORE_NAME).delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

function getRootPrefix() {
  const p = window.location.pathname;
  return (p.includes('/categories/') || p.includes('/tags/') || p.includes('/difficulties/')) ? '../' : '';
}

export async function enqueueGeminiJob({ type, label, payload }) {
  const job = {
    id: `job_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    type,
    label: label || 'Receita na fila',
    payload,
    status: 'pending',
    attempts: 1,
    createdAt: Date.now(),
    nextRetryAt: Date.now() + 20000,
    lastError: 'Gemini ocupado no momento'
  };
  await putJob(job);
  startAiQueueWorker();
  await renderQueueWidget();
  return job;
}

async function executeJob(job) {
  const { type, payload } = job;

  if (type === 'youtube') {
    const extracted = await extractRecipeFromYouTube(payload.url);
    return await finalizeAndSaveRecipe(extracted);
  }

  if (type === 'vercel_video' || type === 'website') {
    const extracted = await extractRecipeFromVercelServer(payload.url);
    return await finalizeAndSaveRecipe(extracted);
  }

  if (type === 'file') {
    const extracted = await extractRecipeFromFile(payload.filesData);
    extracted.image = extracted.image || 'images/placeholder_recipe.png';
    return await finalizeAndSaveRecipe(extracted);
  }

  if (type === 'manual_autocomplete') {
    const partial = payload.partialRecipe;
    const aiResult = await autocompleteRecipeWithAI(partial);
    const merged = {
      title: partial.title,
      ingredients: partial.ingredients,
      steps: partial.steps,
      image: payload.image || 'images/placeholder_recipe.png',
      imageUrl: payload.imageUrl || payload.image || 'images/placeholder_recipe.png',
      subtitle: partial.subtitle || aiResult.subtitle || '',
      cuisine: partial.cuisine || aiResult.cuisine || 'Brasileira',
      difficulty: partial.difficulty || aiResult.difficulty || 'Médio',
      prepTime: partial.prepTime || aiResult.prepTime || 15,
      cookTime: partial.cookTime || aiResult.cookTime || 15,
      totalTime: partial.totalTime || aiResult.totalTime || ((partial.prepTime || aiResult.prepTime || 15) + (partial.cookTime || aiResult.cookTime || 15)),
      servings: partial.servings || aiResult.servings || 2,
      calories: partial.calories || aiResult.calories || aiResult.nutrition?.calories || 300,
      categories: partial.categories?.length > 0 ? partial.categories : (aiResult.categories || ['Almoço']),
      tags: partial.tags?.length > 0 ? partial.tags : (aiResult.tags || ['Saudável']),
      nutrition: aiResult.nutrition || { calories: aiResult.calories || 300, protein: '20g', carbs: '40g', fat: '10g' }
    };

    if (payload.recipeId) {
      await updateUserRecipe(payload.recipeId, merged);
      return { savedId: payload.recipeId, title: merged.title };
    } else {
      const savedId = await saveUserRecipe(merged);
      return { savedId, title: merged.title };
    }
  }

  throw new Error('Tipo de tarefa desconhecido');
}

async function finalizeAndSaveRecipe(extractedRecipe) {
  const isPlaceholder = (imgUrl) => !imgUrl || imgUrl.includes('placeholder') || imgUrl.includes('unsplash') || imgUrl.trim() === '';
  const cover = (!isPlaceholder(extractedRecipe.imageUrl) ? extractedRecipe.imageUrl : null) ||
                (!isPlaceholder(extractedRecipe.image) ? extractedRecipe.image : null) ||
                'images/placeholder_recipe.png';
  extractedRecipe.image = cover;
  extractedRecipe.imageUrl = cover;
  const savedId = await saveUserRecipe(extractedRecipe);
  return { savedId, title: extractedRecipe.title || 'Nova Receita' };
}

async function processQueue(forceNow = false) {
  if (isProcessing || !navigator.onLine) return;
  isProcessing = true;

  try {
    await Promise.race([authReady, new Promise(r => setTimeout(r, 1500))]);
    if (!getUser()) {
      isProcessing = false;
      return;
    }

    const jobs = await getAllJobs();
    const now = Date.now();
    const dueJobs = jobs.filter(j => j.status === 'pending' && (forceNow || j.nextRetryAt <= now));

    for (const job of dueJobs) {
      job.status = 'processing';
      await putJob(job);
      await renderQueueWidget();

      try {
        const result = await executeJob(job);
        job.status = 'done';
        job.savedId = result.savedId;
        job.recipeTitle = result.title;
        job.completedAt = Date.now();
        await putJob(job);
        await renderQueueWidget();
        showQueueReadyBanner(job);
      } catch (err) {
        if (isGeminiBusyError(err) && job.attempts < MAX_ATTEMPTS) {
          job.status = 'pending';
          job.attempts += 1;
          job.nextRetryAt = Date.now() + RETRY_INTERVAL_MS;
          job.lastError = 'Gemini ainda ocupado, tentando novamente em breve...';
          await putJob(job);
        } else {
          job.status = 'failed';
          job.lastError = err?.message || 'Erro ao processar receita';
          await putJob(job);
        }
        await renderQueueWidget();
      }
    }
  } finally {
    isProcessing = false;
  }
}

function showQueueReadyBanner(job) {
  const prefix = getRootPrefix();
  const existing = document.getElementById('ai-queue-ready-toast');
  if (existing) existing.remove();

  const banner = document.createElement('div');
  banner.id = 'ai-queue-ready-toast';
  banner.style.cssText = `
    position: fixed;
    bottom: 24px;
    right: 20px;
    z-index: 99999;
    background: #14110d;
    color: #ffffff;
    border: 2px solid #ffbf00;
    border-radius: 20px;
    padding: 14px 18px;
    box-shadow: 0 18px 44px rgba(0,0,0,0.28);
    display: flex;
    align-items: center;
    gap: 12px;
    max-width: min(360px, calc(100vw - 32px));
    font-family: inherit;
  `;
  banner.innerHTML = `
    <span style="font-size:22px; flex-shrink:0;">🎉</span>
    <div style="flex:1; min-width:0;">
      <div style="font-size:13px; font-weight:800; color:#ffbf00;">Receita pronta da Lista de Espera!</div>
      <div style="font-size:13px; font-weight:600; color:#fff; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${job.recipeTitle || job.label}</div>
    </div>
    <a href="${prefix}recipe.html?id=${encodeURIComponent(job.savedId)}" style="background:#ffbf00; color:#14110d; text-decoration:none; padding:8px 14px; border-radius:999px; font-size:12px; font-weight:800; white-space:nowrap; flex-shrink:0;">Ver →</a>
  `;
  document.body.appendChild(banner);
  setTimeout(() => {
    if (banner.parentNode) banner.remove();
  }, 12000);
}

async function renderQueueWidget() {
  const jobs = await getAllJobs();
  const activeJobs = jobs.filter(j => j.status === 'pending' || j.status === 'processing' || j.status === 'done' || j.status === 'failed');

  let pill = document.getElementById('ai-queue-pill');
  if (activeJobs.length === 0) {
    if (pill) pill.remove();
    const modal = document.getElementById('ai-queue-modal-overlay');
    if (modal) modal.remove();
    return;
  }

  if (!pill) {
    pill = document.createElement('button');
    pill.id = 'ai-queue-pill';
    pill.type = 'button';
    pill.style.cssText = `
      position: fixed;
      bottom: 18px;
      left: 18px;
      z-index: 9998;
      background: #ffffff;
      color: #14110d;
      border: 2px solid #ffbf00;
      border-radius: 999px;
      padding: 10px 16px;
      font-family: inherit;
      font-size: 13px;
      font-weight: 800;
      box-shadow: 0 10px 28px rgba(20, 17, 13, 0.16);
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
    `;
    pill.onclick = () => openQueueModal();
    document.body.appendChild(pill);
  }

  const pendingCount = activeJobs.filter(j => j.status === 'pending' || j.status === 'processing').length;
  const doneCount = activeJobs.filter(j => j.status === 'done').length;

  if (pendingCount > 0) {
    pill.innerHTML = `<span>⏳</span><span>${pendingCount} ${pendingCount === 1 ? 'receita na fila' : 'receitas na fila'}</span>`;
  } else if (doneCount > 0) {
    pill.innerHTML = `<span>✅</span><span>${doneCount} ${doneCount === 1 ? 'receita pronta!' : 'receitas prontas!'}</span>`;
  } else {
    pill.innerHTML = `<span>⚠️</span><span>Fila de receitas (${activeJobs.length})</span>`;
  }

  const modalList = document.getElementById('ai-queue-modal-list');
  if (modalList) {
    renderQueueModalList(activeJobs, modalList);
  }
}

function renderQueueModalList(jobs, container) {
  const prefix = getRootPrefix();
  if (!jobs.length) {
    container.innerHTML = `<div style="text-align:center; padding:20px; color:#6b6459; font-size:14px;">Nenhuma receita na lista de espera.</div>`;
    return;
  }

  container.innerHTML = jobs.map(j => {
    const statusBadge =
      j.status === 'processing' ? `<span style="background:#eaeefe; color:#3a4bc0; padding:3px 10px; border-radius:999px; font-size:11px; font-weight:800;">Tentando agora...</span>` :
      j.status === 'pending' ? `<span style="background:#fff6d9; color:#8a6a00; padding:3px 10px; border-radius:999px; font-size:11px; font-weight:800;">Tentativa ${j.attempts} • Em fila</span>` :
      j.status === 'done' ? `<span style="background:#e6f2ef; color:#1f6b5c; padding:3px 10px; border-radius:999px; font-size:11px; font-weight:800;">Pronta! ✓</span>` :
      `<span style="background:#fdeae8; color:#e14b3f; padding:3px 10px; border-radius:999px; font-size:11px; font-weight:800;">Falhou</span>`;

    const actionBtn =
      j.status === 'done' && j.savedId
        ? `<a href="${prefix}recipe.html?id=${encodeURIComponent(j.savedId)}" style="background:#ffbf00; color:#14110d; text-decoration:none; padding:6px 12px; border-radius:999px; font-size:12px; font-weight:800;">Abrir</a>`
        : (j.status === 'pending' || j.status === 'failed')
          ? `<button type="button" onclick="window.__retryAiQueueJob('${j.id}')" style="background:#f7f4ee; color:#14110d; border:1px solid #ece5d9; padding:6px 12px; border-radius:999px; font-size:12px; font-weight:700; cursor:pointer;">Tentar agora</button>`
          : '';

    return `
      <div style="background:#fcfaf6; border:1px solid #f0ebe3; border-radius:16px; padding:12px 14px; display:flex; flex-direction:column; gap:8px;">
        <div style="display:flex; align-items:center; justify-content:space-between; gap:8px;">
          <div style="font-size:14px; font-weight:800; color:#14110d; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${j.recipeTitle || j.label}</div>
          ${statusBadge}
        </div>
        <div style="display:flex; align-items:center; justify-content:space-between; gap:8px;">
          <span style="font-size:12px; color:#6b6459;">${j.lastError && j.status !== 'done' ? j.lastError : 'Salva no seu Livro de Receitas'}</span>
          <div style="display:flex; align-items:center; gap:6px; flex-shrink:0;">
            ${actionBtn}
            <button type="button" onclick="window.__removeAiQueueJob('${j.id}')" style="background:none; border:none; color:#a39a8c; font-size:12px; font-weight:700; cursor:pointer; padding:4px 6px;">✕</button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

async function openQueueModal() {
  let overlay = document.getElementById('ai-queue-modal-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'ai-queue-modal-overlay';
    overlay.style.cssText = 'position:fixed; inset:0; background:rgba(20,17,13,0.5); backdrop-filter:blur(4px); z-index:99999; display:flex; align-items:center; justify-content:center; padding:16px;';
    overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
    overlay.innerHTML = `
      <div style="background:#fff; width:100%; max-width:440px; border-radius:24px; padding:22px; box-shadow:0 24px 60px rgba(0,0,0,0.22); display:flex; flex-direction:column; gap:14px; max-height:80vh;">
        <div style="display:flex; align-items:center; justify-content:space-between;">
          <h3 style="margin:0; font-size:18px; font-weight:800; color:#14110d;">⏳ Lista de Espera do Gemini</h3>
          <button type="button" onclick="document.getElementById('ai-queue-modal-overlay').remove()" style="width:32px; height:32px; border-radius:50%; background:#f7f4ee; border:none; font-size:15px; font-weight:700; cursor:pointer;">✕</button>
        </div>
        <p style="margin:0; font-size:13px; color:#6b6459; line-height:1.45;">Enquanto você navega pelo site, continuamos tentando importar estas receitas automaticamente em segundo plano.</p>
        <div id="ai-queue-modal-list" style="display:flex; flex-direction:column; gap:10px; overflow-y:auto;"></div>
      </div>
    `;
    document.body.appendChild(overlay);
  }
  const jobs = await getAllJobs();
  renderQueueModalList(jobs, document.getElementById('ai-queue-modal-list'));
}

window.__retryAiQueueJob = async (id) => {
  const jobs = await getAllJobs();
  const job = jobs.find(j => j.id === id);
  if (job) {
    job.status = 'pending';
    job.nextRetryAt = Date.now();
    await putJob(job);
    await renderQueueWidget();
    processQueue(true);
  }
};

window.__removeAiQueueJob = async (id) => {
  await deleteJob(id);
  await renderQueueWidget();
};

export function startAiQueueWorker() {
  if (workerStarted) return;
  workerStarted = true;

  renderQueueWidget();
  processQueue(false);

  pollTimer = setInterval(() => {
    processQueue(false);
  }, 20000);

  window.addEventListener('online', () => processQueue(true));
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') processQueue(false);
  });
}

window.enqueueGeminiJob = enqueueGeminiJob;
window.isGeminiBusyError = isGeminiBusyError;
window.startAiQueueWorker = startAiQueueWorker;
