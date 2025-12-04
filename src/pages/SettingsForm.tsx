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
import wishMoneyLogo from "../assets/wishmoneylogo.png";

const API_BASE_URL = "http://127.0.0.1:5100";

type Currency = "USD" | "LBP";

type CurrencySettings = {
  from_currency: Currency;
  to_currency: Currency;
  conversion_operator: "*" | "/";
  curr_rate: number;
  wish_money_phone: string;
};

const tableFontFamily =
  '"Segoe UI", "Roboto", "Helvetica Neue", Arial, sans-serif';

const SettingsForm: React.FC = () => {
  const [settings, setSettings] = useState<CurrencySettings>({
    from_currency: "USD",
    to_currency: "LBP",
    conversion_operator: "*",
    curr_rate: 90000,
    wish_money_phone: "",
  });

  // Baselines for section-level reset
  const [currencyBaseline, setCurrencyBaseline] = useState<{
    from_currency: Currency;
    to_currency: Currency;
    conversion_operator: "*" | "/";
    curr_rate: number;
  }>({
    from_currency: "USD",
    to_currency: "LBP",
    conversion_operator: "*",
    curr_rate: 90000,
  });

  const [paymentBaseline, setPaymentBaseline] = useState<{
    wish_money_phone: string;
  }>({
    wish_money_phone: "",
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // ---- Load currency settings from API ----
  const loadCurrencySettings = async (opts?: {
    from?: Currency;
    to?: Currency;
  }) => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const params =
        opts?.from && opts?.to
          ? { from_currency: opts.from, to_currency: opts.to }
          : undefined;

      const res = await axios.get(`${API_BASE_URL}/api/settings/currency`, {
        params,
      });
      const data = res.data as Partial<CurrencySettings>;

      const newSettings: CurrencySettings = {
        from_currency:
          (data.from_currency as Currency) ?? settings.from_currency,
        to_currency: (data.to_currency as Currency) ?? settings.to_currency,
        conversion_operator:
          (data.conversion_operator as "*" | "/") ??
          settings.conversion_operator,
        curr_rate:
          typeof data.curr_rate === "number"
            ? data.curr_rate
            : settings.curr_rate,
        // Don't overwrite the phone here – handled separately
        wish_money_phone: settings.wish_money_phone,
      };

      setSettings(newSettings);

      // Update currency baseline from latest API data
      setCurrencyBaseline({
        from_currency: newSettings.from_currency,
        to_currency: newSettings.to_currency,
        conversion_operator: newSettings.conversion_operator,
        curr_rate: newSettings.curr_rate,
      });
    } catch (err: any) {
      console.error("Failed to load currency settings", err);
      const apiError = err?.response?.data?.error;
      setError(apiError || "Failed to load currency settings.");
    } finally {
      setLoading(false);
    }
  };

  // ---- Load Wish Money phone from /api/settings/wish ----
  const loadWishSettings = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/settings/wish`);
      // Expected response: { title: "wish", number: "..." | null }
      const data = res.data as { title?: string; number?: string | null };

      const phone = data.number || "";

      setSettings((prev) => ({
        ...prev,
        wish_money_phone: phone,
      }));

      setPaymentBaseline({
        wish_money_phone: phone,
      });
    } catch (err: any) {
      console.error("Failed to load wish number", err);
      const apiError = err?.response?.data?.error;
      setError(apiError || "Failed to load Wish Money phone.");
    }
  };

  // initial load
  useEffect(() => {
    // load currency (first row or defaults)
    loadCurrencySettings();
    // load wish phone separately
    loadWishSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // ---- SAVE handlers ----
  const handleSaveCurrency = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    if (!["USD", "LBP"].includes(settings.from_currency)) {
      setError("From currency must be USD or LBP.");
      setSaving(false);
      return;
    }
    if (!["USD", "LBP"].includes(settings.to_currency)) {
      setError("To currency must be USD or LBP.");
      setSaving(false);
      return;
    }
    if (!["*", "/"].includes(settings.conversion_operator)) {
      setError("Conversion operator must be * or /.");
      setSaving(false);
      return;
    }
    if (!settings.curr_rate || settings.curr_rate <= 0) {
      setError("Rate must be greater than zero.");
      setSaving(false);
      return;
    }

    try {
      // Backend uses from_currency / to_currency / operator / curr_rate
      await axios.post(`${API_BASE_URL}/api/settings/currency`, {
        from_currency: settings.from_currency,
        to_currency: settings.to_currency,
        conversion_operator: settings.conversion_operator,
        curr_rate: settings.curr_rate,
      });

      setSuccess("Currency settings saved successfully.");

      // Update currency baseline after successful save
      setCurrencyBaseline({
        from_currency: settings.from_currency,
        to_currency: settings.to_currency,
        conversion_operator: settings.conversion_operator,
        curr_rate: settings.curr_rate,
      });
    } catch (err: any) {
      console.error("Failed to save currency settings", err);
      const apiError = err?.response?.data?.error;
      setError(apiError || "Failed to save currency settings.");
    } finally {
      setSaving(false);
    }
  };

  const handleSavePayment = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    if (!settings.wish_money_phone) {
      setError("Wish Money phone number is required.");
      setSaving(false);
      return;
    }

    try {
      // New endpoint: save wish number in settings table
      await axios.post(`${API_BASE_URL}/api/settings/wish`, {
        number: settings.wish_money_phone,
      });

      setSuccess("Payment info saved successfully.");

      // Update payment baseline after successful save
      setPaymentBaseline({
        wish_money_phone: settings.wish_money_phone,
      });
    } catch (err: any) {
      console.error("Failed to save payment info", err);
      const apiError = err?.response?.data?.error;
      setError(apiError || "Failed to save payment info.");
    } finally {
      setSaving(false);
    }
  };

  // ---- RESET handlers (section-only) ----
  const handleResetCurrency = () => {
    setSettings((prev) => ({
      ...prev,
      from_currency: currencyBaseline.from_currency,
      to_currency: currencyBaseline.to_currency,
      conversion_operator: currencyBaseline.conversion_operator,
      curr_rate: currencyBaseline.curr_rate,
    }));
    setError(null);
    setSuccess(null);
  };

  const handleResetPayment = () => {
    setSettings((prev) => ({
      ...prev,
      wish_money_phone: paymentBaseline.wish_money_phone,
    }));
    setError(null);
    setSuccess(null);
  };

  // ---- Handlers that also reload operator + rate from backend ----
  const handleFromCurrencyChange = (newFrom: Currency) => {
    // update from_currency locally
    setSettings((prev) => ({
      ...prev,
      from_currency: newFrom,
    }));
    // fetch operator/rate for this pair
    loadCurrencySettings({ from: newFrom, to: settings.to_currency });
  };

  const handleToCurrencyChange = (newTo: Currency) => {
    // update to_currency locally
    setSettings((prev) => ({
      ...prev,
      to_currency: newTo,
    }));
    // fetch operator/rate for this pair
    loadCurrencySettings({ from: settings.from_currency, to: newTo });
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
            Configure global currency and payment options used across salary
            modules.
          </Typography>
        </Box>

        <Stack direction="row" spacing={1.5} alignItems="center">
          <Button
            variant="outlined"
            size="small"
            onClick={() => {
              loadCurrencySettings({
                from: settings.from_currency,
                to: settings.to_currency,
              });
              loadWishSettings();
            }}
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
            {loading ? "Refreshing..." : "Reload from server"}
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

      {/* Currency Settings section */}
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
            Define conversion from one currency to another.
          </Typography>
        </Stack>

        <Divider sx={{ mb: 2 }} />

        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={2}
          alignItems={{ xs: "stretch", md: "flex-start" }}
        >
          {/* From currency */}
          <TextField
            select
            label="From Currency"
            variant="outlined"
            size="small"
            fullWidth
            value={settings.from_currency}
            onChange={(e) =>
              handleFromCurrencyChange(e.target.value as Currency)
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

          {/* To currency */}
          <TextField
            select
            label="To Currency"
            variant="outlined"
            size="small"
            fullWidth
            value={settings.to_currency}
            onChange={(e) =>
              handleToCurrencyChange(e.target.value as Currency)
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
            label="Operator"
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

          {/* Rate */}
          <TextField
            label="Rate"
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
            onClick={handleResetCurrency}
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
            onClick={handleSaveCurrency}
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
            {saving ? "Saving..." : "Save Currency"}
          </Button>
        </Box>
      </Paper>

      {/* Payment Info / Wish Money section */}
      <Paper
        sx={{
          p: 2.5,
          borderRadius: 2,
          boxShadow: 2,
          borderLeft: "4px solid #ffb300",
          backgroundColor: "#fffef7",
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
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Box
              component="img"
              src={wishMoneyLogo}
              alt="Wish Money"
              sx={{
                width: 26,
                height: 26,
                objectFit: "contain",
                borderRadius: "4px",
              }}
            />
            <Typography
              variant="subtitle1"
              sx={{ fontWeight: 600, color: "text.secondary" }}
            >
              Wish Money – Payment Info
            </Typography>
          </Stack>

          <Typography variant="caption" color="text.secondary">
            Phone number used for Wish Money payments.
          </Typography>
        </Stack>

        <Divider sx={{ mb: 2 }} />

        <TextField
          label="Wish Money Phone"
          variant="outlined"
          size="small"
          fullWidth
          type="tel"
          inputMode="numeric"
          value={settings.wish_money_phone}
          onChange={(e) => {
            const onlyDigits = e.target.value.replace(/\D/g, "");
            handleFieldChange("wish_money_phone", onlyDigits);
          }}
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
          helperText="Enter the phone number linked to Wish Money."
        />

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
            onClick={handleResetPayment}
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
            onClick={handleSavePayment}
            disabled={saving}
            sx={{
              textTransform: "none",
              fontWeight: 600,
              fontFamily: tableFontFamily,
              backgroundColor: "#ffb300",
              "&:hover": {
                backgroundColor: "#ffa000",
              },
            }}
          >
            {saving ? "Saving..." : "Save Payment Info"}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default SettingsForm;
