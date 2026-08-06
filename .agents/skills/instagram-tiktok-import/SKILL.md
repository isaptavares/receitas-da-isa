---
name: instagram-tiktok-import
description: Conhecimento sobre como importar receitas de vídeos do Instagram e TikTok no site Receitas da Isa, incluindo pesquisa sobre o ClipRecipe e as limitações do GitHub Pages.
---

# Importar Receitas de Instagram e TikTok

## Contexto do Projeto

O site "Receitas da Isa" é um site **estático hospedado no GitHub Pages** e usa o **Gemini AI** para extrair receitas de vídeos. A funcionalidade de importar receitas do YouTube já funciona nativamente usando a API do Gemini Video. O desafio é fazer o mesmo para Instagram e TikTok.

## Arquitetura Atual (`add-recipe-link.html`)

O arquivo principal que controla a importação é:
`add-recipe-link.html` (raiz do projeto)

Ele já tem:
- Um campo único de URL que detecta o domínio e executa lógica diferente
- Se for YouTube → processo nativo do Gemini (funciona ✅)
- Se for Instagram/TikTok → pipeline de extração em múltiplos níveis (falha ❌)
- Um console de logs de diagnóstico na UI (para depuração)

A API key do Gemini está em `js/api-key.js`.

## Pesquisa sobre o ClipRecipe

### O que o ClipRecipe faz
- Site: https://www.cliprecipe.com
- É um app **Next.js hospedado na Vercel**
- Quando você cola um link do Instagram/TikTok, o **servidor deles** (não o browser do usuário) faz o download do vídeo e envia para o **Gemini Video API**
- O browser nunca toca diretamente nas APIs do Instagram — é tudo server-side

### Teste realizado (2026-08-05)
Testamos com o link: `https://www.instagram.com/reel/DaJME-zpm7B/`
O ClipRecipe extraiu com sucesso a receita **"Franuí na Travessa"** com:
- ✅ 8 ingredientes (leite condensado, creme de leite, chocolate branco, manteiga, framboesa congelada, açúcar, chocolate meio amargo, franuí)
- ✅ 6 passos de modo de preparo
- ✅ Lista de equipamentos
- ✅ Imagem de capa do Instagram

## Por que Nosso Site Falha

O site roda **100% no browser** (GitHub Pages estático). Qualquer tentativa de chamar Instagram/TikTok direto do browser é bloqueada por **CORS** e **proteções anti-bot** do Instagram. Não há como contornar isso sem um servidor backend.

## Erros Observados nos Logs de Diagnóstico

```
Failed to fetch  ← Todos os proxies CORS falham
```

Proxies testados que falharam:
- `allorigins.win`
- `api.cobalt.tools`
- `co.wuk.sh`
- `cobalt.stream`

## Soluções Planejadas

### ✅ Opção A — API de terceiros (ex: RapidAPI, Apify)
- Usar um scraper de Instagram via RapidAPI para obter a transcrição/legenda
- Passar para o Gemini estruturar como receita
- Prós: funciona sem backend
- Contras: depende de terceiros, pode ter limites/custo

### ✅ Opção B — Extrair apenas a Legenda/Caption (Mais simples)
- Usar proxy CORS para ler a página pública do Instagram
- Extrair o `og:description` (que é a legenda do post)
- Muitas contas de culinária escrevem os ingredientes e preparo na legenda
- Mandar legenda para o Gemini estruturar como receita
- Prós: 100% gratuito, sem backend
- Contras: não funciona se a legenda não tiver a receita

### ✅ Opção C — Backend no Vercel (Completa, igual ao ClipRecipe)
- Criar Vercel Functions (Node.js gratuito)
- Receber o link de vídeo
- Fazer download com `yt-dlp` server-side
- Enviar para Gemini Video API
- Retornar a receita estruturada
- Prós: solução profissional, funciona para qualquer vídeo
- Contras: requer deploy separado e configuração

## Estado Atual

A tarefa de implementar Instagram/TikTok foi **pausada** pelo usuário para ser retomada depois. Os logs de diagnóstico ainda estão ativos no `add-recipe-link.html`.

## Próximos Passos (quando retomar)

1. Decidir entre Opção B (simples) ou Opção C (completa)
2. Se Opção B: implementar extração de `og:description` via proxy
3. Se Opção C: configurar Vercel Functions e fazer deploy
4. Remover os logs de diagnóstico da UI após confirmação
5. Fazer commit e push das alterações
