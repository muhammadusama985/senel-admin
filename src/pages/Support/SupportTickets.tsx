import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../api/client';

const SupportTickets: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
  const [reply, setReply] = useState('');
  const [nextStatus, setNextStatus] = useState('');

  const listQuery = useQuery({
    queryKey: ['admin', 'support-tickets'],
    queryFn: async () => {
      const response = await api.get('/admin/support/tickets');
      return response.data.items || [];
    },
  });

  const detailQuery = useQuery({
    queryKey: ['admin', 'support-tickets', selectedTicket?._id],
    queryFn: async () => {
      const response = await api.get(`/admin/support/tickets/${selectedTicket._id}`);
      return response.data;
    },
    enabled: Boolean(selectedTicket?._id),
  });

  useEffect(() => {
    if (detailQuery.data?.ticket?.status) {
      setNextStatus(detailQuery.data.ticket.status);
    }
  }, [detailQuery.data?.ticket?.status]);

  const replyMutation = useMutation({
    mutationFn: async () =>
      api.post(`/admin/support/tickets/${selectedTicket._id}/messages`, { message: reply.trim() }),
    onSuccess: async () => {
      setReply('');
      await detailQuery.refetch();
      queryClient.invalidateQueries({ queryKey: ['admin', 'support-tickets'] });
    },
  });

  const statusMutation = useMutation({
    mutationFn: async () =>
      api.patch(`/admin/support/tickets/${selectedTicket._id}/status`, {
        status: nextStatus,
        note: reply.trim() || undefined,
      }),
    onSuccess: async () => {
      await detailQuery.refetch();
      queryClient.invalidateQueries({ queryKey: ['admin', 'support-tickets'] });
    },
  });

  const columns: GridColDef[] = [
    { field: 'ticketNumber', headerName: 'Ticket', minWidth: 160, flex: 1 },
    { field: 'subject', headerName: 'Subject', minWidth: 220, flex: 1.5 },
    { field: 'vendorLabel', headerName: 'Vendor', minWidth: 180, flex: 1 },
    { field: 'category', headerName: 'Category', minWidth: 130, flex: 0.8 },
    { field: 'priority', headerName: 'Priority', minWidth: 120, flex: 0.7 },
    {
      field: 'status',
      headerName: 'Status',
      minWidth: 130,
      flex: 0.8,
      renderCell: (params) => <Chip label={String(params.value || '').replaceAll('_', ' ')} size="small" />,
    },
    { field: 'messageCount', headerName: 'Messages', minWidth: 110, flex: 0.6 },
    {
      field: 'actions',
      headerName: 'Actions',
      minWidth: 160,
      sortable: false,
      renderCell: (params) => (
        <Button size="small" variant="outlined" onClick={() => setSelectedTicket(params.row)}>
          View Ticket
        </Button>
      ),
    },
  ];

  return (
    <Paper className="page-shell" sx={{ p: 3 }}>
      <Stack spacing={2}>
        <Typography variant="h4">Support Tickets</Typography>
        <Typography variant="body1" color="text.secondary">
          Review vendor support tickets, reply as admin, and update ticket status.
        </Typography>

        {listQuery.error && <Alert severity="error">Failed to load support tickets.</Alert>}

        <div style={{ height: 620 }}>
          <DataGrid
            rows={listQuery.data || []}
            columns={columns}
            loading={listQuery.isLoading}
            getRowId={(row) => row._id}
            disableRowSelectionOnClick
            pageSizeOptions={[10, 25, 50]}
          />
        </div>
      </Stack>

      <Dialog open={Boolean(selectedTicket)} onClose={() => setSelectedTicket(null)} maxWidth="md" fullWidth>
        <DialogTitle>Support Ticket</DialogTitle>
        <DialogContent dividers>
          {detailQuery.isLoading ? (
            <Typography>Loading ticket...</Typography>
          ) : detailQuery.data ? (
            <Stack spacing={2}>
              <Box>
                <Typography variant="h6">{detailQuery.data.ticket.ticketNumber}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {detailQuery.data.ticket.subject}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Vendor: {detailQuery.data.ticket.vendorLabel || '-'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Created By: {detailQuery.data.ticket.createdByLabel || '-'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Status: {String(detailQuery.data.ticket.status || '').replaceAll('_', ' ')}
                </Typography>
              </Box>

              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle2">Description</Typography>
                <Typography sx={{ mt: 1 }}>{detailQuery.data.ticket.description}</Typography>
              </Paper>

              <Stack spacing={1.5}>
                {(detailQuery.data.messages || []).map((message: any) => (
                  <Paper key={message._id} variant="outlined" sx={{ p: 1.5 }}>
                    <Typography variant="subtitle2">
                      {message.userRole === 'admin'
                        ? 'Admin'
                        : message.userRole === 'vendor'
                          ? 'Vendor'
                          : 'System'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {message.createdAt ? new Date(message.createdAt).toLocaleString() : '-'}
                    </Typography>
                    <Typography sx={{ mt: 1 }}>{message.message}</Typography>
                  </Paper>
                ))}
              </Stack>

              <TextField
                select
                label="Change Status"
                value={nextStatus}
                onChange={(event) => setNextStatus(event.target.value)}
              >
                <MenuItem value="open">Open</MenuItem>
                <MenuItem value="in_progress">In Progress</MenuItem>
                <MenuItem value="waiting">Waiting</MenuItem>
                <MenuItem value="resolved">Resolved</MenuItem>
                <MenuItem value="closed">Closed</MenuItem>
              </TextField>

              <TextField
                label="Reply as Admin"
                multiline
                rows={4}
                value={reply}
                onChange={(event) => setReply(event.target.value)}
              />
            </Stack>
          ) : (
            <Alert severity="error">Failed to load ticket details.</Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedTicket(null)}>Close</Button>
          <Button
            variant="outlined"
            onClick={() => statusMutation.mutate()}
            disabled={!nextStatus || nextStatus === detailQuery.data?.ticket?.status || statusMutation.isPending}
          >
            {statusMutation.isPending ? 'Updating...' : 'Update Status'}
          </Button>
          <Button
            variant="contained"
            onClick={() => replyMutation.mutate()}
            disabled={!reply.trim() || replyMutation.isPending}
          >
            {replyMutation.isPending ? 'Sending...' : 'Send Reply'}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default SupportTickets;
