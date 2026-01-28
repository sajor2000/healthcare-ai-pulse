import { useEffect, useState } from "react";
import Layout from "@/components/layout/Layout";
import SourceCard from "@/components/sources/SourceCard";
import AddSourceDialog from "@/components/sources/AddSourceDialog";
import BulkImportDialog from "@/components/sources/BulkImportDialog";
import SourceAnalytics from "@/components/sources/SourceAnalytics";
import { Database, Filter, Loader2, BarChart3 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Source {
  id: string;
  name: string;
  url: string;
  source_type: string | null;
  is_active: boolean | null;
  last_crawled_at: string | null;
  priority: number | null;
}

const Sources = () => {
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSources = async () => {
    try {
      const { data, error } = await supabase
        .from('sources')
        .select('*')
        .order('priority', { ascending: false })
        .order('name');

      if (error) throw error;
      setSources(data || []);
    } catch (error) {
      console.error('Error fetching sources:', error);
      toast({ title: "Error", description: "Failed to load sources", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSources();
  }, []);

  const handleToggle = async (id: string, isActive: boolean) => {
    setSources(prev =>
      prev.map(source =>
        source.id === id ? { ...source, is_active: isActive } : source
      )
    );

    const { error } = await supabase
      .from('sources')
      .update({ is_active: isActive })
      .eq('id', id);

    if (error) {
      setSources(prev =>
        prev.map(source =>
          source.id === id ? { ...source, is_active: !isActive } : source
        )
      );
      toast({ title: "Error", description: "Failed to update source", variant: "destructive" });
    } else {
      toast({
        title: isActive ? "Source activated" : "Source deactivated",
        description: `The source has been ${isActive ? "enabled" : "disabled"}.`,
      });
    }
  };

  const handlePriorityChange = async (id: string, priority: number) => {
    const oldPriority = sources.find(s => s.id === id)?.priority;
    
    setSources(prev =>
      prev.map(source =>
        source.id === id ? { ...source, priority } : source
      )
    );

    const { error } = await supabase
      .from('sources')
      .update({ priority })
      .eq('id', id);

    if (error) {
      setSources(prev =>
        prev.map(source =>
          source.id === id ? { ...source, priority: oldPriority ?? 3 } : source
        )
      );
      toast({ title: "Error", description: "Failed to update priority", variant: "destructive" });
    } else {
      const priorityLabels: Record<number, string> = {
        1: "Low",
        2: "Below Average",
        3: "Normal",
        4: "High",
        5: "Critical"
      };
      toast({
        title: "Priority updated",
        description: `Source priority set to ${priorityLabels[priority]}.`,
      });
    }
  };

  const handleDelete = async (id: string) => {
    const sourceToDelete = sources.find(s => s.id === id);
    setSources(prev => prev.filter(source => source.id !== id));

    const { error } = await supabase
      .from('sources')
      .delete()
      .eq('id', id);

    if (error) {
      if (sourceToDelete) {
        setSources(prev => [...prev, sourceToDelete]);
      }
      toast({ title: "Error", description: "Failed to delete source", variant: "destructive" });
    } else {
      toast({
        title: "Source removed",
        description: "The source has been removed from your list.",
        variant: "destructive",
      });
    }
  };

  const handleAdd = async (source: { name: string; url: string; sourceType: string }) => {
    const { data, error } = await supabase
      .from('sources')
      .insert({
        name: source.name,
        url: source.url,
        source_type: source.sourceType,
        is_active: true,
        priority: 3
      })
      .select()
      .single();

    if (error) {
      toast({ title: "Error", description: "Failed to add source", variant: "destructive" });
    } else if (data) {
      setSources(prev => [...prev, data]);
      toast({
        title: "Source added",
        description: `${source.name} has been added to your sources.`,
      });
    }
  };

  const handleBulkImport = async (sources: { name: string; url: string; sourceType: string }[]) => {
    const insertData = sources.map(source => ({
      name: source.name,
      url: source.url,
      source_type: source.sourceType,
      is_active: true,
      priority: 3
    }));

    const { data, error } = await supabase
      .from('sources')
      .insert(insertData)
      .select();

    if (error) {
      toast({ title: "Error", description: "Failed to import sources", variant: "destructive" });
    } else if (data) {
      setSources(prev => [...prev, ...data]);
      toast({
        title: "Sources imported",
        description: `Successfully imported ${data.length} source${data.length !== 1 ? 's' : ''}.`,
      });
    }
  };

  const activeCount = sources.filter(s => s.is_active).length;
  const highPriorityCount = sources.filter(s => (s.priority ?? 3) >= 4).length;

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
        <div className="flex items-center justify-between mb-8 animate-fade-in">
          <div>
            <h1 className="text-3xl font-bold mb-2">News Sources</h1>
            <p className="text-muted-foreground">
              {activeCount} of {sources.length} sources active
              {highPriorityCount > 0 && ` · ${highPriorityCount} high priority`}
            </p>
          </div>
          <div className="flex gap-2">
            <BulkImportDialog onImport={handleBulkImport} />
            <AddSourceDialog onAdd={handleAdd} />
          </div>
        </div>

        <Tabs defaultValue="analytics" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="sources" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              Sources ({sources.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="analytics">
            <SourceAnalytics />
          </TabsContent>

          <TabsContent value="sources">
            <div className="space-y-3">
              {sources.map((source, index) => (
                <SourceCard
                  key={source.id}
                  id={source.id}
                  name={source.name}
                  url={source.url}
                  sourceType={source.source_type || 'news'}
                  isActive={source.is_active ?? true}
                  priority={source.priority ?? 3}
                  onToggle={handleToggle}
                  onDelete={handleDelete}
                  onPriorityChange={handlePriorityChange}
                  index={index}
                />
              ))}
            </div>

            {sources.length === 0 && (
              <div className="glass-card p-12 text-center">
                <Filter className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No sources configured</h3>
                <p className="text-muted-foreground mb-4">
                  Add your first news source to start tracking healthcare AI content.
                </p>
                <AddSourceDialog onAdd={handleAdd} />
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default Sources;
