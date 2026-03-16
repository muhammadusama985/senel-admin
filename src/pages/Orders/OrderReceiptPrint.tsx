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

interface OrderReceiptPrintProps {
  order: any;
}

const OrderReceiptPrint: React.FC<OrderReceiptPrintProps> = ({ order }) => {
  const companyInfo = {
    name: 'Senel Express',
    address: '123 Business Park, Berlin, Germany',
    phone: '+49 123 456 789',
    email: 'info@senel.com',
    website: 'www.senel.com',
    vat: 'DE123456789',
  };

  return (
    <Box sx={{ 
      maxWidth: '800px', 
      margin: '0 auto', 
      padding: '20px',
      fontFamily: 'Arial, Helvetica, sans-serif',
      backgroundColor: '#ffffff'
    }}>
      {/* Header with Company Logo/Name */}
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Typography variant="h3" sx={{ 
          color: '#1C0770', 
          fontWeight: 'bold',
          letterSpacing: '2px',
          mb: 1
        }}>
          SENEL EXPRESS
        </Typography>
        <Typography variant="body2" sx={{ color: '#666', mb: 0.5 }}>
          {companyInfo.address}
        </Typography>
        <Typography variant="body2" sx={{ color: '#666' }}>
          Tel: {companyInfo.phone} | Email: {companyInfo.email}
        </Typography>
        <Typography variant="body2" sx={{ color: '#666' }}>
          VAT: {companyInfo.vat}
        </Typography>
      </Box>

      {/* Receipt Title */}
      <Box sx={{ textAlign: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ 
          fontWeight: 'bold',
          borderBottom: '2px solid #1C0770',
          display: 'inline-block',
          pb: 1,
          px: 4
        }}>
          ORDER RECEIPT
        </Typography>
      </Box>

      {/* Order Info Grid */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        mb: 3,
        backgroundColor: '#f8f9fa',
        padding: '15px',
        borderRadius: '5px'
      }}>
        <Box>
          <Typography variant="subtitle2" sx={{ color: '#666', fontSize: '0.8rem' }}>
            ORDER NUMBER
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#1C0770' }}>
            {order.order?.orderNumber}
          </Typography>
        </Box>
        <Box>
          <Typography variant="subtitle2" sx={{ color: '#666', fontSize: '0.8rem' }}>
            ORDER DATE
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
            {format(new Date(order.order?.createdAt), 'dd/MM/yyyy')}
          </Typography>
        </Box>
        <Box>
          <Typography variant="subtitle2" sx={{ color: '#666', fontSize: '0.8rem' }}>
            PAYMENT STATUS
          </Typography>
          <Typography variant="h6" sx={{ 
            fontWeight: 'bold',
            color: order.order?.paymentStatus === 'paid' ? '#2e7d32' : '#ed6c02'
          }}>
            {order.order?.paymentStatus?.toUpperCase()}
          </Typography>
        </Box>
      </Box>

      {/* Billing & Shipping Info */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        mb: 3,
        gap: 2
      }}>
        <Box sx={{ flex: 1, backgroundColor: '#f8f9fa', padding: '15px', borderRadius: '5px' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: '#1C0770', mb: 1 }}>
            BILL TO
          </Typography>
          <Typography variant="body2" sx={{ mb: 0.5 }}>
            <strong>Name:</strong> {order.order?.shippingAddress?.contactPerson || 'N/A'}
          </Typography>
          <Typography variant="body2" sx={{ mb: 0.5 }}>
            <strong>Email:</strong> {order.order?.customerUserId?.email || 'N/A'}
          </Typography>
          <Typography variant="body2" sx={{ mb: 0.5 }}>
            <strong>Phone:</strong> {order.order?.shippingAddress?.mobileNumber || 'N/A'}
          </Typography>
        </Box>
        <Box sx={{ flex: 1, backgroundColor: '#f8f9fa', padding: '15px', borderRadius: '5px' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: '#1C0770', mb: 1 }}>
            SHIP TO
          </Typography>
          <Typography variant="body2" sx={{ mb: 0.5 }}>
            <strong>Company:</strong> {order.order?.shippingAddress?.companyName || 'N/A'}
          </Typography>
          <Typography variant="body2" sx={{ mb: 0.5 }}>
            <strong>Address:</strong> {order.order?.shippingAddress?.street}
          </Typography>
          <Typography variant="body2" sx={{ mb: 0.5 }}>
            <strong>City:</strong> {order.order?.shippingAddress?.city}, {order.order?.shippingAddress?.country}
          </Typography>
        </Box>
      </Box>

      {/* Items Table */}
      <TableContainer sx={{ mb: 3, border: '1px solid #e0e0e0', borderRadius: '5px' }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: '#1C0770' }}>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Item</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }} align="right">Qty</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }} align="right">Unit Price</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }} align="right">Total</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {order.items?.map((item: any, index: number) => (
              <TableRow key={item._id} sx={{ 
                backgroundColor: index % 2 === 0 ? '#ffffff' : '#f8f9fa'
              }}>
                <TableCell>{item.title}</TableCell>
                <TableCell align="right">{item.qty}</TableCell>
                <TableCell align="right">€{item.unitPrice?.toFixed(2)}</TableCell>
                <TableCell align="right">€{item.lineTotal?.toFixed(2)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Vendor Breakdown */}
      {order.vendorOrders?.length > 1 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: '#1C0770', mb: 1 }}>
            Vendor Breakdown
          </Typography>
          <Box sx={{ 
            display: 'flex', 
            flexWrap: 'wrap', 
            gap: 2,
            justifyContent: 'space-between'
          }}>
            {order.vendorOrders?.map((vendorOrder: any) => (
              <Box key={vendorOrder._id} sx={{ 
                flex: 1, 
                minWidth: '200px',
                backgroundColor: '#f8f9fa', 
                padding: '10px', 
                borderRadius: '5px',
                border: '1px solid #e0e0e0'
              }}>
                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                  {vendorOrder.vendorStoreName}
                </Typography>
                <Typography variant="caption" sx={{ color: '#666', display: 'block', mb: 1 }}>
                  Order: {vendorOrder.vendorOrderNumber}
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#1C0770' }}>
                  €{vendorOrder.grandTotal?.toFixed(2)}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
      )}

      {/* Totals */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'flex-end',
        borderTop: '2px solid #1C0770',
        pt: 2
      }}>
        <Box sx={{ width: '300px' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body1">Subtotal:</Typography>
            <Typography variant="body1">€{order.order?.subtotal?.toFixed(2)}</Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body1">Discount:</Typography>
            <Typography variant="body1" sx={{ color: '#d32f2f' }}>
              -€{order.order?.discountTotal?.toFixed(2)}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body1">Shipping:</Typography>
            <Typography variant="body1">€{order.order?.shippingTotal?.toFixed(2)}</Typography>
          </Box>
          <Divider sx={{ my: 1 }} />
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>GRAND TOTAL:</Typography>
            <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#1C0770' }}>
              €{order.order?.grandTotal?.toFixed(2)}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="caption">VAT Included:</Typography>
            <Typography variant="caption">€{((order.order?.grandTotal || 0) * 0.19).toFixed(2)} (19%)</Typography>
          </Box>
        </Box>
      </Box>

      {/* Footer */}
      <Box sx={{ 
        mt: 4, 
        pt: 2, 
        borderTop: '1px dashed #ccc',
        textAlign: 'center'
      }}>
        <Typography variant="caption" sx={{ color: '#666', display: 'block', mb: 0.5 }}>
          Thank you for your business!
        </Typography>
        <Typography variant="caption" sx={{ color: '#666', display: 'block', mb: 0.5 }}>
          This is a computer generated receipt. No signature required.
        </Typography>
        <Typography variant="caption" sx={{ color: '#666', display: 'block' }}>
          Generated on {format(new Date(), 'PPP pp')}
        </Typography>
      </Box>
    </Box>
  );
};

export default OrderReceiptPrint;