import React, { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Grid,
  Paper,
  Tab,
  Tabs,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { alpha, useTheme as useMuiTheme } from '@mui/material/styles';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/client';
import PickupQueue from './PickupQueue';
import ShippingList from './ShippingList';

const TabPanel: React.FC<{ children?: React.ReactNode; value: number; index: number }> = ({ children, value, index }) => (
  <div hidden={value !== index} style={{ paddingTop: 24 }}>
    {value === index && children}
  </div>
);

const ShippingDashboard: React.FC = () => {
  const muiTheme = useMuiTheme();
  const isMobile = useMediaQuery('(max-width:600px)');
  const [tabValue, setTabValue] = useState(0);

  const surface = muiTheme.palette.background.paper;
  const border = muiTheme.palette.divider;
  const textPrimary = muiTheme.palette.text.primary;
  const textSecondary = muiTheme.palette.text.secondary;

  const { data: stats, isLoading, error, refetch } = useQuery({
    queryKey: ['shipping', 'stats'],
    queryFn: async () => {
      const response = await api.get('/admin/vendor-orders?status=ready_pickup,shipped,delivered');
      const orders = response.data.items || [];
      return {
        readyForPickup: orders.filter((o: any) => o.status === 'ready_pickup').length,
        inTransit: orders.filter((o: any) => o.status === 'shipped').length,
        delivered: orders.filter((o: any) => o.status === 'delivered').length,
      };
    },
  });

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress sx={{ color: muiTheme.palette.primary.main }} />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }} action={<Button color="inherit" size="small" onClick={() => refetch()}>Retry</Button>}>
        Error loading shipping data. Please try again.
      </Alert>
    );
  }

  return (
    <Box className="page-shell">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h4" sx={{ fontSize: isMobile ? '1.5rem' : '2rem', color: textPrimary }}>
          Shipping Management
        </Typography>
      </Box>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper sx={{ p: 3, backgroundColor: surface, border: `1px solid ${border}`, borderRadius: 2 }}>
            <Typography variant="subtitle2" sx={{ color: textSecondary, mb: 1 }}>
              Ready for Pickup
            </Typography>
            <Typography variant="h3" sx={{ color: muiTheme.palette.secondary.main, fontWeight: 600 }}>
              {stats?.readyForPickup || 0}
            </Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper sx={{ p: 3, backgroundColor: surface, border: `1px solid ${border}`, borderRadius: 2 }}>
            <Typography variant="subtitle2" sx={{ color: textSecondary, mb: 1 }}>
              In Transit
            </Typography>
            <Typography variant="h3" sx={{ color: textPrimary, fontWeight: 600 }}>
              {stats?.inTransit || 0}
            </Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper sx={{ p: 3, backgroundColor: surface, border: `1px solid ${border}`, borderRadius: 2 }}>
            <Typography variant="subtitle2" sx={{ color: textSecondary, mb: 1 }}>
              Delivered
            </Typography>
            <Typography variant="h3" sx={{ color: muiTheme.palette.success.main, fontWeight: 600 }}>
              {stats?.delivered || 0}
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      <Paper sx={{ width: '100%', backgroundColor: surface, border: `1px solid ${border}` }}>
        <Tabs
          value={tabValue}
          onChange={(_, newValue) => setTabValue(newValue)}
          variant={isMobile ? 'scrollable' : 'fullWidth'}
          scrollButtons={isMobile ? 'auto' : undefined}
          sx={{
            borderBottom: `1px solid ${border}`,
            '& .MuiTab-root': {
              color: textSecondary,
              fontWeight: 600,
            },
            '& .Mui-selected': {
              color: muiTheme.palette.primary.main,
            },
            '& .MuiTabs-indicator': {
              backgroundColor: muiTheme.palette.primary.main,
            },
            '& .MuiTab-root:hover': {
              backgroundColor: alpha(muiTheme.palette.primary.main, 0.06),
            },
          }}
        >
          <Tab label="Pickup Queue" />
          <Tab label="In Transit" />
          <Tab label="Delivered" />
        </Tabs>

        <TabPanel value={tabValue} index={0}>
          <PickupQueue />
        </TabPanel>
        <TabPanel value={tabValue} index={1}>
          <ShippingList status="shipped" />
        </TabPanel>
        <TabPanel value={tabValue} index={2}>
          <ShippingList status="delivered" />
        </TabPanel>
      </Paper>
    </Box>
  );
};

export default ShippingDashboard;
