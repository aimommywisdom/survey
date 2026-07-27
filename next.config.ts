import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // §8：全站不被搜尋引擎索引。meta robots（layout.tsx）+ HTTP header 雙保險。
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-Robots-Tag",
            value: "noindex, nofollow, noarchive",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
