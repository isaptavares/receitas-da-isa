# 🍴 Receitas da Isa — Project Context

> **For the AI assistant:** Read this file at the start of every conversation about this project. It contains everything you need to know to continue working on this website without losing context.

---

## Project Overview

**Name:** Receitas da Isa  
**Language:** Portuguese (pt-BR)  
**Description:** A personal recipe website belonging to "Isa". It showcases recipes from cuisines around the world with a dark luxury aesthetic and warm gold accents.  
**Local URL:** http://localhost:8080 (run `python -m http.server 8080` from this folder)  
**Root folder:** `c:\Users\user\teste\`

---

## Tech Stack

- Pure **HTML + CSS + Vanilla JavaScript** — no frameworks, no build step
- Google Fonts: **Playfair Display** (headings) + **Inter** (body)
- Data stored as **JSON files** (one per recipe + one master index)
- Favorites saved in **localStorage** (key: `receitas_isa_favorites`)
- No backend — fully static site

---

## Design System (`css/styles.css`)

### Color Palette (CSS variables)
| Variable | Value | Use |
|---|---|---|
| `--clr-bg` | `#0f0d0a` | Page background |
| `--clr-surface` | `#1a1612` | Cards, panels |
| `--clr-surface-2` | `#231e18` | Inputs, nested panels |
| `--clr-gold` | `#e8a838` | Primary accent |
| `--clr-gold-light` | `#f5c76a` | Highlights |
| `--clr-gold-dark` | `#c88a22` | Gradient end |
| `--clr-terracotta` | `#c0614a` | Danger / Hard difficulty |
| `--clr-sage` | `#7a9e7e` | Easy difficulty |
| `--clr-amber` | `#d97706` | Medium difficulty |
| `--clr-cream` | `#f5ead8` | Light text |
| `--clr-text-muted` | `#a09070` | Secondary text |

### Key Design Decisions
- Dark mode only (intentional)
- `--gradient-gold`: `linear-gradient(135deg, #e8a838, #f5c76a, #c88a22)`
- Cards hover: `translateY(-6px)` + gold border glow
- Navbar becomes frosted glass (`backdrop-filter: blur`) on scroll
- First recipe card in a grid with 3+ results renders as a **featured** (2-column wide) card

---

## File Structure

```
c:\Users\user\teste\
├── index.html              ← Home page
├── favorites.html          ← Favorites page
├── recipe.html             ← Recipe detail (receives ?id=<recipe-id>)
├── CONTEXT.md              ← This file
├── css/
│   └── styles.css          ← Full design system + all component styles
├── js/
│   └── recipes.js          ← Core logic: data loading, filtering, card rendering, favorites, toasts
├── images/
│   ├── hero_bg.png         ← Home page hero background
│   ├── carbonara.png
│   ├── sushi.png
│   ├── tacos.png
│   ├── coq_au_vin.png
│   └── padthai.png
└── data/
    ├── index.json          ← Master recipe index (ALL recipes listed here)
    └── recipes/
        ├── carbonara.json
        ├── sushi.json
        ├── tacos.json
        ├── coq_au_vin.json
        └── padthai.json
```

---

## Data Architecture

### `data/index.json` — Master Index
Controls what appears on the site. Must be updated every time a recipe is added/removed.

```json
{
  "siteName": "Receitas da Isa",
  "totalRecipes": 5,
  "cuisines": ["Italiana", "Japonesa", ...],
  "allTags": ["massa", "cremoso", ...],
  "recipes": [
    {
      "id": "carbonara",
      "title": "Pasta Carbonara",
      "subtitle": "...",
      "cuisine": "Italiana",
      "image": "images/carbonara.png",
      "calories": 620,
      "servings": 2,
      "totalTime": 30,
      "difficulty": "Médio",
      "favorite": true,
      "tags": ["massa", "cremoso", "clássico", "jantar", "rápido"],
      "file": "data/recipes/carbonara.json"
    }
  ]
}
```

### `data/recipes/<id>.json` — Individual Recipe
Full recipe with all fields:

```json
{
  "id": "carbonara",
  "title": "Pasta Carbonara",
  "subtitle": "A clássica receita italiana...",
  "cuisine": "Italiana",
  "image": "images/carbonara.png",
  "calories": 620,
  "servings": 2,
  "prepTime": 10,
  "cookTime": 20,
  "totalTime": 30,
  "difficulty": "Fácil | Médio | Difícil",
  "favorite": true,
  "tags": ["tag1", "tag2"],
  "ingredients": [
    { "item": "Espaguete", "amount": "200g" }
  ],
  "steps": ["Passo 1...", "Passo 2..."],
  "tips": ["Dica 1..."],
  "nutrition": {
    "calories": 620,
    "protein": "28g",
    "carbs": "72g",
    "fat": "24g",
    "fiber": "3g"
  },
  "createdAt": "2026-04-01"
}
```

---

## `js/recipes.js` — Key Functions

| Function | Purpose |
|---|---|
| `loadIndex()` | `fetch('data/index.json')` → returns full index |
| `loadRecipe(id)` | `fetch('data/recipes/${id}.json')` → full recipe |
| `filterRecipes(recipes, filters)` | Filters array by `{ cuisine, difficulty, search, maxCalories, tags }` |
| `renderRecipeCard(recipe, opts)` | Returns HTML string for a card. `opts.featured` = 2-col layout |
| `handleFavToggle(id)` | Toggles localStorage + updates all heart buttons on page |
| `toggleFavorite(id)` | Adds/removes from `receitas_isa_favorites` array in localStorage |
| `isFavorite(id)` | Returns `true/false` |
| `getCuisineMeta(cuisine)` | Returns `{ flag: '🇮🇹', emoji: '🍝' }` |
| `initNavbar()` | Sets scrolled glass effect + active link highlight |
| `showToast(msg)` | Shows a bottom-right toast notification for ~2.8 seconds |

---

## Current Recipes (5 total)

| ID | Title | Cuisine | Calories | Difficulty | Favorite |
|---|---|---|---|---|---|
| `carbonara` | Pasta Carbonara | Italiana | 620 | Médio | ✅ |
| `sushi` | Dragon Roll de Salmão | Japonesa | 320 | Difícil | ❌ |
| `tacos` | Tacos Al Pastor | Mexicana | 480 | Fácil | ✅ |
| `coq_au_vin` | Coq au Vin | Francesa | 540 | Médio | ✅ |
| `padthai` | Pad Thai de Camarão | Tailandesa | 520 | Médio | ❌ |

---

## Supported Cuisines (with auto-resolved flags)

| Name | Flag | Emoji |
|---|---|---|
| Italiana | 🇮🇹 | 🍝 |
| Japonesa | 🇯🇵 | 🍣 |
| Mexicana | 🇲🇽 | 🌮 |
| Francesa | 🇫🇷 | 🍷 |
| Tailandesa | 🇹🇭 | 🍜 |
| Brasileira | 🇧🇷 | 🍖 |
| Americana | 🇺🇸 | 🍔 |
| Indiana | 🇮🇳 | 🍛 |
| Espanhola | 🇪🇸 | 🥘 |
| Grega | 🇬🇷 | 🫒 |

> To add a new cuisine, also add it to `CUISINE_META` in `js/recipes.js`.

---

## How to Add a New Recipe (Step by Step)

1. **Get/generate an image** → save to `images/<id>.png`
2. **Create** `data/recipes/<id>.json` with all fields (see schema above)
3. **Update** `data/index.json`:
   - Increment `totalRecipes`
   - Add cuisine to `cuisines` array (if new)
   - Add new tags to `allTags` array (if new)
   - Add summary entry to `recipes` array
4. Done! No code changes needed.

---

## Known Behaviors & Notes

- **Favorites persist** across sessions via localStorage — they are NOT stored in JSON files
- The `favorite: true` field in JSON is just a default/suggestion, actual state lives in localStorage
- The `recipe.html` page reads `?id=` from the URL query string
- Cards with `featured: true` option span 2 columns — only used for the first card when grid has 3+
- The hero background uses a subtle parallax scale effect on hover
- Navbar becomes glass (`backdrop-filter: blur(20px)`) after scrolling 20px
- The calorie slider goes from 100 to 1200; at max (1200) it shows "Todas" (no filter applied)
- All filter state is in-memory only; refreshing resets filters (by design)

---

## What Isa Plans to Add Later

- More recipes (she will provide them; create 1 JSON per recipe)
- Custom tags (she will define them)
- Possible new cuisine types

---

## Conversation History Reference
- **Conversation ID:** `70f2794e-9956-4375-9160-52a08db981f6`
- **Date started:** 2026-04-02
- This conversation built the entire site from scratch.
