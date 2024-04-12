import { redirects } from './src/redirects.mjs';

const externals = [];

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  swcMinify: true,
  transpilePackages: [
    '@fuel-explorer/graphql-new',
    'app-commons',
    'app-portal',
  ],
  experimental: {
    externalDir: true,
    serverComponentsExternalPackages: externals,
    missingSuspenseWithCSRBailout: false,
    esmExternals: true,
    typedRoutes: true,
  },
  /** We run eslint as a separate task in CI */
  eslint: {
    ignoreDuringBuilds: !!process.env.CI,
  },
  redirects: async () => {
    return [
      {
        source: '/portal-storybook',
        destination: '/portal-storybook/index.html',
        permanent: false,
      },
      {
        source: '/storybook',
        destination: '/storybook/index.html',
        permanent: false,
      },
      {
        source: '/ui',
        destination: '/ui/index.html',
        permanent: false,
      },
      {
        source: '/portal/bridge',
        destination: '/bridge',
        permanent: false,
      },
      {
        source: '/portal/ecosystem',
        destination: '/ecosystem',
        permanent: false,
      },
      ...redirects,
    ];
  },
  webpack: (config) => {
    config.externals.push(
      {
        'utf-8-validate': 'commonjs utf-8-validate',
        bufferutil: 'commonjs bufferutil',
        encoding: 'commonjs encoding',
        module: 'commonjs module',
      },
      // https://github.com/WalletConnect/walletconnect-monorepo/issues/1908
      'pino-pretty',
      'net',
      'tls',
    );

    // Grab the existing rule that handles SVG imports
    const fileLoaderRule = config.module.rules.find((rule) =>
      rule.test?.test?.('.svg'),
    );
    config.module.rules.push(
      {
        ...fileLoaderRule,
        test: /\.svg$/i,
        resourceQuery: /url/, // *.svg?url
      },
      {
        test: /\.svg$/i,
        issuer: /\.[jt]sx?$/,
        resourceQuery: { not: /url/ }, // exclude if *.svg?url
        use: [
          {
            loader: '@svgr/webpack',
            options: {
              exportType: 'named',
            },
          },
        ],
      },
    );
    // Modify the file loader rule to ignore *.svg, since we have it handled now.
    fileLoaderRule.exclude = /\.svg$/i;

    return config;
  },
};

export default config;
