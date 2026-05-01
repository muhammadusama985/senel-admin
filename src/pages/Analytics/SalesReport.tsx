import React, { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  ButtonGroup,
  Card,
  CardContent,
  CircularProgress,
  Grid,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { alpha, useTheme as useMuiTheme } from '@mui/material/styles';
import { AttachMoney, Download, ShoppingCart, Store, TrendingUp } from '@mui/icons-material';
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
import { useQuery } from '@tanstack/react-query';
import { format, subDays } from 'date-fns';
import { useTranslation } from 'react-i18next';
import api from '../../api/client';

const CHART_COLORS = ['#f59e0b', '#ec4899', '#2563eb', '#16a34a', '#8b5cf6'];

const buildRangeQuery = (
  dateRange: 'today' | 'week' | 'month' | 'custom',
  startDate: string,
  endDate: string
) => {
  if (dateRange === 'today') return 'days=1';
  if (dateRange === 'week') return 'days=7';
  if (dateRange === 'month') return 'days=30';
  return `start=${new Date(startDate).toISOString()}&end=${new Date(endDate).toISOString()}`;
};

const SalesReport: React.FC = () => {
  const muiTheme = useMuiTheme();
  const { t } = useTranslation();
  const isMobile = useMediaQuery('(max-width:600px)');

  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'custom'>('week');
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 7), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [viewType, setViewType] = useState<'revenue' | 'orders'>('revenue');

  const isLight = muiTheme.palette.mode === 'light';
  const surface = muiTheme.palette.background.paper;
  const border = muiTheme.palette.divider;
  const hover = alpha(muiTheme.palette.primary.main, isLight ? 0.06 : 0.16);
  const textPrimary = muiTheme.palette.text.primary;
  const textSecondary = muiTheme.palette.text.secondary;
  const accent = muiTheme.palette.secondary.main;
  const gridStroke = alpha(textPrimary, isLight ? 0.12 : 0.2);

  const fieldSx = {
    '& .MuiOutlinedInput-root': {
      color: textPrimary,
      backgroundColor: surface,
      '& fieldset': { borderColor: border },
      '&:hover fieldset': { borderColor: accent },
      '&.Mui-focused fieldset': { borderColor: accent },
    },
    '& .MuiInputBase-input': { color: textPrimary },
  };

  const toggleGroupSx = {
    '& .MuiButton-root': {
      color: textPrimary,
      borderColor: border,
      '&:hover': {
        backgroundColor: hover,
        borderColor: accent,
      },
    },
    '& .MuiButton-contained': {
      backgroundColor: muiTheme.palette.primary.main,
      color: '#fff',
      borderColor: muiTheme.palette.primary.main,
    },
  };

  const { data: analytics, isLoading, error } = useQuery({
    queryKey: ['admin', 'analytics', dateRange, startDate, endDate],
    queryFn: async () => {
      const response = await api.get(`/admin/analytics/orders/overview?${buildRangeQuery(dateRange, startDate, endDate)}`);
      return response.data;
    },
  });

  const { data: topProducts } = useQuery({
    queryKey: ['admin', 'analytics', 'top-products', dateRange, startDate, endDate],
    queryFn: async () => {
      const response = await api.get(`/admin/analytics/products/top?limit=10&metric=revenue&${buildRangeQuery(dateRange, startDate, endDate)}`);
      return response.data.items || [];
    },
  });

  const { data: topVendors } = useQuery({
    queryKey: ['admin', 'analytics', 'top-vendors', dateRange, startDate, endDate],
    queryFn: async () => {
      const response = await api.get(`/admin/analytics/vendors/top?limit=10&metric=delivered&${buildRangeQuery(dateRange, startDate, endDate)}`);
      return response.data.items || [];
    },
  });

  const { data: countryDemand } = useQuery({
    queryKey: ['admin', 'analytics', 'country-demand', dateRange, startDate, endDate],
    queryFn: async () => {
      let url = '/admin/analytics/demand/countries?limit=10';
      if (dateRange === 'today') url += '&days=1';
      else if (dateRange === 'week') url += '&days=7';
      else if (dateRange === 'month') url += '&days=30';
      else url += `&start=${new Date(startDate).toISOString()}&end=${new Date(endDate).toISOString()}`;
      const response = await api.get(url);
      return response.data.items || [];
    },
  });

  const { data: lowStockProducts } = useQuery({
    queryKey: ['admin', 'analytics', 'low-stock'],
    queryFn: async () => {
      const response = await api.get('/admin/analytics/products/low-stock?limit=10');
      return response.data.items || [];
    },
  });

  const { data: topCategories } = useQuery({
    queryKey: ['admin', 'analytics', 'top-categories', dateRange, startDate, endDate],
    queryFn: async () => {
      let url = '/admin/analytics/categories/top?limit=10';
      if (dateRange === 'today') url += '&days=1';
      else if (dateRange === 'week') url += '&days=7';
      else if (dateRange === 'month') url += '&days=30';
      else url += `&start=${new Date(startDate).toISOString()}&end=${new Date(endDate).toISOString()}`;
      const response = await api.get(url);
      return response.data.items || [];
    },
  });

  const { data: abandonedCarts } = useQuery({
    queryKey: ['admin', 'analytics', 'abandoned-carts', dateRange],
    queryFn: async () => {
      const days = dateRange === 'today' ? 1 : dateRange === 'week' ? 7 : 30;
      const response = await api.get(`/admin/analytics/abandoned-carts?days=${days}&limit=10`);
      return response.data;
    },
  });

  const handleExport = (fileFormat: 'csv' | 'excel') => {
    window.open(`/admin/analytics/export/orders?format=${fileFormat}`, '_blank');
  };

  const translateStatusLabel = (status?: string) => {
    if (!status) return t('products.unknown');

    const normalized = String(status).toLowerCase().replace(/[\s-]+/g, '_');
    const orderStatusKeyMap: Record<string, string> = {
      placed: 'orders.placed',
      pending: 'products.pending',
      approved: 'products.approved',
      rejected: 'products.rejected',
      cancelled: 'orders.cancelled',
      shipped: 'shipping.markShipped',
      delivered: 'shipping.delivered',
      ready_pickup: 'shipping.readyPickup',
      in_transit: 'shipping.inTransit',
    };

    const translationKey = orderStatusKeyMap[normalized];
    return translationKey ? t(translationKey) : status;
  };

  if (isLoading) {
    return <CircularProgress sx={{ color: muiTheme.palette.primary.main }} />;
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2, backgroundColor: surface, color: textPrimary, border: `1px solid ${border}` }}>
        {t('analytics.errorLoading')}
      </Alert>
    );
  }

  const summary = analytics?.summary || { totalOrders: 0, totalRevenue: 0, averageOrderValue: 0, activeVendors: 0, totalDeliveredOrders: 0 };
  const dailyData = analytics?.daily || [];
  const ordersByStatus = analytics?.vendorOrdersByStatus || analytics?.ordersByStatus || [];

  return (
    <Box className="page-shell">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h4" sx={{ fontSize: isMobile ? '1.5rem' : '2rem', color: textPrimary }}>
          {t('analytics.title')}
        </Typography>

        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <ButtonGroup size="small" variant="outlined" sx={toggleGroupSx}>
            <Button variant={dateRange === 'today' ? 'contained' : 'outlined'} onClick={() => setDateRange('today')}>
              {t('analytics.today')}
            </Button>
            <Button variant={dateRange === 'week' ? 'contained' : 'outlined'} onClick={() => setDateRange('week')}>
              {t('analytics.week')}
            </Button>
            <Button variant={dateRange === 'month' ? 'contained' : 'outlined'} onClick={() => setDateRange('month')}>
              {t('analytics.month')}
            </Button>
            <Button variant={dateRange === 'custom' ? 'contained' : 'outlined'} onClick={() => setDateRange('custom')}>
              {t('analytics.custom')}
            </Button>
          </ButtonGroup>

          {dateRange === 'custom' && (
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <TextField type="date" size="small" value={startDate} onChange={(e) => setStartDate(e.target.value)} sx={fieldSx} />
              <TextField type="date" size="small" value={endDate} onChange={(e) => setEndDate(e.target.value)} sx={fieldSx} />
            </Box>
          )}

          <Button variant="outlined" startIcon={<Download />} onClick={() => handleExport('csv')} sx={{ color: textPrimary, borderColor: border }}>
            {t('analytics.export')}
          </Button>
        </Box>
      </Box>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ backgroundColor: surface, border: `1px solid ${border}` }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography gutterBottom variant="body2" sx={{ color: textSecondary }}>
                    {t('analytics.totalOrders')}
                  </Typography>
                  <Typography variant="h4" sx={{ color: textPrimary }}>
                    {summary.totalOrders}
                  </Typography>
                </Box>
                <ShoppingCart sx={{ fontSize: 40, color: muiTheme.palette.primary.main, opacity: 0.7 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ backgroundColor: surface, border: `1px solid ${border}` }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography gutterBottom variant="body2" sx={{ color: textSecondary }}>
                    {t('analytics.deliveredOrders')}
                  </Typography>
                  <Typography variant="h4" sx={{ color: textPrimary }}>
                    {summary.totalDeliveredOrders || 0}
                  </Typography>
                </Box>
                <TrendingUp sx={{ fontSize: 40, color: muiTheme.palette.success.main, opacity: 0.75 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ backgroundColor: surface, border: `1px solid ${border}` }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography gutterBottom variant="body2" sx={{ color: textSecondary }}>
                    {t('analytics.deliveredRevenue')}
                  </Typography>
                  <Typography variant="h4" sx={{ color: accent, fontWeight: 800 }}>
                    {Number(summary.totalRevenue || 0).toFixed(2)}
                  </Typography>
                </Box>
                <AttachMoney sx={{ fontSize: 40, color: accent, opacity: 0.75 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ backgroundColor: surface, border: `1px solid ${border}` }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography gutterBottom variant="body2" sx={{ color: textSecondary }}>
                    {t('analytics.avgDeliveredValue')}
                  </Typography>
                  <Typography variant="h4" sx={{ color: textPrimary }}>
                    {Number(summary.averageOrderValue || 0).toFixed(2)}
                  </Typography>
                </Box>
                <TrendingUp sx={{ fontSize: 40, color: muiTheme.palette.info.main, opacity: 0.75 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ backgroundColor: surface, border: `1px solid ${border}` }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography gutterBottom variant="body2" sx={{ color: textSecondary }}>
                    {t('analytics.activeVendors')}
                  </Typography>
                  <Typography variant="h4" sx={{ color: textPrimary }}>
                    {summary.activeVendors || 0}
                  </Typography>
                </Box>
                <Store sx={{ fontSize: 40, color: muiTheme.palette.warning.main, opacity: 0.75 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Card sx={{ backgroundColor: surface, border: `1px solid ${border}` }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, gap: 2, flexWrap: 'wrap' }}>
                <Typography variant="h6" sx={{ color: textPrimary }}>
                  {t('analytics.revenueTrend')}
                </Typography>
                <ButtonGroup size="small" variant="outlined" sx={toggleGroupSx}>
                  <Button variant={viewType === 'revenue' ? 'contained' : 'outlined'} onClick={() => setViewType('revenue')}>
                    {t('analytics.revenue')}
                  </Button>
                  <Button variant={viewType === 'orders' ? 'contained' : 'outlined'} onClick={() => setViewType('orders')}>
                    {t('analytics.orders')}
                  </Button>
                </ButtonGroup>
              </Box>

              <Box sx={{ height: 400 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dailyData}>
                    <CartesianGrid stroke={gridStroke} strokeDasharray="3 3" />
                    <XAxis dataKey="date" stroke={textSecondary} />
                    <YAxis stroke={textSecondary} />
                    <Tooltip
                      contentStyle={{
                        background: surface,
                        border: `1px solid ${border}`,
                        color: textPrimary,
                        borderRadius: 8,
                      }}
                      labelStyle={{ color: textPrimary }}
                      itemStyle={{ color: textPrimary }}
                    />
                    <Legend wrapperStyle={{ color: textPrimary }} />
                    {viewType === 'revenue' ? (
                      <Line type="monotone" dataKey="revenue" stroke={accent} strokeWidth={3} dot={false} />
                    ) : (
                      <Line type="monotone" dataKey="orders" stroke={muiTheme.palette.primary.main} strokeWidth={3} dot={false} />
                    )}
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
                {t('analytics.ordersByStatus')}
              </Typography>
              <Box sx={{ height: 400 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={ordersByStatus}
                      dataKey="orders"
                      nameKey="_id"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={(props: any) => {
                        const { x, y, name, value } = props;
                        return (
                          <text x={x} y={y} fill={textPrimary} textAnchor="middle" dominantBaseline="central">
                            {`${translateStatusLabel(name)}: ${value}`}
                          </text>
                        );
                      }}
                    >
                      {ordersByStatus.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: surface,
                        border: `1px solid ${border}`,
                        color: textPrimary,
                        borderRadius: 8,
                      }}
                      labelStyle={{ color: textPrimary }}
                      itemStyle={{ color: textPrimary }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ backgroundColor: surface, border: `1px solid ${border}` }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ color: textPrimary }}>
                {t('analytics.topProducts')}
              </Typography>
              <TableContainer sx={{ background: surface, borderRadius: 2, border: `1px solid ${border}` }}>
                <Table size="small">
                  <TableHead>
                    <TableRow
                      sx={{
                        backgroundColor: alpha(textPrimary, isLight ? 0.04 : 0.08),
                        '& .MuiTableCell-root': {
                          color: textPrimary,
                          fontWeight: 700,
                          borderBottom: `1px solid ${border}`,
                        },
                      }}
                    >
                      <TableCell>{t('products.product')}</TableCell>
                      <TableCell align="right">{t('analytics.quantity')}</TableCell>
                      <TableCell align="right">{t('analytics.revenue')}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {topProducts?.map((product: any) => (
                      <TableRow key={product._id} sx={{ '&:hover': { backgroundColor: hover } }}>
                        <TableCell sx={{ color: textPrimary, borderBottom: `1px solid ${border}` }}>{product.product?.title || t('analytics.unknownProduct')}</TableCell>
                        <TableCell align="right" sx={{ color: textPrimary, borderBottom: `1px solid ${border}` }}>
                          {product.qtySum || 0}
                        </TableCell>
                        <TableCell align="right" sx={{ color: textPrimary, borderBottom: `1px solid ${border}` }}>
                          <Typography fontWeight={800} sx={{ color: accent }}>
                            {Number(product.revenueSum || 0).toFixed(2)}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ backgroundColor: surface, border: `1px solid ${border}` }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ color: textPrimary }}>
                {t('analytics.topVendors')}
              </Typography>
              <TableContainer sx={{ background: surface, borderRadius: 2, border: `1px solid ${border}` }}>
                <Table size="small">
                  <TableHead>
                    <TableRow
                      sx={{
                        backgroundColor: alpha(textPrimary, isLight ? 0.04 : 0.08),
                        '& .MuiTableCell-root': {
                          color: textPrimary,
                          fontWeight: 700,
                          borderBottom: `1px solid ${border}`,
                        },
                      }}
                    >
                      <TableCell>{t('common.vendor')}</TableCell>
                      <TableCell align="right">{t('analytics.orders')}</TableCell>
                      <TableCell align="right">{t('analytics.revenue')}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {topVendors?.map((vendor: any) => (
                      <TableRow key={vendor._id} sx={{ '&:hover': { backgroundColor: hover } }}>
                        <TableCell sx={{ color: textPrimary, borderBottom: `1px solid ${border}` }}>
                          {vendor.vendor?.storeName || t('dashboard.senelAdmin')}
                        </TableCell>
                        <TableCell align="right" sx={{ color: textPrimary, borderBottom: `1px solid ${border}` }}>
                          {vendor.vendorOrders || 0}
                        </TableCell>
                        <TableCell align="right" sx={{ color: textPrimary, borderBottom: `1px solid ${border}` }}>
                          <Typography fontWeight={800} sx={{ color: accent }}>
                            {Number(vendor.grandTotalSum || 0).toFixed(2)}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ backgroundColor: surface, border: `1px solid ${border}` }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ color: textPrimary }}>
                {t('analytics.countryDemand')}
              </Typography>
              <TableContainer sx={{ background: surface, borderRadius: 2, border: `1px solid ${border}` }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ backgroundColor: alpha(textPrimary, isLight ? 0.04 : 0.08) }}>
                      <TableCell sx={{ color: textPrimary, fontWeight: 700 }}>{t('analytics.country')}</TableCell>
                      <TableCell align="right" sx={{ color: textPrimary, fontWeight: 700 }}>{t('analytics.orders')}</TableCell>
                      <TableCell align="right" sx={{ color: textPrimary, fontWeight: 700 }}>{t('analytics.revenue')}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {countryDemand?.map((item: any) => (
                      <TableRow key={item.country} sx={{ '&:hover': { backgroundColor: hover } }}>
                        <TableCell sx={{ color: textPrimary, borderBottom: `1px solid ${border}` }}>{item.country || t('products.unknown')}</TableCell>
                        <TableCell align="right" sx={{ color: textPrimary, borderBottom: `1px solid ${border}` }}>{item.orders}</TableCell>
                        <TableCell align="right" sx={{ color: textPrimary, borderBottom: `1px solid ${border}` }}>
                          <Typography fontWeight={800} sx={{ color: accent }}>{Number(item.revenue || 0).toFixed(2)}</Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ backgroundColor: surface, border: `1px solid ${border}` }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ color: textPrimary }}>
                {t('analytics.topCategories')}
              </Typography>
              <TableContainer sx={{ background: surface, borderRadius: 2, border: `1px solid ${border}` }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ backgroundColor: alpha(textPrimary, isLight ? 0.04 : 0.08) }}>
                      <TableCell sx={{ color: textPrimary, fontWeight: 700 }}>{t('analytics.category')}</TableCell>
                      <TableCell align="right" sx={{ color: textPrimary, fontWeight: 700 }}>{t('analytics.units')}</TableCell>
                      <TableCell align="right" sx={{ color: textPrimary, fontWeight: 700 }}>{t('analytics.revenue')}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {topCategories?.map((item: any) => (
                      <TableRow key={item.categoryId || item.category?.slug || item.category?.name} sx={{ '&:hover': { backgroundColor: hover } }}>
                        <TableCell sx={{ color: textPrimary, borderBottom: `1px solid ${border}` }}>
                          {item.category?.name || t('dashboard.uncategorized')}
                        </TableCell>
                        <TableCell align="right" sx={{ color: textPrimary, borderBottom: `1px solid ${border}` }}>
                          {item.qtySum || 0}
                        </TableCell>
                        <TableCell align="right" sx={{ color: textPrimary, borderBottom: `1px solid ${border}` }}>
                          <Typography fontWeight={800} sx={{ color: accent }}>
                            {Number(item.revenueSum || 0).toFixed(2)}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ backgroundColor: surface, border: `1px solid ${border}` }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ color: textPrimary }}>
                {t('analytics.lowInventoryAlerts')}
              </Typography>
              <TableContainer sx={{ background: surface, borderRadius: 2, border: `1px solid ${border}` }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ backgroundColor: alpha(textPrimary, isLight ? 0.04 : 0.08) }}>
                      <TableCell sx={{ color: textPrimary, fontWeight: 700 }}>{t('products.product')}</TableCell>
                      <TableCell sx={{ color: textPrimary, fontWeight: 700 }}>{t('common.vendor')}</TableCell>
                      <TableCell align="right" sx={{ color: textPrimary, fontWeight: 700 }}>{t('analytics.stock')}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {lowStockProducts?.map((item: any) => (
                      <TableRow key={item._id} sx={{ '&:hover': { backgroundColor: hover } }}>
                        <TableCell sx={{ color: textPrimary, borderBottom: `1px solid ${border}` }}>{item.title}</TableCell>
                        <TableCell sx={{ color: textPrimary, borderBottom: `1px solid ${border}` }}>{item.vendorId?.storeName || t('dashboard.senelAdmin')}</TableCell>
                        <TableCell align="right" sx={{ color: textPrimary, borderBottom: `1px solid ${border}` }}>{item.stockQty}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ backgroundColor: surface, border: `1px solid ${border}` }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ color: textPrimary }}>
                {t('analytics.abandonedCarts')}
              </Typography>
              <Stack spacing={1}>
                <Typography sx={{ color: textSecondary }}>
                  {t('analytics.totalAbandoned')}: <strong style={{ color: textPrimary }}>{abandonedCarts?.totalAbandonedCarts || 0}</strong>
                </Typography>
                <Typography sx={{ color: textSecondary }}>
                  {t('analytics.potentialRevenue')}: <strong style={{ color: textPrimary }}>{Number(abandonedCarts?.potentialRevenue || 0).toFixed(2)}</strong>
                </Typography>
                <Typography sx={{ color: textSecondary }}>
                  {t('analytics.recoveryRate')}: <strong style={{ color: textPrimary }}>{Number(abandonedCarts?.recoveryRate || 0).toFixed(1)}%</strong>
                </Typography>
                <Typography sx={{ color: textSecondary }}>
                  {t('analytics.avgItemsPerCart')}: <strong style={{ color: textPrimary }}>{Number(abandonedCarts?.avgItems || 0).toFixed(1)}</strong>
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ backgroundColor: surface, border: `1px solid ${border}` }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ color: textPrimary }}>
                {t('analytics.topAbandonedProducts')}
              </Typography>
              <TableContainer sx={{ background: surface, borderRadius: 2, border: `1px solid ${border}` }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ backgroundColor: alpha(textPrimary, isLight ? 0.04 : 0.08) }}>
                      <TableCell sx={{ color: textPrimary, fontWeight: 700 }}>{t('products.product')}</TableCell>
                      <TableCell align="right" sx={{ color: textPrimary, fontWeight: 700 }}>{t('analytics.quantity')}</TableCell>
                      <TableCell align="right" sx={{ color: textPrimary, fontWeight: 700 }}>{t('analytics.value')}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {abandonedCarts?.topProducts?.map((item: any) => (
                      <TableRow key={item.productId} sx={{ '&:hover': { backgroundColor: hover } }}>
                        <TableCell sx={{ color: textPrimary, borderBottom: `1px solid ${border}` }}>
                          {item.product?.title || t('analytics.unknownProduct')}
                        </TableCell>
                        <TableCell align="right" sx={{ color: textPrimary, borderBottom: `1px solid ${border}` }}>
                          {item.abandonedCount || 0}
                        </TableCell>
                        <TableCell align="right" sx={{ color: textPrimary, borderBottom: `1px solid ${border}` }}>
                          <Typography fontWeight={800} sx={{ color: accent }}>
                            {Number(item.value || 0).toFixed(2)}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12 }}>
          <Card sx={{ backgroundColor: surface, border: `1px solid ${border}` }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ color: textPrimary }}>
                {t('analytics.recentAbandonedCarts')}
              </Typography>
              <TableContainer sx={{ background: surface, borderRadius: 2, border: `1px solid ${border}` }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ backgroundColor: alpha(textPrimary, isLight ? 0.04 : 0.08) }}>
                      <TableCell sx={{ color: textPrimary, fontWeight: 700 }}>{t('analytics.customer')}</TableCell>
                      <TableCell sx={{ color: textPrimary, fontWeight: 700 }}>{t('analytics.preview')}</TableCell>
                      <TableCell align="right" sx={{ color: textPrimary, fontWeight: 700 }}>{t('analytics.items')}</TableCell>
                      <TableCell align="right" sx={{ color: textPrimary, fontWeight: 700 }}>{t('analytics.vendors')}</TableCell>
                      <TableCell align="right" sx={{ color: textPrimary, fontWeight: 700 }}>{t('analytics.subtotal')}</TableCell>
                      <TableCell align="right" sx={{ color: textPrimary, fontWeight: 700 }}>{t('analytics.updated')}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {abandonedCarts?.items?.map((item: any) => (
                      <TableRow key={item.cartId} sx={{ '&:hover': { backgroundColor: hover } }}>
                        <TableCell sx={{ color: textPrimary, borderBottom: `1px solid ${border}` }}>
                          {item.customer?.email || item.customer?.phone || t('analytics.unknownCustomer')}
                        </TableCell>
                        <TableCell sx={{ color: textPrimary, borderBottom: `1px solid ${border}` }}>
                          {(item.itemsPreview || [])
                            .map((preview: any) => `${preview.title} x${preview.qty}`)
                            .join(', ') || t('analytics.noItems')}
                        </TableCell>
                        <TableCell align="right" sx={{ color: textPrimary, borderBottom: `1px solid ${border}` }}>
                          {item.totalItems || 0}
                        </TableCell>
                        <TableCell align="right" sx={{ color: textPrimary, borderBottom: `1px solid ${border}` }}>
                          {item.vendorCount || 0}
                        </TableCell>
                        <TableCell align="right" sx={{ color: textPrimary, borderBottom: `1px solid ${border}` }}>
                          <Typography fontWeight={800} sx={{ color: accent }}>
                            {Number(item.subtotal || 0).toFixed(2)}
                          </Typography>
                        </TableCell>
                        <TableCell align="right" sx={{ color: textPrimary, borderBottom: `1px solid ${border}` }}>
                          {item.updatedAt ? format(new Date(item.updatedAt), 'MMM dd, yyyy') : t('products.notAvailable')}
                        </TableCell>
                      </TableRow>
                    ))}
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

export default SalesReport;
