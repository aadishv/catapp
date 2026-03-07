import { defineConfig } from "@solidjs/start/config";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  ssr: false,
  server: {
    preset: "node-server",
    prerender: {
      routes: ["/"],
    },
  },
  vite: {
    plugins: [tailwindcss()],
    worker: {
      format: "es",
    },
    build: {
      target: "esnext",
    },
  },
});
