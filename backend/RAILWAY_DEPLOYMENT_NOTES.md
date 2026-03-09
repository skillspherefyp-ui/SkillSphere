# Railway Deployment Notes

This repository is a monorepo.

The Railway backend service should use `/backend` as its Root Directory.

The Railway backend service should use `/backend/railway.toml` as its Config File Path.

The watch paths in that config are limited to backend files so changes under `AppAndroidSS` do not trigger backend deployments.
