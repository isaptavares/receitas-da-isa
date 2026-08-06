(async () => {
  const fetch = globalThis.fetch;
  const url = 'https://www.tudogostoso.com.br/receita/187825-hamburguer-caseiro.html';
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36'
    }
  });
  const html = await res.text();
  
  let jsonLd = '';
  const ldMatches = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi);
  if (ldMatches) {
    jsonLd = ldMatches.map(m => {
      const match = m.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/i);
      return match ? match[1].trim() : '';
    }).join('\n\n');
  }
  
  let pText = '';
  const pMatches = html.match(/<(p|li)[^>]*>([\s\S]*?)<\/\1>/gi);
  if (pMatches) {
    pText = pMatches.map(m => m.replace(/<[^>]+>/g, '')).join(' ').replace(/\s+/g, ' ').substring(0, 3000);
  }

  console.log('JSON-LD:', jsonLd.substring(0, 200));
  console.log('P Text:', pText.substring(0, 200));
})();
