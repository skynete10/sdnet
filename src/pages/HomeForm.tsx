import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Stack,
  Chip,
  Divider,
  Button,
} from "@mui/material";
import Grid from "@mui/material/Grid";
import {
  People as PeopleIcon,
  LocalShipping as LocalShippingIcon,
  ReceiptLong as ReceiptLongIcon,
  WarningAmber as WarningAmberIcon,
} from "@mui/icons-material";
import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import axios from "axios";

const API_BASE_URL = "http://127.0.0.1:5100";

const revenueData = [
  { month: "Jan", revenue: 4200 },
  { month: "Feb", revenue: 5200 },
  { month: "Mar", revenue: 6100 },
  { month: "Apr", revenue: 5800 },
  { month: "May", revenue: 7200 },
  { month: "Jun", revenue: 8000 },
];

const customersByCity = [
  { city: "Beirut", customers: 120 },
  { city: "Saida", customers: 65 },
  { city: "Aley", customers: 40 },
  { city: "Tripoli", customers: 55 },
  { city: "Zahle", customers: 32 },
];

const StatCard: React.FC<{
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  color?: string;
}> = ({ title, value, subtitle, icon, color }) => {
  return (
    <Paper
      elevation={3}
      sx={{
        p: 2.5,
        borderRadius: 3,
        display: "flex",
        alignItems: "center",
        gap: 2,
      }}
    >
      <Box
        sx={{
          width: 44,
          height: 44,
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: color || "primary.main",
          color: "#fff",
        }}
      >
        {icon}
      </Box>
      <Box>
        <Typography
          variant="caption"
          sx={{ textTransform: "uppercase", color: "text.secondary" }}
        >
          {title}
        </Typography>
        <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
          {value}
        </Typography>
        {subtitle && (
          <Typography
            variant="caption"
            sx={{ color: "success.main", fontWeight: 500 }}
          >
            {subtitle}
          </Typography>
        )}
      </Box>
    </Paper>
  );
};

const HomeForm: React.FC = () => {
  const [totalCustomers, setTotalCustomers] = useState<number | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [liveUpdate, setLiveUpdate] = useState(true);

  // Fetch total customers from Flask API and refresh periodically
  useEffect(() => {
    let isMounted = true;
    let intervalId: any = null;

    const fetchTotalCustomers = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/customers/count`);
        // Expected: { total: number }
        const total = res.data?.total ?? 0;
        if (isMounted) {
          setTotalCustomers(total);
          setLastUpdated(new Date().toLocaleTimeString());
        }
      } catch (err) {
        console.error("Failed to fetch total customers", err);
        if (isMounted) {
          setTotalCustomers(null);
        }
      }
    };

    // initial load
    fetchTotalCustomers();

    // live update every 30 seconds if enabled
    if (liveUpdate) {
      intervalId = setInterval(fetchTotalCustomers, 30000);
    }

    return () => {
      isMounted = false;
      if (intervalId) clearInterval(intervalId);
    };
  }, [liveUpdate]);

  return (
    <Box sx={{ p: 3, height: "100%", boxSizing: "border-box" }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", sm: "center" }}
          spacing={2}
        >
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              Dashboard
            </Typography>
            <Typography
              variant="body2"
              sx={{ color: "text.secondary", mt: 0.5 }}
            >
              Overview of your ISP Software Manager activity
            </Typography>
            {lastUpdated && (
              <Typography
                variant="caption"
                sx={{ color: "text.secondary", mt: 0.5, display: "block" }}
              >
                Live data · Last update: {lastUpdated}
              </Typography>
            )}
          </Box>

          <Stack direction="row" spacing={1}>
            <Chip
              label={`Today: ${new Date().toLocaleDateString()}`}
              variant="outlined"
              size="small"
            />

            <Button
              variant="contained"
              size="small"
              onClick={() => setLiveUpdate((prev) => !prev)}
              sx={{
                textTransform: "none",
                backgroundColor: liveUpdate ? "#d32f2f" : "#2e7d32",
                color: "#fff",
                "&:hover": {
                  backgroundColor: liveUpdate ? "#b71c1c" : "#1b5e20",
                },
              }}
            >
              {liveUpdate ? "Disable Live Update" : "Enable Live Update"}
            </Button>
          </Stack>
        </Stack>
      </Box>

      {/* Top stats */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Customers"
            value={totalCustomers !== null ? totalCustomers : "..."}
            subtitle={
              totalCustomers !== null
                ? liveUpdate
                  ? "Live from database"
                  : "Loaded from last refresh"
                : "Loading..."
            }
            icon={<PeopleIcon />}
            color="#0ea5e9"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Suppliers"
            value={18}
            subtitle="+2 new"
            icon={<LocalShippingIcon />}
            color="#22c55e"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Sales (This Month)"
            value="$ 8,420"
            subtitle="+9% vs last month"
            icon={<ReceiptLongIcon />}
            color="#6366f1"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Pending Invoices"
            value={7}
            subtitle="Requires follow-up"
            icon={<WarningAmberIcon />}
            color="#f97316"
          />
        </Grid>
      </Grid>

      {/* Charts row */}
      <Grid container spacing={2}>
        {/* Revenue chart */}
        <Grid item xs={12} md={7}>
          <Paper
            elevation={3}
            sx={{
              p: 2.5,
              borderRadius: 3,
              height: 320,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <Box sx={{ mb: 1.5 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                Monthly Revenue
              </Typography>
              <Typography
                variant="caption"
                sx={{ color: "text.secondary" }}
              >
                Last 6 months performance
              </Typography>
            </Box>

            <Divider sx={{ mb: 2 }} />

            <Box sx={{ flex: 1, minHeight: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#6366f1"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>

        {/* Customers by city chart */}
        <Grid item xs={12} md={5}>
          <Paper
            elevation={3}
            sx={{
              p: 2.5,
              borderRadius: 3,
              height: 320,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <Box sx={{ mb: 1.5 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                Active Customers by City
              </Typography>
              <Typography
                variant="caption"
                sx={{ color: "text.secondary" }}
              >
                Distribution across main locations
              </Typography>
            </Box>

            <Divider sx={{ mb: 2 }} />

            <Box sx={{ flex: 1, minHeight: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={customersByCity}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="city" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="customers" fill="#0ea5e9" />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default HomeForm;
