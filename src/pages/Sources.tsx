import { useState } from "react";
import Layout from "@/components/layout/Layout";
import SourceCard from "@/components/sources/SourceCard";
import AddSourceDialog from "@/components/sources/AddSourceDialog";
import { Database, Filter } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const mockSources = [
  { id: "1", name: "Nature Medicine", url: "https://nature.com/nm", sourceType: "website", isActive: true },
  { id: "2", name: "STAT News", url: "https://statnews.com", sourceType: "rss", isActive: true },
  { id: "3", name: "JAMA Network", url: "https://jamanetwork.com", sourceType: "api", isActive: true },
  { id: "4", name: "Healthcare IT News", url: "https://healthcareitnews.com", sourceType: "rss", isActive: true },
  { id: "5", name: "Modern Healthcare", url: "https://modernhealthcare.com", sourceType: "website", isActive: false },
  { id: "6", name: "The Lancet Digital Health", url: "https://thelancet.com/digital-health", sourceType: "api", isActive: true },
  { id: "7", name: "BioPharma Dive", url: "https://biopharmadive.com", sourceType: "rss", isActive: true },
  { id: "8", name: "Science Daily - Health", url: "https://sciencedaily.com/health", sourceType: "rss", isActive: true },
];

const Sources = () => {
  const [sources, setSources] = useState(mockSources);

  const handleToggle = (id: string, isActive: boolean) => {
    setSources(prev =>
      prev.map(source =>
        source.id === id ? { ...source, isActive } : source
      )
    );
    toast({
      title: isActive ? "Source activated" : "Source deactivated",
      description: `The source has been ${isActive ? "enabled" : "disabled"}.`,
    });
  };

  const handleDelete = (id: string) => {
    setSources(prev => prev.filter(source => source.id !== id));
    toast({
      title: "Source removed",
      description: "The source has been removed from your list.",
      variant: "destructive",
    });
  };

  const handleAdd = (source: { name: string; url: string; sourceType: string }) => {
    const newSource = {
      id: Date.now().toString(),
      ...source,
      isActive: true,
    };
    setSources(prev => [...prev, newSource]);
    toast({
      title: "Source added",
      description: `${source.name} has been added to your sources.`,
    });
  };

  const activeCount = sources.filter(s => s.isActive).length;

  return (
    <Layout>
      <div className="container mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8 animate-fade-in">
          <div>
            <h1 className="text-3xl font-bold mb-2">News Sources</h1>
            <p className="text-muted-foreground">
              {activeCount} of {sources.length} sources active
            </p>
          </div>
          <AddSourceDialog onAdd={handleAdd} />
        </div>

        <div className="flex items-center gap-2 mb-4">
          <Database className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Configured Sources</h2>
        </div>

        <div className="space-y-3">
          {sources.map((source, index) => (
            <SourceCard
              key={source.id}
              {...source}
              onToggle={handleToggle}
              onDelete={handleDelete}
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
      </div>
    </Layout>
  );
};

export default Sources;
