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
- Google Fonts: **Playfair Display** (headings) + **Inter** (body)
- Data stored as **JSON files** (one per recipe + one master index)
- Favorites saved in **localStorage** (key: `receitas_isa_favorites`)
- Master Stylesheet: `css/main.css` (Renamed from `styles.css` to force cache bypass)
- **Cache-Busting Logic:** All JSON `fetch` calls in `js/recipes.js` include a timestamp (`?v=TIMESTAMP`) to prevent stale data/tags from appearing after updates.

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
- **Dark mode only** (intentional)
- **Interactive Steps**: `step-item` elements are clickable. Clicking toggles the `.completed` class.
- **Specific Mobile Overrides**: Mobile uses solid colors (like `#f5c76a`) for small elements (numbers) to prevent "muddy" rendering of gradients. 
- **CRITICAL Mobile Specificity**: For the `.completed` state on mobile, rules must be defined **inside** the media query and use `!important` to override the base mobile `.step-item` styles.

---

## File Structure

```
c:\Users\isapt\imagens\Backup drive isa 2\Livro de receitas\
├── index.html              ← Home page
├── favorites.html          ← Favorites page
├── recipe.html             ← Recipe detail (receives ?id=<recipe-id>)
├── CONTEXT.md              ← This file
├── css/
│   └── main.css            ← Master design system (Bypasses old styles.css cache)
├── js/
│   └── recipes.js          ← Core logic: data loading (with cache-bust), filtering, favorites
├── images/                 ← Assets for recipes and UI
└── data/
    ├── index.json          ← Master recipe index (New tags implemented here)
    └── recipes/            ← Individual recipe JSONs
```

---

## Recipe Logic & Features

### 1. Serving Scaler (The "- 1 +" Logic)
- **Base Unit:** The recipe is always loaded as "1 receita" (one batch), regardless of how many servings that batch yields.
- **Dynamic Calculation:** Ingredients scale linearly (Value * Count). Macros stay fixed (per original serving).
- **Yield Display:** "1 receita rende [X] porções" (Updates grammatically to "2 receitas rendem [2X] porções").

### 2. Interactive Steps (Modo de Preparo)
- **Click to Mark:** Each step in the `recipe.html` is an `<li>` with `onclick="this.classList.toggle('completed')"`.
- **Visual State:** `.completed` adds a green border (`#2ecc71`) and green background.

### 3. Tag System
- **Taxonomy:** Only a specific set of tags from the user's reference image is supported: `Fácil de fazer`, `1 panela`, `Falta checar`, `Dia a dia`, `Gostosão`, `Fritura`, `Proteico`, `Pouco calórico`, `Saudável`.

---

## Deployment & Workflow Rules

- **CRITICAL RULE FOR AI:** Every change must be committed and pushed to GitHub immediately.
- **Cache Troubleshooting:** 
  1. Renamed CSS to `main.css`.
  2. Added `?v=` timestamp to JSON `fetch` calls.

---

## Conversation History Reference
- **Conversation ID:** `b8fde2ca-7ac3-4a99-8ce7-dc9a60ce9ebd` (Last Update: 2026-04-06)
- This session finalized the mobile responsiveness, interactive checklist feature, serving logic, and tag overhaul.
