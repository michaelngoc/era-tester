import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // server-only ném lỗi ngoài react-server condition; test chạy trực tiếp module server.
      "server-only": path.resolve(__dirname, "./node_modules/server-only/empty.js"),
    },
  },
});
