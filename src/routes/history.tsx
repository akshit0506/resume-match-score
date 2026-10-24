import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { Button } from "@/components/ui/button";
import { VERDICT_LABELS, type Verdict } from "@/lib/scoring";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/history")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "My scans | Shortlist" },
      { name: "description", content: "Your saved ATS resume scans." },
      { property: "og:title", content: "My scans | Shortlist" },
      { property: "og:description", content: "Your saved ATS resume score reports." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: History,
});

function History() {
  const { session, loading } = useSession();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["scans", session?.user.id],
    enabled: !!session,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("scans")
        .select("id, job_title, company, resume_name, score, verdict, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  if (loading) return null;
  if (!session)
    return (
      <main className="mx-auto max-w-xl px-6 py-24 text-center">
        <h1 className="text-3xl font-semibold">Sign in to see your scans</h1>
        <Button asChild className="mt-6">
          <Link to="/auth">Sign in</Link>
        </Button>
      </main>
    );

  const remove = async (id: string) => {
    const { error } = await supabase.from("scans").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["scans"] });
  };

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <div className="mb-8 flex items-end justify-between">
        <h1 className="text-4xl font-semibold">My scans</h1>
        <Button asChild>
          <Link to="/">New scan</Link>
        </Button>
      </div>
      {isLoading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : !data?.length ? (
        <p className="text-muted-foreground">No scans yet. Run your first one!</p>
      ) : (
        <ul className="space-y-3">
          {data.map((s) => (
            <li key={s.id} className="flex items-center gap-4 rounded-xl bg-card p-5 shadow-card">
              <span
                className={cn(
                  "w-14 font-serif text-3xl font-semibold",
                  s.score >= 80 ? "text-success" : s.score >= 60 ? "text-warning" : "text-destructive",
                )}
              >
                {s.score}
              </span>
              <Link to="/results/$id" params={{ id: s.id }} className="flex-1">
                <p className="font-medium">
                  {[s.job_title, s.company].filter(Boolean).join(" · ") || "Untitled role"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {VERDICT_LABELS[s.verdict as Verdict]} · {s.resume_name} ·{" "}
                  {new Date(s.created_at).toLocaleDateString()}
                </p>
              </Link>
              <Button variant="ghost" size="icon" onClick={() => remove(s.id)} aria-label="Delete scan">
                <Trash2 />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
