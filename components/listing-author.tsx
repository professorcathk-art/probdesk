import { LockedAvatarPreview } from "@/components/locked-avatar-preview";

export function ListingAuthor({
  name,
  avatar,
  anonymousLabel,
  anonymousHint,
}: {
  name?: string | null;
  avatar?: string | null;
  anonymousLabel: string;
  anonymousHint: string;
}) {
  if (!name) {
    return (
      <div className="flex items-center gap-3">
        <LockedAvatarPreview />
        <div>
          <p className="text-base font-semibold text-[#222]">{anonymousLabel}</p>
          <p className="text-sm text-slate-500">{anonymousHint}</p>
        </div>
      </div>
    );
  }

  const initial = name.slice(0, 1);
  return (
    <div className="flex items-center gap-3">
      {avatar ? (
        // eslint-disable-next-line @next/next/no-img-element -- profile photo from storage
        <img src={avatar} alt="" className="h-12 w-12 rounded-full object-cover" />
      ) : (
        <span className="grid h-12 w-12 place-items-center rounded-full bg-rose-50 text-sm font-semibold text-[#e0484d]">{initial}</span>
      )}
      <div>
        <p className="text-base font-semibold text-[#222]">{name}</p>
        <p className="text-sm text-slate-500">{anonymousHint}</p>
      </div>
    </div>
  );
}
