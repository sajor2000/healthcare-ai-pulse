import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  try {
    const baseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${serviceKey}`
    }

    console.log('Starting daily pipeline...')

    // Step 1: Run Perplexity searches for discovery
    console.log('Step 1: Running Perplexity searches...')
    const perplexityResponse = await fetch(`${baseUrl}/functions/v1/perplexity-search`, {
      method: 'POST',
      headers
    })
    const perplexityResult = await perplexityResponse.json()
    console.log('Perplexity search result:', perplexityResult)

    // Step 2: Crawl sources with Firecrawl
    console.log('Step 2: Crawling sources...')
    const crawlResponse = await fetch(`${baseUrl}/functions/v1/crawl-sources`, {
      method: 'POST',
      headers
    })
    const crawlResult = await crawlResponse.json()
    console.log('Crawl result:', crawlResult)

    // Step 3: Score content
    console.log('Step 3: Scoring content...')
    const scoreResponse = await fetch(`${baseUrl}/functions/v1/score-content`, {
      method: 'POST',
      headers
    })
    const scoreResult = await scoreResponse.json()
    console.log('Score result:', scoreResult)

    // Step 4: Generate reading list (10-20 items)
    console.log('Step 4: Generating reading list...')
    const readingListResponse = await fetch(`${baseUrl}/functions/v1/generate-reading-list`, {
      method: 'POST',
      headers
    })
    const readingListResult = await readingListResponse.json()
    console.log('Reading list result:', readingListResult)

    // Step 5: Draft LinkedIn posts (3-5 posts)
    console.log('Step 5: Drafting posts...')
    const draftsResponse = await fetch(`${baseUrl}/functions/v1/draft-posts`, {
      method: 'POST',
      headers
    })
    const draftsResult = await draftsResponse.json()
    console.log('Drafts result:', draftsResult)

    console.log('Daily pipeline completed successfully!')

    return new Response(
      JSON.stringify({ 
        success: true, 
        timestamp: new Date().toISOString(),
        steps: {
          perplexity: perplexityResult,
          crawl: crawlResult,
          score: scoreResult,
          readingList: readingListResult,
          drafts: draftsResult
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    console.error('Pipeline error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
