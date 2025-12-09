import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  TextField,
  Grid,
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  Chip,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  Tooltip
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import DownloadIcon from '@mui/icons-material/Download';

import { fetchTools, refreshTools, fetchFavorites, addFavorite, removeFavorite } from '../api';

function ToolsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [containerFilter, setContainerFilter] = useState('all');

  const { data: tools = [], isLoading, error } = useQuery({
    queryKey: ['tools'],
    queryFn: fetchTools
  });

  const { data: favorites = [] } = useQuery({
    queryKey: ['favorites'],
    queryFn: fetchFavorites
  });

  const refreshMutation = useMutation({
    mutationFn: refreshTools,
    onSuccess: () => {
      queryClient.invalidateQueries(['tools']);
    }
  });

  const toggleFavorite = useMutation({
    mutationFn: async (toolId) => {
      if (favorites.includes(String(toolId))) {
        await removeFavorite(toolId);
      } else {
        await addFavorite(toolId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['favorites']);
    }
  });

  const filteredTools = tools.filter(tool => {
    const matchesSearch = !search ||
      tool.title.toLowerCase().includes(search.toLowerCase()) ||
      tool.description.toLowerCase().includes(search.toLowerCase()) ||
      tool.keywords.some(k => k.toLowerCase().includes(search.toLowerCase()));

    const matchesContainer = containerFilter === 'all' || tool.containerType === containerFilter;

    return matchesSearch && matchesContainer;
  });

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        Failed to load tools: {error.message}
      </Alert>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 2 }}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Search tools..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{
            startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
          }}
        />

        <FormControl sx={{ minWidth: 150 }}>
          <InputLabel>Container</InputLabel>
          <Select
            value={containerFilter}
            label="Container"
            onChange={(e) => setContainerFilter(e.target.value)}
          >
            <MenuItem value="all">All</MenuItem>
            <MenuItem value="docker">Docker</MenuItem>
            <MenuItem value="singularity">Singularity</MenuItem>
            <MenuItem value="unknown">Unknown</MenuItem>
          </Select>
        </FormControl>

        <Tooltip title="Refresh from Zenodo">
          <IconButton
            onClick={() => refreshMutation.mutate()}
            disabled={refreshMutation.isPending}
          >
            {refreshMutation.isPending ? <CircularProgress size={24} /> : <RefreshIcon />}
          </IconButton>
        </Tooltip>
      </Box>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {filteredTools.length} tools found
      </Typography>

      <Grid container spacing={2}>
        {filteredTools.map(tool => (
          <Grid item xs={12} sm={6} md={4} key={tool.id}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ flexGrow: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Typography variant="h6" component="div" gutterBottom noWrap>
                    {tool.title}
                  </Typography>
                  <IconButton
                    size="small"
                    onClick={() => toggleFavorite.mutate(tool.id)}
                  >
                    {favorites.includes(String(tool.id)) ? (
                      <StarIcon color="warning" />
                    ) : (
                      <StarBorderIcon />
                    )}
                  </IconButton>
                </Box>

                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{
                    mb: 1,
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                  }}
                >
                  {tool.description.replace(/<[^>]*>/g, '')}
                </Typography>

                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 1 }}>
                  {tool.containerType !== 'unknown' && (
                    <Chip
                      size="small"
                      label={tool.containerType}
                      color={tool.containerType === 'docker' ? 'primary' : 'secondary'}
                    />
                  )}
                  <Chip size="small" label={`v${tool.version}`} variant="outlined" />
                </Box>

                <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <DownloadIcon fontSize="inherit" />
                  {tool.downloads.toLocaleString()} downloads
                </Typography>
              </CardContent>

              <CardActions>
                <Button size="small" onClick={() => navigate(`/tool/${tool.id}`)}>
                  View Details
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}

export default ToolsPage;
