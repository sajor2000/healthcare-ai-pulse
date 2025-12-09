import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Generate exactly 3 posts for the top 3 most interesting articles
const NUM_POSTS = 3

const SYSTEM_PROMPT = `You are a healthcare AI thought leader writing LinkedIn posts for a community of:
- Healthcare AI professionals and executives
- ICU physicians and critical care specialists  
- Operational AI leaders in health systems

Write engaging, professional posts that:
- Start with a compelling hook that grabs attention in the LinkedIn feed preview
- Share 2-3 key insights from the article with clinical or operational relevance
- Add practical implications for healthcare professionals, especially ICU/critical care and operational leaders
- Connect insights to health equity and evidence-based medicine when relevant
- End with a thought-provoking question or call to action that encourages discussion
- Include 3-5 relevant hashtags (#HealthcareAI #CriticalCare #ICU #DigitalHealth #HealthEquity etc.)
- Keep under 250 words total (LinkedIn optimal length)
- Cite the source with [Read more: URL]

Tone: Authoritative but accessible. Evidence-based. Health equity aware. Physician-friendly.
Focus areas: Clinical AI, ICU/critical care AI, health system operations, peer-reviewed research.
Avoid: Hype, sensationalism, unsubstantiated claims, overly technical jargon.`

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')
  if (!ANTHROPIC_API_KEY) {
    console.error('ANTHROPIC_API_KEY not configured')
    return new Response(
      JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  try {
    const today = new Date().toISOString().split('T')[0]

    // Get today's reading list with content
    const { data: readingList, error: listError } = await supabase
      .from('reading_lists')
      .select(`
        id,
        reading_list_items (
          rank,
          content_item_id,
          content_items (*)
        )
      `)
      .eq('list_date', today)
      .maybeSingle()

    if (listError) throw listError

    if (!readingList) {
      console.log('No reading list found for today')
      return new Response(
        JSON.stringify({ success: false, error: 'No reading list found for today' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    // Get TOP 3 items by relevance score for post generation (most interesting articles)
    const topItems = (readingList.reading_list_items || [])
      .map((item: any) => item.content_items)
      .filter((item: any) => item?.id && item?.title)
      .sort((a: any, b: any) => (b.relevance_score || 0) - (a.relevance_score || 0))
      .slice(0, NUM_POSTS)

    console.log(`Generating ${topItems.length} draft posts for top articles by relevance`)

    // Clear any existing drafts for today to avoid duplicates
    await supabase
      .from('draft_posts')
      .delete()
      .eq('reading_list_id', readingList.id)
      .eq('status', 'draft')

    const drafts = []

    for (let i = 0; i < topItems.length; i++) {
      const item = topItems[i]

      console.log(`Generating post #${i + 1} for: ${item.title?.substring(0, 50)}... (score: ${item.relevance_score})`)

      try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 600,
            system: SYSTEM_PROMPT,
            messages: [{
              role: 'user',
              content: `Write a LinkedIn post about this healthcare AI content. This is article #${i + 1} of the top 3 most relevant articles today (relevance score: ${item.relevance_score}/100).

Title: ${item.title}
Summary: ${item.summary || 'No summary available'}
Source URL: ${item.url}
${item.key_points?.length ? `Key Points:\n${item.key_points.map((p: string) => `- ${p}`).join('\n')}` : ''}

${item.full_text ? `Article excerpt:\n${item.full_text.substring(0, 2000)}` : ''}

Write a compelling post that will resonate with ICU physicians, healthcare AI professionals, and operational AI leaders. Focus on clinical relevance and practical implications.`
            }]
          })
        })

        if (!response.ok) {
          const errorText = await response.text()
          console.error(`Claude API error: ${response.status} - ${errorText}`)
          drafts.push({ status: 'failed', error: `API error: ${response.status}` })
          continue
        }

        const data = await response.json()
        const draftText = data.content[0]?.text || ''

        // Insert draft
        const { data: draft, error: insertError } = await supabase.from('draft_posts').insert({
          reading_list_id: readingList.id,
          content_item_id: item.id,
          draft_text: draftText,
          post_type: 'curated',
          status: 'draft'
        }).select().single()

        if (insertError) {
          console.error(`Insert error:`, insertError)
          drafts.push({ status: 'failed', error: insertError.message })
        } else {
          drafts.push({ id: draft?.id, title: item.title?.substring(0, 50), status: 'created' })
        }

        // Rate limit between Claude calls
        await new Promise(resolve => setTimeout(resolve, 500))

      } catch (llmError) {
        console.error(`Failed to generate post #${i + 1}:`, llmError)
        const llmErrorMessage = llmError instanceof Error ? llmError.message : 'Unknown error'
        drafts.push({ status: 'failed', error: llmErrorMessage })
      }
    }

    console.log('Draft generation completed:', drafts)

    return new Response(
      JSON.stringify({ success: true, drafts, count: drafts.filter(d => d.status === 'created').length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    console.error('Draft posts error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})