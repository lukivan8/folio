import type { Preview } from "@storybook/react-vite";
import "../src/styles/carbon.scss";
import "../src/styles/tokens.scss";
import "../src/style.css";
const preview: Preview = {
  parameters: {
    layout: "padded",
    backgrounds: {
      options: { folio: { name: "Folio surface", value: "#ffffff" } },
    },
    a11y: { test: "error" },
    options: { storySort: { order: ["Foundations", "UI", "Editor"] } },
  },
  initialGlobals: { backgrounds: { value: "folio" } },
};
export default preview;
