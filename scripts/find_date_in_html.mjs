import * as cheerio from 'cheerio';

async function findParent() {
  const url = 'https://www.fmkorea.com/9873715208';
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36',
    'Accept-Language': 'ko-KR,ko;q=0.9',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  };

  try {
    const res = await fetch(url, { headers });
    if (!res.ok) {
      console.log('Status:', res.status);
      return;
    }
    const html = await res.text();
    const $ = cheerio.load(html);

    const el = $('span.date.m_no').first();
    if (el.length > 0) {
      console.log('Found span.date.m_no!');
      console.log('Text:', el.text());
      console.log('Parent tag name:', el.parent()[0].name);
      console.log('Parent class:', el.parent().attr('class'));
      console.log('Parent parent class:', el.parent().parent().attr('class'));
      console.log('Grandparent parent class:', el.parent().parent().parent().attr('class'));
      console.log('HTML of grandparent:', el.parent().parent().html()?.substring(0, 300));
    } else {
      console.log('span.date.m_no NOT found');
    }

  } catch (err) {
    console.error('Error:', err);
  }
}

findParent();
