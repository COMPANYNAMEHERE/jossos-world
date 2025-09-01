import React from 'react';
import { CssBaseline, ThemeProvider } from '@mui/material';
import { HashRouter } from 'react-router-dom';
import theme from '../styles/theme.js';

export default function AppProviders({ children }) {
  return (
    <HashRouter>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </HashRouter>
  );
}

