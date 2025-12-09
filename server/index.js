const express = require('express');
const cors = require('cors');
const http = require('http');
const WebSocket = require('ws');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 3001;
const CACHE_DIR = path.join(__dirname, '..', 'cache');
const TOOLS_CACHE_FILE = path.join(CACHE_DIR, 'tools.json');
const HISTORY_FILE = path.join(CACHE_DIR, 'execution-history.json');
const DATASETS_FILE = path.join(CACHE_DIR, 'datasets.json');
const FAVORITES_FILE = path.join(CACHE_DIR, 'favorites.json');

// Ensure cache directory exists
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Serve static React app in production
const clientBuildPath = path.join(__dirname, '..', 'client', 'build');
if (fs.existsSync(clientBuildPath)) {
  app.use(express.static(clientBuildPath));
}

// Active executions
const activeExecutions = new Map();

// WebSocket connections per execution
const wsConnections = new Map();

// WebSocket handling
wss.on('connection', (ws) => {
  let subscriptions = new Set();

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      if (data.type === 'subscribe' && data.executionId) {
        subscriptions.add(data.executionId);
        if (!wsConnections.has(data.executionId)) {
          wsConnections.set(data.executionId, new Set());
        }
        wsConnections.get(data.executionId).add(ws);
      } else if (data.type === 'unsubscribe' && data.executionId) {
        subscriptions.delete(data.executionId);
        wsConnections.get(data.executionId)?.delete(ws);
      }
    } catch (e) {
      console.error('WebSocket message error:', e);
    }
  });

  ws.on('close', () => {
    subscriptions.forEach((execId) => {
      wsConnections.get(execId)?.delete(ws);
    });
  });
});

function broadcastToExecution(executionId, data) {
  const connections = wsConnections.get(executionId);
  if (connections) {
    const message = JSON.stringify(data);
    connections.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      }
    });
  }
}

// Helper functions
function loadJSON(filepath, defaultValue = []) {
  try {
    if (fs.existsSync(filepath)) {
      return JSON.parse(fs.readFileSync(filepath, 'utf-8'));
    }
  } catch (e) {
    console.error(`Error loading ${filepath}:`, e);
  }
  return defaultValue;
}

function saveJSON(filepath, data) {
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
}

// ========== ZENODO API - Tool Discovery ==========

async function fetchAllBoutiquesTools() {
  const tools = [];
  let page = 1;
  const pageSize = 25;

  console.log('Fetching Boutiques tools from Zenodo...');

  while (true) {
    const query = encodeURIComponent('metadata.subjects.subject:"Boutiques"');
    const url = `https://zenodo.org/api/records?q=${query}&size=${pageSize}&page=${page}&sort=mostrecent`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      if (!data.hits || !data.hits.hits || data.hits.hits.length === 0) {
        break;
      }

      for (const record of data.hits.hits) {
        const tool = {
          id: record.id,
          title: record.metadata?.title || 'Unknown',
          description: record.metadata?.description || '',
          author: record.metadata?.creators?.[0]?.name || 'Unknown',
          version: record.metadata?.version || '1.0.0',
          doi: record.doi || null,
          keywords: record.metadata?.keywords || [],
          publicationDate: record.metadata?.publication_date || null,
          downloads: record.stats?.downloads || 0,
          containerType: detectContainerType(record.metadata?.keywords || []),
          files: record.files || []
        };
        tools.push(tool);
      }

      console.log(`Fetched page ${page}, got ${data.hits.hits.length} tools (total: ${tools.length})`);

      if (data.hits.hits.length < pageSize) {
        break;
      }

      page++;
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));

    } catch (error) {
      console.error(`Error fetching page ${page}:`, error);
      break;
    }
  }

  console.log(`Total tools fetched: ${tools.length}`);
  return tools;
}

function detectContainerType(keywords) {
  const kw = keywords.map(k => k.toLowerCase());
  if (kw.includes('docker')) return 'docker';
  if (kw.includes('singularity') || kw.includes('apptainer')) return 'singularity';
  return 'unknown';
}

async function fetchToolDescriptor(toolId) {
  const descriptorPath = path.join(CACHE_DIR, 'descriptors', `${toolId}.json`);

  // Check cache first
  if (fs.existsSync(descriptorPath)) {
    return JSON.parse(fs.readFileSync(descriptorPath, 'utf-8'));
  }

  // Fetch from Zenodo
  const recordUrl = `https://zenodo.org/api/records/${toolId}`;
  const response = await fetch(recordUrl);

  if (!response.ok) {
    throw new Error(`Failed to fetch record ${toolId}`);
  }

  const record = await response.json();

  // Find the JSON file (exclude metadata.json)
  const jsonFile = record.files?.find(f =>
    f.key.endsWith('.json') && f.key !== 'metadata.json'
  );

  if (!jsonFile) {
    throw new Error('No descriptor file found');
  }

  // Download the descriptor
  const fileUrl = `https://zenodo.org/api/records/${toolId}/files/${jsonFile.key}/content`;
  const fileResponse = await fetch(fileUrl);

  if (!fileResponse.ok) {
    throw new Error('Failed to download descriptor');
  }

  const descriptor = await fileResponse.json();

  // Cache it
  const descriptorsDir = path.join(CACHE_DIR, 'descriptors');
  if (!fs.existsSync(descriptorsDir)) {
    fs.mkdirSync(descriptorsDir, { recursive: true });
  }
  saveJSON(descriptorPath, descriptor);

  return descriptor;
}

// ========== GITHUB API - BIDS Apps Discovery ==========

async function fetchBIDSApps() {
  console.log('Fetching BIDS Apps from GitHub...');

  const url = 'https://api.github.com/orgs/BIDS-Apps/repos?per_page=100';
  const response = await fetch(url, {
    headers: {
      'Accept': 'application/vnd.github.v3+json'
    }
  });

  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status}`);
  }

  const repos = await response.json();

  // Filter out template/example repos
  const excludeNames = ['template', 'example', '.github'];
  const apps = repos
    .filter(repo => !excludeNames.some(name => repo.name.toLowerCase().includes(name)))
    .map(repo => ({
      name: repo.name,
      fullName: repo.full_name,
      description: repo.description || '',
      stars: repo.stargazers_count,
      language: repo.language,
      updatedAt: repo.updated_at,
      htmlUrl: repo.html_url,
      dockerImage: `bids/${repo.name.toLowerCase()}`
    }))
    .sort((a, b) => b.stars - a.stars);

  console.log(`Found ${apps.length} BIDS Apps`);
  return apps;
}

// ========== API Routes ==========

// Get all tools (from cache or fetch)
app.get('/api/tools', async (req, res) => {
  try {
    let tools = loadJSON(TOOLS_CACHE_FILE, null);

    if (!tools) {
      tools = await fetchAllBoutiquesTools();
      saveJSON(TOOLS_CACHE_FILE, tools);
    }

    res.json(tools);
  } catch (error) {
    console.error('Error getting tools:', error);
    res.status(500).json({ error: error.message });
  }
});

// Refresh tools cache
app.post('/api/tools/refresh', async (req, res) => {
  try {
    const tools = await fetchAllBoutiquesTools();
    saveJSON(TOOLS_CACHE_FILE, tools);
    res.json({ success: true, count: tools.length });
  } catch (error) {
    console.error('Error refreshing tools:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get tool descriptor
app.get('/api/tools/:id/descriptor', async (req, res) => {
  try {
    const descriptor = await fetchToolDescriptor(req.params.id);
    res.json(descriptor);
  } catch (error) {
    console.error('Error getting descriptor:', error);
    res.status(500).json({ error: error.message });
  }
});

// Search tools
app.get('/api/tools/search', async (req, res) => {
  try {
    const { q, container, tags } = req.query;
    let tools = loadJSON(TOOLS_CACHE_FILE, []);

    if (q) {
      const query = q.toLowerCase();
      tools = tools.filter(t =>
        t.title.toLowerCase().includes(query) ||
        t.description.toLowerCase().includes(query) ||
        t.keywords.some(k => k.toLowerCase().includes(query))
      );
    }

    if (container && container !== 'all') {
      tools = tools.filter(t => t.containerType === container);
    }

    if (tags) {
      const tagList = tags.split(',').map(t => t.toLowerCase());
      tools = tools.filter(t =>
        tagList.some(tag => t.keywords.some(k => k.toLowerCase().includes(tag)))
      );
    }

    res.json(tools);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get BIDS Apps
app.get('/api/bids-apps', async (req, res) => {
  try {
    const cacheFile = path.join(CACHE_DIR, 'bids-apps.json');
    let apps = loadJSON(cacheFile, null);

    if (!apps) {
      apps = await fetchBIDSApps();
      saveJSON(cacheFile, apps);
    }

    res.json(apps);
  } catch (error) {
    console.error('Error getting BIDS apps:', error);
    res.status(500).json({ error: error.message });
  }
});

// Refresh BIDS Apps cache
app.post('/api/bids-apps/refresh', async (req, res) => {
  try {
    const apps = await fetchBIDSApps();
    saveJSON(path.join(CACHE_DIR, 'bids-apps.json'), apps);
    res.json({ success: true, count: apps.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========== Favorites ==========

app.get('/api/favorites', (req, res) => {
  res.json(loadJSON(FAVORITES_FILE, []));
});

app.post('/api/favorites/:id', (req, res) => {
  const favorites = loadJSON(FAVORITES_FILE, []);
  if (!favorites.includes(req.params.id)) {
    favorites.push(req.params.id);
    saveJSON(FAVORITES_FILE, favorites);
  }
  res.json({ success: true });
});

app.delete('/api/favorites/:id', (req, res) => {
  let favorites = loadJSON(FAVORITES_FILE, []);
  favorites = favorites.filter(id => id !== req.params.id);
  saveJSON(FAVORITES_FILE, favorites);
  res.json({ success: true });
});

// ========== Datasets (BIDS) ==========

app.get('/api/datasets', (req, res) => {
  res.json(loadJSON(DATASETS_FILE, []));
});

app.post('/api/datasets', (req, res) => {
  const { name, path: datasetPath, method } = req.body;
  const datasets = loadJSON(DATASETS_FILE, []);

  const dataset = {
    id: uuidv4(),
    name,
    path: datasetPath,
    method,
    addedAt: new Date().toISOString(),
    validated: false
  };

  datasets.push(dataset);
  saveJSON(DATASETS_FILE, datasets);
  res.json(dataset);
});

app.delete('/api/datasets/:id', (req, res) => {
  let datasets = loadJSON(DATASETS_FILE, []);
  datasets = datasets.filter(d => d.id !== req.params.id);
  saveJSON(DATASETS_FILE, datasets);
  res.json({ success: true });
});

// Browse dataset directory
app.get('/api/datasets/:id/browse', (req, res) => {
  const datasets = loadJSON(DATASETS_FILE, []);
  const dataset = datasets.find(d => d.id === req.params.id);

  if (!dataset) {
    return res.status(404).json({ error: 'Dataset not found' });
  }

  const subpath = req.query.path || '';
  const fullPath = path.join(dataset.path, subpath);

  try {
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ error: 'Path not found' });
    }

    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      const items = fs.readdirSync(fullPath).map(name => {
        const itemPath = path.join(fullPath, name);
        const itemStat = fs.statSync(itemPath);
        return {
          name,
          type: itemStat.isDirectory() ? 'directory' : 'file',
          size: itemStat.size,
          extension: path.extname(name).toLowerCase()
        };
      });
      res.json({ type: 'directory', items });
    } else {
      // Return file info
      res.json({
        type: 'file',
        path: fullPath,
        size: stat.size,
        extension: path.extname(fullPath).toLowerCase()
      });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Read file content (for JSON, TSV, text files)
app.get('/api/files/read', (req, res) => {
  const filePath = req.query.path;

  if (!filePath) {
    return res.status(400).json({ error: 'Path required' });
  }

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    res.json({ content });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Serve NIfTI files for NiiVue
app.get('/api/files/nifti', (req, res) => {
  const filePath = req.query.path;

  if (!filePath) {
    return res.status(400).json({ error: 'Path required' });
  }

  try {
    res.sendFile(filePath);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========== Execution ==========

// Get active executions - must be before :id route
app.get('/api/executions/active', (req, res) => {
  const active = Array.from(activeExecutions.values()).map(e => {
    const { process, ...data } = e;
    return data;
  });
  res.json(active);
});

app.get('/api/executions', (req, res) => {
  res.json(loadJSON(HISTORY_FILE, []));
});

app.get('/api/executions/:id', (req, res) => {
  // Check active executions first
  const active = activeExecutions.get(req.params.id);
  if (active) {
    const { process, ...data } = active;
    return res.json(data);
  }

  // Then check history
  const history = loadJSON(HISTORY_FILE, []);
  const execution = history.find(e => e.id === req.params.id);
  if (!execution) {
    return res.status(404).json({ error: 'Execution not found' });
  }
  res.json(execution);
});

// Track recent execution requests to prevent duplicates
const recentExecutionRequests = new Map();

app.post('/api/execute', async (req, res) => {
  const { toolId, invocation, containerMode, outputDir } = req.body;

  // Create a hash of the request to detect duplicates
  const requestHash = JSON.stringify({ toolId, invocation, containerMode, outputDir });
  const now = Date.now();

  // Check if we've seen this exact request in the last 2 seconds
  const lastRequest = recentExecutionRequests.get(requestHash);
  if (lastRequest && (now - lastRequest.time) < 2000) {
    // Return the existing execution ID instead of creating a new one
    console.log('Duplicate execution request detected, returning existing ID');
    return res.json({ executionId: lastRequest.executionId, status: 'started' });
  }

  const executionId = uuidv4();
  const startTime = new Date().toISOString();

  // Store this request to detect duplicates
  recentExecutionRequests.set(requestHash, { time: now, executionId });
  // Clean up old entries after 5 seconds
  setTimeout(() => recentExecutionRequests.delete(requestHash), 5000);

  // Create execution record
  const execution = {
    id: executionId,
    toolId,
    invocation,
    containerMode,
    outputDir,
    startTime,
    status: 'running',
    stdout: '',
    stderr: '',
    exitCode: null,
    endTime: null
  };

  activeExecutions.set(executionId, execution);

  // Save invocation file
  const invocationPath = path.join(CACHE_DIR, `invocation-${executionId}.json`);
  fs.writeFileSync(invocationPath, JSON.stringify(invocation, null, 2));

  // Get descriptor path
  const descriptorPath = path.join(CACHE_DIR, 'descriptors', `${toolId}.json`);

  // Ensure descriptor exists
  if (!fs.existsSync(descriptorPath)) {
    await fetchToolDescriptor(toolId);
  }

  // Build bosh command
  const args = ['exec', 'launch', descriptorPath, invocationPath, '--verbose'];

  if (containerMode === 'docker') {
    args.push('--force-docker');
  } else if (containerMode === 'singularity') {
    args.push('--force-singularity');
  } else if (containerMode === 'native') {
    args.push('--no-container');
  }

  console.log('Executing:', 'bosh', args.join(' '));

  // Spawn bosh process
  const proc = spawn('bosh', args, {
    cwd: outputDir || process.cwd()
  });

  execution.process = proc;

  proc.stdout.on('data', (data) => {
    const text = data.toString();
    execution.stdout += text;
    broadcastToExecution(executionId, { type: 'stdout', data: text });
  });

  proc.stderr.on('data', (data) => {
    const text = data.toString();
    execution.stderr += text;
    broadcastToExecution(executionId, { type: 'stderr', data: text });
  });

  proc.on('close', (code) => {
    execution.status = code === 0 ? 'completed' : 'failed';
    execution.exitCode = code;
    execution.endTime = new Date().toISOString();

    // Save to history
    const history = loadJSON(HISTORY_FILE, []);
    const { process: _, ...execRecord } = execution;
    history.unshift(execRecord);
    saveJSON(HISTORY_FILE, history);

    // Cleanup
    activeExecutions.delete(executionId);
    fs.unlinkSync(invocationPath);

    broadcastToExecution(executionId, {
      type: 'complete',
      exitCode: code,
      status: execution.status
    });
  });

  proc.on('error', (error) => {
    execution.status = 'error';
    execution.stderr += `\nProcess error: ${error.message}`;
    execution.endTime = new Date().toISOString();

    const history = loadJSON(HISTORY_FILE, []);
    const { process: _, ...execRecord } = execution;
    history.unshift(execRecord);
    saveJSON(HISTORY_FILE, history);

    activeExecutions.delete(executionId);

    broadcastToExecution(executionId, {
      type: 'error',
      error: error.message
    });
  });

  res.json({ executionId, status: 'started' });
});

// Cancel execution
app.post('/api/executions/:id/cancel', (req, res) => {
  const execution = activeExecutions.get(req.params.id);

  if (!execution) {
    return res.status(404).json({ error: 'Execution not found or already completed' });
  }

  if (execution.process) {
    execution.process.kill('SIGTERM');
    execution.status = 'cancelled';
  }

  res.json({ success: true });
});

// ========== Catch-all for React Router ==========

// Serve React app for any non-API routes (must be after all API routes)
if (fs.existsSync(clientBuildPath)) {
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientBuildPath, 'index.html'));
  });
}

// ========== Server Start ==========

server.listen(PORT, () => {
  console.log(`Boutiques UI server running on http://localhost:${PORT}`);
  console.log(`WebSocket server running on ws://localhost:${PORT}`);
});
