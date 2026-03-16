import React, { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
} from '@mui/material';
import { useTheme as useMuiTheme } from '@mui/material/styles';
import api from '../../api/client';

interface Props {
  open: boolean;
  onClose: () => void;
  order: any;
  onSuccess: () => void;
}

const carriers = ['DHL', 'UPS', 'FedEx', 'DPD', 'GLS', 'Hermes', 'Other'];

const AssignShippingModal: React.FC<Props> = ({ open, onClose, order, onSuccess }) => {
  const muiTheme = useMuiTheme();
  const [formData, setFormData] = useState({
    partnerName: '',
    trackingCode: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const surface = muiTheme.palette.background.paper;
  const border = muiTheme.palette.divider;
  const textPrimary = muiTheme.palette.text.primary;
  const textSecondary = muiTheme.palette.text.secondary;
  const accent = muiTheme.palette.secondary.main;

  const fieldSx = {
    '& .MuiOutlinedInput-root': {
      color: textPrimary,
      backgroundColor: surface,
      '& fieldset': { borderColor: border },
      '&:hover fieldset': { borderColor: accent },
      '&.Mui-focused fieldset': { borderColor: accent },
    },
    '& .MuiInputLabel-root': { color: textSecondary },
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const vendorOrderId = order?._id || order?.vendorOrderId || order?.id;
      if (!vendorOrderId) {
        setError('Cannot assign shipping: missing vendor order id');
        setLoading(false);
        return;
      }
      await api.post(`/admin/vendor-orders/${vendorOrderId}/assign-shipping`, formData);
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to assign shipping');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          backgroundColor: surface,
          color: textPrimary,
          border: `1px solid ${border}`,
          borderRadius: 2,
        },
      }}
    >
      <DialogTitle sx={{ color: textPrimary, borderBottom: `1px solid ${border}` }}>Assign Shipping</DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          {order && (
            <Box sx={{ mb: 2, p: 2, bgcolor: muiTheme.palette.action.hover, borderRadius: 1 }}>
              <Box sx={{ fontSize: '0.9rem', color: textSecondary }}>Order: {order.vendorOrderNumber}</Box>
              <Box sx={{ fontSize: '0.9rem', color: textPrimary, fontWeight: 500 }}>Vendor: {order.vendorStoreName}</Box>
            </Box>
          )}

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <FormControl fullWidth margin="normal" sx={fieldSx}>
            <InputLabel>Carrier</InputLabel>
            <Select
              value={formData.partnerName}
              label="Carrier"
              onChange={(e) => setFormData({ ...formData, partnerName: e.target.value })}
              required
            >
              {carriers.map((carrier) => (
                <MenuItem key={carrier} value={carrier}>
                  {carrier}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            fullWidth
            label="Tracking Number"
            value={formData.trackingCode}
            onChange={(e) => setFormData({ ...formData, trackingCode: e.target.value })}
            placeholder="Enter tracking number"
            margin="normal"
            sx={fieldSx}
          />
        </DialogContent>
        <DialogActions sx={{ borderTop: `1px solid ${border}`, p: 2 }}>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={loading || !formData.partnerName}>
            {loading ? <CircularProgress size={20} color="inherit" /> : 'Assign'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default AssignShippingModal;
