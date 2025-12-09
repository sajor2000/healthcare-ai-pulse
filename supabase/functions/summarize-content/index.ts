import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')
const AI_GATEWAY_URL = 'https://ai.gateway.lovable.dev/v1/chat/completions'

interface ContentItem {
  id: string
  title: string
  summary: string | null
  full_text: string | null
}

async function summarizeWithAI(title: string, text: string): Promise<{ summary: string; keyPoints: string[] }> {
  const prompt = `You are a healthcare AI expert. Analyze this article and provide:
1. A concise 2-3 sentence summary (max 200 chars)
2. 3-4 key takeaways as bullet points

Article Title: ${title}

Article Content:
${text?.substring(0, 4000) || 'No content available'}

Respond in JSON format:
{
  "summary": "Your concise summary here",
  "keyPoints": ["Key point 1", "Key point 2", "Key point 3"]
}`

  const response = await fetch(AI_GATEWAY_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash-lite',
      messages: [
        { role: 'system', content: 'You are a healthcare AI analyst. Always respond with valid JSON only, no markdown.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 500,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('AI Gateway error:', response.status, errorText)
    throw new Error(`AI Gateway error: ${response.status}`)
  }

  const data = await response.json()
  const content = data.choices?.[0]?.message?.content || ''
  
  // Parse JSON from response, handling potential markdown code blocks
  let jsonStr = content.trim()
  if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.replace(/```json?\n?/g, '').replace(/```/g, '')
  }
  
  try {
    const parsed = JSON.parse(jsonStr)
    return {
      summary: parsed.summary || 'Summary not available',
      keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints : []
    }
  } catch (e) {
    console.error('Failed to parse AI response:', content)
    return {
      summary: content.substring(0, 200),
      keyPoints: []
    }
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !supabaseKey || !LOVABLE_API_KEY) {
    return new Response(
      JSON.stringify({ error: 'Missing required credentials' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  })

  try {
    console.log('Starting content summarization...')

    // Get content items that need summarization (have text but no key_points)
    const { data: items, error: fetchError } = await supabase
      .from('content_items')
      .select('id, title, summary, full_text')
      .is('key_points', null)
      .not('full_text', 'is', null)
      .order('relevance_score', { ascending: false })
      .limit(10)

    if (fetchError) throw fetchError

    console.log(`Found ${items?.length || 0} items to summarize`)

    let summarized = 0
    const results: any[] = []

    for (const item of (items || []) as ContentItem[]) {
      try {
        console.log(`Summarizing: ${item.title?.substring(0, 50)}...`)
        
        const { summary, keyPoints } = await summarizeWithAI(
          item.title,
          item.full_text || item.summary || ''
        )

        // Update the content item
        const { error: updateError } = await supabase
          .from('content_items')
          .update({
            summary: summary,
            key_points: keyPoints
          })
          .eq('id', item.id)

        if (updateError) {
          console.error(`Failed to update ${item.id}:`, updateError)
        } else {
          summarized++
          results.push({ id: item.id, title: item.title, keyPoints })
        }

        // Rate limit: wait between requests
        await new Promise(r => setTimeout(r, 500))
      } catch (e) {
        console.error(`Error summarizing ${item.id}:`, e)
      }
    }

    console.log(`Summarization complete: ${summarized} items processed`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        summarized,
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Summarization error:', errorMessage)
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
