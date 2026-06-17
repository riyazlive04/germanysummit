/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Container-friendly: emit a self-contained server bundle for Docker/PM2.
  output: "standalone",
  // pdf-parse and mammoth are CommonJS libs used in route handlers — keep them
  // external to the server bundle so they load correctly at runtime.
  experimental: {
    serverComponentsExternalPackages: ["pdf-parse", "mammoth"],
  },
  // Session-aware short links for event-day distribution (printed QR / WhatsApp).
  // The path tags the phase automatically, no ?session= needed on the share.
  async redirects() {
    return [
      { source: "/arrival", destination: "/reality-check?session=on_arrival", permanent: false },
      { source: "/end-of-day", destination: "/reality-check?session=end_of_day", permanent: false },
      { source: "/pre-event", destination: "/reality-check?session=pre_event", permanent: false },
      // The Secret Playbook now lives at /book; keep the old link working.
      { source: "/playbook", destination: "/book", permanent: false },
    ];
  },
};

export default nextConfig;
