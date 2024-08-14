import React from 'react';
import {MainPage} from './components/Mainpage';
import { Container, Box } from '@mui/material';

const App = () => {
  return (
    <Container sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
      <Box sx={{ width: '100%' }}>
        <MainPage />
      </Box>
    </Container>
  );
};

export default App;
