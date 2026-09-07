import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Next regenerates CLAUDE.md on dev start, which overwrites the working notes
  // kept in this repo. Ours is hand-written and version-controlled.
  agentRules: false,

  // Chromium is driven out-of-process by the PDF renderer and must not be
  // traced into the serverless bundle.
  serverExternalPackages: ["puppeteer-core", "@sparticuz/chromium-min"],
};

export default nextConfig;
