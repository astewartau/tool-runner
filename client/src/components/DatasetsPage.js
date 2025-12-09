import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Paper,
  Typography,
  Button,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  Alert,
  Breadcrumbs,
  Link,
  Chip,
  Divider
} from '@mui/material';
import FolderIcon from '@mui/icons-material/Folder';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import ImageIcon from '@mui/icons-material/Image';
import DataObjectIcon from '@mui/icons-material/DataObject';
import TableChartIcon from '@mui/icons-material/TableChart';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

import { fetchDatasets, addDataset, deleteDataset, browseDataset, readFile, getNiftiUrl } from '../api';
import NiftiViewer from './NiftiViewer';

function DatasetsPage() {
  const queryClient = useQueryClient();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newDatasetName, setNewDatasetName] = useState('');
  const [newDatasetPath, setNewDatasetPath] = useState('');
  const [selectedDataset, setSelectedDataset] = useState(null);
  const [currentPath, setCurrentPath] = useState('');
  const [viewerFile, setViewerFile] = useState(null);
  const [fileContent, setFileContent] = useState(null);

  const { data: datasets = [], isLoading } = useQuery({
    queryKey: ['datasets'],
    queryFn: fetchDatasets
  });

  const { data: browseData, isLoading: isBrowsing } = useQuery({
    queryKey: ['browse', selectedDataset?.id, currentPath],
    queryFn: () => browseDataset(selectedDataset.id, currentPath),
    enabled: !!selectedDataset
  });

  const addMutation = useMutation({
    mutationFn: () => addDataset(newDatasetName, newDatasetPath, 'link'),
    onSuccess: () => {
      queryClient.invalidateQueries(['datasets']);
      setAddDialogOpen(false);
      setNewDatasetName('');
      setNewDatasetPath('');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: deleteDataset,
    onSuccess: () => {
      queryClient.invalidateQueries(['datasets']);
      if (selectedDataset) {
        setSelectedDataset(null);
        setCurrentPath('');
      }
    }
  });

  const handleSelectDirectory = async () => {
    if (window.electronAPI) {
      const result = await window.electronAPI.selectDirectory();
      if (result) {
        setNewDatasetPath(result);
        if (!newDatasetName) {
          setNewDatasetName(result.split('/').pop());
        }
      }
    }
  };

  const handleBrowseItem = async (item) => {
    if (item.type === 'directory') {
      setCurrentPath(currentPath ? `${currentPath}/${item.name}` : item.name);
      setFileContent(null);
      setViewerFile(null);
    } else {
      const fullPath = `${selectedDataset.path}/${currentPath}/${item.name}`.replace(/\/+/g, '/');

      if (item.extension === '.nii' || item.extension === '.gz') {
        setViewerFile(fullPath);
        setFileContent(null);
      } else if (['.json', '.txt', '.tsv', '.csv', '.md'].includes(item.extension)) {
        try {
          const data = await readFile(fullPath);
          setFileContent({ name: item.name, content: data.content, type: item.extension });
          setViewerFile(null);
        } catch (error) {
          console.error('Failed to read file:', error);
        }
      }
    }
  };

  const navigateTo = (index) => {
    if (index === -1) {
      setCurrentPath('');
    } else {
      const parts = currentPath.split('/');
      setCurrentPath(parts.slice(0, index + 1).join('/'));
    }
    setFileContent(null);
    setViewerFile(null);
  };

  const pathParts = currentPath ? currentPath.split('/') : [];

  const getFileIcon = (item) => {
    if (item.type === 'directory') return <FolderIcon color="primary" />;
    if (item.extension === '.nii' || item.extension === '.gz') return <ImageIcon color="secondary" />;
    if (item.extension === '.json') return <DataObjectIcon color="info" />;
    if (item.extension === '.tsv' || item.extension === '.csv') return <TableChartIcon color="success" />;
    return <InsertDriveFileIcon />;
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', gap: 3, height: 'calc(100vh - 150px)' }}>
      {/* Dataset List */}
      <Paper sx={{ width: 300, p: 2, flexShrink: 0, overflow: 'auto' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">Datasets</Typography>
          <Button
            startIcon={<AddIcon />}
            size="small"
            onClick={() => setAddDialogOpen(true)}
          >
            Add
          </Button>
        </Box>

        {datasets.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No datasets added yet
          </Typography>
        ) : (
          <List dense>
            {datasets.map(dataset => (
              <ListItem
                key={dataset.id}
                secondaryAction={
                  <IconButton
                    edge="end"
                    size="small"
                    onClick={() => deleteMutation.mutate(dataset.id)}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                }
                disablePadding
              >
                <ListItemButton
                  selected={selectedDataset?.id === dataset.id}
                  onClick={() => {
                    setSelectedDataset(dataset);
                    setCurrentPath('');
                    setFileContent(null);
                    setViewerFile(null);
                  }}
                >
                  <ListItemIcon>
                    <FolderIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary={dataset.name}
                    secondary={new Date(dataset.addedAt).toLocaleDateString()}
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        )}
      </Paper>

      {/* Browser */}
      <Paper sx={{ flexGrow: 1, p: 2, overflow: 'auto' }}>
        {!selectedDataset ? (
          <Typography variant="body1" color="text.secondary" sx={{ textAlign: 'center', mt: 4 }}>
            Select a dataset to browse
          </Typography>
        ) : (
          <>
            <Box sx={{ mb: 2 }}>
              <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />}>
                <Link
                  component="button"
                  variant="body2"
                  onClick={() => navigateTo(-1)}
                  underline="hover"
                >
                  {selectedDataset.name}
                </Link>
                {pathParts.map((part, index) => (
                  <Link
                    key={index}
                    component="button"
                    variant="body2"
                    onClick={() => navigateTo(index)}
                    underline="hover"
                  >
                    {part}
                  </Link>
                ))}
              </Breadcrumbs>
            </Box>

            {isBrowsing ? (
              <CircularProgress />
            ) : browseData?.type === 'directory' ? (
              <List dense>
                {currentPath && (
                  <ListItem disablePadding>
                    <ListItemButton onClick={() => navigateTo(pathParts.length - 2)}>
                      <ListItemIcon>
                        <ArrowBackIcon />
                      </ListItemIcon>
                      <ListItemText primary=".." />
                    </ListItemButton>
                  </ListItem>
                )}
                {browseData.items
                  .sort((a, b) => {
                    if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
                    return a.name.localeCompare(b.name);
                  })
                  .map(item => (
                    <ListItem key={item.name} disablePadding>
                      <ListItemButton onClick={() => handleBrowseItem(item)}>
                        <ListItemIcon>
                          {getFileIcon(item)}
                        </ListItemIcon>
                        <ListItemText
                          primary={item.name}
                          secondary={item.type === 'file' ? `${(item.size / 1024).toFixed(1)} KB` : null}
                        />
                      </ListItemButton>
                    </ListItem>
                  ))}
              </List>
            ) : null}
          </>
        )}
      </Paper>

      {/* Viewer Panel */}
      {(viewerFile || fileContent) && (
        <Paper sx={{ width: 500, p: 2, flexShrink: 0, overflow: 'auto' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              {viewerFile ? 'NIfTI Viewer' : fileContent?.name}
            </Typography>
            <Button size="small" onClick={() => { setViewerFile(null); setFileContent(null); }}>
              Close
            </Button>
          </Box>

          {viewerFile && (
            <NiftiViewer url={getNiftiUrl(viewerFile)} />
          )}

          {fileContent && (
            <Box
              sx={{
                backgroundColor: '#0d1117',
                p: 2,
                borderRadius: 1,
                overflow: 'auto',
                maxHeight: 'calc(100vh - 300px)'
              }}
            >
              <pre style={{ margin: 0, color: '#c9d1d9', fontSize: '12px', whiteSpace: 'pre-wrap' }}>
                {fileContent.type === '.json'
                  ? JSON.stringify(JSON.parse(fileContent.content), null, 2)
                  : fileContent.content}
              </pre>
            </Box>
          )}
        </Paper>
      )}

      {/* Add Dataset Dialog */}
      <Dialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Dataset</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Dataset Name"
            fullWidth
            value={newDatasetName}
            onChange={(e) => setNewDatasetName(e.target.value)}
          />
          <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
            <TextField
              margin="dense"
              label="Path"
              fullWidth
              value={newDatasetPath}
              onChange={(e) => setNewDatasetPath(e.target.value)}
            />
            <Button onClick={handleSelectDirectory} sx={{ mt: 1 }}>
              Browse
            </Button>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={() => addMutation.mutate()}
            disabled={!newDatasetName || !newDatasetPath || addMutation.isPending}
          >
            Add
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default DatasetsPage;
