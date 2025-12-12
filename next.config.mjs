/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Temporarily ignore ESLint during builds due to configuration conflict
    // Run `npm run lint` manually to check for linting errors
    ignoreDuringBuilds: true,
  },
};
export default nextConfig;
