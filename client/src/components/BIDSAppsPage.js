import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
  CircularProgress,
  Alert,
  Tooltip,
  Link
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import StarIcon from '@mui/icons-material/Star';
import GitHubIcon from '@mui/icons-material/GitHub';

import { fetchBIDSApps, refreshBIDSApps } from '../api';

function BIDSAppsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');

  const { data: apps = [], isLoading, error } = useQuery({
    queryKey: ['bids-apps'],
    queryFn: fetchBIDSApps
  });

  const refreshMutation = useMutation({
    mutationFn: refreshBIDSApps,
    onSuccess: () => {
      queryClient.invalidateQueries(['bids-apps']);
    }
  });

  const filteredApps = apps.filter(app => {
    if (!search) return true;
    const query = search.toLowerCase();
    return (
      app.name.toLowerCase().includes(query) ||
      (app.description && app.description.toLowerCase().includes(query))
    );
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
        Failed to load BIDS apps: {error.message}
      </Alert>
    );
  }

  return (
    <Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        BIDS Apps are containerized neuroimaging pipelines that work with BIDS-formatted datasets.
      </Typography>

      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 2 }}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Search BIDS apps..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{
            startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
          }}
        />

        <Tooltip title="Refresh from GitHub">
          <IconButton
            onClick={() => refreshMutation.mutate()}
            disabled={refreshMutation.isPending}
          >
            {refreshMutation.isPending ? <CircularProgress size={24} /> : <RefreshIcon />}
          </IconButton>
        </Tooltip>
      </Box>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {filteredApps.length} apps found
      </Typography>

      <Grid container spacing={2}>
        {filteredApps.map(app => (
          <Grid item xs={12} sm={6} md={4} key={app.name}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ flexGrow: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Typography variant="h6" component="div" gutterBottom>
                    {app.name}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <StarIcon fontSize="small" color="warning" />
                    <Typography variant="body2">{app.stars}</Typography>
                  </Box>
                </Box>

                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{
                    mb: 2,
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                  }}
                >
                  {app.description || 'No description available'}
                </Typography>

                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 1 }}>
                  {app.language && (
                    <Chip size="small" label={app.language} variant="outlined" />
                  )}
                  <Chip
                    size="small"
                    label={`Updated: ${new Date(app.updatedAt).toLocaleDateString()}`}
                    variant="outlined"
                  />
                </Box>

                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                  Docker: {app.dockerImage}
                </Typography>
              </CardContent>

              <CardActions>
                <Button
                  size="small"
                  startIcon={<GitHubIcon />}
                  component={Link}
                  href={app.htmlUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View on GitHub
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}

export default BIDSAppsPage;
