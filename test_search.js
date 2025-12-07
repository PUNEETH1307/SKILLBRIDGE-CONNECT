const http = require('http');

function testSemanticSearch(query) {
  return new Promise((resolve, reject) => {
    http.get(`http://localhost:3000/api/semantic-search?q=${encodeURIComponent(query)}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          console.log(`\n${'='.repeat(60)}`);
          console.log(`Query: "${query}"`);
          console.log(`${'='.repeat(60)}`);
          console.log(`✅ Results Count: ${json.count}`);
          console.log(`Workers returned:\n`);
          if (json.data && json.data.length > 0) {
            json.data.forEach((w, i) => {
              console.log(`  ${i+1}. ${w.name.padEnd(20)} (${w.occupation.padEnd(15)})`)
              console.log(`     Rating: ${w.rating} | Reviews: ${w.reviews_count} | Score: ${w._score}`);
            });
          } else {
            console.log('  No workers found');
          }
          resolve(json);
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

// Run test
(async () => {
  try {
    await testSemanticSearch('top rated worker');
    await testSemanticSearch('plumber');
    await testSemanticSearch('carpenter');
  } catch (e) {
    console.error('Error:', e.message);
  }
})();
