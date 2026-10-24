import { Link, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { Button } from "@/components/ui/button";

export function SiteHeader() {
  const { session } = useSession();
  const navigate = useNavigate();
  return (
    <header className="border-b border-border">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-baseline gap-2">
          <span className="font-serif text-2xl font-semibold">GetSeen</span>
          <span className="hidden text-xs uppercase tracking-[0.2em] text-muted-foreground sm:inline">
            ATS score check
          </span>
        </Link>
        <nav className="flex items-center gap-2">
          {session ? (
            <>
              <Button variant="ghost" asChild>
                <Link to="/history">My scans</Link>
              </Button>
              <Button
                variant="outline"
                onClick={async () => {
                  await supabase.auth.signOut();
                  navigate({ to: "/", replace: true });
                }}
              >
                Sign out
              </Button>
            </>
          ) : (
            <Button variant="outline" asChild>
              <Link to="/auth">Sign in</Link>
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}
