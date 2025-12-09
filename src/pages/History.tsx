import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { CalendarDays, ChevronRight, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface HistoryItem {
  id: string;
  list_date: string;
  items_count: number;
  drafts_count?: number;
}

const History = () => {
  const navigate = useNavigate();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        // Fetch reading lists with counts
        const { data: readingLists } = await supabase
          .from('reading_lists')
          .select('id, list_date, items_count')
          .order('list_date', { ascending: false })
          .limit(30);

        if (readingLists) {
          // Fetch draft counts for each reading list
          const historyWithDrafts = await Promise.all(
            readingLists.map(async (rl) => {
              const { count } = await supabase
                .from('draft_posts')
                .select('*', { count: 'exact', head: true })
                .eq('reading_list_id', rl.id);
              
              return {
                ...rl,
                drafts_count: count || 0
              };
            })
          );
          setHistory(historyWithDrafts);
        }
      } catch (error) {
        console.error('Error fetching history:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, []);

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto px-6 py-8 flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-6 py-8 max-w-3xl">
        <div className="mb-8 animate-fade-in">
          <h1 className="text-3xl font-bold mb-2">History</h1>
          <p className="text-muted-foreground">
            Past reading lists and draft posts
          </p>
        </div>

        {history.length === 0 ? (
          <div className="glass-card p-8 text-center animate-fade-in">
            <CalendarDays className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No history yet. Run the pipeline to get started.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {history.map((item, index) => (
              <div 
                key={item.id}
                className="glass-card p-4 animate-slide-up hover:border-primary/30 transition-all cursor-pointer"
                style={{ animationDelay: `${index * 50}ms` }}
                onClick={() => navigate(`/?date=${item.list_date}`)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <CalendarDays className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">
                        {format(new Date(item.list_date), 'EEEE, MMMM d, yyyy')}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {item.items_count || 0} articles • {item.drafts_count || 0} drafts
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default History;
