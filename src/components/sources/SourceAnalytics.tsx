import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell } from "recharts";
import { TrendingUp, Award, FileText, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface SourceStats {
  source_id: string;
  source_name: string;
  source_type: string;
  priority: number;
  article_count: number;
  avg_score: number;
  high_score_count: number;
  max_score: number;
}

const SOURCE_TYPE_COLORS: Record<string, string> = {
  news: "hsl(var(--chart-1))",
  blog: "hsl(var(--chart-2))",
  journal: "hsl(var(--chart-3))",
  policy: "hsl(var(--chart-4))",
  company: "hsl(var(--chart-5))",
  podcast: "hsl(142, 76%, 36%)",
  social: "hsl(280, 87%, 65%)",
};

const chartConfig = {
  avg_score: {
    label: "Avg Score",
    color: "hsl(var(--primary))",
  },
  article_count: {
    label: "Articles",
    color: "hsl(var(--chart-2))",
  },
};

const SourceAnalytics = () => {
  const [stats, setStats] = useState<SourceStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      // Fetch content items with their source information
      const { data: contentItems, error: contentError } = await supabase
        .from('content_items')
        .select(`
          source_id,
          relevance_score,
          sources!content_items_source_id_fkey (
            id,
            name,
            source_type,
            priority
          )
        `)
        .not('source_id', 'is', null);

      if (contentError) throw contentError;

      // Aggregate stats by source
      const sourceMap = new Map<string, SourceStats>();

      contentItems?.forEach((item) => {
        const source = item.sources as unknown as { id: string; name: string; source_type: string; priority: number } | null;
        if (!source) return;

        const existing = sourceMap.get(source.id);
        const score = item.relevance_score ?? 0;

        if (existing) {
          existing.article_count += 1;
          existing.avg_score = ((existing.avg_score * (existing.article_count - 1)) + score) / existing.article_count;
          existing.high_score_count += score >= 70 ? 1 : 0;
          existing.max_score = Math.max(existing.max_score, score);
        } else {
          sourceMap.set(source.id, {
            source_id: source.id,
            source_name: source.name,
            source_type: source.source_type || 'news',
            priority: source.priority ?? 3,
            article_count: 1,
            avg_score: score,
            high_score_count: score >= 70 ? 1 : 0,
            max_score: score,
          });
        }
      });

      const aggregatedStats = Array.from(sourceMap.values())
        .sort((a, b) => b.avg_score - a.avg_score);

      setStats(aggregatedStats);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="mb-8">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (stats.length === 0) {
    return (
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Source Analytics
          </CardTitle>
          <CardDescription>
            No content data available yet. Run the daily pipeline to start collecting analytics.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const topPerformers = stats.slice(0, 5);
  const totalArticles = stats.reduce((sum, s) => sum + s.article_count, 0);
  const avgOverallScore = stats.reduce((sum, s) => sum + s.avg_score, 0) / stats.length;
  const topSource = stats[0];

  // Prepare chart data - top 10 sources by average score
  const chartData = stats.slice(0, 10).map(s => ({
    name: s.source_name.length > 15 ? s.source_name.substring(0, 15) + '...' : s.source_name,
    fullName: s.source_name,
    avg_score: Math.round(s.avg_score),
    article_count: s.article_count,
    source_type: s.source_type,
  }));

  return (
    <div className="space-y-6 mb-8">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Articles</CardDescription>
            <CardTitle className="text-2xl flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              {totalArticles}
            </CardTitle>
          </CardHeader>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active Sources</CardDescription>
            <CardTitle className="text-2xl">{stats.length}</CardTitle>
          </CardHeader>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Avg Relevance Score</CardDescription>
            <CardTitle className="text-2xl flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              {avgOverallScore.toFixed(1)}
            </CardTitle>
          </CardHeader>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Top Performer</CardDescription>
            <CardTitle className="text-lg flex items-center gap-2">
              <Award className="h-5 w-5 text-accent-foreground" />
              <span className="truncate">{topSource?.source_name}</span>
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Top Sources by Average Score
          </CardTitle>
          <CardDescription>
            Sources ranked by their average content relevance score
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[300px] w-full">
            <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 20 }}>
              <XAxis type="number" domain={[0, 100]} />
              <YAxis 
                type="category" 
                dataKey="name" 
                width={120}
                tick={{ fontSize: 12 }}
              />
              <ChartTooltip 
                content={<ChartTooltipContent />}
                formatter={(value, name, props) => [
                  `${value} (${props.payload.article_count} articles)`,
                  "Avg Score"
                ]}
              />
              <Bar dataKey="avg_score" radius={[0, 4, 4, 0]}>
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={SOURCE_TYPE_COLORS[entry.source_type] || "hsl(var(--primary))"} 
                  />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Top Performers Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Top Performing Sources
          </CardTitle>
          <CardDescription>
            Sources generating the highest-scoring content for LinkedIn posts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {topPerformers.map((source, index) => (
              <div 
                key={source.source_id}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm">
                    #{index + 1}
                  </span>
                  <div>
                    <p className="font-medium">{source.source_name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {source.source_type}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {source.article_count} articles
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-lg text-foreground">{source.avg_score.toFixed(1)}</p>
                  <p className="text-xs text-muted-foreground">
                    {source.high_score_count} high-score
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SourceAnalytics;
