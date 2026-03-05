import { cn } from "@/lib/utils";

function getScoreColor(score: number) {
  if (score >= 80) return "text-green-400 border-green-500/30 bg-green-500/10";
  if (score >= 60) return "text-emerald-400 border-emerald-500/30 bg-emerald-500/10";
  if (score >= 40) return "text-yellow-400 border-yellow-500/30 bg-yellow-500/10";
  if (score >= 20) return "text-orange-400 border-orange-500/30 bg-orange-500/10";
  return "text-red-400 border-red-500/30 bg-red-500/10";
}

export function ScoreBadge({ score, size = "md" }: { score: number; size?: "sm" | "md" | "lg" }) {
  const sizeClasses = {
    sm: "h-8 w-8 text-xs",
    md: "h-12 w-12 text-sm",
    lg: "h-16 w-16 text-lg",
  };

  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-full border-2 font-bold",
        getScoreColor(score),
        sizeClasses[size]
      )}
    >
      {score}
    </div>
  );
}

export function ScoreBar({ score, max, label }: { score: number; max: number; label: string }) {
  const pct = Math.round((score / max) * 100);

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-slate-400">{label}</span>
        <span className="text-slate-300">{score}/{max}</span>
      </div>
      <div className="h-2 rounded-full bg-slate-800">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            pct >= 80 ? "bg-green-500" : pct >= 60 ? "bg-emerald-500" : pct >= 40 ? "bg-yellow-500" : pct >= 20 ? "bg-orange-500" : "bg-red-500"
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
