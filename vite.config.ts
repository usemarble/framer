import react from "@vitejs/plugin-react-swc"
import { defineConfig } from "vite"
import framer from "vite-plugin-framer"
import mkcert from "vite-plugin-mkcert"

export default defineConfig({
    plugins: [react(), mkcert(), framer()],
    server: {
        proxy: {
            "/marble-api": {
                target: "https://api.marblecms.com",
                changeOrigin: true,
                rewrite: path => path.replace(/^\/marble-api/, ""),
                secure: true,
            },
        },
    },
})
