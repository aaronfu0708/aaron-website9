/** @type {import('next').NextConfig} */
const nextConfig = {
  // 環境變數設定
  env: {
    NEXT_PUBLIC_BACKEND_API_URL: process.env.NEXT_PUBLIC_BACKEND_API_URL,
    NEXT_PUBLIC_ML_SERVICE_URL: process.env.NEXT_PUBLIC_ML_SERVICE_URL,
    NEXT_PUBLIC_FRONTEND_URL: process.env.NEXT_PUBLIC_FRONTEND_URL,
  },
  
  // 圖片域名設定（如果需要從其他域名載入圖片）
  images: {
    domains: [
      'aaron-website.onrender.com',
      'aaron-website9.onrender.com',
      'aaron-website9.vercel.app'
    ],
  },
  
  // 重定向設定（如果需要）
  async redirects() {
    return [
      // 可以加入重定向規則
    ];
  },
  
  // 標頭設定
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
