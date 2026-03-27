import React from 'react';
import { Box, Card, CardContent, Typography, useMediaQuery } from '@mui/material';
import { alpha, useTheme as useMuiTheme } from '@mui/material/styles';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import StoreIcon from '@mui/icons-material/Store';
import InventoryIcon from '@mui/icons-material/Inventory';
import PaymentsIcon from '@mui/icons-material/Payments';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';

interface StatsWidgetProps {
  title: string;
  value: number;
  icon: 'orders' | 'vendors' | 'products' | 'payouts' | 'inventory';
  color: string;
}

const StatsWidget: React.FC<StatsWidgetProps> = ({ title, value, icon, color }) => {
  const muiTheme = useMuiTheme();
  const isMobile = useMediaQuery('(max-width:600px)');
  const isLight = muiTheme.palette.mode === 'light';

  const getIcon = () => {
    const iconProps = { sx: { fontSize: isMobile ? 30 : 40 } };
    switch (icon) {
      case 'orders':
        return <ShoppingCartIcon {...iconProps} />;
      case 'vendors':
        return <StoreIcon {...iconProps} />;
      case 'products':
        return <InventoryIcon {...iconProps} />;
      case 'inventory':
        return <InventoryIcon {...iconProps} />;
      case 'payouts':
        return <PaymentsIcon {...iconProps} />;
      default:
        return <TrendingUpIcon {...iconProps} />;
    }
  };

  return (
    <Card
      sx={{
        height: '100%',
        backgroundColor: muiTheme.palette.background.paper,
        border: `1px solid ${muiTheme.palette.divider}`,
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: isLight
            ? '0 18px 36px rgba(15,23,42,0.10)'
            : '0 18px 36px rgba(0,0,0,0.32)',
        },
      }}
    >
      <CardContent>
        <Box
          sx={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            alignItems: isMobile ? 'flex-start' : 'center',
            justifyContent: 'space-between',
            gap: isMobile ? 1 : 0,
          }}
        >
          <Box>
            <Typography variant="body2" sx={{ color: muiTheme.palette.text.secondary, mb: 0.5 }}>
              {title}
            </Typography>
            <Typography variant={isMobile ? 'h5' : 'h4'} sx={{ fontWeight: 700, color: muiTheme.palette.text.primary }}>
              {value?.toLocaleString() || '0'}
            </Typography>
          </Box>

          <Box
            sx={{
              backgroundColor: alpha(color, isLight ? 0.12 : 0.2),
              color,
              borderRadius: '50%',
              p: isMobile ? 1 : 1.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              alignSelf: isMobile ? 'flex-end' : 'center',
              boxShadow: `0 0 0 2px ${alpha(color, 0.18)}`,
            }}
          >
            {getIcon()}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default StatsWidget;
