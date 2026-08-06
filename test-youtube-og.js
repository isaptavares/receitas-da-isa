(async () => {
  const fetch = globalThis.fetch;
  const res = await fetch('https://www.youtube.com/shorts/BKbrpnj-c0k', {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36' }
  });
  const html = await res.text();
  const match = html.match(/<meta[^>]*property="og:image"[^>]*content="([^"]+)"/i) || html.match(/<meta[^>]*content="([^"]+)"[^>]*property="og:image"/i);
  if (match) {
    console.log('Found og:image:', match[1]);
  } else {
    console.log('No og:image found');
  }
})();
