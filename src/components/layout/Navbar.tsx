import { NavLink } from "@/components/NavLink";
import { Newspaper, Database, Settings, Sparkles } from "lucide-react";

const Navbar = () => {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/95 backdrop-blur-sm">
      <div className="container mx-auto px-6">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <span className="text-lg font-semibold tracking-tight">
              Healthcare AI <span className="text-primary">Daily</span>
            </span>
          </div>
          
          <div className="flex items-center gap-1">
            <NavLink
              to="/"
              className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium text-muted-foreground transition-colors hover:text-foreground hover:bg-secondary"
              activeClassName="text-foreground bg-secondary"
            >
              <Newspaper className="h-4 w-4" />
              Dashboard
            </NavLink>
            <NavLink
              to="/sources"
              className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium text-muted-foreground transition-colors hover:text-foreground hover:bg-secondary"
              activeClassName="text-foreground bg-secondary"
            >
              <Database className="h-4 w-4" />
              Sources
            </NavLink>
            <NavLink
              to="/settings"
              className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium text-muted-foreground transition-colors hover:text-foreground hover:bg-secondary"
              activeClassName="text-foreground bg-secondary"
            >
              <Settings className="h-4 w-4" />
              Settings
            </NavLink>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
