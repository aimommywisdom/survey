import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

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

// 讓 next dev 也拿得到 Cloudflare 綁定（D1），與部署環境一致。
// 本機資料在 .wrangler/state/v3（wrangler d1 --local 也用同一份）。
initOpenNextCloudflareForDev();
