import React from 'react';
import {
  Box,
  Typography,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { formatMoney } from '../../utils/currency';

interface OrderReceiptPrintProps {
  order: any;
}

const OrderReceiptPrint: React.FC<OrderReceiptPrintProps> = ({ order }) => {
  const { t } = useTranslation();
  const currency = order?.order?.currency || order?.items?.[0]?.currency || 'EUR';

  const companyInfo = {
    name: 'Senel Express',
    address: '123 Business Park, Berlin, Germany',
    phone: '+49 123 456 789',
    email: 'info@senel.com',
    website: 'www.senel.com',
    vat: 'DE123456789',
  };

  return (
    <Box
      sx={{
        maxWidth: '800px',
        margin: '0 auto',
        padding: '20px',
        fontFamily: 'Arial, Helvetica, sans-serif',
        backgroundColor: '#ffffff',
      }}
    >
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Typography
          variant="h3"
          sx={{
            color: '#1C0770',
            fontWeight: 'bold',
            letterSpacing: '2px',
            mb: 1,
          }}
        >
          SENEL EXPRESS
        </Typography>
        <Typography variant="body2" sx={{ color: '#666', mb: 0.5 }}>
          {companyInfo.address}
        </Typography>
        <Typography variant="body2" sx={{ color: '#666' }}>
          {t('print.tel')}: {companyInfo.phone} | {t('common.email')}: {companyInfo.email}
        </Typography>
        <Typography variant="body2" sx={{ color: '#666' }}>
          {t('print.vat')}: {companyInfo.vat}
        </Typography>
      </Box>

      <Box sx={{ textAlign: 'center', mb: 3 }}>
        <Typography
          variant="h5"
          sx={{
            fontWeight: 'bold',
            borderBottom: '2px solid #1C0770',
            display: 'inline-block',
            pb: 1,
            px: 4,
          }}
        >
          {t('print.orderReceipt')}
        </Typography>
      </Box>

      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          mb: 3,
          backgroundColor: '#f8f9fa',
          padding: '15px',
          borderRadius: '5px',
        }}
      >
        <Box>
          <Typography variant="subtitle2" sx={{ color: '#666', fontSize: '0.8rem' }}>
            {t('print.orderNumber')}
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#1C0770' }}>
            {order.order?.orderNumber}
          </Typography>
        </Box>
        <Box>
          <Typography variant="subtitle2" sx={{ color: '#666', fontSize: '0.8rem' }}>
            {t('print.orderDate')}
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
            {format(new Date(order.order?.createdAt), 'dd/MM/yyyy')}
          </Typography>
        </Box>
        <Box>
          <Typography variant="subtitle2" sx={{ color: '#666', fontSize: '0.8rem' }}>
            {t('print.paymentStatus')}
          </Typography>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 'bold',
              color: order.order?.paymentStatus === 'paid' ? '#2e7d32' : '#ed6c02',
            }}
          >
            {String(order.order?.paymentStatus || '').toUpperCase()}
          </Typography>
        </Box>
      </Box>

      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          mb: 3,
          gap: 2,
        }}
      >
        <Box sx={{ flex: 1, backgroundColor: '#f8f9fa', padding: '15px', borderRadius: '5px' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: '#1C0770', mb: 1 }}>
            {t('print.billTo')}
          </Typography>
          <Typography variant="body2" sx={{ mb: 0.5 }}>
            <strong>{t('common.name')}:</strong> {order.order?.shippingAddress?.contactPerson || t('products.notAvailable')}
          </Typography>
          <Typography variant="body2" sx={{ mb: 0.5 }}>
            <strong>{t('common.email')}:</strong> {order.order?.customerUserId?.email || t('products.notAvailable')}
          </Typography>
          <Typography variant="body2" sx={{ mb: 0.5 }}>
            <strong>{t('common.phone')}:</strong> {order.order?.shippingAddress?.mobileNumber || t('products.notAvailable')}
          </Typography>
        </Box>
        <Box sx={{ flex: 1, backgroundColor: '#f8f9fa', padding: '15px', borderRadius: '5px' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: '#1C0770', mb: 1 }}>
            {t('print.shipTo')}
          </Typography>
          <Typography variant="body2" sx={{ mb: 0.5 }}>
            <strong>{t('print.company')}:</strong> {order.order?.shippingAddress?.companyName || t('products.notAvailable')}
          </Typography>
          <Typography variant="body2" sx={{ mb: 0.5 }}>
            <strong>{t('common.address')}:</strong> {order.order?.shippingAddress?.street}
          </Typography>
          <Typography variant="body2" sx={{ mb: 0.5 }}>
            <strong>{t('print.city')}:</strong> {order.order?.shippingAddress?.city}, {order.order?.shippingAddress?.country}
          </Typography>
        </Box>
      </Box>

      <TableContainer sx={{ mb: 3, border: '1px solid #e0e0e0', borderRadius: '5px' }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: '#1C0770' }}>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>{t('print.item')}</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }} align="right">{t('print.qty')}</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }} align="right">{t('print.unitPrice')}</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }} align="right">{t('print.total')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {order.items?.map((item: any, index: number) => (
              <TableRow
                key={item._id}
                sx={{
                  backgroundColor: index % 2 === 0 ? '#ffffff' : '#f8f9fa',
                }}
              >
                <TableCell>{item.title}</TableCell>
                <TableCell align="right">{item.qty}</TableCell>
                <TableCell align="right">{formatMoney(item.unitPrice || 0, item.currency || currency)}</TableCell>
                <TableCell align="right">{formatMoney(item.lineTotal || 0, item.currency || currency)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {order.vendorOrders?.length > 1 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: '#1C0770', mb: 1 }}>
            {t('print.vendorBreakdown')}
          </Typography>
          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 2,
              justifyContent: 'space-between',
            }}
          >
            {order.vendorOrders?.map((vendorOrder: any) => (
              <Box
                key={vendorOrder._id}
                sx={{
                  flex: 1,
                  minWidth: '200px',
                  backgroundColor: '#f8f9fa',
                  padding: '10px',
                  borderRadius: '5px',
                  border: '1px solid #e0e0e0',
                }}
              >
                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                  {vendorOrder.vendorStoreName}
                </Typography>
                <Typography variant="caption" sx={{ color: '#666', display: 'block', mb: 1 }}>
                  {t('common.orderNumber')}: {vendorOrder.vendorOrderNumber}
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#1C0770' }}>
                  {formatMoney(vendorOrder.grandTotal || 0, vendorOrder.currency || currency)}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
      )}

      <Box
        sx={{
          display: 'flex',
          justifyContent: 'flex-end',
          borderTop: '2px solid #1C0770',
          pt: 2,
        }}
      >
        <Box sx={{ width: '300px' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body1">{t('print.subtotal')}:</Typography>
            <Typography variant="body1">{formatMoney(order.order?.subtotal || 0, currency)}</Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body1">{t('print.discount')}:</Typography>
            <Typography variant="body1" sx={{ color: '#d32f2f' }}>
              -{formatMoney(order.order?.discountTotal || 0, currency)}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body1">{t('print.shipping')}:</Typography>
            <Typography variant="body1">{formatMoney(order.order?.shippingTotal || 0, currency)}</Typography>
          </Box>
          <Divider sx={{ my: 1 }} />
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
              {t('print.grandTotal')}:
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#1C0770' }}>
              {formatMoney(order.order?.grandTotal || 0, currency)}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="caption">{t('print.vatIncluded')}:</Typography>
            <Typography variant="caption">{formatMoney(((order.order?.grandTotal || 0) * 0.19), currency)} (19%)</Typography>
          </Box>
        </Box>
      </Box>

      <Box
        sx={{
          mt: 4,
          pt: 2,
          borderTop: '1px dashed #ccc',
          textAlign: 'center',
        }}
      >
        <Typography variant="caption" sx={{ color: '#666', display: 'block', mb: 0.5 }}>
          {t('print.thankYou')}
        </Typography>
        <Typography variant="caption" sx={{ color: '#666', display: 'block', mb: 0.5 }}>
          {t('print.generatedReceiptNotice')}
        </Typography>
        <Typography variant="caption" sx={{ color: '#666', display: 'block' }}>
          {t('print.generatedOn', { date: format(new Date(), 'PPP pp') })}
        </Typography>
      </Box>
    </Box>
  );
};

export default OrderReceiptPrint;
