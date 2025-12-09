# Boutiques UI - JupyterLab Server Proxy Configuration
# This file configures jupyter-server-proxy to serve Boutiques UI as a JupyterLab app

c.ServerProxy.servers = {
    'boutiques-ui': {
        'command': ['/bin/bash', '/opt/boutiques-ui/start.sh'],
        'port': 3001,
        'timeout': 60,
        'absolute_url': False,
        'launcher_entry': {
            'enabled': True,
            'title': 'Boutiques UI',
            'icon_path': '/opt/boutiques-ui/assets/icon.svg',
            'path_info': 'boutiques-ui'
        }
    }
}
