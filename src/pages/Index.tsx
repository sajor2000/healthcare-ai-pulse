import { useEffect, useState } from "react";
import Layout from "@/components/layout/Layout";
import ReadingListItem from "@/components/dashboard/ReadingListItem";
import { CalendarDays, BookOpen, CheckCircle2, Clock, RefreshCw, Loader2, Filter, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { format, subDays, addDays, isToday, parseISO } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

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
  pub_date: string | null;
  sources?: { name: string; source_type: string } | null;
}

const Index = () => {
  const [readingList, setReadingList] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sourceFilter, setSourceFilter] = useState<SourceType>("all");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [availableDates, setAvailableDates] = useState<string[]>([]);

  const fetchAvailableDates = async () => {
    const { data } = await supabase
      .from('reading_lists')
      .select('list_date')
      .order('list_date', { ascending: false })
      .limit(14);

    if (data) {
      setAvailableDates(data.map(d => d.list_date));
    }
  };

  const fetchData = async (date: Date) => {
    setLoading(true);
    try {
      const dateStr = format(date, 'yyyy-MM-dd');
      
      // Fetch reading list for selected date
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
              pub_date,
              sources (name, source_type)
            )
          )
        `)
        .eq('list_date', dateStr)
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
      } else {
        setReadingList([]);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAvailableDates();
  }, []);

  useEffect(() => {
    fetchData(selectedDate);
  }, [selectedDate]);

  const handlePrevDay = () => {
    const newDate = subDays(selectedDate, 1);
    const minDate = subDays(new Date(), 13);
    if (newDate >= minDate) {
      setSelectedDate(newDate);
    }
  };

  const handleNextDay = () => {
    const newDate = addDays(selectedDate, 1);
    if (newDate <= new Date()) {
      setSelectedDate(newDate);
    }
  };

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

  const handleRefresh = async () => {
    setRefreshing(true);
    toast({ title: "Running pipeline", description: "This may take a few minutes..." });
    
    try {
      const { error } = await supabase.functions.invoke('daily-pipeline');
      
      if (error) throw error;
      
      setSelectedDate(new Date());
      await fetchData(new Date());
      await fetchAvailableDates();
      toast({ title: "Success", description: "Content refreshed!" });
    } catch (error) {
      console.error('Pipeline error:', error);
      toast({ title: "Error", description: "Failed to run pipeline", variant: "destructive" });
    } finally {
      setRefreshing(false);
    }
  };

  const handleReset = async () => {
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    
    try {
      // Delete reading list items and drafts for this date
      const { data: readingListData } = await supabase
        .from('reading_lists')
        .select('id')
        .eq('list_date', dateStr)
        .maybeSingle();

      if (readingListData) {
        await supabase.from('reading_list_items').delete().eq('reading_list_id', readingListData.id);
        await supabase.from('draft_posts').delete().eq('reading_list_id', readingListData.id);
        await supabase.from('reading_lists').delete().eq('id', readingListData.id);
      }

      setReadingList([]);
      await fetchAvailableDates();
      toast({ title: "Reset complete", description: "Reading list cleared for this day" });
    } catch (error) {
      console.error('Reset error:', error);
      toast({ title: "Error", description: "Failed to reset", variant: "destructive" });
    }
  };

  const dateLabel = format(selectedDate, 'EEEE, MMMM d, yyyy');
  const isCurrentDay = isToday(selectedDate);
  const canGoBack = selectedDate > subDays(new Date(), 13);
  const canGoForward = !isCurrentDay;

  // Filter reading list by source type
  const filteredReadingList = sourceFilter === "all" 
    ? readingList 
    : readingList.filter(item => item.sources?.source_type === sourceFilter);

  const readCount = readingList.filter(item => item.is_read).length;
  const totalCount = readingList.length;
  const progressPercentage = totalCount > 0 ? (readCount / totalCount) * 100 : 0;

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
            <h1 className="text-3xl font-bold">
              <span className="gradient-text">Reading</span> List
            </h1>
            <div className="flex items-center gap-2">
              {isCurrentDay && (
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
                  Refresh
                </Button>
              )}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Reset Day
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Reset this day's reading list?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will delete all articles and drafts for {dateLabel}. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleReset} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Reset
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>

          {/* Date Navigator */}
          <div className="glass-card p-4 mb-6">
            <div className="flex items-center justify-between">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handlePrevDay}
                disabled={!canGoBack}
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-2 text-center">
                <CalendarDays className="h-5 w-5 text-primary" />
                <span className="font-medium">{dateLabel}</span>
                {isCurrentDay && (
                  <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
                    Today
                  </span>
                )}
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleNextDay}
                disabled={!canGoForward}
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
          </div>
          
          {/* Stats Row */}
          <div className="grid grid-cols-2 gap-4 mb-6">
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
          </div>
        </div>

        {/* Reading List */}
        <div className="animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold">Articles</h2>
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
          {totalCount > 0 && (
            <div className="flex items-center gap-3 mb-4">
              <Progress value={progressPercentage} className="flex-1 h-2" />
              <span className="text-sm text-muted-foreground font-medium">
                {readCount} of {totalCount} read
              </span>
            </div>
          )}

          {filteredReadingList.length === 0 ? (
            <div className="glass-card p-8 text-center">
              <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {totalCount === 0 
                  ? 'No articles for this day. Click "Refresh" to fetch content.'
                  : 'No articles match the selected filter.'}
              </p>
            </div>
          ) : (
            <div className="grid gap-3">
              {filteredReadingList.map((item, index) => (
                <ReadingListItem
                  key={item.id}
                  title={item.title}
                  source={item.sources?.name || 'Unknown Source'}
                  sourceType={item.sources?.source_type || 'journal'}
                  summary={item.summary || 'No summary available'}
                  keyPoints={item.key_points || undefined}
                  relevanceScore={item.relevance_score}
                  isRead={item.is_read}
                  isSaved={item.is_saved}
                  url={item.url}
                  pubDate={item.pub_date || undefined}
                  onToggleRead={() => handleToggleRead(item.id)}
                  onToggleSave={() => handleToggleSave(item.id)}
                  index={index}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Index;