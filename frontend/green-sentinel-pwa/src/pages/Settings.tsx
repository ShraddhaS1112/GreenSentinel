import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  TextField,
  Button,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Grid,
  Divider,
  Switch,
  FormControlLabel,
  Slider,
} from '@mui/material';
import { Phone as PhoneIcon, Save as SaveIcon, Info as InfoIcon } from '@mui/icons-material';

export const Settings: React.FC = () => {
  const [phoneNumber, setPhoneNumber] = useState(
    localStorage.getItem('alertPhoneNumber') || '+919970187593'
  );
  const [language, setLanguage] = useState(localStorage.getItem('alertLanguage') || 'mr');
  const [whatsappEnabled, setWhatsappEnabled] = useState(
    localStorage.getItem('whatsappEnabled') !== 'false'
  );
  const [confidenceThreshold, setConfidenceThreshold] = useState(
    parseInt(localStorage.getItem('confidenceThreshold') || '75')
  );
  const [cooldownMinutes, setCooldownMinutes] = useState(
    parseInt(localStorage.getItem('cooldownMinutes') || '5')
  );
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    // Save to localStorage
    localStorage.setItem('alertPhoneNumber', phoneNumber);
    localStorage.setItem('alertLanguage', language);
    localStorage.setItem('whatsappEnabled', whatsappEnabled.toString());
    localStorage.setItem('confidenceThreshold', confidenceThreshold.toString());
    localStorage.setItem('cooldownMinutes', cooldownMinutes.toString());

    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <Box sx={{ padding: '24px', maxWidth: '900px', margin: '0 auto' }}>
      {/* Header */}
      <Typography
        variant="h4"
        sx={{
          fontWeight: 'bold',
          marginBottom: '24px',
          color: '#1e293b',
          fontFamily: 'Noto Sans Devanagari, sans-serif',
        }}
      >
        ⚙️ सेटिंग्स
      </Typography>

      {/* Success Message */}
      {saved && (
        <Alert
          severity="success"
          sx={{
            marginBottom: '16px',
            backgroundColor: 'rgba(34, 197, 94, 0.1)',
            border: '1px solid #22c55e',
            color: '#16a34a',
          }}
        >
          ✅ सेटिंग्स सफलतापूर्वक सेव केली गई
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Phone Number Section */}
        <Grid item xs={12}>
          <Card
            sx={{
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            }}
          >
            <CardHeader
              title="📱 व्हाट्सअँप अलर्ट"
              titleTypographyProps={{
                sx: {
                  fontFamily: 'Noto Sans Devanagari, sans-serif',
                  fontWeight: 'bold',
                  color: '#1e293b',
                },
              }}
              sx={{
                backgroundColor: 'rgba(59, 130, 246, 0.05)',
                borderBottom: '1px solid #e2e8f0',
              }}
            />
            <CardContent sx={{ paddingTop: '24px' }}>
              {/* Enable/Disable Toggle */}
              <FormControlLabel
                control={
                  <Switch
                    checked={whatsappEnabled}
                    onChange={(e) => setWhatsappEnabled(e.target.checked)}
                  />
                }
                label="व्हाट्सअँप अलर्ट सक्षम करा"
                sx={{
                  display: 'block',
                  marginBottom: '16px',
                  fontFamily: 'Noto Sans Devanagari, sans-serif',
                }}
              />

              {/* Phone Number */}
              <Typography
                variant="body2"
                sx={{
                  color: '#64748b',
                  marginBottom: '12px',
                  fontFamily: 'Noto Sans Devanagari, sans-serif',
                }}
              >
                व्हाट्सअँप अलर्ट प्राप्त करण्यासाठी फोन नंबर
              </Typography>
              <TextField
                fullWidth
                label="फोन नंबर"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+919970187593"
                disabled={!whatsappEnabled}
                InputProps={{
                  startAdornment: <PhoneIcon sx={{ marginRight: '8px', color: '#64748b' }} />,
                }}
                sx={{
                  marginBottom: '16px',
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '8px',
                  },
                }}
              />

              {/* Info Alert */}
              <Alert
                severity="info"
                icon={<InfoIcon />}
                sx={{
                  backgroundColor: 'rgba(59, 130, 246, 0.1)',
                  border: '1px solid #3b82f6',
                  color: '#1e40af',
                  marginTop: '12px',
                }}
              >
                <Typography variant="caption" sx={{ fontFamily: 'Noto Sans Devanagari, sans-serif' }}>
                  देश कोड सह पूर्ण फोन नंबर प्रविष्ट करा (उदा: +919970187593)
                </Typography>
              </Alert>
            </CardContent>
          </Card>
        </Grid>

        {/* Alert Configuration Section */}
        <Grid item xs={12}>
          <Card
            sx={{
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            }}
          >
            <CardHeader
              title="🎯 अलर्ट कॉन्फिगरेशन"
              titleTypographyProps={{
                sx: {
                  fontFamily: 'Noto Sans Devanagari, sans-serif',
                  fontWeight: 'bold',
                  color: '#1e293b',
                },
              }}
              sx={{
                backgroundColor: 'rgba(245, 158, 11, 0.05)',
                borderBottom: '1px solid #e2e8f0',
              }}
            />
            <CardContent sx={{ paddingTop: '24px' }}>
              {/* Confidence Threshold */}
              <Box sx={{ marginBottom: '24px' }}>
                <Typography
                  variant="subtitle2"
                  sx={{
                    fontWeight: 'bold',
                    marginBottom: '12px',
                    color: '#1e293b',
                    fontFamily: 'Noto Sans Devanagari, sans-serif',
                  }}
                >
                  विश्वास थ्रेशोल्ड: {confidenceThreshold}%
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    color: '#64748b',
                    display: 'block',
                    marginBottom: '12px',
                    fontFamily: 'Noto Sans Devanagari, sans-serif',
                  }}
                >
                  केवळ या टक्केवारीपेक्षा जास्त विश्वास असलेले अलर्ट पाठवा (संदेश वापरणे कमी करते)
                </Typography>
                <Slider
                  value={confidenceThreshold}
                  onChange={(e, newValue) => setConfidenceThreshold(newValue as number)}
                  min={0}
                  max={100}
                  step={5}
                  marks={[
                    { value: 0, label: '0%' },
                    { value: 50, label: '50%' },
                    { value: 100, label: '100%' },
                  ]}
                  valueLabelDisplay="auto"
                  disabled={!whatsappEnabled}
                  sx={{
                    marginBottom: '12px',
                  }}
                />
              </Box>

              <Divider sx={{ marginBottom: '24px' }} />

              {/* Cooldown Period */}
              <Box>
                <Typography
                  variant="subtitle2"
                  sx={{
                    fontWeight: 'bold',
                    marginBottom: '12px',
                    color: '#1e293b',
                    fontFamily: 'Noto Sans Devanagari, sans-serif',
                  }}
                >
                  अलर्ट कूलडाउन: {cooldownMinutes} मिनिट
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    color: '#64748b',
                    display: 'block',
                    marginBottom: '12px',
                    fontFamily: 'Noto Sans Devanagari, sans-serif',
                  }}
                >
                  समान धोक्याच्या प्रकारासाठी अलर्टमधील किमान वेळ (संदेश वापरणे कमी करते)
                </Typography>
                <Slider
                  value={cooldownMinutes}
                  onChange={(e, newValue) => setCooldownMinutes(newValue as number)}
                  min={0}
                  max={60}
                  step={5}
                  marks={[
                    { value: 0, label: '0 मिनिट' },
                    { value: 30, label: '30 मिनिट' },
                    { value: 60, label: '60 मिनिट' },
                  ]}
                  valueLabelDisplay="auto"
                  disabled={!whatsappEnabled}
                  sx={{
                    marginBottom: '12px',
                  }}
                />
              </Box>

              {/* Info Alert */}
              <Alert
                severity="warning"
                icon={<InfoIcon />}
                sx={{
                  backgroundColor: 'rgba(245, 158, 11, 0.1)',
                  border: '1px solid #f59e0b',
                  color: '#92400e',
                  marginTop: '16px',
                }}
              >
                <Typography variant="caption" sx={{ fontFamily: 'Noto Sans Devanagari, sans-serif' }}>
                  उच्च थ्रेशोल्ड आणि कूलडाउन संदेश वापरणे कमी करते परंतु महत्वाचे अलर्ट मिस होऊ शकते
                </Typography>
              </Alert>
            </CardContent>
          </Card>
        </Grid>

        {/* Language Section */}
        <Grid item xs={12} md={6}>
          <Card
            sx={{
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            }}
          >
            <CardHeader
              title="🌐 भाषा"
              titleTypographyProps={{
                sx: {
                  fontFamily: 'Noto Sans Devanagari, sans-serif',
                  fontWeight: 'bold',
                  color: '#1e293b',
                },
              }}
              sx={{
                backgroundColor: 'rgba(34, 197, 94, 0.05)',
                borderBottom: '1px solid #e2e8f0',
              }}
            />
            <CardContent sx={{ paddingTop: '24px' }}>
              <FormControl fullWidth>
                <InputLabel>भाषा निवडा</InputLabel>
                <Select
                  value={language}
                  label="भाषा निवडा"
                  onChange={(e) => setLanguage(e.target.value)}
                  sx={{
                    borderRadius: '8px',
                  }}
                >
                  <MenuItem value="mr">मराठी</MenuItem>
                  <MenuItem value="hi">हिंदी</MenuItem>
                  <MenuItem value="en">English</MenuItem>
                </Select>
              </FormControl>
            </CardContent>
          </Card>
        </Grid>

        {/* Save Button */}
        <Grid item xs={12}>
          <Button
            variant="contained"
            size="large"
            startIcon={<SaveIcon />}
            onClick={handleSave}
            sx={{
              background: 'linear-gradient(135deg, #3b82f6, #1e40af)',
              color: '#fff',
              fontWeight: 'bold',
              borderRadius: '8px',
              padding: '12px 32px',
              fontSize: '1rem',
              '&:hover': {
                opacity: 0.9,
              },
            }}
          >
            सेटिंग्स सेव करा
          </Button>
        </Grid>
      </Grid>
    </Box>
  );
};
