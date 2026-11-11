// @ts-check
import starlight from "@astrojs/starlight";
import { defineConfig } from "astro/config";

// Published on GitHub Pages at https://alvfdz.github.io/nutria/.
export default defineConfig({
  site: "https://alvfdz.github.io",
  base: "/nutria",
  integrations: [
    starlight({
      title: "Nutria",
      description:
        "Self-hosted macro tracker and meal planner. Deployment, desktop app and user guide.",
      logo: {
        light: "./brand/acorn.svg",
        dark: "./src/assets/acorn-dark.svg",
        alt: "",
      },
      favicon: "/favicon.svg",
      social: [
        {
          icon: "github",
          label: "Source code",
          href: "https://github.com/alvfdz/nutria",
        },
      ],
      customCss: [
        "@fontsource-variable/geist",
        "@fontsource-variable/geist-mono",
        "./src/styles/nutria.css",
      ],
      sidebar: [
        {
          label: "Deployment",
          items: [
            "deployment/self-hosting",
            "deployment/reverse-proxy",
            "deployment/updating",
            "deployment/password-reset",
          ],
        },
        {
          label: "Desktop app",
          items: ["desktop/linux"],
        },
        {
          label: "User guide",
          items: [
            "guide/first-run",
            "guide/goals",
            "guide/ingredients",
            "guide/meals",
            "guide/calendar",
            "guide/today",
            "guide/account",
          ],
        },
      ],
    }),
  ],
});
