import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [react()],
  server: {
     allowedHosts: true,
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
        secure: false, // For HTTPS targets with self-signed certs
        rewrite: (path) => path.replace(/^\/api/, ""),
        configure: (proxy, options) => {
          // For websocket support
          proxy.on("error", (err) => console.error("Proxy error:", err));
          proxy.on("proxyReq", (proxyReq) => {
            console.log("Proxy request to:", proxyReq.path);
          });
        },
      },
    },
  },
});
