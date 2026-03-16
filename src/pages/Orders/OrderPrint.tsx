import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Chip,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Card,
  CardContent,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
} from '@mui/material';
import {
  Inventory,
  Person,
  Email,
  Phone,
  LocationOn,
  Store,
} from '@mui/icons-material';
import { format } from 'date-fns';

interface OrderPrintProps {
  order: any;
}

const OrderPrint: React.FC<OrderPrintProps> = ({ order }) => {
  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h4" align="center" gutterBottom>
        ORDER #{order.order?.orderNumber}
      </Typography>
      
      <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid size={{xs:6}} >
          <Typography variant="subtitle2">Order Date:</Typography>
          <Typography variant="body1">
            {format(new Date(order.order.createdAt), 'PPP')}
          </Typography>
        </Grid>
          <Grid size={{xs:6}} >
          <Typography variant="subtitle2">Total Amount:</Typography>
          <Typography variant="h6" sx={{ color: '#1C0770' }}>
            €{order.order.grandTotal?.toFixed(2)}
          </Typography>
        </Grid>
      </Grid>

      <Typography variant="h6" gutterBottom sx={{ color: '#1C0770' }}>
        Customer Information
      </Typography>
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2}>
          <Grid size={{xs:6}} >
            <Typography variant="body2">
              <strong>Name:</strong> {order.order.shippingAddress?.contactPerson || 'N/A'}
            </Typography>
            <Typography variant="body2">
              <strong>Email:</strong> {order.order.customerUserId?.email || 'N/A'}
            </Typography>
            <Typography variant="body2">
              <strong>Phone:</strong> {order.order.shippingAddress?.mobileNumber || 'N/A'}
            </Typography>
          </Grid>
          <Grid size={{xs:6}} >
            <Typography variant="body2">
              <strong>Address:</strong><br />
              {order.order.shippingAddress?.companyName && (
                <>{order.order.shippingAddress.companyName}<br /></>
              )}
              {order.order.shippingAddress?.street}<br />
              {order.order.shippingAddress?.city}, {order.order.shippingAddress?.country}
            </Typography>
          </Grid>
        </Grid>
      </Paper>

      <Typography variant="h6" gutterBottom sx={{ color: '#1C0770' }}>
        Order Items
      </Typography>
      
      {order.vendorOrders?.map((vendorOrder: any) => (
        <Card key={vendorOrder._id} sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="subtitle1" sx={{ color: '#1C0770', fontWeight: 600 }}>
              {vendorOrder.vendorStoreName}
            </Typography>
            <Typography variant="caption" display="block" gutterBottom>
              Vendor Order #{vendorOrder.vendorOrderNumber}
            </Typography>

            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Product</TableCell>
                    <TableCell align="right">Qty</TableCell>
                    <TableCell align="right">Unit Price</TableCell>
                    <TableCell align="right">Total</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {order.items
                    ?.filter((item: any) => item.vendorOrderId === vendorOrder._id)
                    .map((item: any) => (
                      <TableRow key={item._id}>
                        <TableCell>{item.title}</TableCell>
                        <TableCell align="right">{item.qty}</TableCell>
                        <TableCell align="right">€{item.unitPrice?.toFixed(2)}</TableCell>
                        <TableCell align="right">€{item.lineTotal?.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </TableContainer>

            {vendorOrder.shipping && vendorOrder.shipping.trackingCode && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="caption" display="block">
                  Tracking: {vendorOrder.shipping.partnerName} - {vendorOrder.shipping.trackingCode}
                </Typography>
              </Box>
            )}
          </CardContent>
        </Card>
      ))}

      <Box sx={{ mt: 4, pt: 2, borderTop: '1px solid #ccc' }}>
        <Grid container spacing={2} justifyContent="flex-end">
          <Grid size={{xs:6}} >
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography>Subtotal:</Typography>
              <Typography>€{order.order.subtotal?.toFixed(2)}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography>Discount:</Typography>
              <Typography color="error">-€{order.order.discountTotal?.toFixed(2)}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography>Shipping:</Typography>
              <Typography>€{order.order.shippingTotal?.toFixed(2)}</Typography>
            </Box>
            <Divider sx={{ my: 1 }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="h6">Total:</Typography>
              <Typography variant="h6" sx={{ color: '#1C0770' }}>
                €{order.order.grandTotal?.toFixed(2)}
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Box>

      <Typography variant="caption" display="block" align="center" sx={{ mt: 4 }}>
        Generated on {format(new Date(), 'PPP pp')}
      </Typography>
    </Box>
  );
};

export default OrderPrint;