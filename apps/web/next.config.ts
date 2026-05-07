import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs';

const nextConfig: NextConfig = {};

export default withSentryConfig(nextConfig, {
  org: 'flowchat',
  project: 'flowchat-web',
  silent: true,
  widenClientFileUpload: true,
  disableLogger: true,
});
