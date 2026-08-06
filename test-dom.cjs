const jsdom = require('jsdom');
const { JSDOM } = jsdom;
(async () => {
  const fetch = globalThis.fetch;
  const url = 'https://www.tudogostoso.com.br/receita/187825-hamburguer-caseiro.html';
  const res = await fetch('https://api.codetabs.com/v1/proxy?quest=' + encodeURIComponent(url));
  const htmlContent = await res.text();
  const dom = new JSDOM(htmlContent);
  const doc = dom.window.document;
  
  let imageUrl = '';
  const ogImage = doc.querySelector('meta[property="og:image"]');
  if (ogImage) imageUrl = ogImage.getAttribute('content');
  console.log('Image:', imageUrl);
})();
