import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const POST_TYPES = ['research', 'news', 'insight', 'trend', 'opinion']
const NUM_POSTS = 5

const SYSTEM_PROMPT = `You are a healthcare AI thought leader writing LinkedIn posts.
Write engaging, professional posts that:
- Start with a compelling hook (first line appears in preview)
- Share 2-3 key insights from the article
- Add practical implications for healthcare professionals
- End with a thought-provoking question or call to action
- Include 3-5 relevant hashtags (#HealthcareAI #DigitalHealth etc.)
- Keep under 250 words total
- Cite the source with [Read more: URL]

Tone: Authoritative but accessible. Evidence-based. Health equity aware.
Avoid: Hype, sensationalism, unsubstantiated claims.`

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

    // Get top items for post generation
    const topItems = (readingList.reading_list_items || [])
      .sort((a: any, b: any) => a.rank - b.rank)
      .slice(0, NUM_POSTS)
      .map((item: any) => ({ ...item.content_items, content_item_id: item.content_item_id }))

    console.log(`Generating ${topItems.length} draft posts`)

    const drafts = []

    for (let i = 0; i < topItems.length; i++) {
      const item = topItems[i]
      const postType = POST_TYPES[i % POST_TYPES.length]

      console.log(`Generating ${postType} post for: ${item.title?.substring(0, 50)}...`)

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
              content: `Write a ${postType}-style LinkedIn post about this healthcare AI content:

Title: ${item.title}
Summary: ${item.summary || 'No summary available'}
Source URL: ${item.url}

${item.full_text ? `Article excerpt:\n${item.full_text.substring(0, 2000)}` : ''}

Remember: This is a ${postType} post, so ${
                postType === 'research' ? 'focus on methodology and findings' :
                postType === 'news' ? 'highlight the news value and timeliness' :
                postType === 'insight' ? 'provide your analysis and interpretation' :
                postType === 'trend' ? 'connect this to broader industry trends' :
                'share your professional opinion and experience'
              }.`
            }]
          })
        })

        if (!response.ok) {
          const errorText = await response.text()
          console.error(`Claude API error: ${response.status} - ${errorText}`)
          drafts.push({ post_type: postType, status: 'failed', error: `API error: ${response.status}` })
          continue
        }

        const data = await response.json()
        const draftText = data.content[0]?.text || ''

        // Insert draft
        const { data: draft, error: insertError } = await supabase.from('draft_posts').insert({
          reading_list_id: readingList.id,
          content_item_id: item.id,
          draft_text: draftText,
          post_type: postType,
          status: 'draft'
        }).select().single()

        if (insertError) {
          console.error(`Insert error:`, insertError)
          drafts.push({ post_type: postType, status: 'failed', error: insertError.message })
        } else {
          drafts.push({ id: draft?.id, post_type: postType, status: 'created' })
        }

        // Rate limit between Claude calls
        await new Promise(resolve => setTimeout(resolve, 500))

      } catch (llmError) {
        console.error(`Failed to generate ${postType} post:`, llmError)
        const llmErrorMessage = llmError instanceof Error ? llmError.message : 'Unknown error'
        drafts.push({ post_type: postType, status: 'failed', error: llmErrorMessage })
      }
    }

    console.log('Draft generation completed:', drafts)

    return new Response(
      JSON.stringify({ success: true, drafts }),
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
