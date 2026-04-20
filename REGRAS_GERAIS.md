# 📋 Regras Gerais — Taxonomia de Receitas

Para manter a organização do site e garantir que os filtros funcionem corretamente, todas as receitas devem seguir este padrão de classificação.

---

## 1. Categorias (Campo: `categories`)
As categorias definem em qual página a receita será exibida (ex: pasta `categories/`). Cada receita **deve pertencer a pelo menos uma** categoria.
- **Seleção:** Múltipla.

**Categorias permitidas:**
- `Café da Manhã`
- `Almoço`
- `Lanche`
- `Jantar`
- `Sobremesa`
- `Acompanhamento`

---

## 2. Tags (Campo: `tags`)
As tags descrevem características da receita e têm sua própria pasta `tags/`.
- **Seleção:** Múltipla.
- **Mínimo:** 1 tag por receita (use `Dia a dia` se não houver outra específica).

**Tags permitidas:**
1. `1 panela`
2. `Falta checar`
3. `Dia a dia`
4. `Gostosão`
5. `Fritura`
6. `Proteico`
7. `Pouco calórico`
8. `Saudável`

---

## 3. Dificuldade (Campo: `difficulty`)
Define o nível de complexidade e possui a pasta `difficulties/`.
- **Seleção:** Única (Obrigatório).

**Opções permitidas:**
- `Fácil`
- `Médio`
- `Difícil`

---

## 4. Exemplo de Estrutura JSON
```json
{
  "title": "Exemplo de Receita",
  "categories": ["Almoço", "Jantar"],
  "tags": ["1 panela", "Dia a dia"],
  "difficulty": "Fácil",
  ...
}
```

---

> [!IMPORTANT]
> Tags como "Vegano", "Vegetariano", "Oriental" ou "Premium" **não devem ser usadas**. Se uma receita for vegana por natureza, isso deve ser mencionado na descrição ou ingredientes, mas não como tag.
