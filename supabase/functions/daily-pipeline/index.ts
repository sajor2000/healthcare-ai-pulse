import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const REQUEST_TIMEOUT = 150000 // 2.5 minutes per step

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeout: number
): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)
  try {
    const response = await fetch(url, { ...options, signal: controller.signal })
    clearTimeout(timeoutId)
    return response
  } catch (error) {
    clearTimeout(timeoutId)
    throw error
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !supabaseKey) {
    return new Response(
      JSON.stringify({ error: 'Missing Supabase credentials' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  })

  const pipelineRunId = crypto.randomUUID()
  const stepsCompleted: string[] = []
  let itemsScraped = 0
  let postsGenerated = 0

  try {
    // Create pipeline run record
    await supabase.from('pipeline_runs').insert({
      id: pipelineRunId,
      run_date: new Date().toISOString().split('T')[0],
      status: 'running',
      steps_completed: []
    })

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabaseKey}`
    }

    console.log('Starting daily pipeline...')

    // Step 1: Run Perplexity searches for discovery
    console.log('Step 1: Running Perplexity searches...')
    try {
      const perplexityResponse = await fetchWithTimeout(
        `${supabaseUrl}/functions/v1/perplexity-search`,
        { method: 'POST', headers },
        REQUEST_TIMEOUT
      )
      const perplexityResult = await perplexityResponse.json()
      console.log('Perplexity search result:', perplexityResult)
      stepsCompleted.push('perplexity-search')
      itemsScraped += perplexityResult.urls_discovered || 0
    } catch (e) {
      console.error('Perplexity search failed:', e)
    }

    // Step 2: Fetch PubMed research (FREE API)
    console.log('Step 2: Fetching PubMed research...')
    try {
      const pubmedResponse = await fetchWithTimeout(
        `${supabaseUrl}/functions/v1/fetch-pubmed`,
        { method: 'POST', headers },
        REQUEST_TIMEOUT
      )
      const pubmedResult = await pubmedResponse.json()
      console.log('PubMed result:', pubmedResult)
      stepsCompleted.push('fetch-pubmed')
      itemsScraped += pubmedResult.papers || 0
    } catch (e) {
      console.error('PubMed fetch failed:', e)
    }

    // Step 3: Fetch arXiv research (FREE API)
    console.log('Step 3: Fetching arXiv research...')
    try {
      const arxivResponse = await fetchWithTimeout(
        `${supabaseUrl}/functions/v1/fetch-arxiv`,
        { method: 'POST', headers },
        REQUEST_TIMEOUT
      )
      const arxivResult = await arxivResponse.json()
      console.log('arXiv result:', arxivResult)
      stepsCompleted.push('fetch-arxiv')
      itemsScraped += arxivResult.papers || 0
    } catch (e) {
      console.error('arXiv fetch failed:', e)
    }

    // Step 4: Crawl sources with Firecrawl
    console.log('Step 4: Crawling sources...')
    try {
      const crawlResponse = await fetchWithTimeout(
        `${supabaseUrl}/functions/v1/crawl-sources`,
        { method: 'POST', headers },
        REQUEST_TIMEOUT
      )
      const crawlResult = await crawlResponse.json()
      console.log('Crawl result:', crawlResult)
      stepsCompleted.push('crawl-sources')
      itemsScraped += crawlResult.articles_scraped || 0
    } catch (e) {
      console.error('Crawl sources failed:', e)
    }

    // Step 5: Score content
    console.log('Step 5: Scoring content...')
    try {
      const scoreResponse = await fetchWithTimeout(
        `${supabaseUrl}/functions/v1/score-content`,
        { method: 'POST', headers },
        REQUEST_TIMEOUT
      )
      const scoreResult = await scoreResponse.json()
      console.log('Score result:', scoreResult)
      stepsCompleted.push('score-content')
    } catch (e) {
      console.error('Score content failed:', e)
    }

    // Step 6: Generate reading list (10-20 items)
    console.log('Step 6: Generating reading list...')
    try {
      const readingListResponse = await fetchWithTimeout(
        `${supabaseUrl}/functions/v1/generate-reading-list`,
        { method: 'POST', headers },
        REQUEST_TIMEOUT
      )
      const readingListResult = await readingListResponse.json()
      console.log('Reading list result:', readingListResult)
      stepsCompleted.push('generate-reading-list')
    } catch (e) {
      console.error('Generate reading list failed:', e)
    }

    // Step 7: Draft LinkedIn posts (3-5 posts)
    console.log('Step 7: Drafting posts...')
    try {
      const draftsResponse = await fetchWithTimeout(
        `${supabaseUrl}/functions/v1/draft-posts`,
        { method: 'POST', headers },
        REQUEST_TIMEOUT
      )
      const draftsResult = await draftsResponse.json()
      console.log('Drafts result:', draftsResult)
      stepsCompleted.push('draft-posts')
      postsGenerated = draftsResult.drafts?.length || 0
    } catch (e) {
      console.error('Draft posts failed:', e)
    }

    // Update pipeline run as completed
    await supabase
      .from('pipeline_runs')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        steps_completed: stepsCompleted,
        items_scraped: itemsScraped,
        posts_generated: postsGenerated
      })
      .eq('id', pipelineRunId)

    console.log('Daily pipeline completed successfully!')

    return new Response(
      JSON.stringify({ 
        success: true, 
        timestamp: new Date().toISOString(),
        pipeline_run_id: pipelineRunId,
        steps_completed: stepsCompleted,
        items_scraped: itemsScraped,
        posts_generated: postsGenerated
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      function: 'daily-pipeline',
      error: errorMessage
    }))

    // Update pipeline run as failed
    await supabase
      .from('pipeline_runs')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
        steps_completed: stepsCompleted,
        error_message: errorMessage
      })
      .eq('id', pipelineRunId)

    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
