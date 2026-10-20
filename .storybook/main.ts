import type { StorybookConfig } from "@storybook/react-vite";
const config: StorybookConfig = {
  stories: ["../src/**/*.stories.tsx"],
  framework: "@storybook/react-vite",
  addons: [
    "@storybook/addon-docs",
    "@storybook/addon-a11y",
    "@storybook/addon-vitest",
  ],
  core: { disableTelemetry: true },
  viteFinal: async (config) => ({
    ...config,
    base: "/",
    server: { ...config.server, host: "127.0.0.1", strictPort: false },
  }),
};
export default config;
