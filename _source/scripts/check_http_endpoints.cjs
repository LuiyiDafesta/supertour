const https = require('https');

function fetchGet(url) {
  return new Promise((resolve) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (c) => data += c);
      res.on('end', () => resolve({
        statusCode: res.statusCode,
        contentType: res.headers['content-type'],
        data
      }));
    }).on('error', (e) => resolve({ error: e.message }));
  });
}

async function check() {
  console.log('=== CHECK SITEMAP.XML ===');
  const sitemap = await fetchGet('https://supertourchannel.com.ar/sitemap.xml');
  console.log('Status:', sitemap.statusCode);
  console.log('Content-Type:', sitemap.contentType);
  console.log('First 200 chars:', sitemap.data.substring(0, 200));

  console.log('\n=== CHECK ROBOTS.TXT ===');
  const robots = await fetchGet('https://supertourchannel.com.ar/robots.txt');
  console.log('Status:', robots.statusCode);
  console.log('Content-Type:', robots.contentType);
  console.log('Content:\n', robots.data);

  console.log('\n=== CHECK _source/package.json GET ===');
  const srcPkg = await fetchGet('https://supertourchannel.com.ar/_source/package.json');
  console.log('Status:', srcPkg.statusCode);
  console.log('Content-Type:', srcPkg.contentType);
  console.log('First 200 chars:', srcPkg.data.substring(0, 200));

  console.log('\n=== CHECK NON-EXISTENT ROUTE ===');
  const notFound = await fetchGet('https://supertourchannel.com.ar/ruta-inexistente-123456');
  console.log('Status:', notFound.statusCode);
  console.log('Content-Type:', notFound.contentType);
  console.log('Is HTML index?', notFound.data.includes('<div id="root">'));
}

check();
