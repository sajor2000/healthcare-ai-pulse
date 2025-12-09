import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY')
  if (!FIRECRAWL_API_KEY) {
    console.error('FIRECRAWL_API_KEY not configured')
    return new Response(
      JSON.stringify({ error: 'FIRECRAWL_API_KEY not configured' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  try {
    // Get active sources
    const { data: sources, error: sourcesError } = await supabase
      .from('sources')
      .select('*')
      .eq('is_active', true)

    if (sourcesError) {
      throw sourcesError
    }

    console.log(`Found ${sources?.length || 0} active sources to crawl`)

    const results = []

    for (const source of sources || []) {
      console.log(`Crawling source: ${source.name} (${source.url})`)
      
      try {
        // Firecrawl API call
        const crawlResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            url: source.url,
            formats: ['markdown', 'links'],
            onlyMainContent: true,
            waitFor: 2000,
            timeout: 30000
          })
        })

        const crawlData = await crawlResponse.json()
        console.log(`Firecrawl response for ${source.name}:`, JSON.stringify(crawlData).substring(0, 500))

        if (crawlData.success && crawlData.data) {
          const { links, metadata } = crawlData.data

          // Filter for article links
          const articleLinks = (links || [])
            .filter((link: string) =>
              link.includes('/article') ||
              link.includes('/news') ||
              link.includes('/blog') ||
              link.includes('/story') ||
              link.includes('/post') ||
              link.includes('2024') ||
              link.includes('2025')
            )
            .slice(0, 10)

          console.log(`Found ${articleLinks.length} article links from ${source.name}`)

          // Scrape each article
          for (const articleUrl of articleLinks) {
            try {
              console.log(`Scraping article: ${articleUrl}`)
              
              const articleResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  url: articleUrl,
                  formats: ['markdown'],
                  onlyMainContent: true
                })
              })

              const articleData = await articleResponse.json()

              if (articleData.success && articleData.data) {
                const { markdown: articleMarkdown, metadata: articleMeta } = articleData.data

                // Insert/update content item
                const { error: insertError } = await supabase.from('content_items').upsert({
                  source_id: source.id,
                  title: articleMeta?.title || 'Untitled',
                  url: articleUrl,
                  summary: articleMeta?.description || articleMarkdown?.substring(0, 300),
                  full_text: articleMarkdown,
                  pub_date: articleMeta?.publishedTime?.split('T')[0] || new Date().toISOString().split('T')[0]
                }, { onConflict: 'url' })

                if (insertError) {
                  console.log(`Insert error for ${articleUrl}:`, insertError.message)
                } else {
                  results.push({ url: articleUrl, status: 'success' })
                }
              }

              // Rate limit between article scrapes
              await new Promise(resolve => setTimeout(resolve, 500))

            } catch (articleError) {
              console.error(`Failed to scrape article ${articleUrl}:`, articleError)
              results.push({ url: articleUrl, status: 'failed' })
            }
          }

          // Update source last_crawled_at
          await supabase
            .from('sources')
            .update({ last_crawled_at: new Date().toISOString() })
            .eq('id', source.id)
        }

      } catch (sourceError) {
        console.error(`Failed to crawl source ${source.name}:`, sourceError)
      }

      // Rate limit between sources
      await new Promise(resolve => setTimeout(resolve, 1000))
    }

    console.log('Crawl completed:', results)

    return new Response(
      JSON.stringify({ success: true, articles_processed: results.length, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    console.error('Crawl error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
