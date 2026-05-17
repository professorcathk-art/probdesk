"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

type Props = {
  tags: string[];
  onChange: (next: string[]) => void;
  maxTags: number;
  placeholder: string;
};

export function TagInputField({ tags, onChange, maxTags, placeholder }: Props) {
  const [draft, setDraft] = useState("");

  function commit() {
    const v = draft.trim();
    if (!v || tags.length >= maxTags) return;
    const exists = tags.some((t) => t.toLowerCase() === v.toLowerCase());
    if (exists) return;
    onChange([...tags, v]);
    setDraft("");
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {tags.map((t) => (
          <Badge key={t} variant="outline" className="gap-1 border-white/15 pr-1 text-slate-200">
            {t}
            <button
              type="button"
              className="rounded p-0.5 text-slate-400 hover:bg-white/10 hover:text-slate-100"
              aria-label="Remove tag"
              onClick={() => onChange(tags.filter((x) => x !== t))}
            >
              <X className="h-3 w-3" strokeWidth={2} />
            </button>
          </Badge>
        ))}
      </div>
      <Input
        value={draft}
        disabled={tags.length >= maxTags}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit();
          }
        }}
        placeholder={placeholder}
        className="border-white/10 bg-white/[0.03] text-slate-50 placeholder:text-slate-500"
      />
    </div>
  );
}
