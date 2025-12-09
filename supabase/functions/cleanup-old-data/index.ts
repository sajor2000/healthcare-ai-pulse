import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  try {
    console.log('Starting cleanup of data older than 14 days...')

    // Calculate cutoff date (14 days ago)
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - 14)
    const cutoffDateStr = cutoffDate.toISOString().split('T')[0]

    console.log(`Cutoff date: ${cutoffDateStr}`)

    // Get reading lists older than 14 days
    const { data: oldReadingLists, error: fetchError } = await supabase
      .from('reading_lists')
      .select('id')
      .lt('list_date', cutoffDateStr)

    if (fetchError) {
      console.error('Error fetching old reading lists:', fetchError)
      throw fetchError
    }

    console.log(`Found ${oldReadingLists?.length || 0} reading lists to delete`)

    if (!oldReadingLists || oldReadingLists.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No old data to clean up', deleted: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    const readingListIds = oldReadingLists.map(rl => rl.id)

    // Delete draft_posts linked to old reading lists
    const { error: draftsError, count: draftsDeleted } = await supabase
      .from('draft_posts')
      .delete({ count: 'exact' })
      .in('reading_list_id', readingListIds)

    if (draftsError) {
      console.error('Error deleting old drafts:', draftsError)
    } else {
      console.log(`Deleted ${draftsDeleted || 0} old draft posts`)
    }

    // Delete reading_list_items linked to old reading lists
    const { error: itemsError, count: itemsDeleted } = await supabase
      .from('reading_list_items')
      .delete({ count: 'exact' })
      .in('reading_list_id', readingListIds)

    if (itemsError) {
      console.error('Error deleting old reading list items:', itemsError)
    } else {
      console.log(`Deleted ${itemsDeleted || 0} old reading list items`)
    }

    // Delete old reading lists
    const { error: listsError, count: listsDeleted } = await supabase
      .from('reading_lists')
      .delete({ count: 'exact' })
      .in('id', readingListIds)

    if (listsError) {
      console.error('Error deleting old reading lists:', listsError)
      throw listsError
    }

    console.log(`Deleted ${listsDeleted || 0} old reading lists`)

    // Optionally clean up orphaned content_items (not in any reading list)
    // This is commented out to preserve content history - uncomment if needed
    /*
    const { error: contentError, count: contentDeleted } = await supabase
      .from('content_items')
      .delete({ count: 'exact' })
      .lt('scraped_at', cutoffDate.toISOString())
      .eq('is_saved', false)

    if (contentError) {
      console.error('Error deleting old content:', contentError)
    } else {
      console.log(`Deleted ${contentDeleted || 0} old content items`)
    }
    */

    const summary = {
      success: true,
      cutoff_date: cutoffDateStr,
      deleted: {
        reading_lists: listsDeleted || 0,
        reading_list_items: itemsDeleted || 0,
        draft_posts: draftsDeleted || 0
      }
    }

    console.log('Cleanup completed:', summary)

    return new Response(
      JSON.stringify(summary),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Cleanup error:', errorMessage)

    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})