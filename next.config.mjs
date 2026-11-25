/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: { serverActions: { bodySizeLimit: '6mb' } },
  serverExternalPackages: ['pg', 'bcryptjs'],
};
export default nextConfig;
