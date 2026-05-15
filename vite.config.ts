import react from "@vitejs/plugin-react-swc";
import { defineConfig } from "vite";
import framer from "vite-plugin-framer";
import mkcert from "vite-plugin-mkcert";

const MARBLE_API_PROXY_PREFIX_PATTERN = /^\/marble-api/;

export default defineConfig({
  plugins: [react(), mkcert(), framer()],
  server: {
    proxy: {
      "/marble-api": {
        target: "https://api.marblecms.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(MARBLE_API_PROXY_PREFIX_PATTERN, ""),
        secure: true,
      },
    },
  },
});
