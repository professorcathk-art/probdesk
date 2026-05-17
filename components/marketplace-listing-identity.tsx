"use client";

import type { MarketplaceListing } from "@/actions/marketplace";
import { useLanguage } from "@/components/language-provider";
import { Badge } from "@/components/ui/badge";
import { displayGenderLabel } from "@/lib/display-gender";
import { cn } from "@/lib/utils";

type Props = {
  listing: MarketplaceListing;
  /** Marquee strip cards — one muted line */
  density?: "default" | "compact";
  className?: string;
};

export function MarketplaceListingIdentity({ listing, density = "default", className }: Props) {
  const { strings } = useLanguage();
  const cx = strings.console;
  const mp = strings.marketplace;

  const genderLabels = {
    genderWoman: cx.genderWoman,
    genderMan: cx.genderMan,
    genderNonBinary: cx.genderNonBinary,
    genderPreferNotSay: cx.genderPreferNotSay,
    genderOther: cx.genderOther,
  };
  const genderLine = displayGenderLabel(listing.gender, genderLabels);
  const kw = listing.interest_keywords ?? [];

  if (density === "compact") {
    const tagHint = kw.slice(0, 4).join(" · ");
    const parts = [genderLine, tagHint].filter(Boolean);
    if (parts.length === 0) return null;
    return <p className={cn("mt-2 line-clamp-2 text-[11px] leading-snug text-slate-500", className)}>{parts.join(" · ")}</p>;
  }

  return (
    <div className={cn("space-y-2", className)}>
      {genderLine ? (
        <p className="text-xs text-slate-400">
          <span className="font-medium text-slate-500">{mp.publicGenderLabel}</span> {genderLine}
        </p>
      ) : (
        <p className="text-xs italic text-slate-600">{mp.publicGenderUnset}</p>
      )}
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500">{mp.publicInterestsLabel}</p>
        {kw.length > 0 ? (
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {kw.map((tag) => (
              <Badge key={tag} variant="outline" className="border-white/12 bg-black/20 text-[11px] font-normal text-slate-300">
                {tag}
              </Badge>
            ))}
          </div>
        ) : (
          <p className="mt-1 text-xs text-slate-600">{mp.noInterestTags}</p>
        )}
      </div>
    </div>
  );
}
