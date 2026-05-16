import { LandingGalaxyScene } from "@/components/landing-galaxy-scene";
import { LandingPageBody } from "@/components/landing-page-body";
import { getAuthContext } from "@/lib/auth-context";

export const dynamic = "force-dynamic";

export default async function Home() {
  const { user, onboardingStatus } = await getAuthContext();

  return (
    <div className="relative min-h-screen text-slate-50">
      <LandingGalaxyScene />
      <LandingPageBody user={user} onboardingStatus={onboardingStatus} />
    </div>
  );
}
