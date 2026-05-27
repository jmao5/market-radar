import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pcjsylqwdjeklkoqjfjk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjanN5bHF3ZGpla2xrb3FqZmprIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODU5NDU0OCwiZXhwIjoyMDk0MTcwNTQ4fQ.jxWqpf4lBwUYpYPCEJuwm0vtbUksX0nRinabConn7JM';

const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

async function checkPostedAt() {
  const { data: posts, error } = await supabase
    .from('forum_posts')
    .select('id, url, post_id, title, author, posted_at, scraped_at')
    .eq('author', '서생원')
    .order('scraped_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`Found ${posts.length} posts for 서생원:`);
  for (const p of posts) {
    console.log(`Title: ${p.title}`);
    console.log(`  posted_at: ${p.posted_at}`);
    console.log(`  scraped_at: ${p.scraped_at}`);
    
    // Compare with current local time (KST)
    const now = new Date();
    const postedDate = p.posted_at ? new Date(p.posted_at) : null;
    const scrapedDate = p.scraped_at ? new Date(p.scraped_at) : null;
    
    if (postedDate) {
      const diffMs = postedDate.getTime() - now.getTime();
      console.log(`  posted_at diff from now: ${diffMs / (60 * 60 * 1000)} hours`);
    }
  }
}

checkPostedAt();
