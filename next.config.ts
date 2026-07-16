import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname),
  serverExternalPackages: ["unpdf"],
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "4mb",
    },
    // The (app) layout's XP/level/streak header reads `profiles` via cookies
    // on every server render, but the client Router Cache still reused a
    // stale cached render across sibling navigations (quest -> results ->
    // dashboard) after finish_quest_attempt mutated it outside a Server
    // Action — confirmed live: DB had the new XP, header still showed the
    // pre-battle value until a hard reload, even with router.refresh()
    // called before the redirect. Setting dynamic staleTime to 0 makes every
    // client-side navigation refetch dynamic segments (this layout included)
    // instead of reusing the cache.
    staleTimes: {
      dynamic: 0,
    },
  },
};

export default nextConfig;
