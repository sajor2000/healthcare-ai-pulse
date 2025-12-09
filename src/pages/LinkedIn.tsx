import { useEffect, useState } from "react";
import Layout from "@/components/layout/Layout";
import DraftPost from "@/components/dashboard/DraftPost";
import { FileEdit, Loader2, Users, Sparkles, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

type DraftPostStatus = "draft" | "approved" | "archived";

interface DraftPostData {
  id: string;
  content: string;
  postType: string;
  status: DraftPostStatus;
  content_item_id: string | null;
  sourceUrl?: string;
  sourceTitle?: string;
  relevanceScore?: number;
}

const LinkedIn = () => {
  const [draftPosts, setDraftPosts] = useState<DraftPostData[]>([]);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);

  const fetchDrafts = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];

      // Fetch today's draft posts with content item info (top 3)
      const { data: draftsData } = await supabase
        .from('draft_posts')
        .select(`
          *,
          content_items (url, title, relevance_score)
        `)
        .gte('created_at', today)
        .neq('status', 'archived')
        .order('created_at', { ascending: true })
        .limit(3);

      if (draftsData) {
        setDraftPosts(draftsData.map(d => ({
          id: d.id,
          content: d.edited_text || d.draft_text,
          postType: d.post_type || 'insight',
          status: d.status as DraftPostStatus,
          content_item_id: d.content_item_id,
          sourceUrl: (d as any).content_items?.url,
          sourceTitle: (d as any).content_items?.title,
          relevanceScore: (d as any).content_items?.relevance_score
        })));
      }
    } catch (error) {
      console.error('Error fetching drafts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrafts();
  }, []);

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
      fetchDrafts();
    } else {
      toast({ title: "Post archived", description: "Post has been archived" });
    }
  };

  const handleRegenerate = async () => {
    setRegenerating(true);
    toast({ title: "Generating drafts", description: "Creating 3 best posts for your community..." });

    try {
      const { error } = await supabase.functions.invoke('draft-posts');
      if (error) throw error;
      await fetchDrafts();
      toast({ title: "Success", description: "New drafts generated!" });
    } catch (error) {
      console.error('Regenerate error:', error);
      toast({ title: "Error", description: "Failed to regenerate drafts", variant: "destructive" });
    } finally {
      setRegenerating(false);
    }
  };

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
                <span className="gradient-text">LinkedIn</span> Drafts
              </h1>
              <p className="text-muted-foreground">
                Top 3 AI-curated posts for your healthcare AI community
              </p>
            </div>
            <Button 
              variant="outline" 
              onClick={handleRegenerate}
              disabled={regenerating}
            >
              {regenerating ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Regenerate
            </Button>
          </div>

          {/* Target Audience */}
          <div className="glass-card p-4 mb-6">
            <div className="flex items-center gap-3 mb-3">
              <Users className="h-5 w-5 text-primary" />
              <span className="font-medium">Target Community</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
                Healthcare AI
              </span>
              <span className="px-3 py-1 rounded-full bg-success/10 text-success text-sm font-medium">
                ICU Physicians
              </span>
              <span className="px-3 py-1 rounded-full bg-warning/10 text-warning text-sm font-medium">
                Operational AI Leaders
              </span>
            </div>
          </div>
        </div>

        {/* Drafts */}
        {draftPosts.length === 0 ? (
          <div className="glass-card p-8 text-center animate-fade-in">
            <Sparkles className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">
              No drafts yet. Run the pipeline from the Dashboard to generate posts.
            </p>
            <Button onClick={handleRegenerate} disabled={regenerating}>
              {regenerating ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              Generate Drafts
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {draftPosts.map((post, index) => (
              <div key={post.id} className="animate-slide-up" style={{ animationDelay: `${index * 100}ms` }}>
                <div className="mb-2 flex items-center gap-2">
                  <span className="text-sm font-medium text-primary">
                    #{index + 1} Best Pick
                  </span>
                  {post.sourceTitle && (
                    <span className="text-sm text-muted-foreground truncate max-w-md">
                      — {post.sourceTitle}
                    </span>
                  )}
                  {post.relevanceScore && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                      Score: {post.relevanceScore}
                    </span>
                  )}
                </div>
                <DraftPost
                  {...post}
                  onUpdate={handleUpdatePost}
                  onApprove={handleApprovePost}
                  onArchive={handleArchivePost}
                  index={index}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default LinkedIn;