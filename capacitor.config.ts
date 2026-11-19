import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "bo.tropigo.app",
  appName: "TropiGO",
  webDir: "public",
  server: {
    url: "https://tropigo-ai.vercel.app",
    cleartext: true,
  },
  android: {
    allowMixedContent: true,
  },
};

export default config;
