import type { StorybookConfig } from '@storybook/react-webpack5';
import path from 'path';

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(js|jsx|ts|tsx)'],
  addons: ['@storybook/addon-essentials'],
  framework: {
    name: '@storybook/react-webpack5',
    options: {},
  },
  typescript: {
    check: false,
    reactDocgen: false,
  },
  webpackFinal: async (config) => {
    // Add path aliases
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, '../src'),
    };
    config.resolve.extensions = ['.ts', '.tsx', '.js', '.jsx', '.json'];

    // Add TypeScript loader
    config.module = config.module || {};
    config.module.rules = config.module.rules || [];
    config.module.rules.push({
      test: /\.(ts|tsx)$/,
      exclude: /node_modules/,
      use: [
        {
          loader: 'babel-loader',
          options: {
            presets: [
              '@babel/preset-env',
              ['@babel/preset-react', { runtime: 'automatic' }],
              '@babel/preset-typescript',
            ],
          },
        },
      ],
    });

    // Configure CSS with PostCSS for Tailwind CSS 4
    const cssRuleIndex = config.module.rules.findIndex(
      (rule) => rule && typeof rule === 'object' && rule.test?.toString().includes('css')
    );

    if (cssRuleIndex !== -1) {
      config.module.rules.splice(cssRuleIndex, 1);
    }

    config.module.rules.push({
      test: /\.css$/,
      use: [
        'style-loader',
        'css-loader',
        {
          loader: 'postcss-loader',
          options: {
            postcssOptions: {
              plugins: [
                ['@tailwindcss/postcss', {}],
              ],
            },
          },
        },
      ],
    });

    return config;
  },
};

export default config;
