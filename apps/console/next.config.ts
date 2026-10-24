import type { NextConfig } from 'next';
const config:NextConfig={transpilePackages:['@hunger/core','@hunger/ui'],poweredByHeader:false,distDir:process.env.HUNGER_E2E?'.next-e2e':'.next'};
export default config;
