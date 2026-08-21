# Handoff: Receitas da Isa — redesign completo

## Overview
Redesign visual e estrutural do site **Receitas da Isa** (https://isaptavares.github.io/receitas-da-isa/), um app pessoal de receitas em português: catálogo de receitas, páginas por categoria, ficha de receita, três fluxos de criação (manual, por link, por importação de foto/PDF) e planejador semanal com lista de compras.

O redesign mantém toda a informação e funcionalidade do site original e troca a linguagem visual: fundo branco, tipografia sem serifa, cores saturadas e amarelo #ffbf00 como cor de acento dos ícones.

## About the Design Files
Os arquivos `.dc.html` deste pacote são **referências de design feitas em HTML** — protótipos que mostram aparência e comportamento pretendidos, **não** código de produção para copiar.

A tarefa é **recriar esses designs no ambiente do site real** (o site atual é HTML estático + JS no GitHub Pages, com Firebase para dados e Gemini para as importações por IA), usando os padrões já existentes daquele projeto. Cada arquivo abre direto no navegador para consulta visual; `support.js` é apenas o runtime que renderiza os protótipos e **não deve ser portado**.

## Fidelity
**Alta fidelidade (hifi).** Cores, tipografia, espaçamentos, raios, sombras e estados de hover são finais e devem ser reproduzidos com precisão. As fotos são placeholders listrados marcados (`foto do prato`, `foto da receita — 1:1`, `destaque`) — devem ser substituídas pelas imagens reais das receitas.

---

## Design Tokens

### Cores
| Papel | Hex |
| --- | --- |
| Fundo | `#ffffff` |
| Texto principal | `#14110d` |
| Texto corpo / secundário | `#6b6459` |
| Texto terciário / legendas | `#a39a8c` |
| Amarelo de marca (ícones, CTA primário) | `#ffbf00` |
| Amarelo escuro (texto sobre claro, hover) | `#d99f00` |
| Amarelo texto sobre `#fff6d9` | `#8a6a00` |
| Amarelo claro (fundo de selo/ícone) | `#fff6d9` |
| Roxo (destaques de título, hover destrutivo) | `#7b4bd1` |
| Vermelho (exclusivo do coração de favoritar) | `#e14b3f` |
| Verde-azulado (acento) | `#2f8f7d` / texto `#1f6b5c` / fundo `#e6f2ef` |
| Azul-violeta (acento) | `#6b7ef0` / texto `#3a4bc0` / fundo `#eaeefe` |
| Bege de superfície | `#f7f4ee` |
| Linha / borda | `#f0ebe3` |
| Borda de campo | `#ece5d9` |
| Borda de botão secundário | `#e5ded2` |
| Placeholder listrado | `repeating-linear-gradient(135deg,#f4efe6 0 12px,#efe8dc 12px 24px)` |

Marcas de terceiros (chips de exemplo na importação por link): YouTube `#ff0033`, Instagram `#c13584`, TikTok `#14110d`, Panelinha `#e42313`, TudoGostoso `#ff6a28` (logo em `assets/tudogostoso.png`).

### Tipografia
- Família: **Plus Jakarta Sans** (400/500/600/700/800 + itálico 600/700), Google Fonts.
- Monoespaçada de apoio: **JetBrains Mono** (400/500) — legendas técnicas, quantidades, datas curtas.
- Escala: h1 hero 74px/0.98 · h1 de página 60–64px/1 · h2 seção 44px · h2 card 22–32px · título de card 17–18px · corpo 16–18px/1.55–1.6 · rótulo 13px 800 uppercase `letter-spacing:0.08em` · selo 11–12px 800 uppercase `0.1–0.14em`.
- `letter-spacing` negativo nos títulos: −0.02em a −0.035em. Ênfase em títulos = `<em>` com peso 700 e cor de acento (roxo, verde ou azul-violeta, conforme a página).

### Espaçamento e forma
- Container: `max-width` 1440px (home, categoria, planejador), 1280px (receita), 1040px (formulários), 900px (importar); padding lateral 48px.
- Raios: 999px (pílulas), 28px (imagem principal/modal), 26px (cards de formulário), 24px (cards flutuantes), 22px (card de receita), 20px/18px/14px/12px (elementos menores).
- Bordas vazadas: **2px** (era 1,5px); tracejadas 2–2,5px; ícones SVG com `stroke-width:2.8`, `stroke-linecap/linejoin: round`, viewBox 18×18 (24×24 no globo).
- Sombras: card flutuante `0 22px 54px rgba(20,17,13,0.18)`; imagem principal `0 28px 64px rgba(20,17,13,0.16)`; botão de ação em card `0 4px 12px rgba(20,17,13,0.12)`; modal `0 40px 100px rgba(20,17,13,0.35)`.
- Layout sempre em flex/grid com `gap`. Colunas usam `minmax(0,1fr)` para não estourar; navegação do cabeçalho não encolhe, a busca sim (`flex:0 1 260px; overflow:hidden`).

---

## Componentes recorrentes

### Cabeçalho (todas as páginas)
Sticky, `rgba(255,255,255,0.92)` + `backdrop-filter: blur(12px)`, borda inferior `#f0ebe3`, padding 20px 48px.
Logo: quadrado 40px raio 13px em `#ffbf00` com círculo preto de 14px; wordmark "Receitas da Isa" 19px/800 e sublinha "SABORES DO MUNDO" 11px/800 uppercase `#a39a8c`.
Nav: Início · Favoritas · Planejador · Recebidas (com badge numérico). Item ativo: peso 700 + borda inferior 2px `#ffbf00`.
Direita: campo de busca pílula em `#f7f4ee` e botão "Entrar" preto `#14110d`, texto branco, raio 999px.
Nas três páginas de criação, a nav é substituída por abas: Manualmente / Por link / Importar — ativa com fundo `#fff6d9` e texto `#8a6a00`.

### Card de receita
Imagem 4:3 raio 22px (placeholder listrado). Sobreposto:
- Canto superior direito: **cinco botões redondos brancos de 32px** na ordem **favoritar, editar, apagar, adicionar ao planejador, compartilhar** (gap 6px, sombra leve). Ícones SVG de traço, 17px. O coração de favoritar é **sempre `#e14b3f`**; os demais são `#14110d` com hover colorido (editar → `#d99f00`, apagar → `#e14b3f`, planejador → `#2f8f7d`, compartilhar → `#6b7ef0`).
- Canto inferior esquerdo: chip branco com a culinária, 11px/800 uppercase.
Abaixo: nome 18px/800; linha de metadados 13px/600 `#a39a8c` com pontos coloridos — tempo (ponto `#ffbf00`), dificuldade (ponto `#2f8f7d`) e calorias.

### Composição em camadas (hero da home, hero da receita, hero da categoria)
Formas geométricas grandes em baixa opacidade atrás da imagem (círculo `#6b7ef0` 0.15, quarto de círculo `#7b4bd1` 0.16, gota `#ffbf00` 0.28), imagem com sombra profunda e **um card branco flutuante sobreposto** (nutrição na home e na receita; "mais visitada da semana" na categoria). É a assinatura visual do redesign — reproduzir com z-index explícito para o card ficar acima das formas.

### Card de nutrição
Donut de 92–96px feito com `conic-gradient(#ffbf00 0 42%, #2f8f7d 42% 74%, #6b7ef0 74% 100%)` e miolo branco de 70–72px com kcal; ao lado, três linhas com bolinha da cor correspondente: Proteína, Carbo, Gordura.

---

## Telas

### 1. Home — `Receitas da Isa.dc.html`
- **Hero (2 colunas):** selo pílula `#fff6d9` "VOCÊ É O QUE VOCÊ COME"; h1 74px "Então, que comamos bem" em roxo itálico; botões "Explorar receitas" (amarelo) e "Minhas favoritas" (contornado, coração vermelho); três estatísticas (248 Receitas · 19 Culinárias em verde · 36 Favoritas em roxo) acima de uma linha divisória. À direita, a composição em camadas com o card de nutrição.
- **Linha de criação:** três cartões brancos sobre bloco `#f7f4ee` — Adicionar manualmente / Por link / Importar (linkam para as três páginas).
- **Categorias:** grade de 6 cartões contornados com ícone circular amarelo, nome e contagem.
- **Receitas:** cabeçalho de seção + barra de filtros em `#f7f4ee` (busca, Culinária, Dificuldade, Calorias, Tags, **campo "Ingredientes da geladeira"**, Limpar filtros) e grade de 4 colunas de cards.
- **Modal de ingredientes:** abre pelo campo "Ingredientes da geladeira". Overlay `rgba(20,17,13,0.55)`, card 620px raio 28px. Cabeçalho: ✕ / "Filtrar por ingredientes" / "Limpar". Busca. Bloco "Selecionados" (miniaturas 58px com borda amarela e badge ✕ preto) e "Populares" (miniaturas cinzas; selecionadas ficam amarelas com badge ✓). Rodapé: contagem à esquerda e **Confirmar** (amarelo) que fecha o modal e escreve a seleção no campo ("Azeite, Alho" com até 2, senão "N ingredientes").
- **Tweaks disponíveis:** `showAddRow`, `showFilters`, `recipeCount` (4–8).

### 2. Categoria — `Categoria - Cafe da Manha.dc.html`
Serve todas as categorias (prop `categoryName`). Breadcrumb; selo com contagem; h1 64px; descrição; "Organizar por" com Padrão / Mais recentes / Menor tempo / Menos calorias; à direita a composição em camadas com o card "MAIS VISITADA DA SEMANA". Grade de 4 colunas e botão "Carregar mais". **Não há chips de outras categorias** — a página é de uma categoria só.

### 3. Receita — `Receita.dc.html`
Breadcrumb; chips de culinária/tags; h1 58px; parágrafo de descrição; grade de 4 metadados (Tempo, Dificuldade, Rendimento, Calorias) com separadores de 1px; barra de ações na ordem **Favoritar (amarelo, coração vermelho), Editar, Apagar, Adicionar ao planejador, Compartilhar**. À direita, **uma única imagem** 1:1 com formas atrás e o card de nutrição flutuando sobreposto.
Abaixo, duas colunas: **Ingredientes** em card `#f7f4ee` com stepper de porções (−/+, 1 a 12) que **recalcula as quantidades em tempo real** (vírgula decimal, formato pt-BR); e **Modo de preparo** com etapas numeradas em quadrados `#fff6d9` e subetapas 1.1/1.2 indentadas com filete lateral, encerrando no bloco preto "DICA DA ISA".

### 4. Nova receita — Manual — `Nova Receita - Manual.dc.html`
Selo "PRA NUNCA MAIS ESQUECER"; h1 "Nova receita manualmente".
**Passo 1 — obrigatórios:** nome; lista dinâmica de ingredientes (quantidade + ingrediente + remover; "+ Adicionar ingrediente" tracejado, contador "N adicionados"); modo de preparo em editor com numeração de linhas, nota "cada linha = 1 etapa · Tab indenta em 1.1, 1.2…" e barra inferior com "Organizar com IA".
**Passo 2 — opcionais (autopreenchíveis por IA):** culinária, dificuldade, tempo, rendimento, calorias; chips de categorias e de tags; imagem de capa com upload de arquivo **e alternativa "OU POR URL"** (campo + botão "Usar URL") ao lado da prévia.
Rodapé: aviso + Cancelar e "Salvar receita" (amarelo).

### 5. Nova receita — Por link — `Nova Receita - Link.dc.html`
Selo "CHEGA DE SALVAR E NÃO FAZER"; h1 "Nova receita por link". Dois cards de altura igual (flex column; o campo de URL é empurrado para a base com `margin-top:auto`, então **os botões ficam alinhados**):
- **Vídeo** — ícone de play amarelo, chips YouTube / Instagram / TikTok com seus marcadores, campo de URL, botão amarelo "Importar vídeo".
- **Site de receitas** — **ícone de globo** azul-violeta, chips de exemplo Panelinha (texto vermelho `#e42313`), TudoGostoso (logo em PNG) e "etc." (amarelo `#ffbf00`), todos com a mesma moldura; campo de URL; botão **roxo** "Importar do site".
Sem painel de logs. Rodapé só com Cancelar.

### 6. Nova receita — Importar — `Nova Receita - Importar.dc.html`
Selo "PRA JAMAIS PERDER AQUELA RECEITA DE FAMÍLIA"; h1 "Nova receita por importação"; área de drag-and-drop tracejada com botão "Escolher arquivo" e formatos aceitos (JPG, PNG, WEBP, PDF até 10 MB); linha do arquivo selecionado (nome, tamanho, barra de progresso amarela, remover); três cartões explicando o processo (Leitura do arquivo → Estimativas → Sua revisão); Cancelar e **"Importar"**.

### 7. Planejador — `Planejador.dc.html`
Selo "MENU DA SEMANA"; h1 "Meu planejador" (verde); descrição; **navegação de semana logo abaixo** (setas grossas ← 10 – 16 ago →) — não há botão "Nova semana": avançar a seta abre a semana seguinte.
Grade `minmax(0,1fr) minmax(280px,400px)`:
- **Sete cards de dia** com cabeçalho `#f7f4ee` (nome, data monoespaçada, selo "HOJE" amarelo) e dois slots (Almoço/Jantar, `repeat(auto-fit,minmax(260px,1fr))`): preenchido mostra miniatura 64px + rótulo + título; vazio mostra "Adicionar almoço/jantar". Botão "+" à direita.
- **Lista de compras** sticky (`top:104px`): topo com **fundo amarelo `#ffbf00`**, título, progresso ("4 de 22 comprados") e botões brancos Copiar texto / Salvar PDF; corpo rolável com grupos (Legumes, Frutas, Proteínas) mostrando contagem e itens com caixa de seleção (marcado = quadrado verde com ✓), nome, receita de origem e quantidade em pílula.

---

## Interações & estados
- **Modal de ingredientes:** abre a partir do campo do filtro copiando a seleção já aplicada; alternar miniatura entra/sai da seleção; Limpar esvazia o rascunho; Confirmar grava e fecha; ✕ descarta.
- **Stepper de porções (receita):** limites 1–12; recalcula todas as quantidades e o rótulo de rendimento.
- **Lista de ingredientes (manual):** adicionar/remover linhas, 1 a 20.
- **Hovers:** links → `#d99f00`; botões contornados → borda `#ffbf00`; ações destrutivas → `#e14b3f` / `#7b4bd1`; ícones de card conforme a tabela do componente.
- **Foco em campos:** borda passa para `#ffbf00` (ou `#6b7ef0` no campo de URL de site).
- Placeholders em `#6b6459` com `opacity:1` (contraste elevado a pedido).

## Assets
- `assets/tudogostoso.png` — logo oficial do TudoGostoso, fornecido pela usuária, já recortado nas bordas brancas (236×50).
- Logo do Panelinha: **não incluído** — o SVG do site deles bloqueia uso externo. Está representado como texto no vermelho da marca; substituir pelo arquivo oficial quando disponível.
- Todas as fotos de pratos são placeholders listrados e precisam ser trocadas pelas imagens reais.
- Fontes: Google Fonts (Plus Jakarta Sans, JetBrains Mono).

## Files
| Arquivo | Tela |
| --- | --- |
| `Receitas da Isa.dc.html` | Home |
| `Categoria - Cafe da Manha.dc.html` | Página de categoria (todas) |
| `Receita.dc.html` | Ficha de receita |
| `Nova Receita - Manual.dc.html` | Criação manual |
| `Nova Receita - Link.dc.html` | Criação por link |
| `Nova Receita - Importar.dc.html` | Criação por foto/PDF |
| `Planejador.dc.html` | Planejador semanal + lista de compras |
| `support.js` | Runtime dos protótipos — **não portar** |
