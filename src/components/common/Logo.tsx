import React from 'react';
import { Box } from '@mui/material';
import { useTheme } from '../../context/ThemeContext';

interface LogoProps {
  height?: number;
  showText?: boolean;
}

const Logo: React.FC<LogoProps> = ({ height = 40, showText = false }) => {
  const { mode } = useTheme();
  
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <img
        src="/logo.png" // Change this to your logo path
        alt="Senel Express"
        height={height}
        style={{
          filter: mode === 'dark' ? 'brightness(1.2)' : 'none',
        }}
      />
      {showText && (
        <Box
          component="span"
          sx={{
            color: mode === 'light' ? '#1C0770' : '#9f96c1',
            fontWeight: 600,
            fontSize: '1.2rem',
          }}
        >
          Senel Express
        </Box>
      )}
    </Box>
  );
};

export default Logo;