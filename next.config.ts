import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /*
   * The dev server refuses /_next/* requests whose origin doesn't match the
   * host it bound to, answering a bare 403. Reaching a server bound to
   * localhost via 127.0.0.1 counts as a mismatch, and the only symptom is that
   * one script chunk fails and the page never hydrates — every form then
   * quietly falls back to a native submit. Allowing both spellings avoids that.
   * Development only; it has no effect on a deployed build.
   */
  allowedDevOrigins: ["localhost", "127.0.0.1"],
};

export default nextConfig;
