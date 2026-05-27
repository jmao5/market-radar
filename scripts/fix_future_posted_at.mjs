import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pcjsylqwdjeklkoqjfjk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjanN5bHF3ZGpla2xrb3FqZmprIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODU5NDU0OCwiZXhwIjoyMDk0MTcwNTQ4fQ.jxWqpf4lBwUYpYPCEJuwm0vtbUksX0nRinabConn7JM';

const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

async function fixFuturePostedAt() {
  console.log('Fetching posts where posted_at is in the future compared to scraped_at...');
  
  // Fetch posts where posted_at > scraped_at
  // Note: Since we can't do direct column comparison in simple supabase filters easily,
  // we will fetch recent posts and filter them in memory, or use a RPC/custom query.
  // Actually, we can fetch posts scraped in the last 7 days and check if posted_at > scraped_at.
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  
  const { data: posts, error } = await supabase
    .from('forum_posts')
    .select('id, title, posted_at, scraped_at')
    .gt('scraped_at', sevenDaysAgo)
    .not('posted_at', 'is', null);

  if (error) {
    console.error('Error fetching posts:', error);
    return;
  }

  console.log(`Fetched ${posts.length} recent posts with non-null posted_at.`);
  
  const futurePosts = [];
  for (const post of posts) {
    const postedDate = new Date(post.posted_at);
    const scrapedDate = new Date(post.scraped_at);
    
    // If posted_at is in the future relative to scraped_at by more than 1 minute
    if (postedDate.getTime() - scrapedDate.getTime() > 60_000) {
      futurePosts.push(post);
    }
  }

  console.log(`Found ${futurePosts.length} posts with future-shifted posted_at timestamps.`);
  
  if (futurePosts.length === 0) {
    console.log('No posts need adjustment. DB is clean! 🎉');
    return;
  }

  console.log('\nAdjusting posted_at timestamps (-24 hours)...');
  
  for (const post of futurePosts) {
    const originalPostedAt = post.posted_at;
    const adjustedDate = new Date(new Date(post.posted_at).getTime() - 24 * 60 * 60 * 1000);
    const adjustedPostedAtStr = adjustedDate.toISOString();
    
    console.log(`Fixing post: "${post.title}"`);
    console.log(`  Original posted_at:  ${originalPostedAt}`);
    console.log(`  Adjusted posted_at:  ${adjustedPostedAtStr}`);
    console.log(`  Scraped at:          ${post.scraped_at}`);
    
    const { error: updateError } = await supabase
      .from('forum_posts')
      .update({ posted_at: adjustedPostedAtStr })
      .eq('id', post.id);

    if (updateError) {
      console.error(`  Failed to update post ${post.id}:`, updateError);
    } else {
      console.log(`  Successfully adjusted!`);
    }
  }
  
  console.log('\nAll future-shifted posts have been corrected! 🎉');
}

fixFuturePostedAt();
