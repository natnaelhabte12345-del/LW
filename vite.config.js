import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";
import { handleAiChatBody } from "./api/ai-chat.js";

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
    });
    req.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}

export default defineConfig(({ mode }) => {
  const env = { ...process.env, ...loadEnv(mode, process.cwd(), "") };

  return {
    plugins: [
      react(),
      {
        name: "local-gemini-api",
        configureServer(server) {
          server.middlewares.use("/api/ai-chat", async (req, res) => {
            if (req.method !== "POST") {
              res.statusCode = 405;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ error: "Method not allowed" }));
              return;
            }

            try {
              const body = await readJsonBody(req);
              const result = await handleAiChatBody(body, env);
              res.statusCode = result.status;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify(result.body));
            } catch {
              res.statusCode = 500;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ error: "AI Tutor is not reachable right now." }));
            }
          });
        }
      }
    ]
  };
});

