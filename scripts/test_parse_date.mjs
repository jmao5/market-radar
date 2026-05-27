import * as cheerio from 'cheerio';

async function testParseDate() {
  const url = 'https://www.fmkorea.com/9873715208';
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36',
    'Accept-Language': 'ko-KR,ko;q=0.9',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  };

  try {
    const res = await fetch(url, { headers });
    if (!res.ok) {
      console.log('Fetch failed with status:', res.status);
      return;
    }
    const html = await res.text();
    const $ = cheerio.load(html);

    console.log('Selectors:');
    for (const sel of ['article .document_info .date', 'article header .date', 'time[datetime]', '.bd_wrp .date']) {
      const el = $(sel).first();
      console.log(`- Selector "${sel}":`);
      console.log(`  exists: ${el.length > 0}`);
      if (el.length > 0) {
        console.log(`  text: "${el.text().trim()}"`);
        console.log(`  datetime attr: "${el.attr('datetime')}"`);
        console.log(`  html: "${el.parent().html()?.substring(0, 150)}"`);
      }
    }
  } catch (err) {
    console.error('Error:', err);
  }
}

testParseDate();
