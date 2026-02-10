/** @type {import('next').NextConfig} */
const nextConfig = {
  // Externalize @selanet/sdk native addon so webpack doesn't try to bundle it
  serverExternalPackages: ["@selanet/sdk"],
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Prevent webpack from trying to parse native .node files
      config.externals = config.externals || [];
      config.externals.push({
        "@selanet/sdk": "commonjs @selanet/sdk",
      });
    }
    return config;
  },
};

module.exports = nextConfig;
