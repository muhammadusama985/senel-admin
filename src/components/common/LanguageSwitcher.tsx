import React, { useState } from 'react';
import {
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Typography,
  Box,
} from '@mui/material';
import LanguageIcon from '@mui/icons-material/Language';
import CheckIcon from '@mui/icons-material/Check';
import { useTranslation } from 'react-i18next';

const languages = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'tr', name: 'Türkçe', flag: '🇹🇷' },
];

export const LanguageSwitcher: React.FC = () => {
  const { i18n } = useTranslation();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    localStorage.setItem('language', lng);
    handleClose();
  };

  const currentLang = languages.find(l => l.code === i18n.language) || languages[0];

  return (
    <>
      <IconButton
        onClick={handleClick}
        color="inherit"
        sx={{
          '&:hover': {
            backgroundColor: 'rgba(255,255,255,0.1)',
          },
        }}
      >
        <LanguageIcon />
        <Typography
          variant="caption"
          sx={{
            ml: 0.5,
            fontWeight: 500,
            display: { xs: 'none', md: 'inline' },
          }}
        >
          {currentLang.flag}
        </Typography>
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        PaperProps={{
          sx: {
            mt: 1.5,
            minWidth: 180,
            borderRadius: 2,
            boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
          },
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        {languages.map((lang) => (
          <MenuItem
            key={lang.code}
            onClick={() => changeLanguage(lang.code)}
            selected={i18n.language === lang.code}
            sx={{
              py: 1,
              '&.Mui-selected': {
                backgroundColor: 'rgba(13, 26, 99, 0.08)',
                '&:hover': {
                  backgroundColor: 'rgba(13, 26, 99, 0.12)',
                },
              },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
              <Typography sx={{ mr: 1, fontSize: '1.2rem' }}>{lang.flag}</Typography>
              <ListItemText primary={lang.name} />
              {i18n.language === lang.code && (
                <ListItemIcon sx={{ minWidth: 'auto', ml: 1 }}>
                  <CheckIcon color="primary" fontSize="small" />
                </ListItemIcon>
              )}
            </Box>
          </MenuItem>
        ))}
      </Menu>
    </>
  );
};