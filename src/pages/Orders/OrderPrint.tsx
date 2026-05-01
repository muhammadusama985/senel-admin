import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Card,
  CardContent,
} from '@mui/material';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { formatMoney } from '../../utils/currency';

interface OrderPrintProps {
  order: any;
}

const OrderPrint: React.FC<OrderPrintProps> = ({ order }) => {
  const { t } = useTranslation();
  const orderCurrency = order?.order?.currency || order?.items?.[0]?.currency || 'EUR';

  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h4" align="center" gutterBottom>
        {t('orders.order')}#{order.order?.orderNumber}
      </Typography>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 6 }}>
          <Typography variant="subtitle2">{t('print.orderDate')}:</Typography>
          <Typography variant="body1">
            {format(new Date(order.order.createdAt), 'PPP')}
          </Typography>
        </Grid>
        <Grid size={{ xs: 6 }}>
          <Typography variant="subtitle2">{t('print.totalAmount')}:</Typography>
          <Typography variant="h6" sx={{ color: '#1C0770' }}>
            {formatMoney(order.order.grandTotal || 0, orderCurrency)}
          </Typography>
        </Grid>
      </Grid>

      <Typography variant="h6" gutterBottom sx={{ color: '#1C0770' }}>
        {t('print.customerInformation')}
      </Typography>
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 6 }}>
            <Typography variant="body2">
              <strong>{t('common.name')}:</strong> {order.order.shippingAddress?.contactPerson || t('products.notAvailable')}
            </Typography>
            <Typography variant="body2">
              <strong>{t('common.email')}:</strong> {order.order.customerUserId?.email || t('products.notAvailable')}
            </Typography>
            <Typography variant="body2">
              <strong>{t('common.phone')}:</strong> {order.order.shippingAddress?.mobileNumber || t('products.notAvailable')}
            </Typography>
          </Grid>
          <Grid size={{ xs: 6 }}>
            <Typography variant="body2">
              <strong>{t('common.address')}:</strong>
              <br />
              {order.order.shippingAddress?.companyName && (
                <>
                  {order.order.shippingAddress.companyName}
                  <br />
                </>
              )}
              {order.order.shippingAddress?.street}
              <br />
              {order.order.shippingAddress?.city}, {order.order.shippingAddress?.country}
            </Typography>
          </Grid>
        </Grid>
      </Paper>

      <Typography variant="h6" gutterBottom sx={{ color: '#1C0770' }}>
        {t('print.orderItems')}
      </Typography>

      {order.vendorOrders?.map((vendorOrder: any) => (
        <Card key={vendorOrder._id} sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="subtitle1" sx={{ color: '#1C0770', fontWeight: 600 }}>
              {vendorOrder.vendorStoreName}
            </Typography>
            <Typography variant="caption" display="block" gutterBottom>
              {t('common.orderNumber')} #{vendorOrder.vendorOrderNumber}
            </Typography>

            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>{t('print.product')}</TableCell>
                    <TableCell align="right">{t('print.qty')}</TableCell>
                    <TableCell align="right">{t('print.unitPrice')}</TableCell>
                    <TableCell align="right">{t('print.total')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {order.items
                    ?.filter((item: any) => item.vendorOrderId === vendorOrder._id)
                    .map((item: any) => (
                      <TableRow key={item._id}>
                        <TableCell>{item.title}</TableCell>
                        <TableCell align="right">{item.qty}</TableCell>
                        <TableCell align="right">{formatMoney(item.unitPrice || 0, item.currency || orderCurrency)}</TableCell>
                        <TableCell align="right">{formatMoney(item.lineTotal || 0, item.currency || orderCurrency)}</TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </TableContainer>

            {vendorOrder.shipping && vendorOrder.shipping.trackingCode && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="caption" display="block">
                  {t('print.tracking')}: {vendorOrder.shipping.partnerName} - {vendorOrder.shipping.trackingCode}
                </Typography>
              </Box>
            )}
          </CardContent>
        </Card>
      ))}

      <Box sx={{ mt: 4, pt: 2, borderTop: '1px solid #ccc' }}>
        <Grid container spacing={2} justifyContent="flex-end">
          <Grid size={{ xs: 6 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography>{t('print.subtotal')}:</Typography>
              <Typography>{formatMoney(order.order.subtotal || 0, orderCurrency)}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography>{t('print.discount')}:</Typography>
              <Typography color="error">-{formatMoney(order.order.discountTotal || 0, orderCurrency)}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography>{t('print.shipping')}:</Typography>
              <Typography>{formatMoney(order.order.shippingTotal || 0, orderCurrency)}</Typography>
            </Box>
            <Divider sx={{ my: 1 }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="h6">{t('print.total')}:</Typography>
              <Typography variant="h6" sx={{ color: '#1C0770' }}>
                {formatMoney(order.order.grandTotal || 0, orderCurrency)}
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Box>

      <Typography variant="caption" display="block" align="center" sx={{ mt: 4 }}>
        {t('print.generatedOn', { date: format(new Date(), 'PPP pp') })}
      </Typography>
    </Box>
  );
};

export default OrderPrint;
