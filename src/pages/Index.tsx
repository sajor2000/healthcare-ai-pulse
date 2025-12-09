import { useEffect, useState } from "react";
import Layout from "@/components/layout/Layout";
import ReadingListItem from "@/components/dashboard/ReadingListItem";
import DraftPost from "@/components/dashboard/DraftPost";
import { CalendarDays, BookOpen, FileEdit, CheckCircle2, Clock, Send, RefreshCw, Loader2, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

type DraftPostStatus = "draft" | "approved" | "archived";
type SourceType = "all" | "news" | "blog" | "journal" | "policy";

interface ContentItem {
  id: string;
  title: string;
  url: string;
  summary: string | null;
  key_points: string[] | null;
  relevance_score: number;
  is_read: boolean;
  is_saved: boolean;
  source_id: string | null;
  sources?: { name: string; source_type: string } | null;
}

interface DraftPostData {
  id: string;
  content: string;
  postType: string;
  status: DraftPostStatus;
  content_item_id: string | null;
  sourceUrl?: string;
}

const Index = () => {
  const [readingList, setReadingList] = useState<ContentItem[]>([]);
  const [draftPosts, setDraftPosts] = useState<DraftPostData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sourceFilter, setSourceFilter] = useState<SourceType>("all");

  const fetchData = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Fetch today's reading list
      const { data: readingListData } = await supabase
        .from('reading_lists')
        .select(`
          id,
          reading_list_items (
            rank,
            content_items (
              id,
              title,
              url,
              summary,
              key_points,
              relevance_score,
              is_read,
              is_saved,
              source_id,
              sources (name, source_type)
            )
          )
        `)
        .eq('list_date', today)
        .maybeSingle();

      if (readingListData?.reading_list_items) {
        const items = readingListData.reading_list_items
          .sort((a: any, b: any) => a.rank - b.rank)
          .map((item: any) => ({
            ...item.content_items,
            sources: item.content_items?.sources
          }))
          .filter((item: any) => item?.id);
        setReadingList(items);
      }

      // Fetch today's draft posts with content item info
      const { data: draftsData } = await supabase
        .from('draft_posts')
        .select(`
          *,
          content_items (url)
        `)
        .gte('created_at', today)
        .neq('status', 'archived')
        .order('created_at', { ascending: false });

      if (draftsData) {
        setDraftPosts(draftsData.map(d => ({
          id: d.id,
          content: d.edited_text || d.draft_text,
          postType: d.post_type || 'insight',
          status: d.status as DraftPostStatus,
          content_item_id: d.content_item_id,
          sourceUrl: (d as any).content_items?.url
        })));
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleToggleRead = async (id: string) => {
    const item = readingList.find(i => i.id === id);
    if (!item) return;

    const newIsRead = !item.is_read;
    
    setReadingList(prev =>
      prev.map(i => i.id === id ? { ...i, is_read: newIsRead } : i)
    );

    const { error } = await supabase
      .from('content_items')
      .update({ is_read: newIsRead })
      .eq('id', id);

    if (error) {
      setReadingList(prev =>
        prev.map(i => i.id === id ? { ...i, is_read: !newIsRead } : i)
      );
      toast({ title: "Error", description: "Failed to update read status", variant: "destructive" });
    }
  };

  const handleToggleSave = async (id: string) => {
    const item = readingList.find(i => i.id === id);
    if (!item) return;

    const newIsSaved = !item.is_saved;
    
    setReadingList(prev =>
      prev.map(i => i.id === id ? { ...i, is_saved: newIsSaved } : i)
    );

    const { error } = await supabase
      .from('content_items')
      .update({ is_saved: newIsSaved })
      .eq('id', id);

    if (error) {
      setReadingList(prev =>
        prev.map(i => i.id === id ? { ...i, is_saved: !newIsSaved } : i)
      );
      toast({ title: "Error", description: "Failed to update saved status", variant: "destructive" });
    } else {
      toast({ 
        title: newIsSaved ? "Saved for later" : "Removed from saved",
        description: newIsSaved ? "Article added to your saved list" : "Article removed from saved"
      });
    }
  };

  const handleUpdatePost = async (id: string, content: string) => {
    setDraftPosts(prev =>
      prev.map(post => post.id === id ? { ...post, content } : post)
    );

    const { error } = await supabase
      .from('draft_posts')
      .update({ edited_text: content })
      .eq('id', id);

    if (error) {
      toast({ title: "Error", description: "Failed to save draft", variant: "destructive" });
    }
  };

  const handleApprovePost = async (id: string) => {
    setDraftPosts(prev =>
      prev.map(post => post.id === id ? { ...post, status: "approved" as DraftPostStatus } : post)
    );

    const { error } = await supabase
      .from('draft_posts')
      .update({ status: 'approved' })
      .eq('id', id);

    if (error) {
      toast({ title: "Error", description: "Failed to approve post", variant: "destructive" });
    } else {
      toast({ title: "Post approved", description: "Ready to share on LinkedIn!" });
    }
  };

  const handleArchivePost = async (id: string) => {
    setDraftPosts(prev => prev.filter(post => post.id !== id));

    const { error } = await supabase
      .from('draft_posts')
      .update({ status: 'archived' })
      .eq('id', id);

    if (error) {
      toast({ title: "Error", description: "Failed to archive post", variant: "destructive" });
      fetchData();
    } else {
      toast({ title: "Post archived", description: "Post has been archived" });
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    toast({ title: "Running pipeline", description: "This may take a few minutes..." });
    
    try {
      const { error } = await supabase.functions.invoke('daily-pipeline');
      
      if (error) throw error;
      
      await fetchData();
      toast({ title: "Success", description: "Content refreshed!" });
    } catch (error) {
      console.error('Pipeline error:', error);
      toast({ title: "Error", description: "Failed to run pipeline", variant: "destructive" });
    } finally {
      setRefreshing(false);
    }
  };

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Filter reading list by source type
  const filteredReadingList = sourceFilter === "all" 
    ? readingList 
    : readingList.filter(item => item.sources?.source_type === sourceFilter);

  const readCount = readingList.filter(item => item.is_read).length;
  const totalCount = readingList.length;
  const progressPercentage = totalCount > 0 ? (readCount / totalCount) * 100 : 0;
  const draftsCount = draftPosts.filter(p => p.status === "draft").length;
  const approvedCount = draftPosts.filter(p => p.status === "approved").length;

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
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8 animate-fade-in">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <CalendarDays className="h-4 w-4" />
              <span className="text-sm">{today}</span>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRefresh}
              disabled={refreshing}
            >
              {refreshing ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Refresh Content
            </Button>
          </div>
          <h1 className="text-3xl font-bold mb-4">
            Good morning, <span className="gradient-text">Doctor</span>
          </h1>
          
          {/* Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div className="glass-card p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Clock className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalCount - readCount}</p>
                  <p className="text-xs text-muted-foreground">To Read</p>
                </div>
              </div>
            </div>
            <div className="glass-card p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
                  <CheckCircle2 className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{readCount}</p>
                  <p className="text-xs text-muted-foreground">Completed</p>
                </div>
              </div>
            </div>
            <div className="glass-card p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10">
                  <FileEdit className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{draftsCount}</p>
                  <p className="text-xs text-muted-foreground">Drafts</p>
                </div>
              </div>
            </div>
            <div className="glass-card p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Send className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{approvedCount}</p>
                  <p className="text-xs text-muted-foreground">Ready to Post</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Two-Column Layout */}
        <div className="grid lg:grid-cols-5 gap-8 animate-fade-in">
          {/* Reading List - 60% */}
          <div className="lg:col-span-3">
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-primary" />
                  <h2 className="text-xl font-semibold">Today's Reading List</h2>
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
              
              {/* Progress Bar */}
              <div className="flex items-center gap-3 mb-4">
                <Progress value={progressPercentage} className="flex-1 h-2" />
                <span className="text-sm text-muted-foreground font-medium">
                  {readCount} of {totalCount} read
                </span>
              </div>
              
              <p className="text-sm text-muted-foreground">
                {filteredReadingList.length > 0 
                  ? `${filteredReadingList.length} articles curated for you`
                  : 'No articles yet. Click "Refresh Content" to fetch today\'s content.'}
              </p>
            </div>
            
            <div className="grid gap-3 max-h-[70vh] overflow-y-auto pr-2">
              {filteredReadingList.map((item, index) => (
                <ReadingListItem
                  key={item.id}
                  title={item.title}
                  source={item.sources?.name || 'Unknown Source'}
                  sourceType={item.sources?.source_type || 'news'}
                  summary={item.summary || 'No summary available'}
                  keyPoints={item.key_points || undefined}
                  relevanceScore={item.relevance_score}
                  isRead={item.is_read}
                  isSaved={item.is_saved}
                  url={item.url}
                  onToggleRead={() => handleToggleRead(item.id)}
                  onToggleSave={() => handleToggleSave(item.id)}
                  index={index}
                />
              ))}
            </div>
          </div>

          {/* Draft Posts - 40% */}
          <div className="lg:col-span-2">
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <FileEdit className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-semibold">LinkedIn Drafts</h2>
              </div>
              <p className="text-sm text-muted-foreground">
                {draftPosts.length > 0
                  ? `${draftPosts.length} AI-generated posts ready for review`
                  : 'No drafts yet. Run the pipeline to generate posts.'}
              </p>
            </div>
            
            <div className="grid gap-4 max-h-[70vh] overflow-y-auto pr-2">
              {draftPosts.map((post, index) => (
                <DraftPost
                  key={post.id}
                  {...post}
                  onUpdate={handleUpdatePost}
                  onApprove={handleApprovePost}
                  onArchive={handleArchivePost}
                  index={index}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Index;
