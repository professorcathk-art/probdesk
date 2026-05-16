"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { MarketplaceListing } from "@/actions/marketplace";
import { ConnectModal } from "@/components/connect-modal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Props = {
  listings: MarketplaceListing[];
  currentUserId: string | null;
  pendingIntentIds: string[];
};

export function MarketplaceGrid({ listings, currentUserId, pendingIntentIds }: Props) {
  const router = useRouter();
  const pending = useMemo(() => new Set(pendingIntentIds), [pendingIntentIds]);
  const [connectOpen, setConnectOpen] = useState(false);
  const [ctx, setCtx] = useState<{ receiverUserId: string; receiverIntentId: string } | null>(null);

  return (
    <>
      <div className="grid gap-6 md:grid-cols-2">
        {listings.map((item) => (
          <Card key={item.id} className="border-white/10 bg-white/[0.035] backdrop-blur-xl">
            <CardHeader className="gap-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full border border-white/10 bg-gradient-to-br from-slate-200/25 to-slate-600/20 blur-[4px]" />
                  <div>
                    <CardTitle className="text-base text-slate-200">Anonymous seeker</CardTitle>
                    <CardDescription className="text-slate-500">Identity revealed after mutual acceptance</CardDescription>
                  </div>
                </div>
                <Badge variant="outline" className="border-white/15 text-slate-200">
                  {item.location_filter ?? "Location undisclosed"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm leading-relaxed text-slate-200">{item.natural_language_input}</p>
              <Button
                className="w-full border border-sky-400/35 bg-sky-500/15 text-sky-50 hover:bg-sky-500/25 disabled:opacity-60"
                disabled={currentUserId === item.user_id || pending.has(item.id)}
                onClick={() => {
                  if (!currentUserId) {
                    router.push("/login");
                    return;
                  }
                  setCtx({ receiverUserId: item.user_id, receiverIntentId: item.id });
                  setConnectOpen(true);
                }}
              >
                {pending.has(item.id) ? "Pending" : "Connect"}
              </Button>
            </CardContent>
          </Card>
        ))}
        {listings.length === 0 ? (
          <p className="col-span-full text-center text-sm text-slate-500">
            Square is quiet — check back after experts publish public intents.
          </p>
        ) : null}
      </div>

      {ctx ? (
        <ConnectModal
          open={connectOpen}
          onOpenChange={(open) => {
            setConnectOpen(open);
            if (!open) router.refresh();
          }}
          receiverUserId={ctx.receiverUserId}
          receiverIntentId={ctx.receiverIntentId}
          headline="this listing"
        />
      ) : null}
    </>
  );
}
