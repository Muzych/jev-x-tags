import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'Jev X Tags',
    description:
      'Tag X/Twitter accounts with TypeSafe Jev and hide posts by tag.',
    permissions: ['storage'],
    host_permissions: [
      'https://x.com/*',
      'https://twitter.com/*',
      'https://api.typesafe.ai/*',
    ],
    icons: {
      16: '/icon-16.png',
      32: '/icon-32.png',
      48: '/icon-48.png',
      128: '/icon-128.png',
    },
    action: {
      default_title: 'Jev X Tags',
      default_icon: {
        16: '/icon-16.png',
        32: '/icon-32.png',
        48: '/icon-48.png',
        128: '/icon-128.png',
      },
    },
  },
});
