# Boutiques UI

A desktop and web application for discovering, configuring, and executing containerized neuroimaging tools via the [Boutiques](https://boutiques.github.io/) framework.

![License](https://img.shields.io/github/license/astewartau/tool-runner)
![Release](https://img.shields.io/github/v/release/astewartau/tool-runner)

## Features

- **Tool Discovery** - Browse 170+ neuroimaging tools from Zenodo with search and filtering
- **BIDS Apps** - Discover and run BIDS-compatible applications from the BIDS-Apps GitHub organization
- **Dynamic Forms** - Automatically generated parameter forms from Boutiques descriptors
- **Real-time Execution** - Live output streaming via WebSocket during tool execution
- **Dataset Management** - Register and browse BIDS datasets for use with tools
- **NIfTI Viewer** - Built-in neuroimaging file viewer powered by NiiVue
- **Execution History** - Track past and active tool executions
- **Favorites** - Save frequently used tools for quick access

## Installation

### Desktop Application (Electron)

Download the latest release for your platform from the [Releases](https://github.com/astewartau/tool-runner/releases) page:

- **Windows**: `Boutiques.UI-x.x.x.exe`
- **macOS**: `Boutiques.UI-x.x.x.dmg`
- **Linux**: `Boutiques.UI-x.x.x.AppImage` or `boutiques-ui_x.x.x_amd64.deb`

### JupyterLab Integration (NeuroDesk)

Boutiques UI can be integrated into JupyterLab environments like [NeuroDesk](https://www.neurodesk.org/). See the [NeuroDesk Integration](#neurodesk-integration) section below.

### From Source

```bash
# Clone the repository
git clone https://github.com/astewartau/tool-runner.git
cd tool-runner

# Install dependencies
npm install
cd client && npm install && cd ..

# Run in development mode
npm start
```

## Usage

### Discovering Tools

1. Navigate to the **Tools** page to browse available Boutiques tools
2. Use the search bar to filter by name or description
3. Click on a tool to view its details and parameters

### Running a Tool

1. Select a tool and click **Configure & Run**
2. Fill in the required parameters using the dynamic form
3. Select a container execution mode (Docker/Singularity)
4. Click **Execute** to run the tool
5. Monitor real-time output in the execution view

### Managing Datasets

1. Go to the **Datasets** page
2. Click **Add Dataset** to register a BIDS dataset
3. Browse dataset contents and select files for tool inputs

## NeuroDesk Integration

Boutiques UI can run as a JupyterLab application inside NeuroDesk containers.

### Using the Pre-built Image

```bash
# Pull and run the integrated image
docker run -d --name neurodesk-boutiques \
  -p 8888:8888 \
  --shm-size=256m \
  ghcr.io/astewartau/tool-runner:latest
```

### Building from Dockerfile

```bash
# Build the NeuroDesk-integrated image
docker build -f Dockerfile.neurodesk -t boutiques-ui-neurodesk .

# Run with Docker socket for container execution
docker run -d --name boutiques-neurodesk \
  -p 8888:8888 \
  --shm-size=256m \
  -v /var/run/docker.sock:/var/run/docker.sock \
  boutiques-ui-neurodesk
```

### Integrating into Existing NeuroDesk Deployments

Download the web release and configure jupyter-server-proxy:

```bash
# Download and extract
curl -L https://github.com/astewartau/tool-runner/releases/download/v0.1.0/boutiques-ui-web.tar.gz | tar -xz -C /opt/

# Add to jupyter config
cat >> /etc/jupyter/jupyter_notebook_config.py << 'EOF'
c.ServerProxy.servers['boutiques-ui'] = {
    'command': ['/bin/bash', '/opt/web/start.sh'],
    'port': 3001,
    'timeout': 60,
    'new_browser_tab': False,
    'launcher_entry': {
        'enabled': True,
        'title': 'Boutiques UI',
        'icon_path': '/opt/web/assets/icon.svg'
    }
}
EOF
```

## Architecture

```
boutiques-ui/
├── main.js              # Electron main process
├── preload.js           # Electron preload script
├── server/
│   └── index.js         # Express backend + WebSocket server
├── client/
│   └── src/
│       ├── App.js       # React application
│       ├── api.js       # API client
│       └── components/  # React components
├── assets/
│   └── icon.svg         # Application icon
├── Dockerfile           # Standard JupyterLab integration
└── Dockerfile.neurodesk # NeuroDesk-specific integration
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/tools` | GET | List all Boutiques tools |
| `/api/tools/search` | GET | Search tools with filters |
| `/api/tools/:id/descriptor` | GET | Get tool's Boutiques descriptor |
| `/api/bids-apps` | GET | List BIDS Apps |
| `/api/datasets` | GET/POST | Manage datasets |
| `/api/execute` | POST | Execute a tool |
| `/api/executions` | GET | List execution history |
| `/api/executions/active` | GET | List running executions |

## Requirements

- **Node.js** 18+
- **Docker** or **Singularity** for container execution
- **Boutiques** (`pip install boutiques`) for tool execution

## Development

```bash
# Run client only (for frontend development)
cd client && npm start

# Run server only
npm run server

# Run both with Electron
npm start

# Build for distribution
npm run dist
```

## License

MIT License - see [LICENSE](LICENSE) for details.

## Acknowledgments

- [Boutiques](https://boutiques.github.io/) - Tool descriptor framework
- [NeuroDesk](https://www.neurodesk.org/) - Neuroimaging platform
- [NiiVue](https://github.com/niivue/niivue) - WebGL neuroimaging viewer
- [BIDS](https://bids.neuroimaging.io/) - Brain Imaging Data Structure
