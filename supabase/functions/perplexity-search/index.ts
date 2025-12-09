import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const QUERIES = [
  "healthcare AI news today FDA approvals clinical decision support",
  "artificial intelligence hospital health system deployment",
  "large language models medical diagnosis research papers",
  "AI health equity bias clinical algorithms",
  "digital health startups funding AI healthcare"
]

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const PERPLEXITY_API_KEY = Deno.env.get('PERPLEXITY_API_KEY')
  if (!PERPLEXITY_API_KEY) {
    console.error('PERPLEXITY_API_KEY not configured')
    return new Response(
      JSON.stringify({ error: 'PERPLEXITY_API_KEY not configured' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  try {
    const results = []

    for (const query of QUERIES) {
      console.log(`Searching: ${query}`)
      
      const response = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'sonar-pro',
          messages: [
            {
              role: 'system',
              content: 'You are a healthcare AI news researcher. Find the most recent and relevant news articles. Focus on credible sources. Return specific article URLs when possible.'
            },
            { role: 'user', content: query }
          ],
          search_recency_filter: 'week',
          max_tokens: 1024,
          temperature: 0.2
        })
      })

      if (!response.ok) {
        console.error(`Perplexity API error: ${response.status}`)
        continue
      }

      const data = await response.json()
      console.log(`Perplexity response for "${query}":`, JSON.stringify(data).substring(0, 500))

      // Extract citations from response
      const citations = data.citations || []

      // Store search results
      await supabase.from('perplexity_searches').insert({
        query,
        response: data,
        citations: citations
      })

      // Insert discovered URLs as content items
      for (const citation of citations) {
        if (citation) {
          const url = typeof citation === 'string' ? citation : citation.url
          const title = typeof citation === 'object' ? citation.title : 'Discovered Article'
          
          if (url) {
            const { error } = await supabase.from('content_items').upsert({
              title: title || 'Untitled',
              url: url,
              summary: typeof citation === 'object' ? citation.snippet : null,
              pub_date: new Date().toISOString().split('T')[0]
            }, { onConflict: 'url', ignoreDuplicates: true })
            
            if (error) {
              console.log(`Skipping duplicate URL: ${url}`)
            }
          }
        }
      }

      results.push({ query, citations_found: citations.length })

      // Rate limit between queries
      await new Promise(resolve => setTimeout(resolve, 1000))
    }

    console.log('Perplexity searches completed:', results)

    return new Response(
      JSON.stringify({ success: true, queries_processed: QUERIES.length, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    console.error('Perplexity search error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
