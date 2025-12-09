import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Paper,
  Typography,
  Button,
  Chip,
  CircularProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Switch,
  FormControlLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  IconButton
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';

import { fetchTools, fetchToolDescriptor, fetchFavorites, addFavorite, removeFavorite, executeToolAPI } from '../api';

function ParameterInput({ param, value, onChange }) {
  const handleFileSelect = async () => {
    if (window.electronAPI) {
      let result;
      if (param.type === 'File') {
        result = await window.electronAPI.selectFile();
      } else {
        result = await window.electronAPI.selectFiles();
      }
      if (result) {
        onChange(result);
      }
    }
  };

  switch (param.type) {
    case 'String':
      return (
        <TextField
          fullWidth
          label={param.name}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          helperText={param.description}
          required={!param.optional}
          size="small"
        />
      );

    case 'Number':
      return (
        <TextField
          fullWidth
          type="number"
          label={param.name}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
          helperText={param.description}
          required={!param.optional}
          size="small"
          inputProps={{
            min: param.minimum,
            max: param.maximum
          }}
        />
      );

    case 'Flag':
      return (
        <FormControlLabel
          control={
            <Switch
              checked={!!value}
              onChange={(e) => onChange(e.target.checked)}
            />
          }
          label={
            <Box>
              <Typography variant="body2">{param.name}</Typography>
              <Typography variant="caption" color="text.secondary">
                {param.description}
              </Typography>
            </Box>
          }
        />
      );

    case 'File':
      return (
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
          <TextField
            fullWidth
            label={param.name}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            helperText={param.description}
            required={!param.optional}
            size="small"
          />
          <Button
            variant="outlined"
            size="small"
            onClick={handleFileSelect}
            startIcon={<FolderOpenIcon />}
            sx={{ mt: 0.5, whiteSpace: 'nowrap' }}
          >
            Browse
          </Button>
        </Box>
      );

    default:
      if (param['value-choices']) {
        return (
          <FormControl fullWidth size="small">
            <InputLabel>{param.name}</InputLabel>
            <Select
              value={value || ''}
              label={param.name}
              onChange={(e) => onChange(e.target.value)}
            >
              {param['value-choices'].map((choice) => (
                <MenuItem key={choice} value={choice}>
                  {choice}
                </MenuItem>
              ))}
            </Select>
            {param.description && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                {param.description}
              </Typography>
            )}
          </FormControl>
        );
      }

      return (
        <TextField
          fullWidth
          label={param.name}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          helperText={param.description}
          required={!param.optional}
          size="small"
        />
      );
  }
}

function ToolDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [invocation, setInvocation] = useState({});
  const [containerMode, setContainerMode] = useState('docker');
  const [outputDir, setOutputDir] = useState('');

  const { data: tools = [] } = useQuery({
    queryKey: ['tools'],
    queryFn: fetchTools
  });

  const { data: descriptor, isLoading, error } = useQuery({
    queryKey: ['descriptor', id],
    queryFn: () => fetchToolDescriptor(id)
  });

  const { data: favorites = [] } = useQuery({
    queryKey: ['favorites'],
    queryFn: fetchFavorites
  });

  const tool = tools.find(t => String(t.id) === id);

  const toggleFavorite = useMutation({
    mutationFn: async () => {
      if (favorites.includes(id)) {
        await removeFavorite(id);
      } else {
        await addFavorite(id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['favorites']);
    }
  });

  const executeMutation = useMutation({
    mutationFn: () => executeToolAPI(id, invocation, containerMode, outputDir),
    onSuccess: (data) => {
      navigate(`/execution/${data.executionId}`);
    }
  });

  // Initialize default values from descriptor
  useEffect(() => {
    if (descriptor?.inputs) {
      const defaults = {};
      descriptor.inputs.forEach(input => {
        if (input['default-value'] !== undefined) {
          defaults[input.id] = input['default-value'];
        }
      });
      setInvocation(defaults);
    }
  }, [descriptor]);

  const handleParamChange = (paramId, value) => {
    setInvocation(prev => ({
      ...prev,
      [paramId]: value
    }));
  };

  const handleSelectOutputDir = async () => {
    if (window.electronAPI) {
      const result = await window.electronAPI.selectDirectory();
      if (result) {
        setOutputDir(result);
      }
    }
  };

  const requiredInputs = descriptor?.inputs?.filter(i => !i.optional) || [];
  const optionalInputs = descriptor?.inputs?.filter(i => i.optional) || [];

  const canExecute = requiredInputs.every(input => {
    const value = invocation[input.id];
    return value !== undefined && value !== '' && value !== null;
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
        Failed to load tool descriptor: {error.message}
      </Alert>
    );
  }

  return (
    <Box>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate(-1)}
        sx={{ mb: 2 }}
      >
        Back
      </Button>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Typography variant="h4" component="h1">
            {descriptor?.name || tool?.title}
          </Typography>
          <IconButton onClick={() => toggleFavorite.mutate()}>
            {favorites.includes(id) ? (
              <StarIcon color="warning" fontSize="large" />
            ) : (
              <StarBorderIcon fontSize="large" />
            )}
          </IconButton>
        </Box>

        <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
          {descriptor?.description}
        </Typography>

        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
          {descriptor?.['tool-version'] && (
            <Chip label={`v${descriptor['tool-version']}`} size="small" />
          )}
          {descriptor?.['container-image'] && (
            <Chip
              label={descriptor['container-image'].type || 'container'}
              color="primary"
              size="small"
            />
          )}
          {tool?.doi && (
            <Chip
              label="DOI"
              size="small"
              variant="outlined"
              component="a"
              href={`https://doi.org/${tool.doi}`}
              target="_blank"
              clickable
            />
          )}
        </Box>

        {descriptor?.author && (
          <Typography variant="body2" color="text.secondary">
            Author: {descriptor.author}
          </Typography>
        )}
      </Paper>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h5" gutterBottom>
          Parameters
        </Typography>

        {requiredInputs.length > 0 && (
          <>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
              Required Parameters
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
              {requiredInputs.map(input => (
                <ParameterInput
                  key={input.id}
                  param={input}
                  value={invocation[input.id]}
                  onChange={(value) => handleParamChange(input.id, value)}
                />
              ))}
            </Box>
          </>
        )}

        {optionalInputs.length > 0 && (
          <Accordion defaultExpanded={false}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography>Optional Parameters ({optionalInputs.length})</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {optionalInputs.map(input => (
                  <ParameterInput
                    key={input.id}
                    param={input}
                    value={invocation[input.id]}
                    onChange={(value) => handleParamChange(input.id, value)}
                  />
                ))}
              </Box>
            </AccordionDetails>
          </Accordion>
        )}
      </Paper>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h5" gutterBottom>
          Execution Settings
        </Typography>

        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>Container Mode</InputLabel>
            <Select
              value={containerMode}
              label="Container Mode"
              onChange={(e) => setContainerMode(e.target.value)}
            >
              <MenuItem value="docker">Docker</MenuItem>
              <MenuItem value="singularity">Singularity/Apptainer</MenuItem>
              <MenuItem value="native">Native (no container)</MenuItem>
            </Select>
          </FormControl>

          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexGrow: 1 }}>
            <TextField
              fullWidth
              label="Output Directory"
              value={outputDir}
              onChange={(e) => setOutputDir(e.target.value)}
              placeholder="Current directory if empty"
            />
            <Button
              variant="outlined"
              onClick={handleSelectOutputDir}
              startIcon={<FolderOpenIcon />}
            >
              Browse
            </Button>
          </Box>
        </Box>
      </Paper>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
        <Button
          variant="contained"
          size="large"
          startIcon={<PlayArrowIcon />}
          onClick={() => executeMutation.mutate()}
          disabled={!canExecute || executeMutation.isPending}
        >
          {executeMutation.isPending ? 'Starting...' : 'Execute'}
        </Button>
      </Box>

      {executeMutation.error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          Failed to start execution: {executeMutation.error.message}
        </Alert>
      )}
    </Box>
  );
}

export default ToolDetailPage;
