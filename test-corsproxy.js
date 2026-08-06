(async () => {
  const fetch = globalThis.fetch;
  const url = 'https://www.tudogostoso.com.br/receita/187825-hamburguer-caseiro.html';
  const res = await fetch('https://corsproxy.io/?' + encodeURIComponent(url));
  const htmlContent = await res.text();
  console.log('Includes og:image?', htmlContent.includes('og:image'));
  console.log('First 500 chars:', htmlContent.substring(0, 500));
})();
