(async () => {
  const fetch = globalThis.fetch;
  const url = 'https://www.tudogostoso.com.br/receita/187825-hamburguer-caseiro.html';
  try {
    const res = await fetch('https://api.allorigins.win/get?url=' + encodeURIComponent(url));
    const data = await res.json();
    const htmlContent = data.contents;
    
    let imageUrl = '';
    const ogMatch = htmlContent.match(/<meta[^>]*property=[\"']og:image[\"'][^>]*content=[\"']([^\"']+)[\"'][^>]*>/i);
    if (ogMatch) imageUrl = ogMatch[1];
    
    console.log('Extracted Image URL:', imageUrl);
  } catch(e) {
    console.error(e);
  }
})();
