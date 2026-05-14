import type { Express, Request, Response, NextFunction } from "express";
import http from "node:http";
import https from "node:https";
import { URL } from "node:url";

/**
 * Forward /api/* to a PHP backend (same paths and JSON contract as server/routes.ts).
 */
export function mountPhpApiProxy(app: Express, targetBase: string): void {
  const target = new URL(targetBase.replace(/\/$/, ""));

  app.use((req: Request, res: Response, next: NextFunction) => {
    if (!req.path.startsWith("/api")) {
      next();
      return;
    }

    const lib = target.protocol === "https:" ? https : http;
    const opts: http.RequestOptions = {
      hostname: target.hostname,
      port: target.port || (target.protocol === "https:" ? "443" : "80"),
      path: req.originalUrl,
      method: req.method,
      headers: {
        ...req.headers,
        host: target.host,
      },
    };

    const proxyReq = lib.request(opts, (proxyRes) => {
      res.writeHead(proxyRes.statusCode ?? 502, proxyRes.headers);
      proxyRes.pipe(res);
    });

    proxyReq.on("error", (err) => {
      console.error("[php-proxy]", err);
      if (!res.headersSent) {
        res.status(502).json({ message: "PHP API unavailable" });
      }
    });

    req.pipe(proxyReq);
  });
}
