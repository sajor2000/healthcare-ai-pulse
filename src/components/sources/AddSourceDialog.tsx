import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AddSourceDialogProps {
  onAdd: (source: { name: string; url: string; sourceType: string; description?: string }) => void;
}

const AddSourceDialog = ({ onAdd }: AddSourceDialogProps) => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [sourceType, setSourceType] = useState("news");
  const [description, setDescription] = useState("");

  const handleSubmit = () => {
    if (name && url) {
      onAdd({ name, url, sourceType, description: description || undefined });
      setName("");
      setUrl("");
      setSourceType("news");
      setDescription("");
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="glow">
          <Plus className="h-4 w-4 mr-2" />
          Add Source
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] bg-card border-border">
        <DialogHeader>
          <DialogTitle>Add New Source</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Add any website, blog, newsletter, or RSS feed to track healthcare AI content for LinkedIn posts.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Source Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Nature Medicine, TechCrunch AI"
              className="bg-secondary border-border"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="url">URL (Website or RSS Feed)</Label>
            <Input
              id="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com or https://example.com/feed.xml"
              className="bg-secondary border-border"
            />
            <p className="text-xs text-muted-foreground">
              Enter homepage URL or direct RSS/Atom feed URL for better article discovery
            </p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="type">Source Type</Label>
            <Select value={sourceType} onValueChange={setSourceType}>
              <SelectTrigger className="bg-secondary border-border">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="news">📰 News Site</SelectItem>
                <SelectItem value="blog">✍️ Blog / Newsletter</SelectItem>
                <SelectItem value="journal">🔬 Research Journal</SelectItem>
                <SelectItem value="policy">🏛️ Policy / Government</SelectItem>
                <SelectItem value="company">🏢 Company Blog</SelectItem>
                <SelectItem value="podcast">🎙️ Podcast / Media</SelectItem>
                <SelectItem value="social">💬 Social / Community</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this source and why it's valuable for LinkedIn content..."
              className="bg-secondary border-border resize-none h-20"
            />
            <p className="text-xs text-muted-foreground">
              Helps AI understand the source context for better LinkedIn post generation
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!name || !url}>
            Add Source
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddSourceDialog;
