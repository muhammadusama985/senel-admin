import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Box, Typography, Paper, IconButton } from '@mui/material';
import { alpha, useTheme as useMuiTheme } from '@mui/material/styles';
import { CloudUpload, Close } from '@mui/icons-material';
import { resolveMediaUrl } from '../../utils/media';

interface ImageUploadProps {
    onImageUpload: (file: File) => void;
    onImageRemove?: () => void;
    currentImage?: string;
    label?: string;
}

const ImageUpload: React.FC<ImageUploadProps> = ({
    onImageUpload,
    onImageRemove,
    currentImage,
    label = 'Upload Image'
}) => {
    const muiTheme = useMuiTheme();
    const isLight = muiTheme.palette.mode === 'light';

    const onDrop = useCallback((acceptedFiles: File[]) => {
        if (acceptedFiles.length > 0) {
            onImageUpload(acceptedFiles[0]);
        }
    }, [onImageUpload]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp']
        },
        maxFiles: 1,
        maxSize: 5 * 1024 * 1024 // 5MB
    });

    const getImageSource = (imagePath: string): string => {
        if (!imagePath) return '';
        return resolveMediaUrl(imagePath);
    };

    return (
        <Box>
            {!currentImage ? (
                <Paper
                    {...getRootProps()}
                    sx={{
                        p: 3,
                        border: '2px dashed',
                        borderColor: isDragActive ? muiTheme.palette.primary.main : muiTheme.palette.divider,
                        backgroundColor: isDragActive
                            ? alpha(muiTheme.palette.primary.main, isLight ? 0.08 : 0.16)
                            : alpha(muiTheme.palette.background.paper, isLight ? 0.92 : 1),
                        cursor: 'pointer',
                        textAlign: 'center',
                        transition: 'all 0.3s',
                        '&:hover': {
                            borderColor: muiTheme.palette.primary.main,
                            backgroundColor: alpha(muiTheme.palette.primary.main, isLight ? 0.04 : 0.12)
                        }
                    }}
                >
                    <input {...getInputProps()} />
                    <CloudUpload sx={{ fontSize: 48, color: muiTheme.palette.primary.main, mb: 2 }} />
                    <Typography variant="body1" gutterBottom>
                        {isDragActive ? 'Drop the image here' : `Drag & drop or click to ${label.toLowerCase()}`}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                        Supports: JPG, PNG, GIF, WEBP (Max 5MB)
                    </Typography>
                </Paper>
            ) : (
                <Box sx={{ position: 'relative', display: 'inline-block' }}>
                    <Box
                        component="img"
                        src={getImageSource(currentImage)}
                        alt="Preview"
                        crossOrigin="anonymous"
                        referrerPolicy="no-referrer"
                        sx={{
                            maxWidth: '100%',
                            maxHeight: 200,
                            borderRadius: 1,
                            border: `1px solid ${muiTheme.palette.divider}`,
                            display: 'block'
                        }}
                        onError={(e) => {
                            console.error('Image load error in uploader:', currentImage);
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            target.parentElement!.innerHTML = `
                                <div style="padding: 20px; text-align: center; background: ${muiTheme.palette.background.paper}; border-radius: 8px;">
                                    <span style="color: ${muiTheme.palette.text.secondary}; font-size: 14px;">Failed to load image</span>
                                </div>
                            `;
                        }}
                    />
                    {onImageRemove && (
                        <IconButton
                            size="small"
                            onClick={onImageRemove}
                            sx={{
                                position: 'absolute',
                                top: 8,
                                right: 8,
                                backgroundColor: alpha(muiTheme.palette.background.paper, 0.92),
                                color: muiTheme.palette.text.primary,
                                '&:hover': { backgroundColor: muiTheme.palette.background.paper },
                                boxShadow: 1
                            }}
                        >
                            <Close fontSize="small" />
                        </IconButton>
                    )}
                </Box>
            )}
        </Box>
    );
};

export default ImageUpload;
