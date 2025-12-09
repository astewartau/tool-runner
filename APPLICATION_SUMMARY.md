# Boutiques UI - Application Summary

## What is Boutiques UI?

Boutiques UI is a desktop application that provides a graphical interface for discovering, configuring, and executing containerized neuroimaging tools. It serves as an accessible front-end to the [Boutiques](https://boutiques.github.io/) framework, enabling researchers to run complex computational workflows without requiring command-line expertise.

The application runs locally as an Electron app with a React frontend and Node.js backend, communicating with containerized tools via Docker or Singularity/Apptainer.

## Who is it for?

- **Neuroimaging Researchers** conducting brain imaging studies (fMRI, structural MRI, diffusion MRI, PET)
- **Clinical Researchers** analyzing neuroimaging data
- **Lab Managers** overseeing large-scale neuroimaging studies
- **Students and Trainees** learning neuroimaging analysis
- **Research Computing Teams** supporting neuroscience communities

## The Problem it Solves

Neuroimaging research involves running numerous specialized analysis tools (FSL, SPM, ANTs, MRtrix, etc.) that are typically distributed as containerized applications. Researchers face several challenges:

- Tools have complex command-line interfaces that are difficult to learn
- Integrating tools into research pipelines requires extensive technical knowledge
- Managing BIDS (Brain Imaging Data Structure) datasets is time-consuming
- Executing reproducible analyses across different environments is challenging
- Monitoring long-running pipelines and accessing results is cumbersome

Boutiques UI addresses these challenges by providing a unified web interface that abstracts away the complexity while maintaining full power and flexibility.

## Core Features

### 1. Tool Discovery and Search

- Access to **170+ neuroimaging tools** from the Zenodo repository
- Advanced search with filtering by tags, container types, and publication dates
- Favorites system for frequently-used tools
- Ability to add custom tools from Zenodo URLs
- Offline access through local tool caching

### 2. Interactive Tool Execution

- **Dynamic parameter forms** automatically generated from tool descriptors
- Support for Docker, Singularity/Apptainer, or native execution
- **Real-time output streaming** via WebSocket for live monitoring
- Execution control (start, cancel, monitor running tools)
- Input validation before execution
- Complete execution history with timestamps and parameters

### 3. BIDS Dataset Management

- Import datasets via link, copy, or move operations
- Automatic BIDS validation and metadata extraction
- Dataset structure exploration
- Built-in viewers for:
  - NIfTI images (3D neuroimaging data) using NiiVue
  - JSON metadata files
  - TSV/CSV tabular data
  - Text files

### 4. BIDS Apps Integration

- Discovers **100+ BIDS Apps** from the BIDS-Apps GitHub organization
- Browse apps with details like stars, language, and update status
- Run BIDS Apps directly on imported datasets
- Support for participant-level and group-level analysis

### 5. Execution Logging

Every tool execution is recorded with:
- Tool ID and version
- Input parameters
- Output file paths
- Execution duration and exit codes
- Full stdout/stderr logs
- Timestamps for reproducibility

## External Integrations

| Service | Purpose |
|---------|---------|
| **Zenodo** | Tool repository for discovering Boutiques descriptors |
| **GitHub** | BIDS Apps discovery from the BIDS-Apps organization |
| **Docker Hub** | Container image distribution |
| **Boutiques** | Tool descriptor and execution framework |

## System Requirements

- **Node.js 16+** for the application runtime
- **Python with Boutiques** (`pip install boutiques`)
- **Docker or Apptainer/Singularity** for container execution

## Typical Workflow

1. **Browse** - Open Boutiques UI and explore available tools
2. **Search** - Find a specific tool (e.g., search for "FSL")
3. **Configure** - Fill in the auto-generated parameter form
4. **Execute** - Run the tool with real-time output monitoring
5. **Review** - Access output files and execution logs
6. **Document** - Execution record is saved for reproducibility

## Key Benefits

- **Unified Interface** - One platform for multiple neuroimaging tool types
- **BIDS-Native** - Deep integration with the BIDS standard and BIDS Apps ecosystem
- **Containerization-Ready** - First-class support for reproducible, containerized workflows
- **Research Reproducibility** - Complete execution history and parameter tracking
- **Modern UX** - Intuitive interface with responsive design
- **Offline Capable** - Cached tools enable discovery without internet

## Related Projects

- [Boutiques](https://boutiques.github.io/) - Tool descriptor framework
- [BIDS](https://bids.neuroimaging.io/) - Brain Imaging Data Structure standard
- [BIDS-Apps](https://bids-apps.neuroimaging.io/) - Community repository of BIDS-compatible applications

---

## Developer Reference: Rebuilding This Application

This section contains critical implementation details for developers who need to rebuild or recreate this application from scratch.

### Zenodo API Integration

**Base URL:** `https://zenodo.org/api`

**Finding Boutiques Tools:**
The key to discovering Boutiques tools on Zenodo is the subject metadata field. Use this query:

```
q=metadata.subjects.subject:"Boutiques"
```

Full API call example:
```
GET https://zenodo.org/api/records?q=metadata.subjects.subject:"Boutiques"&size=25&page=1&sort=-stats.downloads
```

**Important notes:**
- Zenodo limits unauthenticated requests to 25 results per page
- Paginate through all results to get the full tool list (currently ~170 tools)
- Add a delay between batch requests (500ms-1000ms) to be respectful to the API
- Sort by `-stats.downloads` to show most popular tools first

**Downloading Tool Descriptors:**
Each Zenodo record contains a `.json` file that is the Boutiques descriptor:

```
GET https://zenodo.org/api/records/{record_id}
```

Then find the JSON file in the `files` array (excluding `metadata.json`) and download it:

```
GET https://zenodo.org/api/records/{record_id}/files/{filename}/content
```

**Tool Metadata Structure:**
Extract from Zenodo record:
- `id` - Zenodo record ID (used as tool identifier)
- `metadata.title` - Tool name
- `metadata.description` - Tool description
- `metadata.creators[0].name` - Primary author
- `metadata.version` - Tool version
- `metadata.doi` - DOI for citation
- `metadata.keywords` - Tags (look for "docker" or "singularity" to determine container type)
- `metadata.publication_date` - Publication date
- `stats.downloads` - Download count for popularity sorting

### BIDS Apps Discovery

**GitHub API Endpoint:**
```
GET https://api.github.com/orgs/BIDS-Apps/repos?per_page=100
```

**Organization:** `BIDS-Apps` (case-sensitive)

**Filtering:**
- Exclude repos named `template`, `example`, or `.github`
- Sort by `stargazers_count` for popularity

**Docker Image Convention:**
BIDS Apps follow a naming convention for Docker images:
```
bids/{app-name-lowercase}
```

For example, the `fmriprep` app uses `bids/fmriprep`.

**Getting README:**
```
GET https://api.github.com/repos/BIDS-Apps/{app-name}/readme
```
The content is base64-encoded.

### Boutiques Execution

**Command-Line Tool:** `bosh` (Boutiques Shell)

**Installation:** `pip install boutiques`

**Basic Execution Command:**
```bash
bosh exec launch descriptor.json invocation.json
```

**Common Flags:**
- `--verbose` - Show detailed output
- `--force-singularity` - Use Singularity instead of Docker
- `--force-docker` - Force Docker execution
- `--no-container` - Run without containerization
- `--container-opts "..."` - Pass options to container runtime
- `--debug` - Debug mode

**Invocation File:**
A JSON file mapping parameter IDs to values. The structure depends on the tool's descriptor.

**Descriptor File:**
A Boutiques JSON descriptor defining the tool's inputs, outputs, command-line template, and container information.

### NIfTI Visualization

**Library:** [NiiVue](https://github.com/niivue/niivue)

NiiVue is a WebGL-based neuroimaging viewer that can display NIfTI files directly in the browser.

### Real-Time Output Streaming

Use WebSockets for streaming command output in real-time:
- Create a WebSocket server on the backend
- Broadcast stdout/stderr as it arrives from child processes
- Client subscribes to execution-specific channels using execution IDs

### Key Tag Formats on Zenodo

Tools may use key-value tags in the format `key:value`. Common ones:
- `domain:neuroimaging`
- `schema:boutiques`
- Container types: `docker`, `singularity`

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Electron App                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              React Frontend (Port 3000)                │  │
│  │  - Material-UI components                              │  │
│  │  - React Query for state                               │  │
│  │  - WebSocket client for real-time updates              │  │
│  └───────────────────────────────────────────────────────┘  │
│                           │                                  │
│                      HTTP/WebSocket                          │
│                           │                                  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              Node.js Backend (Port 3001)               │  │
│  │  - Express REST API                                    │  │
│  │  - WebSocket server                                    │  │
│  │  - Spawns bosh processes                               │  │
│  │  - Local JSON cache for tools                          │  │
│  └───────────────────────────────────────────────────────┘  │
│                           │                                  │
│              ┌────────────┼────────────┐                    │
│              │            │            │                    │
│              ▼            ▼            ▼                    │
│          Docker     Singularity    Native                   │
│        Containers   Containers    Execution                 │
└─────────────────────────────────────────────────────────────┘
```

### External API Summary

| API | Base URL | Auth Required |
|-----|----------|---------------|
| Zenodo | `https://zenodo.org/api` | No (rate limited) |
| GitHub | `https://api.github.com` | No (rate limited) |

### Cache Strategy

- Cache tool metadata and descriptors locally in JSON files
- Store execution history persistently
- Update cache manually via "refresh" action (not automatic)
- Descriptors are downloaded on-demand if not cached
