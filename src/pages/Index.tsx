import { useEffect, useState } from "react";
import Layout from "@/components/layout/Layout";
import ReadingListItem from "@/components/dashboard/ReadingListItem";
import DraftPost from "@/components/dashboard/DraftPost";
import { CalendarDays, BookOpen, FileEdit, CheckCircle2, Clock, Send, RefreshCw, Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

type DraftPostStatus = "draft" | "approved" | "archived";

interface ContentItem {
  id: string;
  title: string;
  url: string;
  summary: string | null;
  relevance_score: number;
  is_read: boolean;
  source_id: string | null;
  sources?: { name: string } | null;
}

interface DraftPostData {
  id: string;
  content: string;
  postType: string;
  status: DraftPostStatus;
  content_item_id: string | null;
}

const Index = () => {
  const [readingList, setReadingList] = useState<ContentItem[]>([]);
  const [draftPosts, setDraftPosts] = useState<DraftPostData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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
              relevance_score,
              is_read,
              source_id,
              sources (name)
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

      // Fetch today's draft posts
      const { data: draftsData } = await supabase
        .from('draft_posts')
        .select('*')
        .gte('created_at', today)
        .order('created_at', { ascending: false });

      if (draftsData) {
        setDraftPosts(draftsData.map(d => ({
          id: d.id,
          content: d.edited_text || d.draft_text,
          postType: d.post_type || 'insight',
          status: d.status as DraftPostStatus,
          content_item_id: d.content_item_id
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

  const unreadCount = readingList.filter(item => !item.is_read).length;
  const readCount = readingList.filter(item => item.is_read).length;
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
          
          {/* Dual Purpose Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div className="glass-card p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Clock className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{unreadCount}</p>
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

        {/* Tabbed Interface for Dual Purpose */}
        <Tabs defaultValue="reading" className="animate-fade-in">
          <TabsList className="grid w-full max-w-md grid-cols-2 mb-6 bg-secondary">
            <TabsTrigger value="reading" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <BookOpen className="h-4 w-4" />
              My Reading List
            </TabsTrigger>
            <TabsTrigger value="content" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <FileEdit className="h-4 w-4" />
              LinkedIn Content
            </TabsTrigger>
          </TabsList>

          {/* Reading List Tab */}
          <TabsContent value="reading" className="animate-slide-up">
            <div className="mb-4">
              <h2 className="text-xl font-semibold mb-1">Today's Curated Articles</h2>
              <p className="text-sm text-muted-foreground">
                {readingList.length > 0 
                  ? `${readingList.length} articles curated for you. Mark as read to track progress.`
                  : 'No articles yet. Click "Refresh Content" to fetch today\'s content.'}
              </p>
            </div>
            <div className="grid gap-3">
              {readingList.map((item, index) => (
                <ReadingListItem
                  key={item.id}
                  title={item.title}
                  source={item.sources?.name || 'Unknown Source'}
                  summary={item.summary || 'No summary available'}
                  relevanceScore={item.relevance_score}
                  isRead={item.is_read}
                  url={item.url}
                  onToggleRead={() => handleToggleRead(item.id)}
                  index={index}
                />
              ))}
            </div>
          </TabsContent>

          {/* Content Creation Tab */}
          <TabsContent value="content" className="animate-slide-up">
            <div className="mb-4">
              <h2 className="text-xl font-semibold mb-1">LinkedIn Draft Posts</h2>
              <p className="text-sm text-muted-foreground">
                {draftPosts.length > 0
                  ? 'AI-generated posts based on today\'s top articles. Edit, refine, and approve.'
                  : 'No drafts yet. Run the pipeline to generate posts.'}
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {draftPosts.map((post, index) => (
                <DraftPost
                  key={post.id}
                  {...post}
                  onUpdate={handleUpdatePost}
                  onApprove={handleApprovePost}
                  index={index}
                />
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default Index;
