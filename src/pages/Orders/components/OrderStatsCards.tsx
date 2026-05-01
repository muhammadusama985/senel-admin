import React from 'react';
import { alpha, useTheme as useMuiTheme } from '@mui/material/styles';
import { Box, Grid, Paper, Skeleton, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import {
  CheckCircle,
  LocalShipping,
  Payment,
  Pending,
  ShoppingCart,
  Warning,
} from '@mui/icons-material';

interface OrderStats {
  total: number;
  pending: number;
  processing: number;
  shipped: number;
  delivered: number;
  cancelled: number;
  paid: number;
  unpaid: number;
}

interface Props {
  stats?: OrderStats;
  loading?: boolean;
}

const OrderStatsCards: React.FC<Props> = ({ stats, loading }) => {
  const muiTheme = useMuiTheme();
  const { t } = useTranslation();
  const isLight = muiTheme.palette.mode === 'light';

  const statCards = [
    { label: t('orders.totalOrders'), value: stats?.total || 0, icon: <ShoppingCart />, color: '#3b82f6' },
    { label: t('products.pending'), value: stats?.pending || 0, icon: <Pending />, color: '#f59e0b' },
    { label: t('orders.processing'), value: stats?.processing || 0, icon: <Payment />, color: '#8b5cf6' },
    { label: t('shipping.markShipped'), value: stats?.shipped || 0, icon: <LocalShipping />, color: '#06b6d4' },
    { label: t('shipping.delivered'), value: stats?.delivered || 0, icon: <CheckCircle />, color: '#10b981' },
    { label: t('orders.cancelled'), value: stats?.cancelled || 0, icon: <Warning />, color: '#ef4444' },
    { label: t('payments.paid'), value: stats?.paid || 0, icon: <Payment />, color: '#10b981' },
    { label: t('orders.unpaid'), value: stats?.unpaid || 0, icon: <Warning />, color: '#f59e0b' },
  ];

  const surface = muiTheme.palette.background.paper;
  const border = muiTheme.palette.divider;
  const textPrimary = muiTheme.palette.text.primary;
  const textSecondary = muiTheme.palette.text.secondary;

  const cardSx = {
    p: 2,
    borderRadius: 2,
    transition: 'transform 0.2s',
    cursor: 'pointer',
    '&:hover': {
      transform: 'translateY(-4px)',
    },
    backgroundColor: surface,
    border: `1px solid ${border}`,
  };

  if (loading) {
    return (
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[1, 2, 3, 4].map((item) => (
          <Grid size={{ xs: 12, sm: 6, md: 3 }} key={item}>
            <Skeleton variant="rounded" height={100} sx={{ bgcolor: alpha(textPrimary, isLight ? 0.08 : 0.18) }} />
          </Grid>
        ))}
      </Grid>
    );
  }

  return (
    <Grid container spacing={2} sx={{ mb: 3 }}>
      {statCards.map((stat) => (
        <Grid size={{ xs: 12, sm: 6, md: 3 }} key={stat.label}>
          <Paper sx={cardSx}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography
                  variant="caption"
                  sx={{
                    color: textSecondary,
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                  }}
                >
                  {stat.label}
                </Typography>
                <Typography
                  variant="h4"
                  sx={{
                    color: textPrimary,
                    fontWeight: 800,
                    mt: 1,
                  }}
                >
                  {stat.value}
                </Typography>
              </Box>
              <Box
                sx={{
                  backgroundColor: alpha(stat.color, 0.14),
                  borderRadius: '50%',
                  width: 48,
                  height: 48,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: stat.color,
                }}
              >
                {stat.icon}
              </Box>
            </Box>
          </Paper>
        </Grid>
      ))}
    </Grid>
  );
};

export default OrderStatsCards;
