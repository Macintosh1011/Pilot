import path from "path";

const __dirname = path.dirname(new URL(import.meta.url).pathname);

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Vercel/monorepo: trace files from the repo root so the standalone build is correct.
  outputFileTracingRoot: path.resolve(__dirname, ".."),
};

export default nextConfig;
