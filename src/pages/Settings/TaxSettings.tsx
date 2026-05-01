import React, { useState } from 'react';
import {
  Box,
  Typography,
  Grid,
  TextField,
  Button,
  Switch,
  FormControlLabel,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  useMediaQuery,
} from '@mui/material';
import {
  Save,
  Add,
  Delete,
  Percent,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/client';
import { useTheme } from '../../context/ThemeContext';
import { useTranslation } from 'react-i18next';

interface CountryRate {
  country: string;
  rate: number;
}

const TaxSettings: React.FC = () => {
  const { mode } = useTheme();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const isMobile = useMediaQuery('(max-width:600px)');
  
  const [settings, setSettings] = useState({
    enabled: false,
    mode: 'exclusive',
    defaultRate: 0,
    applyOnShipping: false,
    countryRates: [] as CountryRate[],
  });
  const [newCountry, setNewCountry] = useState('');
  const [newRate, setNewRate] = useState('');

  const { isLoading } = useQuery({
    queryKey: ['admin', 'tax'],
    queryFn: async () => {
      const response = await api.get('/admin/tax');
      if (response.data.settings) {
        setSettings(response.data.settings);
      }
      return response.data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      await api.patch('/admin/tax', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'tax'] });
    },
  });

  const handleSave = () => {
    saveMutation.mutate(settings);
  };

  const handleAddCountryRate = () => {
    if (newCountry && newRate) {
      setSettings({
        ...settings,
        countryRates: [
          ...settings.countryRates,
          { country: newCountry, rate: parseFloat(newRate) },
        ],
      });
      setNewCountry('');
      setNewRate('');
    }
  };

  const handleRemoveCountryRate = (index: number) => {
    setSettings({
      ...settings,
      countryRates: settings.countryRates.filter((_, i) => i !== index),
    });
  };

  if (isLoading) return <CircularProgress />;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography
          variant="h4"
          sx={{
            fontSize: isMobile ? '1.5rem' : '2rem',
            color: mode === 'light' ? '#1C0770' : '#9f96c1',
          }}
        >
          {t('tax.title')}
        </Typography>
        <Button
          variant="contained"
          startIcon={<Save />}
          onClick={handleSave}
          disabled={saveMutation.isPending}
        sx={{
  background: 'linear-gradient(90deg, #5B2EFF 0%, #8A2BE2 50%, #FF6A00 100%)',
  color: '#ffffff',
  '&:hover': {
    background: 'linear-gradient(90deg, #4a25d9 0%, #7a22c9 50%, #e85f00 100%)',
  },
  '&:disabled': {
    background: 'linear-gradient(90deg, rgba(91,46,255,0.5) 0%, rgba(138,43,226,0.5) 50%, rgba(255,106,0,0.5) 100%)',
    color: 'rgba(255,255,255,0.6)',
  },
}}
        >
          {saveMutation.isPending ? <CircularProgress size={24} /> : t('tax.saveChanges')}
        </Button>
      </Box>

      {saveMutation.isSuccess && (
        <Alert severity="success" sx={{ mb: 3 }}>
          {t('tax.updated')}
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid size={{xs:12,md:6 }} >
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ color: '#1C0770' }}>
                {t('tax.generalSettings')}
              </Typography>
              
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.enabled}
                    onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })}
                  />
                }
                label={t('tax.enableCalculation')}
                sx={{ mb: 2, display: 'block' }}
              />

              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>{t('tax.mode')}</InputLabel>
                <Select
                  value={settings.mode}
                  label={t('tax.mode')}
                  onChange={(e) => setSettings({ ...settings, mode: e.target.value })}
                >
                  <MenuItem value="exclusive">{t('tax.exclusive')}</MenuItem>
                  <MenuItem value="inclusive">{t('tax.inclusive')}</MenuItem>
                </Select>
              </FormControl>

              <TextField
                label={t('tax.defaultRate')}
                type="number"
                fullWidth
                value={settings.defaultRate}
                onChange={(e) => setSettings({ ...settings, defaultRate: parseFloat(e.target.value) || 0 })}
                InputProps={{
                  startAdornment: <Percent sx={{ mr: 1, color: '#b0b0b0' }} />,
                }}
                sx={{ mb: 2 }}
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={settings.applyOnShipping}
                    onChange={(e) => setSettings({ ...settings, applyOnShipping: e.target.checked })}
                  />
                }
                label={t('tax.applyOnShipping')}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{xs:12, md:6 }} >
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ color: '#1C0770' }}>
                {t('tax.countryRates')}
              </Typography>

              <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                <TextField
                  size="small"
                  label={t('tax.country')}
                  value={newCountry}
                  onChange={(e) => setNewCountry(e.target.value)}
                  placeholder={t('tax.countryPlaceholder')}
                  sx={{ flex: 2 }}
                />
                <TextField
                  size="small"
                  label={t('tax.ratePercent')}
                  type="number"
                  value={newRate}
                  onChange={(e) => setNewRate(e.target.value)}
                  sx={{ flex: 1 }}
                />
                <IconButton
                  color="primary"
                  onClick={handleAddCountryRate}
                  disabled={!newCountry || !newRate}
                  sx={{ color: '#1C0770' }}
                >
                  <Add />
                </IconButton>
              </Box>

              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>{t('tax.country')}</TableCell>
                      <TableCell>{t('tax.rate')}</TableCell>
                      <TableCell align="right">{t('tax.action')}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {settings.countryRates.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>{item.country}</TableCell>
                        <TableCell>{item.rate}%</TableCell>
                        <TableCell align="right">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleRemoveCountryRate(index)}
                          >
                            <Delete />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                    {settings.countryRates.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} align="center">
                          {t('tax.noCountryRates')}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default TaxSettings;
