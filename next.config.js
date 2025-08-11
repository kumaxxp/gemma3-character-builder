/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  
  // Ollama APIへのプロキシ設定
  async rewrites() {
    return [
      {
        source: '/api/ollama/:path*',
        destination: 'http://localhost:11434/:path*',
      },
    ];
  },
  
  // 環境変数
  env: {
    NEXT_PUBLIC_OLLAMA_ENDPOINT: process.env.NEXT_PUBLIC_OLLAMA_ENDPOINT || 'http://localhost:11434',
    NEXT_PUBLIC_GPU_CONFIG: process.env.NEXT_PUBLIC_GPU_CONFIG || 'rtx_a5000',
  },
}

module.exports = nextConfig