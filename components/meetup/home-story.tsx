import Link from "next/link";
import { ArrowUpRight, Compass, Dumbbell, Heart, Laptop, Search, TreePine, UserRound, Users } from "lucide-react";
import type { meetupCopy } from "@/lib/meetup-copy";

type Copy = ReturnType<typeof meetupCopy>;

const BUBBLES = [
  { src: "/meetup-covers/cover-date.jpg", label: "catLove" as const, className: "lg:left-0 lg:top-6" },
  { src: "/meetup-covers/cover-badminton.jpg", label: "catClass" as const, className: "lg:left-10 lg:bottom-6" },
  { src: "/meetup-covers/cover-milktea.jpg", label: "catClub" as const, className: "lg:right-8 lg:top-2" },
  { src: "/meetup-covers/cover-harbour.jpg", label: "catWeekly" as const, className: "lg:right-0 lg:bottom-8" },
];

export function HomeStory({ t, signedIn, onBrowse }: { t: Copy; signedIn: boolean; onBrowse: (query: string) => void }) {
  const joinHref = signedIn ? "/create" : "/login?flow=register&after=%2Fcreate";

  return (
    <div className="mt-16 space-y-16 sm:mt-20 sm:space-y-20">
      <section className="relative overflow-hidden rounded-[32px] bg-white px-5 py-12 sm:px-10 sm:py-16">
        <ul className="mx-auto grid max-w-3xl grid-cols-2 gap-4 sm:grid-cols-4 lg:pointer-events-none lg:absolute lg:inset-x-8 lg:top-12 lg:mx-0 lg:block lg:h-[calc(100%-6rem)] lg:max-w-none">
          {BUBBLES.map((bubble, index) => (
            <li key={bubble.src} className={`lg:absolute lg:w-40 ${bubble.className}`}>
              <div className={`relative rounded-[40%_60%_46%_54%] p-1.5 shadow-sm ${index % 2 === 0 ? "rotate-[-4deg] bg-violet-100" : "rotate-[4deg] bg-rose-100"}`}>
                {/* eslint-disable-next-line @next/next/no-img-element -- local cover photo */}
                <img src={bubble.src} alt="" className="aspect-[4/5] w-full rounded-[38%_58%_44%_56%] object-cover" />
                <span className="absolute bottom-4 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 shadow-sm">
                  {t[bubble.label]}
                </span>
              </div>
            </li>
          ))}
        </ul>
        <div className="relative mx-auto max-w-lg px-2 pt-4 text-center lg:px-8 lg:py-24">
          <h2 className="text-3xl font-bold leading-tight tracking-tight text-slate-900 sm:text-4xl">{t.storyTitle}</h2>
          <p className="mt-4 text-sm leading-6 text-slate-500 sm:text-base">{t.storyLead}</p>
          <Link href={joinHref} className="mt-6 inline-flex min-h-11 items-center rounded-full bg-[#222] px-6 text-sm font-semibold text-white hover:bg-black">
            {t.storyJoin}
          </Link>
        </div>
      </section>

      <section className="relative px-1 py-2 sm:px-10">
        <Heart className="absolute left-4 top-0 hidden h-12 w-12 text-rose-200 sm:block" aria-hidden />
        <p className="absolute right-8 top-1 hidden text-xs font-semibold tracking-wide text-[#ff8a80] sm:block">{t.catSocial}</p>
        <div className="relative mx-auto max-w-3xl overflow-hidden rounded-[32px] bg-white px-6 py-12 text-center shadow-[0_24px_70px_rgba(15,23,42,0.07)] sm:px-16">
          <span className="pointer-events-none absolute -left-8 top-0 hidden h-28 w-28 rounded-full bg-rose-100 sm:block" aria-hidden />
          <span className="pointer-events-none absolute -right-10 -top-8 hidden h-32 w-32 rounded-[40%] bg-violet-100 sm:block" aria-hidden />
          {/* eslint-disable-next-line @next/next/no-img-element -- local cover photo */}
          <img src="/meetup-covers/cover-pets.jpg" alt="" className="absolute left-6 top-12 hidden h-16 w-16 rounded-full object-cover ring-4 ring-white sm:block" />
          {/* eslint-disable-next-line @next/next/no-img-element -- local cover photo */}
          <img src="/meetup-covers/cover-startup.jpg" alt="" className="absolute right-8 top-16 hidden h-16 w-16 rounded-full object-cover ring-4 ring-white sm:block" />
          {/* eslint-disable-next-line @next/next/no-img-element -- local cover photo */}
          <img src="/meetup-covers/cover-london.jpg" alt="" className="absolute bottom-10 left-12 hidden h-14 w-14 rounded-full object-cover ring-4 ring-white md:block" />
          {/* eslint-disable-next-line @next/next/no-img-element -- local cover photo */}
          <img src="/meetup-covers/cover-home.jpg" alt="" className="absolute bottom-12 right-14 hidden h-14 w-14 rounded-full object-cover ring-4 ring-white md:block" />
          <h2 className="relative text-3xl font-bold tracking-tight text-slate-900">{t.joinTitle}</h2>
          <p className="relative mx-auto mt-3 max-w-md text-sm leading-6 text-slate-500">{t.joinLead}</p>
          <Link href={joinHref} className="relative mt-6 inline-flex min-h-11 items-center rounded-full bg-[#222] px-6 text-sm font-semibold text-white hover:bg-black">
            {signedIn ? t.how3Link : t.joinCta}
          </Link>
        </div>
      </section>

      <CategoryRow t={t} onBrowse={onBrowse} />
      <HowItWorks t={t} />
    </div>
  );
}

function CategoryRow({ t, onBrowse }: { t: Copy; onBrowse: (query: string) => void }) {
  const items = [
    { label: t.catOutdoor, icon: TreePine, bar: "bg-emerald-400", tint: "text-emerald-600" },
    { label: t.catSocial, icon: Users, bar: "bg-orange-300", tint: "text-orange-500" },
    { label: t.catHobby, icon: Compass, bar: "bg-sky-400", tint: "text-sky-500" },
    { label: t.catSport, icon: Dumbbell, bar: "bg-violet-400", tint: "text-violet-500" },
    { label: t.catWork, icon: Laptop, bar: "bg-amber-400", tint: "text-amber-600" },
  ];
  return (
    <section>
      <h2 className="text-2xl font-bold tracking-tight text-slate-900">{t.categoriesTitle}</h2>
      <ul className="mt-5 flex gap-3 overflow-x-auto pb-2">
        {items.map((item) => (
          <li key={item.label} className="min-w-[11.5rem] flex-1">
            <button
              type="button"
              onClick={() => onBrowse(item.label)}
              className="flex h-full min-h-[8.5rem] w-full flex-col justify-between overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-sm hover:-translate-y-0.5 hover:shadow-md"
            >
              <span className="flex items-start justify-between gap-2 p-4 font-semibold leading-snug text-slate-900">
                {item.label}
                <ArrowUpRight className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
              </span>
              <span className="flex items-end justify-end px-4">
                <item.icon className={`h-6 w-6 ${item.tint}`} aria-hidden />
              </span>
              <span className={`mt-3 h-1.5 w-full ${item.bar}`} aria-hidden />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function HowItWorks({ t }: { t: Copy }) {
  const steps = [
    { href: "#home-listings", title: t.how1Title, body: t.how1Body, link: t.how1Link, icon: Search },
    { href: "/square", title: t.how2Title, body: t.how2Body, link: t.how2Link, icon: UserRound },
    { href: "/create", title: t.how3Title, body: t.how3Body, link: t.how3Link, icon: Users },
  ];
  return (
    <section className="relative pb-4">
      <h2 className="text-center text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{t.howTitle}</h2>
      <ol className="relative mt-8 grid gap-4 md:grid-cols-3 md:gap-6">
        {steps.map((step) => (
          <li key={step.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <step.icon className="h-5 w-5 text-[#7c6af7]" aria-hidden />
            <h3 className="mt-3 font-semibold text-slate-900">{step.title}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-500">{step.body}</p>
            <Link href={step.href} className="mt-3 inline-flex min-h-11 items-center text-sm font-medium text-[#6d5efc] hover:underline">
              {step.link}
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
