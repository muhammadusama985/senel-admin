import React from 'react';
import {
  Alert,
  Box,
  Card,
  CardContent,
  Grid,
  LinearProgress,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { alpha, useTheme as useMuiTheme } from '@mui/material/styles';
import { useQuery } from '@tanstack/react-query';
import {
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import api from '../../api/client';
import RecentOrders from './widgets/RecentOrders';
import StatsWidget from './widgets/StatsWidget';

const CHART_COLORS = ['#f59e0b', '#ec4899', '#f97316', '#8b5cf6', '#22c55e'];

const Dashboard: React.FC = () => {
  const muiTheme = useMuiTheme();
  const isMobile = useMediaQuery('(max-width:600px)');
  const isLight = muiTheme.palette.mode === 'light';

  const surface = muiTheme.palette.background.paper;
  const border = muiTheme.palette.divider;
  const textPrimary = muiTheme.palette.text.primary;
  const textSecondary = muiTheme.palette.text.secondary;
  const chartGrid = alpha(textPrimary, isLight ? 0.12 : 0.18);
  const tooltipBg = alpha(surface, 0.96);

  const { data: stats, isLoading, error } = useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: async () => {
      const ordersResponse = await api
        .get('/admin/analytics/orders/overview')
        .catch(() => ({ data: { summary: { totalDeliveredOrders: 0 } } }));

      const vendorsResponse = await api
        .get('/vendors/admin/vendors')
        .catch(() => ({ data: { vendors: [] } }));
      const pendingVendors =
        vendorsResponse.data.vendors?.filter((vendor: any) => vendor.status === 'submitted').length || 0;

      const productsResponse = await api
        .get('/products/admin/products?status=submitted')
        .catch(() => ({ data: { products: [] } }));

      const payoutsResponse = await api
        .get('/admin/payouts?status=requested')
        .catch(() => ({ data: { items: [] } }));

      const lowStockResponse = await api
        .get('/admin/analytics/products/low-stock?limit=10')
        .catch(() => ({ data: { items: [] } }));

      const revenueResponse = await api
        .get('/admin/analytics/products/top?limit=7')
        .catch(() => ({ data: { items: [] } }));

      return {
        orders: ordersResponse.data,
        pendingVendors,
        pendingProducts: productsResponse.data.products?.length || 0,
        pendingPayouts: payoutsResponse.data.items?.length || 0,
        lowStockProducts: lowStockResponse.data.items || [],
        lowStockCount: lowStockResponse.data.total || lowStockResponse.data.items?.length || 0,
        revenue:
          revenueResponse.data.items?.map((item: any, index: number) => ({
            date: `Day ${index + 1}`,
            revenue: item.totalRevenue || 0,
          })) || [],
      };
    },
    refetchInterval: 30000,
  });

  if (isLoading) {
    return (
      <LinearProgress
        sx={{
          backgroundColor: alpha(textPrimary, isLight ? 0.08 : 0.18),
          '& .MuiLinearProgress-bar': { backgroundColor: muiTheme.palette.primary.main },
        }}
      />
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        Error loading dashboard data. Please refresh.
      </Alert>
    );
  }

  const orderStatusData = stats?.orders?.ordersByStatus || [];
  const revenueData = stats?.revenue || [];

  return (
    <Box className="page-shell">
      <Typography variant="h4" gutterBottom sx={{ fontSize: isMobile ? '1.5rem' : '2rem', color: textPrimary, mb: 3 }}>
        Dashboard
      </Typography>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatsWidget title="Delivered Orders" value={stats?.orders?.summary?.totalDeliveredOrders || 0} icon="orders" color={muiTheme.palette.primary.main} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatsWidget title="Pending Vendors" value={stats?.pendingVendors || 0} icon="vendors" color={muiTheme.palette.error.main} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatsWidget title="Pending Products" value={stats?.pendingProducts || 0} icon="products" color={muiTheme.palette.warning.main} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatsWidget title="Pending Payouts" value={stats?.pendingPayouts || 0} icon="payouts" color={muiTheme.palette.success.main} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatsWidget title="Low Stock Products" value={stats?.lowStockCount || 0} icon="inventory" color={muiTheme.palette.error.main} />
        </Grid>

        <Grid size={{ xs: 12, md: 8 }}>
          <Card sx={{ backgroundColor: surface, border: `1px solid ${border}` }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ color: textPrimary }}>
                Revenue Trend (Last 7 Days)
              </Typography>

              <Box sx={{ height: isMobile ? 250 : 350 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={revenueData}>
                    <CartesianGrid stroke={chartGrid} strokeDasharray="3 3" />
                    <XAxis dataKey="date" stroke={textSecondary} />
                    <YAxis stroke={textSecondary} />
                    <Tooltip
                      contentStyle={{
                        background: tooltipBg,
                        border: `1px solid ${border}`,
                        color: textPrimary,
                      }}
                      labelStyle={{ color: textPrimary }}
                      itemStyle={{ color: textPrimary }}
                    />
                    <Legend wrapperStyle={{ color: textPrimary }} />
                    <Line type="monotone" dataKey="revenue" stroke={muiTheme.palette.primary.main} strokeWidth={3} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ height: '100%', backgroundColor: surface, border: `1px solid ${border}` }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ color: textPrimary }}>
                Order Status
              </Typography>

              <Box sx={{ height: isMobile ? 200 : 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={orderStatusData}
                      dataKey="orders"
                      nameKey="_id"
                      cx="50%"
                      cy="50%"
                      outerRadius={isMobile ? 60 : 80}
                      label={(props: any) => {
                        const { x, y, name, value } = props;
                        return (
                          <text x={x} y={y} fill={textPrimary} textAnchor="middle" dominantBaseline="central">
                            {`${name}: ${value}`}
                          </text>
                        );
                      }}
                    >
                      {orderStatusData.map((_entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: tooltipBg,
                        border: `1px solid ${border}`,
                        color: textPrimary,
                      }}
                      labelStyle={{ color: textPrimary }}
                      itemStyle={{ color: textPrimary }}
                    />
                    <Legend wrapperStyle={{ color: textPrimary }} />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12 }}>
          <Card sx={{ backgroundColor: surface, border: `1px solid ${border}` }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ color: textPrimary }}>
                Recent Orders
              </Typography>
              <RecentOrders />
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12 }}>
          <Card sx={{ backgroundColor: surface, border: `1px solid ${border}` }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ color: textPrimary }}>
                Low Stock Products
              </Typography>

              {stats?.lowStockProducts?.length ? (
                <Box sx={{ display: 'grid', gap: 1.25 }}>
                  {stats.lowStockProducts.map((item: any) => (
                    <Box
                      key={item._id}
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: isMobile ? '1fr' : 'minmax(180px, 2fr) minmax(160px, 1.4fr) 110px 110px',
                        gap: 1,
                        alignItems: 'center',
                        px: 1.5,
                        py: 1.25,
                        borderRadius: 2,
                        border: `1px solid ${border}`,
                        backgroundColor: alpha(muiTheme.palette.error.main, isLight ? 0.03 : 0.08),
                      }}
                    >
                      <Box>
                        <Typography sx={{ color: textPrimary, fontWeight: 700 }}>
                          {item.title}
                        </Typography>
                        <Typography variant="body2" sx={{ color: textSecondary }}>
                          {item.categoryId?.name || 'Uncategorized'}
                        </Typography>
                      </Box>

                      <Box>
                        <Typography sx={{ color: textPrimary }}>
                          {item.vendorId?.storeName || 'Senel Admin'}
                        </Typography>
                        <Typography variant="body2" sx={{ color: textSecondary }}>
                          {item.vendorId ? 'Vendor product' : 'Platform product'}
                        </Typography>
                      </Box>

                      <Typography sx={{ color: textPrimary, fontWeight: 700 }}>
                        Stock: {item.hasVariants
                          ? (item.variants || []).reduce((sum: number, variant: any) => sum + Number(variant.stockQty || 0), 0)
                          : Number(item.stockQty || 0)}
                      </Typography>

                      <Typography sx={{ color: muiTheme.palette.error.main, fontWeight: 700 }}>
                        Threshold: {Number(item.lowStockThreshold || 0)}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              ) : (
                <Typography sx={{ color: textSecondary }}>
                  No low stock products right now.
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;
