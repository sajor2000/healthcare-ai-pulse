import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const MIN_ITEMS = 10
const MAX_ITEMS = 20

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  try {
    const today = new Date().toISOString().split('T')[0]

    // Create or get today's reading list
    const { data: existingList } = await supabase
      .from('reading_lists')
      .select('*')
      .eq('list_date', today)
      .maybeSingle()

    let readingList
    if (existingList) {
      readingList = existingList
      console.log('Using existing reading list for today')
    } else {
      const { data: newList, error: createError } = await supabase
        .from('reading_lists')
        .insert({ list_date: today })
        .select()
        .single()
      
      if (createError) throw createError
      readingList = newList
      console.log('Created new reading list for today')
    }

    // Get top content by relevance score from last 7 days
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    
    const { data: topContent, error: contentError } = await supabase
      .from('content_items')
      .select('*')
      .gte('pub_date', weekAgo)
      .gt('relevance_score', 0)
      .order('relevance_score', { ascending: false })
      .order('pub_date', { ascending: false })
      .limit(MAX_ITEMS * 2)

    if (contentError) throw contentError

    console.log(`Found ${topContent?.length || 0} potential items`)

    // Filter to quality content
    const qualityContent = (topContent || [])
      .filter(item => item.relevance_score >= 30 && item.title)
      .slice(0, MAX_ITEMS)

    const finalContent = qualityContent.length >= MIN_ITEMS
      ? qualityContent
      : (topContent || []).slice(0, MIN_ITEMS)

    console.log(`Selected ${finalContent.length} items for reading list`)

    // Clear existing items for today
    await supabase
      .from('reading_list_items')
      .delete()
      .eq('reading_list_id', readingList.id)

    // Insert reading list items with rank
    for (let i = 0; i < finalContent.length; i++) {
      const { error: insertError } = await supabase.from('reading_list_items').insert({
        reading_list_id: readingList.id,
        content_item_id: finalContent[i].id,
        rank: i + 1
      })

      if (insertError) {
        console.log(`Error inserting item ${i}:`, insertError.message)
      }
    }

    console.log('Reading list generated successfully')

    return new Response(
      JSON.stringify({
        success: true,
        reading_list_id: readingList.id,
        items_count: finalContent.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    console.error('Reading list error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
