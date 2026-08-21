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

---

## 5. Padronização de Nomes de Ingredientes (Normalização)

Para manter os filtros da geladeira e busca limpos e sem duplicidades:

1. **Remoção de Estados & Modos de Preparo:**
   - Adjetivos como `derretido`, `congelado`, `grelhado`, `amassado`, `fresco`, `picado`, `ralado`, `moído`, `fatiado`, `desfiado`, `cozido`, `em cubos`, `em conserva`, `em lascas` **devem ser removidos do nome do ingrediente base** (ex: *Manteiga derretida* ➔ *Manteiga*; *Chocolate meio amargo derretido* ➔ *Chocolate meio amargo*).

2. **Remoção de Cortes & Prefixos de Corte:**
   - Prefixos de preparo como `escalope de`, `filé de`, `dentes de`, `postas de`, `pedaços de` **devem ser omitidos** (ex: *escalope de lombo de porco* ➔ *Lombo de porco*).

3. **Formatos & Concentrações:**
   - Percentuais como `100%`, `70%` são omitidos (ex: *cacau em pó 100%* ➔ *Cacau em pó*).

4. **Mapas de Canonização:**
   - **Azeite:** *Azeite de oliva*, *Azeite extra virgem* ➔ `Azeite`.
   - **Banana:** *Banana congelada*, *Banana prata amassada* ➔ `Banana`.
   - **Camarão:** *Camarão médio*, *Camarões grandes* ➔ `Camarão`.
   - **Cebola:** *Cebola pérola*, *Cebolas* ➔ `Cebola` (Manter `Cebola roxa` separada).
   - **Cebolinha:** *Cebolinha verde* ➔ `Cebolinha`.
   - **Limão:** *Limão tahiti*, *Limões* ➔ `Limão`.
   - **Ovo:** *Ovos inteiros*, *Ovo grande*, *Gemas de ovo* ➔ `Ovo`.
   - **Pepino:** *Pepino em conserva* ➔ `Pepino`.
   - **Pimenta:** *Pimenta do reino moída na hora*, *Pimenta-do-reino* ➔ `Pimenta-do-reino`.
   - **Queijo Parmesão:** *Parmesão ralado*, *Queijo parmesão ou em lascas* ➔ `Queijo Parmesão`.

5. **Exclusões de Combos Duplos:**
   - Combos genéricos como `"Sal e pimenta"`, `"Sal e pimenta-do-reino"` **não devem ser cadastrados como 1 único ingrediente**; devem ser separados em ingredientes individuais ou omitidos da lista global.
