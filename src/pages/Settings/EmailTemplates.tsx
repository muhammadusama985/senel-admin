import React, { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import api from '../../api/client';

const initialForm = {
  key: '',
  subject: '',
  htmlBody: '',
  textBody: '',
  description: '',
  isActive: true,
};

const EmailTemplates: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState(initialForm);

  const { data = [], isLoading, error } = useQuery({
    queryKey: ['admin', 'email-templates'],
    queryFn: async () => {
      const response = await api.get('/admin/email-templates');
      return response.data.items || [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editing?._id) {
        await api.patch(`/admin/email-templates/${editing._id}`, form);
      } else {
        await api.post('/admin/email-templates', form);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'email-templates'] });
      setOpen(false);
      setEditing(null);
      setForm(initialForm);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/admin/email-templates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'email-templates'] });
    },
  });

  const columns = useMemo<GridColDef[]>(
    () => [
      { field: 'key', headerName: 'Key', minWidth: 180, flex: 1 },
      { field: 'subject', headerName: 'Subject', minWidth: 220, flex: 1.4 },
      { field: 'description', headerName: 'Description', minWidth: 220, flex: 1.4 },
      {
        field: 'isActive',
        headerName: 'Active',
        minWidth: 100,
        renderCell: (params) => (params.value ? 'Yes' : 'No'),
      },
      {
        field: 'actions',
        headerName: t('common.actions'),
        minWidth: 180,
        sortable: false,
        renderCell: (params) => (
          <Stack direction="row" spacing={1}>
            <Button
              size="small"
              onClick={() => {
                setEditing(params.row);
                setForm({
                  key: params.row.key || '',
                  subject: params.row.subject || '',
                  htmlBody: params.row.htmlBody || '',
                  textBody: params.row.textBody || '',
                  description: params.row.description || '',
                  isActive: params.row.isActive ?? true,
                });
                setOpen(true);
              }}
            >
              Edit
            </Button>
            <Button size="small" color="error" onClick={() => deleteMutation.mutate(params.row._id)}>
              Delete
            </Button>
          </Stack>
        ),
      },
    ],
    [deleteMutation, t]
  );

  return (
    <Paper className="page-shell" sx={{ p: 3 }}>
      <Stack spacing={2}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="h4">{t('emails.title')}</Typography>
            <Typography variant="body1" color="text.secondary">
              {t('emails.intro')}
            </Typography>
          </Box>
          <Button
            variant="contained"
            onClick={() => {
              setEditing(null);
              setForm(initialForm);
              setOpen(true);
            }}
          >
            {t('emails.newTemplate')}
          </Button>
        </Stack>

        {error && <Alert severity="error">Failed to load email templates.</Alert>}

        <div style={{ height: 620 }}>
          <DataGrid rows={data} columns={columns} loading={isLoading} getRowId={(row) => row._id} disableRowSelectionOnClick />
        </div>
      </Stack>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>{editing ? `${t('common.edit')} ${t('emails.title')}` : `${t('common.create')} ${t('emails.title')}`}</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Stack spacing={2}>
            <TextField label="Key" value={form.key} onChange={(e) => setForm((prev) => ({ ...prev, key: e.target.value }))} fullWidth />
            <TextField label="Subject" value={form.subject} onChange={(e) => setForm((prev) => ({ ...prev, subject: e.target.value }))} fullWidth />
            <TextField label="Description" value={form.description} onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))} fullWidth />
            <TextField
              label="HTML Body"
              value={form.htmlBody}
              onChange={(e) => setForm((prev) => ({ ...prev, htmlBody: e.target.value }))}
              multiline
              minRows={8}
              fullWidth
            />
            <TextField
              label="Text Body"
              value={form.textBody}
              onChange={(e) => setForm((prev) => ({ ...prev, textBody: e.target.value }))}
              multiline
              minRows={4}
              fullWidth
            />
            <Stack direction="row" alignItems="center" spacing={1}>
              <Switch checked={form.isActive} onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.checked }))} />
              <Typography>{t('emails.templateActive')}</Typography>
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>{t('common.cancel')}</Button>
          <Button variant="contained" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            {t('common.save')}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default EmailTemplates;
