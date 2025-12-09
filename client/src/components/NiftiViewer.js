import React, { useEffect, useRef } from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';
import { Niivue } from '@niivue/niivue';

function NiftiViewer({ url }) {
  const canvasRef = useRef(null);
  const nvRef = useRef(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  useEffect(() => {
    if (!canvasRef.current || !url) return;

    const initViewer = async () => {
      setLoading(true);
      setError(null);

      try {
        // Clean up previous instance
        if (nvRef.current) {
          nvRef.current.closeDrawing();
        }

        nvRef.current = new Niivue({
          backColor: [0.1, 0.1, 0.1, 1],
          show3Dcrosshair: true,
          multiplanarForceRender: true
        });

        await nvRef.current.attachToCanvas(canvasRef.current);
        await nvRef.current.loadVolumes([{ url }]);

        setLoading(false);
      } catch (err) {
        console.error('NiiVue error:', err);
        setError(err.message || 'Failed to load NIfTI file');
        setLoading(false);
      }
    };

    initViewer();

    return () => {
      if (nvRef.current) {
        try {
          nvRef.current.closeDrawing();
        } catch (e) {
          // Ignore cleanup errors
        }
      }
    };
  }, [url]);

  return (
    <Box sx={{ position: 'relative', width: '100%', height: 400 }}>
      {loading && (
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 1
          }}
        >
          <CircularProgress />
        </Box>
      )}

      {error && (
        <Box sx={{ textAlign: 'center', p: 2 }}>
          <Typography color="error">{error}</Typography>
        </Box>
      )}

      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
          display: error ? 'none' : 'block'
        }}
      />
    </Box>
  );
}

export default NiftiViewer;
