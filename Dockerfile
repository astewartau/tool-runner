# Boutiques UI - JupyterLab Integration
# This Dockerfile creates a JupyterLab environment with Boutiques UI as an integrated app

FROM quay.io/jupyter/base-notebook:latest

LABEL maintainer="Boutiques UI"
LABEL description="JupyterLab with integrated Boutiques UI for neuroimaging tool discovery and execution"

USER root

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Install jupyter-server-proxy
RUN pip install --no-cache-dir jupyter-server-proxy boutiques

# Create app directory
RUN mkdir -p /opt/boutiques-ui

# Copy application files
COPY --chown=${NB_UID}:${NB_GID} package.json /opt/boutiques-ui/
COPY --chown=${NB_UID}:${NB_GID} server /opt/boutiques-ui/server/
COPY --chown=${NB_UID}:${NB_GID} client /opt/boutiques-ui/client/
COPY --chown=${NB_UID}:${NB_GID} assets /opt/boutiques-ui/assets/
COPY --chown=${NB_UID}:${NB_GID} start.sh /opt/boutiques-ui/

# Install Node.js dependencies and build React app
WORKDIR /opt/boutiques-ui
RUN npm install --omit=dev \
    && cd client && npm install && npm run build \
    && rm -rf client/node_modules client/src \
    && cd .. && mkdir -p cache && chmod 777 cache

# Make start script executable
RUN chmod +x /opt/boutiques-ui/start.sh

# Copy JupyterLab configuration
COPY jupyter/jupyter_notebook_config.py /etc/jupyter/jupyter_notebook_config.py

# Switch back to notebook user
USER ${NB_USER}
WORKDIR /home/${NB_USER}

# Expose ports
EXPOSE 8888 3001

# The base image handles the CMD for JupyterLab
