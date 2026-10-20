import { white } from "@carbon/themes";
import { purple, cyan, teal, magenta } from "@carbon/colors";
/** Shared Carbon authority for host exports and the capability-free artifact SDK. */
export const carbon = Object.freeze({
  theme: "white",
  fontFamily: "IBM Plex Sans, Helvetica Neue, Arial, sans-serif",
  colors: {
    background: white.background,
    layer: white.layer01,
    text: white.textPrimary,
    textSecondary: white.textSecondary,
    border: white.borderSubtle01,
    focus: white.focus,
    interactive: white.interactive,
  },
  dataColors: [purple[70], cyan[50], teal[70], magenta[70]],
  chartOptions: {
    theme: "white",
    animations: false,
    toolbar: { enabled: false },
    resizable: true,
  },
});
