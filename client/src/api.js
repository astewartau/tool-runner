// Determine API base URL based on current location
// When running through jupyter-server-proxy, use relative paths
// When running standalone (Electron or dev), use localhost:3001
function getApiBase() {
  // Check if we're running through jupyter-server-proxy (path contains /boutiques-ui/)
  if (window.location.pathname.includes('/boutiques-ui/') || window.location.pathname.startsWith('/boutiques-ui')) {
    // Use relative path that jupyter-server-proxy will route correctly
    const basePath = window.location.pathname.split('/boutiques-ui')[0] + '/boutiques-ui';
    return `${window.location.origin}${basePath}/api`;
  }
  // Standalone mode - use localhost:3001
  return 'http://localhost:3001/api';
}

function getWsUrl() {
  if (window.location.pathname.includes('/boutiques-ui/') || window.location.pathname.startsWith('/boutiques-ui')) {
    // WebSocket through jupyter-server-proxy
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const basePath = window.location.pathname.split('/boutiques-ui')[0] + '/boutiques-ui';
    return `${protocol}//${window.location.host}${basePath}`;
  }
  return 'ws://localhost:3001';
}

const API_BASE = getApiBase();
const WS_URL = getWsUrl();

export async function fetchTools() {
  const res = await fetch(`${API_BASE}/tools`);
  if (!res.ok) throw new Error('Failed to fetch tools');
  return res.json();
}

export async function refreshTools() {
  const res = await fetch(`${API_BASE}/tools/refresh`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to refresh tools');
  return res.json();
}

export async function searchTools(query, container, tags) {
  const params = new URLSearchParams();
  if (query) params.set('q', query);
  if (container) params.set('container', container);
  if (tags) params.set('tags', tags);
  const res = await fetch(`${API_BASE}/tools/search?${params}`);
  if (!res.ok) throw new Error('Search failed');
  return res.json();
}

export async function fetchToolDescriptor(id) {
  const res = await fetch(`${API_BASE}/tools/${id}/descriptor`);
  if (!res.ok) throw new Error('Failed to fetch descriptor');
  return res.json();
}

export async function fetchBIDSApps() {
  const res = await fetch(`${API_BASE}/bids-apps`);
  if (!res.ok) throw new Error('Failed to fetch BIDS apps');
  return res.json();
}

export async function refreshBIDSApps() {
  const res = await fetch(`${API_BASE}/bids-apps/refresh`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to refresh BIDS apps');
  return res.json();
}

export async function fetchFavorites() {
  const res = await fetch(`${API_BASE}/favorites`);
  if (!res.ok) throw new Error('Failed to fetch favorites');
  return res.json();
}

export async function addFavorite(id) {
  const res = await fetch(`${API_BASE}/favorites/${id}`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to add favorite');
  return res.json();
}

export async function removeFavorite(id) {
  const res = await fetch(`${API_BASE}/favorites/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to remove favorite');
  return res.json();
}

export async function fetchDatasets() {
  const res = await fetch(`${API_BASE}/datasets`);
  if (!res.ok) throw new Error('Failed to fetch datasets');
  return res.json();
}

export async function addDataset(name, path, method) {
  const res = await fetch(`${API_BASE}/datasets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, path, method })
  });
  if (!res.ok) throw new Error('Failed to add dataset');
  return res.json();
}

export async function deleteDataset(id) {
  const res = await fetch(`${API_BASE}/datasets/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete dataset');
  return res.json();
}

export async function browseDataset(id, subpath = '') {
  const params = subpath ? `?path=${encodeURIComponent(subpath)}` : '';
  const res = await fetch(`${API_BASE}/datasets/${id}/browse${params}`);
  if (!res.ok) throw new Error('Failed to browse dataset');
  return res.json();
}

export async function readFile(filePath) {
  const res = await fetch(`${API_BASE}/files/read?path=${encodeURIComponent(filePath)}`);
  if (!res.ok) throw new Error('Failed to read file');
  return res.json();
}

export function getNiftiUrl(filePath) {
  return `${API_BASE}/files/nifti?path=${encodeURIComponent(filePath)}`;
}

export async function fetchExecutions() {
  const res = await fetch(`${API_BASE}/executions`);
  if (!res.ok) throw new Error('Failed to fetch executions');
  return res.json();
}

export async function fetchActiveExecutions() {
  const res = await fetch(`${API_BASE}/executions/active`);
  if (!res.ok) throw new Error('Failed to fetch active executions');
  return res.json();
}

export async function fetchExecution(id) {
  const res = await fetch(`${API_BASE}/executions/${id}`);
  if (!res.ok) throw new Error('Failed to fetch execution');
  return res.json();
}

export async function executeToolAPI(toolId, invocation, containerMode, outputDir) {
  const res = await fetch(`${API_BASE}/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ toolId, invocation, containerMode, outputDir })
  });
  if (!res.ok) throw new Error('Failed to start execution');
  return res.json();
}

export async function cancelExecution(id) {
  const res = await fetch(`${API_BASE}/executions/${id}/cancel`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to cancel execution');
  return res.json();
}

export function createExecutionWebSocket(executionId, onMessage) {
  const ws = new WebSocket(WS_URL);

  ws.onopen = () => {
    ws.send(JSON.stringify({ type: 'subscribe', executionId }));
  };

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      onMessage(data);
    } catch (e) {
      console.error('WebSocket message parse error:', e);
    }
  };

  ws.onerror = (error) => {
    console.error('WebSocket error:', error);
  };

  return ws;
}
