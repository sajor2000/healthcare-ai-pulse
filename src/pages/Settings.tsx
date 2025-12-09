import { useState } from "react";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  Settings as SettingsIcon, 
  Bell, 
  Clock, 
  Linkedin,
  Save,
  Play,
  Loader2,
  CheckCircle
} from "lucide-react";

const Settings = () => {
  const [settings, setSettings] = useState({
    dailyDigest: true,
    digestTime: "07:00",
    autoApprove: false,
    articlesPerDay: "15",
  });
  const [runningPipeline, setRunningPipeline] = useState(false);
  const [pipelineStatus, setPipelineStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleSave = () => {
    toast({
      title: "Settings saved",
      description: "Your preferences have been updated.",
    });
  };

  const handleRunPipeline = async () => {
    setRunningPipeline(true);
    setPipelineStatus('idle');
    
    toast({
      title: "Pipeline started",
      description: "Fetching content from sources... This may take a few minutes.",
    });

    try {
      const { data, error } = await supabase.functions.invoke('daily-pipeline');
      
      if (error) throw error;
      
      setPipelineStatus('success');
      toast({
        title: "Pipeline completed",
        description: "Content has been refreshed successfully!",
      });
    } catch (error) {
      console.error('Pipeline error:', error);
      setPipelineStatus('error');
      toast({
        title: "Pipeline failed",
        description: "There was an error running the pipeline. Check the logs.",
        variant: "destructive",
      });
    } finally {
      setRunningPipeline(false);
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-6 py-8 max-w-2xl">
        <div className="mb-8 animate-fade-in">
          <h1 className="text-3xl font-bold mb-2">Settings</h1>
          <p className="text-muted-foreground">
            Configure your content pipeline and preferences
          </p>
        </div>

        <div className="space-y-8">
          {/* Pipeline Control */}
          <section className="glass-card p-6 animate-slide-up">
            <div className="flex items-center gap-2 mb-4">
              <Play className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Content Pipeline</h2>
            </div>
            
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                The pipeline fetches content from your configured sources, scores relevance, 
                generates your reading list, and drafts LinkedIn posts.
              </p>
              
              <div className="flex items-center gap-4">
                <Button 
                  onClick={handleRunPipeline}
                  disabled={runningPipeline}
                  variant="glow"
                >
                  {runningPipeline ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Running Pipeline...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Run Pipeline Now
                    </>
                  )}
                </Button>
                
                {pipelineStatus === 'success' && (
                  <div className="flex items-center gap-2 text-success">
                    <CheckCircle className="h-4 w-4" />
                    <span className="text-sm">Completed successfully</span>
                  </div>
                )}
              </div>
              
              <p className="text-xs text-muted-foreground">
                Pipeline runs automatically daily at your configured time. You can also trigger it manually.
              </p>
            </div>
          </section>

          {/* LinkedIn Integration */}
          <section className="glass-card p-6 animate-slide-up" style={{ animationDelay: "100ms" }}>
            <div className="flex items-center gap-2 mb-4">
              <Linkedin className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">LinkedIn Integration</h2>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Manual Posting Only</p>
                <p className="text-sm text-muted-foreground">
                  Copy approved drafts to clipboard and paste into LinkedIn. 
                  Direct API posting is not available.
                </p>
              </div>
            </div>
          </section>

          {/* Notification Preferences */}
          <section className="glass-card p-6 animate-slide-up" style={{ animationDelay: "200ms" }}>
            <div className="flex items-center gap-2 mb-4">
              <Bell className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Notifications</h2>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Daily Digest Email</p>
                  <p className="text-sm text-muted-foreground">
                    Receive a daily summary of curated articles
                  </p>
                </div>
                <Switch
                  checked={settings.dailyDigest}
                  onCheckedChange={(checked) => setSettings({ ...settings, dailyDigest: checked })}
                />
              </div>

              <Separator className="bg-border" />

              <div className="space-y-2">
                <Label htmlFor="time" className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Pipeline Run Time (UTC)
                </Label>
                <Input
                  id="time"
                  type="time"
                  value={settings.digestTime}
                  onChange={(e) => setSettings({ ...settings, digestTime: e.target.value })}
                  className="bg-secondary border-border w-32"
                  disabled={!settings.dailyDigest}
                />
                <p className="text-xs text-muted-foreground">
                  Time when the daily pipeline runs automatically
                </p>
              </div>
            </div>
          </section>

          {/* Content Settings */}
          <section className="glass-card p-6 animate-slide-up" style={{ animationDelay: "300ms" }}>
            <div className="flex items-center gap-2 mb-4">
              <SettingsIcon className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Content Settings</h2>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="articles">Target Articles per Day</Label>
                <Input
                  id="articles"
                  type="number"
                  min="5"
                  max="25"
                  value={settings.articlesPerDay}
                  onChange={(e) => setSettings({ ...settings, articlesPerDay: e.target.value })}
                  className="bg-secondary border-border w-24"
                />
                <p className="text-xs text-muted-foreground">
                  Number of articles to include in daily reading list (10-20 recommended)
                </p>
              </div>

              <Separator className="bg-border" />

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Auto-approve Low-edit Posts</p>
                  <p className="text-sm text-muted-foreground">
                    Automatically approve posts with minimal edits
                  </p>
                </div>
                <Switch
                  checked={settings.autoApprove}
                  onCheckedChange={(checked) => setSettings({ ...settings, autoApprove: checked })}
                />
              </div>
            </div>
          </section>

          {/* Save Button */}
          <div className="flex justify-end animate-slide-up" style={{ animationDelay: "400ms" }}>
            <Button onClick={handleSave} variant="glow" size="lg">
              <Save className="h-4 w-4 mr-2" />
              Save Settings
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Settings;
