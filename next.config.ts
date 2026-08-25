import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // La foto de perfil admite hasta 4MB (ver AVATAR_BUCKET en lib/actions.ts);
      // el límite por defecto de Server Actions es 1MB, muy poco para una foto real.
      bodySizeLimit: "5mb",
    },
  },
};

export default nextConfig;
