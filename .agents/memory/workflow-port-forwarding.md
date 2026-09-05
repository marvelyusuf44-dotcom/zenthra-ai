---
name: Replit workflow port detection
description: Replit workflow behavior observed while starting the Zenthra web server.
---

When the Next.js server reports `Ready` on `0.0.0.0:5000` but a webview
workflow still times out waiting for port 5000, configuring the web workflow
without `waitForPort` allows the healthy process to remain running and the
preview to work through the configured port mapping.

**Why:** In this environment, the runner's port-wait check produced a false
negative even though the server was healthy and answered HTTP requests when
started directly.

**How to apply:** Confirm the workflow log contains the expected host and port,
verify `/api/health` manually, then prefer the no-wait webview workflow instead
of repeatedly restarting the same command.