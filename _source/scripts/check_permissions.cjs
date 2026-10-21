const https = require('https');

const SUPABASE_URL = 'https://dbsbfjeqldmtgfqjbptu.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRic2JmamVxbGRtdGdmcWpicHR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwMzM5MTMsImV4cCI6MjA4NzYwOTkxM30.4pX-ZNH298qDel8gd1JW-XrKMRyFcMqvmV2YMDXfOUg';

function fetchUrl(url, options = {}) {
  return new Promise((resolve) => {
    const parsed = new URL(url);
    const req = https.request(parsed, options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data
        });
      });
    });
    req.on('error', (err) => {
      resolve({ error: err.message });
    });
    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

async function run() {
  console.log('=== TEST 1: SUPABASE REST API READ-ONLY (ANON ROLE) ===');
  const tables = ['schools', 'gallery_photos', 'supertour_settings', 'analytics_events', 'surveys', 'admin_users'];

  for (const table of tables) {
    const res = await fetchUrl(`${SUPABASE_URL}/rest/v1/${table}?select=count`, {
      method: 'GET',
      headers: {
        'apikey': ANON_KEY,
        'Authorization': `Bearer ${ANON_KEY}`,
        'Range-Unit': 'items',
        'Prefer': 'count=exact'
      }
    });

    if (res.error) {
      console.log(`Table ${table}: Network Error - ${res.error}`);
    } else {
      let count = 'N/A';
      try {
        const parsed = JSON.parse(res.data);
        if (Array.isArray(parsed) && parsed[0] && parsed[0].count !== undefined) {
          count = parsed[0].count;
        } else if (parsed && parsed.message) {
          count = `Error: ${parsed.message} (${parsed.code || ''})`;
        }
      } catch (e) {
        count = res.data.substring(0, 80);
      }
      console.log(`Table ${table.padEnd(20)} => HTTP ${res.statusCode} | Content-Range: ${res.headers['content-range'] || 'none'} | Info: ${count}`);
    }
  }

  console.log('\n=== TEST 2: ATTEMPT ANONYMOUS WRITE TO SCHOOLS (SHOULD FAIL) ===');
  const writeTest = await fetchUrl(`${SUPABASE_URL}/rest/v1/schools`, {
    method: 'POST',
    headers: {
      'apikey': ANON_KEY,
      'Authorization': `Bearer ${ANON_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify({
      name: 'TEST_AUDIT_SECURITY_PROBE',
      city: 'TestCity',
      travel_date: '2026-10-20'
    })
  });
  console.log(`POST /schools => HTTP ${writeTest.statusCode}: ${writeTest.data}`);

  console.log('\n=== TEST 3: PRODUCTION HTTP ASSET & PATH EXPOSURE ===');
  const prodUrls = [
    'https://supertourchannel.com.ar/',
    'https://supertourchannel.com.ar/robots.txt',
    'https://supertourchannel.com.ar/sitemap.xml',
    'https://supertourchannel.com.ar/_source/package.json',
    'https://supertourchannel.com.ar/_source/supabase/migrations/20260522080000_create_supertour_schema.sql',
    'https://supertourchannel.com.ar/_source/.env',
    'https://supertourchannel.com.ar/.htaccess',
    'https://supertourchannel.com.ar/.git/config',
    'https://supertourchannel.com.ar/delete.php',
    'https://supertourchannel.com.ar/upload.php'
  ];

  for (const u of prodUrls) {
    const res = await fetchUrl(u, { method: 'HEAD' });
    console.log(`HEAD ${u.padEnd(70)} => HTTP ${res.statusCode || 'ERR'}`);
  }
}

run();
