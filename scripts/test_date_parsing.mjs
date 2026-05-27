// Pure JS test of the date parsing logic to avoid TS import issues

function parsePostedAt(timeStr) {
  const t = timeStr.trim()
  if (!t) return null

  // 1. Full absolute datetime: YYYY.MM.DD HH:mm or YYYY-MM-DD HH:mm
  const fullDateTimeMatch = t.match(/^(\d{4})[.\-](\d{2})[.\-](\d{2})\s+(\d{2}):(\d{2})$/)
  if (fullDateTimeMatch) {
    const [, y, mo, d, h, mi] = fullDateTimeMatch
    const kst = new Date(`${y}-${mo}-${d}T${h}:${mi}:00+09:00`)
    return isNaN(kst.getTime()) ? null : kst.toISOString()
  }

  // 2. Relative times like "5분 전" / "3시간 전" / "1일 전" (used on detail pages)
  const minMatch = t.match(/(\d+)\s*분\s*전/)
  if (minMatch) return new Date(Date.now() - parseInt(minMatch[1], 10) * 60_000).toISOString()
  const hrMatch = t.match(/(\d+)\s*시간\s*전/)
  if (hrMatch) return new Date(Date.now() - parseInt(hrMatch[1], 10) * 3_600_000).toISOString()
  const dayMatch = t.match(/(\d+)\s*일\s*전/)
  if (dayMatch) return new Date(Date.now() - parseInt(dayMatch[1], 10) * 86_400_000).toISOString()

  // 3. Time only: HH:mm (e.g., "11:01" or "23:05")
  if (/^\d{1,2}:\d{2}$/.test(t)) {
    const [h, m] = t.split(':').map(Number)
    const now = new Date()
    // Current date in KST
    const kstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000)
    const y = kstNow.getUTCFullYear()
    const mo = String(kstNow.getUTCMonth() + 1).padStart(2, '0')
    const d = String(kstNow.getUTCDate()).padStart(2, '0')
    
    let kst = new Date(`${y}-${mo}-${d}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00+09:00`)
    
    // If the parsed time is in the future by more than 15 minutes compared to now, it is from yesterday.
    // (This happens on search pages where yesterday's posts within 24h are shown as HH:mm)
    if (kst.getTime() - now.getTime() > 15 * 60 * 1000) {
      kst = new Date(kst.getTime() - 24 * 60 * 60 * 1000)
    }
    return isNaN(kst.getTime()) ? null : kst.toISOString()
  }

  // 4. Date only: YYYY.MM.DD
  if (/^\d{4}\.\d{2}\.\d{2}$/.test(t)) {
    const [yyyy, mm, dd] = t.split('.').map(Number)
    return new Date(`${yyyy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}T00:00:00+09:00`).toISOString()
  }

  // 5. Date only: YY.MM.DD
  if (/^\d{2}\.\d{2}\.\d{2}$/.test(t)) {
    const [yy, mm, dd] = t.split('.').map(Number)
    return new Date(`${2000 + yy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}T00:00:00+09:00`).toISOString()
  }

  // 6. Date only: MM.DD or MM/DD
  const mmDdMatch = t.match(/^(\d{1,2})[.\/](\d{1,2})$/)
  if (mmDdMatch) {
    const [, mm, dd] = mmDdMatch
    const kstNow = new Date(Date.now() + 9 * 60 * 60 * 1000)
    const yyyyy = kstNow.getUTCFullYear()
    return new Date(`${yyyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}T00:00:00+09:00`).toISOString()
  }

  return null
}

const now = new Date();
console.log(`Current server time (UTC): ${now.toISOString()}`);
console.log(`Current KST time: ${new Date(now.getTime() + 9 * 60 * 60 * 1000).toISOString().replace('Z', '+09:00')}`);

const testCases = [
  // 1. Full absolute datetime
  { input: '2026.05.25 20:01', expected: '2026-05-25T11:01:00.000Z' },
  { input: '2026-05-25 20:01', expected: '2026-05-25T11:01:00.000Z' },
  
  // 2. Relative times
  { input: '5분 전', verify: (res) => {
    const diff = now.getTime() - new Date(res).getTime();
    return Math.abs(diff - 5 * 60 * 1000) < 5000;
  }},
  { input: '3시간 전', verify: (res) => {
    const diff = now.getTime() - new Date(res).getTime();
    return Math.abs(diff - 3 * 60 * 60 * 1000) < 5000;
  }},
  
  // 3. Date only formats
  { input: '2026.05.20', expected: '2026-05-19T15:00:00.000Z' },
  { input: '26.05.20', expected: '2026-05-19T15:00:00.000Z' },
  
  // 4. MM.DD format (current year 2026 expected)
  { input: '05.20', expected: '2026-05-19T15:00:00.000Z' }
];

console.log('\nRunning test cases...');
let passed = true;

for (const tc of testCases) {
  const res = parsePostedAt(tc.input);
  let ok = false;
  if (tc.expected) {
    ok = (res === tc.expected);
    if (!ok) {
      console.error(`FAIL: parsePostedAt("${tc.input}")`);
      console.error(`  Expected: ${tc.expected}`);
      console.error(`  Got:      ${res}`);
      passed = false;
    } else {
      console.log(`PASS: parsePostedAt("${tc.input}") -> ${res}`);
    }
  } else if (tc.verify) {
    ok = tc.verify(res);
    if (!ok) {
      console.error(`FAIL: parsePostedAt("${tc.input}")`);
      console.error(`  Verify failed for result: ${res}`);
      passed = false;
    } else {
      console.log(`PASS: parsePostedAt("${tc.input}") -> ${res} (verified relative offset)`);
    }
  }
}

// 5. HH:mm timezone future offset correction test
console.log('\nTesting HH:mm future offset correction logic:');
const futureKst = new Date(Date.now() + 2 * 60 * 60 * 1000 + 9 * 60 * 60 * 1000);
const futureHourStr = String(futureKst.getUTCHours()).padStart(2, '0');
const futureMinStr = String(futureKst.getUTCMinutes()).padStart(2, '0');
const futureInput = `${futureHourStr}:${futureMinStr}`;

const futureRes = parsePostedAt(futureInput);
const futureResDate = new Date(futureRes);

const expectedDiffMs = 22 * 60 * 60 * 1000;
const actualDiffMs = now.getTime() - futureResDate.getTime();
const marginMs = 5 * 60 * 1000;

if (Math.abs(actualDiffMs - expectedDiffMs) < marginMs) {
  console.log(`PASS: parsePostedAt("${futureInput}") (future time today) successfully corrected to yesterday -> ${futureRes}`);
} else {
  console.error(`FAIL: parsePostedAt("${futureInput}") (future time today) correction failed.`);
  console.error(`  Result: ${futureRes}`);
  console.error(`  Actual difference: ${actualDiffMs / (60 * 60 * 1000)} hours, expected: ${expectedDiffMs / (60 * 60 * 1000)} hours`);
  passed = false;
}

// 6. HH:mm past offset today test
const pastKst = new Date(Date.now() - 2 * 60 * 60 * 1000 + 9 * 60 * 60 * 1000);
const pastHourStr = String(pastKst.getUTCHours()).padStart(2, '0');
const pastMinStr = String(pastKst.getUTCMinutes()).padStart(2, '0');
const pastInput = `${pastHourStr}:${pastMinStr}`;

const pastRes = parsePostedAt(pastInput);
const pastResDate = new Date(pastRes);
const actualPastDiffMs = now.getTime() - pastResDate.getTime();

if (Math.abs(actualPastDiffMs - 2 * 60 * 60 * 1000) < marginMs) {
  console.log(`PASS: parsePostedAt("${pastInput}") (past time today) kept as today -> ${pastRes}`);
} else {
  console.error(`FAIL: parsePostedAt("${pastInput}") (past time today) failed.`);
  console.error(`  Result: ${pastRes}`);
  passed = false;
}

if (passed) {
  console.log('\nALL TESTS PASSED SUCCESSFULLY! 🎉');
  process.exit(0);
} else {
  console.error('\nSOME TESTS FAILED.');
  process.exit(1);
}
