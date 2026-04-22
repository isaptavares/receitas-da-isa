# 🍴 Receitas da Isa — Project Context

> **For the AI assistant:** Read this file at the start of every conversation about this project. It contains everything you need to know to continue working on this website without losing context.

---

## Project Overview

**Name:** Receitas da Isa  
**Language:** Portuguese (pt-BR)  
**Description:** A personal recipe website belonging to "Isa". It showcases recipes from cuisines around the world with a dark luxury aesthetic and warm gold accents.  
**Public URL:** https://isaptavares.github.io/receitas-da-isa/
**Root folder:** `c:\Users\isapt\imagens\Backup drive isa 2\Livro de receitas\`

---

## Tech Stack

- Pure **HTML + CSS + Vanilla JavaScript** — no frameworks, no build step
- **Firebase (Auth & Firestore)** — Cloud solution for user accounts and cross-device favorites (Novidade).
- Google Fonts: **Playfair Display** (headings) + **Inter** (body)
- Data stored as **JSON files** (one per recipe + one master index)
- Favorites: Saved in **Firestore** when logged in; **localStorage** as fallback (key: `receitas_isa_favorites`).
- Master Stylesheet: `css/main.css` (Cache versioning used: `?v=2`)
- **Cache-Busting Logic:** All JSON `fetch` calls in `js/recipes.js` include a timestamp (`?v=TIMESTAMP`) to prevent stale data.

---

## Design System (`css/main.css`)

### Color Palette (CSS variables)
| Variable | Value | Use |
|---|---|---|
| `--clr-bg` | `#0f0d0a` | Page background |
| `--clr-surface` | `#1a1612` | Cards, panels |
| `--clr-surface-2` | `#231e18` | Inputs, nested panels |
| `--clr-gold` | `#e8a838` | Primary accent |
| `--clr-gold-light` | `#f5c76a` | Highlights / Mobile step numbers |
| `--clr-gold-dark` | `#c88a22` | Gradient end |
| `--clr-success` | `#2ecc71` | Completed steps stroke/text |
| `--clr-terracotta` | `#c0614a` | Danger / Hard difficulty |
| `--clr-sage` | `#7a9e7e` | Easy difficulty |
| `--clr-amber` | `#d97706` | Medium difficulty |
| `--clr-cream` | `#f5ead8` | Light text |
| `--clr-text-muted` | `#a09070` | Secondary text |

### Key Design Decisions
- **Dark mode only** (intentional).
- **Interactive Steps**: `step-item` elements are clickable.
- **Mobile List View (Novo):** No mobile, os cards de receita mudam de vertical para **horizontal** (imagem à esquerda, conteúdo à direita). O subtítulo (frase de efeito) é ocultado para permitir visualizar ~4 cards simultaneamente na tela.
- **Specificity**: Regras críticas de mobile usam `!important` para garantir consistência em navegadores comuns de celular (MIUI/Android).

---

## File Structure

```
c:\Users\isapt\imagens\Backup drive isa 2\Livro de receitas\
├── index.html              ← Home page
├── favorites.html          ← Favorites page
├── recipe.html             ← Recipe detail (receives ?id=<recipe-id>)
├── CONTEXT.md              ← This file
├── categories/             ← Dedicated category pages (Café da manhã, Almoco, etc.)
├── css/
│   └── main.css            ← Master design system
├── js/
│   ├── auth.js            ← Firebase Authentication & user UI logic
│   ├── firebase-config.js  ← Firebase project keys & initialization
│   ├── recipes.js          ← Core logic: data loading, favorites, card rendering
│   └── category-manager.js ← Logic for category pages (sorting, pagination)
├── images/                 ← Assets for recipes and UI
└── data/
    ├── index.json          ← Master recipe index (21 recipes currently)
    └── recipes/            ← Individual recipe JSONs (21 files)
```

---

## Recipe Logic & Features

### 1. Serving Scaler
- Ingredients scale based on serving selector. Macros and base batch info stay proportional to the input data.

### 2. Category Pages (Novidade)
- Páginas individuais por categoria com:
  - **Ordenação:** Por data (createdAt), tempo total ou calorias.
  - **Paginação:** Botão "Carregar Mais" (exibe 12 por vez).
  - **Filtros:** Integrados via `js/category-manager.js`.

### 3. Tag System
- Tags mantidas no layout mobile e desktop.
- Categorias suportadas: Café da Maunhã, Almoço, Lanche, Jantar, Sobremesa, Acompanhamento.

---

## Deployment & Workflow Rules

- **REGRA DE DEPLOY:** Não suba as mudanças para o GitHub automaticamente. Aguarde comando explícito ("deploy", "pode subir").
- **Visualização Local:** Testar sempre via `192.168.x.x:8080` para garantir responsividade mobile real.
- **Placeholder de Imagens:** Atualmente, novas receitas usam `images/placeholder_recipe.png` (cartoon) devido a limites de cota de IA.

---

- **Conversation ID:** `a81d785e-ba85-403f-9389-023c0e1a6688` (Last Update: 2026-04-13)
- Sessão anterior implementou:
  - Integração com **Firebase Authentication** (Login pelo Google).
  - Sincronização de **Favoritos na Nuvem** (Firestore Database).
  - Componente de Perfil na Navbar (Avatar Dinâmico).
  - Lógica de fallback para favoritos locais quando deslogado.

---

- **Conversation ID:** `4695f9ec-b04e-4fba-9d62-ce7ffcc51167` (Last Update: 2026-04-22)
- Esta sessão implementou:
  - Substituição do botão de "Imprimir" na página da receita por um botão de "Compartilhar" (ícone sem texto).
  - Implementação de um Modal de Compartilhamento com duas opções:
    1. **Link da Receita:** Usa a Web Share API nativa (`navigator.share`).
    2. **Salvar PDF:** Usa `window.print()`.
  - Otimização pesada do `@media print` no `recipe.html` para PDFs: Layout side-by-side (Ingredientes à direita/esquerda da Nutrição), redução de margens e fontes, visando caber toda a receita em uma única folha A4.
