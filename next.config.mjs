import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,

  outputFileTracingIncludes: {
    '/api/[...path]': ['./server/**/*'],
  },

  serverExternalPackages: [
    '@xenova/transformers',
    'onnxruntime-node',
  ],



  webpack: (config, { isServer }) => {
    // Path aliases used by the frontend (src/)
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, 'src'),
      'lib': path.resolve(__dirname, 'src/app/lib'),
    };

    // Handle binary .node files during Webpack bundling
    config.module.rules.push({
      test: /\.node$/,
      type: 'asset/resource',
    });

    // Node built-ins that have no browser equivalent — tell webpack to skip them
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs:            false,
      net:           false,
      tls:           false,
      child_process: false,
      crypto:        false,
    };

    return config;
  },
};

export default nextConfig;
