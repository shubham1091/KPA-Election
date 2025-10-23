import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  serverExternalPackages: ['pg', 'pg-hstore'],
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Mark pg as external for server-side to prevent bundling
      config.externals = config.externals || [];
      if (Array.isArray(config.externals)) {
        config.externals.push({
          pg: 'commonjs pg',
          'pg-hstore': 'commonjs pg-hstore',
        });
      }
    } else {
      // Don't bundle server-side modules on the client
      config.resolve.fallback = {
        ...config.resolve.fallback,
        pg: false,
        'pg-hstore': false,
      };
    }
    
    return config;
  },
};

export default nextConfig;
