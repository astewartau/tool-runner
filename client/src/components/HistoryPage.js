import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  CircularProgress,
  Alert,
  Tooltip
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import CancelIcon from '@mui/icons-material/Cancel';
import PlayCircleIcon from '@mui/icons-material/PlayCircle';

import { fetchExecutions, fetchActiveExecutions } from '../api';

function HistoryPage() {
  const navigate = useNavigate();

  const { data: executions = [], isLoading, error } = useQuery({
    queryKey: ['executions'],
    queryFn: fetchExecutions
  });

  const { data: activeExecutions = [] } = useQuery({
    queryKey: ['activeExecutions'],
    queryFn: fetchActiveExecutions,
    refetchInterval: 2000
  });

  const getStatusChip = (status) => {
    const props = {
      completed: { icon: <CheckCircleIcon />, color: 'success', label: 'Completed' },
      failed: { icon: <ErrorIcon />, color: 'error', label: 'Failed' },
      error: { icon: <ErrorIcon />, color: 'error', label: 'Error' },
      cancelled: { icon: <CancelIcon />, color: 'warning', label: 'Cancelled' },
      running: { icon: <PlayCircleIcon />, color: 'info', label: 'Running' }
    }[status] || { color: 'default', label: status };

    return <Chip size="small" icon={props.icon} color={props.color} label={props.label} />;
  };

  const formatDuration = (start, end) => {
    if (!end) {
      // For running jobs, show elapsed time
      const duration = Date.now() - new Date(start);
      const seconds = Math.floor(duration / 1000);
      if (seconds < 60) return `${seconds}s`;
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return `${minutes}m ${remainingSeconds}s`;
    }
    const duration = new Date(end) - new Date(start);
    const seconds = Math.floor(duration / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes < 60) return `${minutes}m ${remainingSeconds}s`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

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
        Failed to load execution history: {error.message}
      </Alert>
    );
  }

  const renderExecutionTable = (items, title) => (
    <TableContainer component={Paper} sx={{ mb: 3 }}>
      {title && (
        <Box sx={{ p: 2, backgroundColor: 'background.default' }}>
          <Typography variant="h6">{title}</Typography>
        </Box>
      )}
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>ID</TableCell>
            <TableCell>Tool ID</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Started</TableCell>
            <TableCell>Duration</TableCell>
            <TableCell>Exit Code</TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {items.map((execution) => (
            <TableRow key={execution.id} hover>
              <TableCell>
                <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                  {execution.id.substring(0, 8)}...
                </Typography>
              </TableCell>
              <TableCell>{execution.toolId}</TableCell>
              <TableCell>{getStatusChip(execution.status)}</TableCell>
              <TableCell>
                {new Date(execution.startTime).toLocaleString()}
              </TableCell>
              <TableCell>
                {formatDuration(execution.startTime, execution.endTime)}
              </TableCell>
              <TableCell>
                {execution.exitCode !== null ? (
                  <Chip
                    size="small"
                    label={execution.exitCode}
                    color={execution.exitCode === 0 ? 'success' : 'error'}
                    variant="outlined"
                  />
                ) : (
                  '-'
                )}
              </TableCell>
              <TableCell align="right">
                <Tooltip title="View Details">
                  <IconButton
                    size="small"
                    onClick={() => navigate(`/execution/${execution.id}`)}
                  >
                    <VisibilityIcon />
                  </IconButton>
                </Tooltip>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  const hasNoData = activeExecutions.length === 0 && executions.length === 0;

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Execution History
      </Typography>

      {hasNoData ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">
            No executions recorded yet. Run a tool to see history here.
          </Typography>
        </Paper>
      ) : (
        <>
          {activeExecutions.length > 0 && renderExecutionTable(activeExecutions, 'Currently Running')}
          {executions.length > 0 && renderExecutionTable(executions, activeExecutions.length > 0 ? 'Completed' : null)}
        </>
      )}
    </Box>
  );
}

export default HistoryPage;
