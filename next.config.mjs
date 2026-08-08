import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,

  // These packages are require()'d at runtime inside the API route handler.
  // Listing them here tells Next.js NOT to bundle them with webpack —
  // they are loaded directly from node_modules by Node.js at request time.
  serverExternalPackages: [
    '@xenova/transformers',
    '@supabase/supabase-js',
    'pdf-parse',
    'bcryptjs',
    'jsonwebtoken',
    'express',
    'cors',
    'multer',
    'uuid',
    'socket.io',
    'dotenv',
    'google-auth-library',
    '@google/genai',
    'pusher',
  ],

  webpack: (config) => {
    // Path aliases used by the frontend (src/)
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, 'src'),
      'lib': path.resolve(__dirname, 'src/app/lib'),
    };

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
