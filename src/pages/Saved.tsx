import { useEffect, useState } from "react";
import Layout from "@/components/layout/Layout";
import ReadingListItem from "@/components/dashboard/ReadingListItem";
import { Bookmark, Loader2, BookOpen, Filter } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

type SourceType = "all" | "news" | "blog" | "journal" | "policy";

interface SavedArticle {
  id: string;
  title: string;
  url: string;
  summary: string | null;
  key_points: string[] | null;
  relevance_score: number;
  is_read: boolean;
  is_saved: boolean;
  pub_date: string | null;
  sources?: { name: string; source_type: string } | null;
  // Academic metadata
  doi?: string | null;
  pmid?: string | null;
  arxiv_id?: string | null;
  abstract?: string | null;
  journal_name?: string | null;
  citation_count?: number | null;
  pdf_url?: string | null;
  mesh_terms?: string[] | null;
  publication_type?: string | null;
  authors?: string | null;
}

const Saved = () => {
  const [savedArticles, setSavedArticles] = useState<SavedArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [sourceFilter, setSourceFilter] = useState<SourceType>("all");

  const fetchSavedArticles = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('content_items')
        .select(`
          id,
          title,
          url,
          summary,
          key_points,
          relevance_score,
          is_read,
          is_saved,
          pub_date,
          doi,
          pmid,
          arxiv_id,
          abstract,
          journal_name,
          citation_count,
          pdf_url,
          mesh_terms,
          publication_type,
          authors,
          sources (name, source_type)
        `)
        .eq('is_saved', true)
        .order('pub_date', { ascending: false });

      if (error) throw error;

      setSavedArticles(data || []);
    } catch (error) {
      console.error('Error fetching saved articles:', error);
      toast({ title: "Error", description: "Failed to load saved articles", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSavedArticles();
  }, []);

  const handleToggleRead = async (id: string) => {
    const article = savedArticles.find(a => a.id === id);
    if (!article) return;

    const newIsRead = !article.is_read;
    
    setSavedArticles(prev =>
      prev.map(a => a.id === id ? { ...a, is_read: newIsRead } : a)
    );

    const { error } = await supabase
      .from('content_items')
      .update({ is_read: newIsRead })
      .eq('id', id);

    if (error) {
      setSavedArticles(prev =>
        prev.map(a => a.id === id ? { ...a, is_read: !newIsRead } : a)
      );
      toast({ title: "Error", description: "Failed to update read status", variant: "destructive" });
    }
  };

  const handleToggleSave = async (id: string) => {
    const article = savedArticles.find(a => a.id === id);
    if (!article) return;

    // Optimistically remove from list
    setSavedArticles(prev => prev.filter(a => a.id !== id));

    const { error } = await supabase
      .from('content_items')
      .update({ is_saved: false })
      .eq('id', id);

    if (error) {
      // Restore on error
      setSavedArticles(prev => [...prev, article]);
      toast({ title: "Error", description: "Failed to unsave article", variant: "destructive" });
    } else {
      toast({ title: "Removed from saved", description: "Article removed from your saved list" });
    }
  };

  // Filter by source type
  const filteredArticles = sourceFilter === "all" 
    ? savedArticles 
    : savedArticles.filter(article => article.sources?.source_type === sourceFilter);

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
      <div className="container mx-auto px-6 py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-8 animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">
                <span className="gradient-text">Saved</span> Articles
              </h1>
              <p className="text-muted-foreground">
                {savedArticles.length} article{savedArticles.length !== 1 ? 's' : ''} saved for later
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="glass-card p-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Bookmark className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{savedArticles.length}</p>
                <p className="text-xs text-muted-foreground">Total Saved</p>
              </div>
              <div className="ml-auto flex items-center gap-2 text-sm text-muted-foreground">
                <BookOpen className="h-4 w-4" />
                <span>{savedArticles.filter(a => a.is_read).length} read</span>
              </div>
            </div>
          </div>
        </div>

        {/* Articles List */}
        <div className="animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold">Your Collection</h2>
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={sourceFilter} onValueChange={(v) => setSourceFilter(v as SourceType)}>
                <SelectTrigger className="w-[120px] h-8 bg-secondary border-border">
                  <SelectValue placeholder="Filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="news">News</SelectItem>
                  <SelectItem value="blog">Blog</SelectItem>
                  <SelectItem value="journal">Research</SelectItem>
                  <SelectItem value="policy">Policy</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {filteredArticles.length === 0 ? (
            <div className="glass-card p-8 text-center">
              <Bookmark className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No saved articles</h3>
              <p className="text-muted-foreground">
                {savedArticles.length === 0 
                  ? "Bookmark articles from your reading list to save them here."
                  : "No articles match the selected filter."}
              </p>
            </div>
          ) : (
            <div className="grid gap-3">
              {filteredArticles.map((article, index) => (
                <ReadingListItem
                  key={article.id}
                  id={article.id}
                  title={article.title}
                  source={article.sources?.name || 'Unknown Source'}
                  sourceType={article.sources?.source_type || 'journal'}
                  summary={article.summary || 'No summary available'}
                  keyPoints={article.key_points || undefined}
                  relevanceScore={article.relevance_score}
                  isRead={article.is_read}
                  isSaved={article.is_saved}
                  url={article.url}
                  pubDate={article.pub_date || undefined}
                  onToggleRead={() => handleToggleRead(article.id)}
                  onToggleSave={() => handleToggleSave(article.id)}
                  index={index}
                  doi={article.doi}
                  pmid={article.pmid}
                  arxivId={article.arxiv_id}
                  abstract={article.abstract}
                  journalName={article.journal_name}
                  citationCount={article.citation_count || 0}
                  pdfUrl={article.pdf_url}
                  meshTerms={article.mesh_terms || []}
                  publicationType={article.publication_type}
                  authors={article.authors}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Saved;
