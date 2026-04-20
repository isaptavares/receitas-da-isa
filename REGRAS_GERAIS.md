# 📋 Regras Gerais — Taxonomia de Receitas

Para manter a organização do site e garantir que os filtros funcionem corretamente, todas as receitas devem seguir este padrão de classificação.

---

## 1. Categorias (Campo: `categories`)
As categorias definem em qual página a receita será exibida (ex: página de Almoço). Cada receita **deve pertencer a pelo menos uma** categoria.

**Categorias permitidas:**
- `Café da Manhã`
- `Almoço`
- `Lanche`
- `Jantar`
- `Sobremesa`
- `Acompanhamento`

---

## 2. Tags (Campo: `tags`)
As tags são usadas para filtrar receitas na página inicial. Elas descrevem características da receita.

**Regras de Tags:**
- **Mínimo:** 1 tag por receita (use `Dia a dia` se não houver outra específica).
- **Exclusividade:** Apenas as 9 tags abaixo são permitidas. Não crie tags novas.

**Tags permitidas:**
1. `Fácil de fazer`
2. `1 panela`
3. `Falta checar`
4. `Dia a dia`
5. `Gostosão`
6. `Fritura`
7. `Proteico`
8. `Pouco calórico`
9. `Saudável`

---

## 3. Exemplo de Estrutura JSON
```json
{
  "title": "Exemplo de Receita",
  "categories": ["Almoço", "Jantar"],
  "tags": ["Fácil de fazer", "Dia a dia"],
  ...
}
```

---

> [!IMPORTANT]
> Tags como "Vegano", "Vegetariano", "Oriental" ou "Premium" **não devem ser usadas**. Se uma receita for vegana por natureza, isso deve ser mencionado na descrição ou ingredientes, mas não como tag.
