import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Box,
  Paper,
  Typography,
  Button,
  Chip,
  CircularProgress,
  Tabs,
  Tab,
  LinearProgress
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import StopIcon from '@mui/icons-material/Stop';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import PendingIcon from '@mui/icons-material/Pending';

import { fetchExecution, cancelExecution, createExecutionWebSocket } from '../api';

function ExecutionPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState(0);
  const [stdout, setStdout] = useState('');
  const [stderr, setStderr] = useState('');
  const [status, setStatus] = useState('running');
  const [exitCode, setExitCode] = useState(null);
  const outputRef = useRef(null);
  const wsRef = useRef(null);

  const { data: execution, isLoading } = useQuery({
    queryKey: ['execution', id],
    queryFn: () => fetchExecution(id),
    refetchInterval: status === 'running' ? 2000 : false
  });

  useEffect(() => {
    if (execution) {
      setStdout(execution.stdout || '');
      setStderr(execution.stderr || '');
      setStatus(execution.status);
      setExitCode(execution.exitCode);
    }
  }, [execution]);

  useEffect(() => {
    // Connect to WebSocket for real-time updates
    wsRef.current = createExecutionWebSocket(id, (data) => {
      if (data.type === 'stdout') {
        setStdout(prev => prev + data.data);
      } else if (data.type === 'stderr') {
        setStderr(prev => prev + data.data);
      } else if (data.type === 'complete') {
        setStatus(data.status);
        setExitCode(data.exitCode);
      } else if (data.type === 'error') {
        setStatus('error');
        setStderr(prev => prev + '\n' + data.error);
      }
    });

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [id]);

  // Auto-scroll output
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [stdout, stderr, tab]);

  const handleCancel = async () => {
    try {
      await cancelExecution(id);
      setStatus('cancelled');
    } catch (error) {
      console.error('Failed to cancel:', error);
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'running':
        return <PendingIcon color="info" />;
      case 'completed':
        return <CheckCircleIcon color="success" />;
      case 'failed':
      case 'error':
        return <ErrorIcon color="error" />;
      default:
        return <PendingIcon />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'running':
        return 'info';
      case 'completed':
        return 'success';
      case 'failed':
      case 'error':
        return 'error';
      case 'cancelled':
        return 'warning';
      default:
        return 'default';
    }
  };

  if (isLoading && !execution) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
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
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {getStatusIcon()}
            <Typography variant="h5">
              Execution: {id.substring(0, 8)}...
            </Typography>
            <Chip
              label={status}
              color={getStatusColor()}
              size="small"
            />
          </Box>

          {status === 'running' && (
            <Button
              variant="outlined"
              color="error"
              startIcon={<StopIcon />}
              onClick={handleCancel}
            >
              Cancel
            </Button>
          )}
        </Box>

        {status === 'running' && (
          <LinearProgress sx={{ mb: 2 }} />
        )}

        {execution && (
          <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
            <Typography variant="body2" color="text.secondary">
              Tool ID: {execution.toolId}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Started: {new Date(execution.startTime).toLocaleString()}
            </Typography>
            {execution.endTime && (
              <Typography variant="body2" color="text.secondary">
                Ended: {new Date(execution.endTime).toLocaleString()}
              </Typography>
            )}
            {exitCode !== null && (
              <Typography variant="body2" color="text.secondary">
                Exit Code: {exitCode}
              </Typography>
            )}
          </Box>
        )}
      </Paper>

      <Paper sx={{ p: 0 }}>
        <Tabs value={tab} onChange={(e, v) => setTab(v)}>
          <Tab label="Output (stdout)" />
          <Tab label="Errors (stderr)" />
          <Tab label="Parameters" />
        </Tabs>

        <Box
          ref={outputRef}
          sx={{
            p: 2,
            height: '500px',
            overflow: 'auto',
            backgroundColor: '#0d1117',
            fontFamily: 'monospace',
            fontSize: '13px',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word'
          }}
        >
          {tab === 0 && (
            <pre style={{ margin: 0, color: '#c9d1d9' }}>
              {stdout || '(no output yet)'}
            </pre>
          )}

          {tab === 1 && (
            <pre style={{ margin: 0, color: '#f85149' }}>
              {stderr || '(no errors)'}
            </pre>
          )}

          {tab === 2 && execution && (
            <pre style={{ margin: 0, color: '#c9d1d9' }}>
              {JSON.stringify(execution.invocation, null, 2)}
            </pre>
          )}
        </Box>
      </Paper>
    </Box>
  );
}

export default ExecutionPage;
