import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AppsIcon from '@mui/icons-material/Apps';
import FolderIcon from '@mui/icons-material/Folder';
import HistoryIcon from '@mui/icons-material/History';
import StarIcon from '@mui/icons-material/Star';

import ToolsPage from './components/ToolsPage';
import BIDSAppsPage from './components/BIDSAppsPage';
import DatasetsPage from './components/DatasetsPage';
import HistoryPage from './components/HistoryPage';
import FavoritesPage from './components/FavoritesPage';
import ToolDetailPage from './components/ToolDetailPage';
import ExecutionPage from './components/ExecutionPage';

const drawerWidth = 220;

const navItems = [
  { path: '/', label: 'Tools', icon: <SearchIcon /> },
  { path: '/bids-apps', label: 'BIDS Apps', icon: <AppsIcon /> },
  { path: '/datasets', label: 'Datasets', icon: <FolderIcon /> },
  { path: '/favorites', label: 'Favorites', icon: <StarIcon /> },
  { path: '/history', label: 'History', icon: <HistoryIcon /> }
];

function Navigation() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <Box sx={{ overflow: 'auto' }}>
      <Toolbar>
        <Typography variant="h6" noWrap>
          Boutiques UI
        </Typography>
      </Toolbar>
      <Divider />
      <List>
        {navItems.map(item => (
          <ListItem key={item.path} disablePadding>
            <ListItemButton
              selected={location.pathname === item.path}
              onClick={() => navigate(item.path)}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Box>
  );
}

function AppContent() {
  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar
        position="fixed"
        sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}
      >
        <Toolbar>
          <Typography variant="h6" noWrap component="div">
            Boutiques UI - Neuroimaging Tool Interface
          </Typography>
        </Toolbar>
      </AppBar>

      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box'
          }
        }}
      >
        <Navigation />
      </Drawer>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          mt: 8,
          minHeight: 'calc(100vh - 64px)',
          backgroundColor: 'background.default'
        }}
      >
        <Routes>
          <Route path="/" element={<ToolsPage />} />
          <Route path="/bids-apps" element={<BIDSAppsPage />} />
          <Route path="/datasets" element={<DatasetsPage />} />
          <Route path="/favorites" element={<FavoritesPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/tool/:id" element={<ToolDetailPage />} />
          <Route path="/execution/:id" element={<ExecutionPage />} />
        </Routes>
      </Box>
    </Box>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
