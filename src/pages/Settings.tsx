import { useState } from "react";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { 
  Settings as SettingsIcon, 
  Key, 
  Bell, 
  Clock, 
  Linkedin,
  Save,
  Eye,
  EyeOff
} from "lucide-react";

const Settings = () => {
  const [showApiKey, setShowApiKey] = useState(false);
  const [settings, setSettings] = useState({
    openaiKey: "sk-••••••••••••••••••••••••••••••••",
    linkedinConnected: false,
    dailyDigest: true,
    digestTime: "07:00",
    autoApprove: false,
    articlesPerDay: "10",
  });

  const handleSave = () => {
    toast({
      title: "Settings saved",
      description: "Your preferences have been updated.",
    });
  };

  return (
    <Layout>
      <div className="container mx-auto px-6 py-8 max-w-2xl">
        <div className="mb-8 animate-fade-in">
          <h1 className="text-3xl font-bold mb-2">Settings</h1>
          <p className="text-muted-foreground">
            Configure your API keys and preferences
          </p>
        </div>

        <div className="space-y-8">
          {/* API Configuration */}
          <section className="glass-card p-6 animate-slide-up">
            <div className="flex items-center gap-2 mb-4">
              <Key className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">API Configuration</h2>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="openai">OpenAI API Key</Label>
                <div className="relative">
                  <Input
                    id="openai"
                    type={showApiKey ? "text" : "password"}
                    value={settings.openaiKey}
                    onChange={(e) => setSettings({ ...settings, openaiKey: e.target.value })}
                    className="bg-secondary border-border pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Used for content analysis and post generation
                </p>
              </div>
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
                <p className="font-medium">Connect LinkedIn Account</p>
                <p className="text-sm text-muted-foreground">
                  Enable direct posting to your LinkedIn profile
                </p>
              </div>
              <Button variant={settings.linkedinConnected ? "outline" : "glow"}>
                {settings.linkedinConnected ? "Disconnect" : "Connect"}
              </Button>
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
                  Digest Time
                </Label>
                <Input
                  id="time"
                  type="time"
                  value={settings.digestTime}
                  onChange={(e) => setSettings({ ...settings, digestTime: e.target.value })}
                  className="bg-secondary border-border w-32"
                  disabled={!settings.dailyDigest}
                />
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
                <Label htmlFor="articles">Articles per Day</Label>
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
                  Number of articles to include in daily reading list (5-25)
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
