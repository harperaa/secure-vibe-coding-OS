import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Pinned explicitly during the Next.js 16 upgrade. Both values match the
    // v16 defaults today, but both CHANGED in v16 (`qualities` was previously
    // unrestricted; `minimumCacheTTL` was 60s). Stating them here means a
    // future default change can't silently alter how images are served.
    qualities: [75],
    minimumCacheTTL: 14400,
  },
};

export default nextConfig;
