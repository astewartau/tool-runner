import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Grid,
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  Chip,
  IconButton,
  CircularProgress,
  Paper
} from '@mui/material';
import StarIcon from '@mui/icons-material/Star';
import DownloadIcon from '@mui/icons-material/Download';

import { fetchTools, fetchFavorites, removeFavorite } from '../api';

function FavoritesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: tools = [], isLoading: toolsLoading } = useQuery({
    queryKey: ['tools'],
    queryFn: fetchTools
  });

  const { data: favorites = [], isLoading: favoritesLoading } = useQuery({
    queryKey: ['favorites'],
    queryFn: fetchFavorites
  });

  const removeFavoriteMutation = useMutation({
    mutationFn: removeFavorite,
    onSuccess: () => {
      queryClient.invalidateQueries(['favorites']);
    }
  });

  const favoriteTools = tools.filter(tool =>
    favorites.includes(String(tool.id))
  );

  const isLoading = toolsLoading || favoritesLoading;

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Favorite Tools
      </Typography>

      {favoriteTools.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <StarIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
          <Typography color="text.secondary">
            No favorite tools yet. Browse tools and click the star icon to add favorites.
          </Typography>
          <Button
            variant="contained"
            sx={{ mt: 2 }}
            onClick={() => navigate('/')}
          >
            Browse Tools
          </Button>
        </Paper>
      ) : (
        <Grid container spacing={2}>
          {favoriteTools.map(tool => (
            <Grid item xs={12} sm={6} md={4} key={tool.id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Typography variant="h6" component="div" gutterBottom noWrap>
                      {tool.title}
                    </Typography>
                    <IconButton
                      size="small"
                      onClick={() => removeFavoriteMutation.mutate(tool.id)}
                    >
                      <StarIcon color="warning" />
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
      )}
    </Box>
  );
}

export default FavoritesPage;
