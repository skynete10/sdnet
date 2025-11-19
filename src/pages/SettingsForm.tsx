import React, { useEffect, useState } from "react";
import {
  Box,
  Paper,
  Typography,
  Stack,
  TextField,
  Button,
  Divider,
  MenuItem,
} from "@mui/material";
import axios from "axios";

const API_BASE_URL = "http://127.0.0.1:5100";

type Currency = "USD" | "LBP";

type CurrencySettings = {
  default_currency: Currency;
  conversion_operator: "*" | "/";
  curr_rate: number;
};

const tableFontFamily =
  '"Segoe UI", "Roboto", "Helvetica Neue", Arial, sans-serif';

const SettingsForm: React.FC = () => {
  const [settings, setSettings] = useState<CurrencySettings>({
    default_currency: "LBP",
    conversion_operator: "*",
    curr_rate: 90000,
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // ---- Load settings from API (optionally for a specific currency) ----
  const loadSettings = async (currency?: Currency) => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await axios.get(`${API_BASE_URL}/api/settings/currency`, {
        params: currency ? { default_currency: currency } : undefined,
      });

      const data = res.data as Partial<CurrencySettings>;

      setSettings((prev) => ({
        default_currency:
          (data.default_currency as Currency) ??
          currency ??
          prev.default_currency,
        conversion_operator:
          (data.conversion_operator as "*" | "/") ?? prev.conversion_operator,
        curr_rate:
          typeof data.curr_rate === "number" ? data.curr_rate : prev.curr_rate,
      }));
    } catch (err: any) {
      console.error("Failed to load currency settings", err);
      const apiError = err?.response?.data?.error;
      setError(apiError || "Failed to load currency settings.");
    } finally {
      setLoading(false);
    }
  };

  // initial load (no specific currency)
  useEffect(() => {
    loadSettings();
  }, []);

  const handleFieldChange = <K extends keyof CurrencySettings>(
    field: K,
    value: CurrencySettings[K]
  ) => {
    setSettings((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // When default currency changes → call API to get operator + rate for that currency
  const handleDefaultCurrencyChange = (newCurrency: Currency) => {
    // optimistically update the selected currency
    setSettings((prev) => ({
      ...prev,
      default_currency: newCurrency,
    }));
    // then fetch its settings from backend
    loadSettings(newCurrency);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    // simple frontend validation to mirror backend
    if (!["USD", "LBP"].includes(settings.default_currency)) {
      setError("Default currency must be USD or LBP.");
      setSaving(false);
      return;
    }
    if (!["*", "/"].includes(settings.conversion_operator)) {
      setError("Conversion operator must be * or /.");
      setSaving(false);
      return;
    }
    if (!settings.curr_rate || settings.curr_rate <= 0) {
      setError("USD → LBP rate must be greater than zero.");
      setSaving(false);
      return;
    }

    try {
      await axios.post(`${API_BASE_URL}/api/settings/currency`, settings);
      setSuccess("Settings saved successfully.");
    } catch (err: any) {
      console.error("Failed to save currency settings", err);
      const apiError = err?.response?.data?.error;
      setError(apiError || "Failed to save currency settings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box sx={{ p: 3, display: "flex", flexDirection: "column", gap: 2 }}>
      {/* Header bar */}
      <Paper
        sx={{
          p: 2,
          borderRadius: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 2,
          background:
            "linear-gradient(90deg, rgba(0,77,64,1) 0%, rgba(0,121,107,1) 40%, rgba(0,150,136,1) 100%)",
          color: "#fff",
          boxShadow: 4,
          fontFamily: tableFontFamily,
        }}
      >
        <Box>
          <Typography
            variant="h5"
            sx={{ fontWeight: 700, mb: 0.5, fontFamily: tableFontFamily }}
          >
            Settings
          </Typography>
          <Typography
            variant="body2"
            sx={{ opacity: 0.9, fontFamily: tableFontFamily }}
          >
            Configure global currency options used across salary modules.
          </Typography>
        </Box>

        <Stack direction="row" spacing={1.5} alignItems="center">
          <Button
            variant="outlined"
            size="small"
            onClick={() => loadSettings()}
            disabled={loading || saving}
            sx={{
              textTransform: "none",
              fontWeight: 600,
              fontFamily: tableFontFamily,
              borderColor: "#e0f2f1",
              color: "#ffffff",
              "&:hover": {
                borderColor: "#ffffff",
                backgroundColor: "rgba(255,255,255,0.12)",
              },
            }}
          >
            {loading ? "Refreshing..." : "Reload"}
          </Button>
        </Stack>
      </Paper>

      {error && (
        <Typography
          variant="body2"
          color="error"
          sx={{ mb: 1, textAlign: "right", fontFamily: tableFontFamily }}
        >
          {error}
        </Typography>
      )}

      {success && (
        <Typography
          variant="body2"
          color="success.main"
          sx={{ mb: 1, textAlign: "right", fontFamily: tableFontFamily }}
        >
          {success}
        </Typography>
      )}

      {/* Main settings card */}
      <Paper
        sx={{
          p: 2.5,
          borderRadius: 2,
          boxShadow: 2,
          borderLeft: "4px solid #00897b",
          backgroundColor: "#fafafa",
          fontFamily: tableFontFamily,
        }}
      >
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", md: "center" }}
          spacing={2}
          mb={2}
        >
          <Typography
            variant="subtitle1"
            sx={{ fontWeight: 600, color: "text.secondary" }}
          >
            Currency Settings
          </Typography>
          <Typography variant="caption" color="text.secondary">
            These values are used for salary calculations and conversions.
          </Typography>
        </Stack>

        <Divider sx={{ mb: 2 }} />

        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={2}
          alignItems={{ xs: "stretch", md: "flex-start" }}
        >
          {/* Default currency */}
          <TextField
            select
            label="Default Currency"
            variant="outlined"
            size="small"
            fullWidth
            value={settings.default_currency}
            onChange={(e) =>
              handleDefaultCurrencyChange(e.target.value as Currency)
            }
            InputProps={{
              sx: {
                fontFamily: tableFontFamily,
                fontSize: "0.9rem",
              },
            }}
            InputLabelProps={{
              sx: {
                fontFamily: tableFontFamily,
                fontSize: "0.85rem",
              },
            }}
          >
            <MenuItem value="USD">USD</MenuItem>
            <MenuItem value="LBP">LBP</MenuItem>
          </TextField>

          {/* Conversion operator */}
          <TextField
            select
            label="Operator (USD ↔ LBP)"
            variant="outlined"
            size="small"
            fullWidth
            value={settings.conversion_operator}
            onChange={(e) =>
              handleFieldChange(
                "conversion_operator",
                e.target.value as "*" | "/"
              )
            }
            InputProps={{
              sx: {
                fontFamily: tableFontFamily,
                fontSize: "0.9rem",
              },
            }}
            InputLabelProps={{
              sx: {
                fontFamily: tableFontFamily,
                fontSize: "0.85rem",
              },
            }}
          >
            <MenuItem value="*">× Multiply</MenuItem>
            <MenuItem value="/">÷ Divide</MenuItem>
          </TextField>

          {/* USD → LBP rate */}
          <TextField
            label="USD → LBP Rate"
            variant="outlined"
            size="small"
            fullWidth
            type="number"
            value={settings.curr_rate}
            onChange={(e) =>
              handleFieldChange("curr_rate", Number(e.target.value || 0))
            }
            InputProps={{
              sx: {
                fontFamily: tableFontFamily,
                fontSize: "0.9rem",
              },
            }}
            InputLabelProps={{
              sx: {
                fontFamily: tableFontFamily,
                fontSize: "0.85rem",
              },
            }}
          />
        </Stack>

        <Box
          sx={{
            mt: 3,
            display: "flex",
            justifyContent: "flex-end",
            gap: 1.5,
          }}
        >
          <Button
            variant="outlined"
            size="small"
            onClick={() => loadSettings(settings.default_currency)}
            disabled={loading || saving}
            sx={{
              textTransform: "none",
              fontWeight: 600,
              fontFamily: tableFontFamily,
            }}
          >
            Reset
          </Button>
          <Button
            variant="contained"
            size="small"
            onClick={handleSave}
            disabled={saving}
            sx={{
              textTransform: "none",
              fontWeight: 600,
              fontFamily: tableFontFamily,
              backgroundColor: "#00897b",
              "&:hover": {
                backgroundColor: "#00695c",
              },
            }}
          >
            {saving ? "Saving..." : "Save Settings"}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default SettingsForm;
