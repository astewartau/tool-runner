#!/bin/bash
# Boutiques UI Startup Script for JupyterLab integration

set -e

APP_DIR="${APP_DIR:-/opt/boutiques-ui}"
cd "$APP_DIR"

# Export environment variables for the app
export NODE_ENV=production
export PORT=3001

# Start the Express server (serves both API and built React app)
exec node server/index.js
