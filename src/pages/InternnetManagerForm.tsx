import React, { useState } from "react";
import {
  Box,
  Paper,
  Typography,
  Stack,
  Divider,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  OutlinedInput,
  Checkbox,
  ListItemText,
  Switch,
  FormControlLabel,
  RadioGroup,
  Radio,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
} from "@mui/material";

const tableFontFamily =
  '"Segoe UI", "Roboto", "Helvetica Neue", Arial, sans-serif';

// Example options – replace with your real data if needed
const ADDRESS_OPTIONS = ["Beirut", "Tripoli", "Saida", "Zahle", "Tyre"];
const DUE_DATE_OPTIONS = ["Today", "This Week", "This Month", "Overdue"];

type PaymentStatus = "" | "paid" | "unpaid" | "partial" | "all";

type InternetRecord = {
  id: number;
  username: string;
  fullname: string;
  city: string;
  village: string;
  due_date: string; // YYYY-MM-DD
  amount: number;
  invoiced: boolean;
  payment: "paid" | "unpaid" | "partial";
  status: "active" | "stopped";
};

// demo data – replace with API data later
const DEMO_ROWS: InternetRecord[] = [
  {
    id: 1,
    username: "jdoe",
    fullname: "John Doe",
    city: "Beirut",
    village: "Hamra",
    due_date: "2025-11-30",
    amount: 25.0,
    invoiced: true,
    payment: "paid",
    status: "active",
  },
  {
    id: 2,
    username: "asmaa",
    fullname: "Asmaa Khalil",
    city: "Tripoli",
    village: "Mina",
    due_date: "2025-12-05",
    amount: 18.5,
    invoiced: true,
    payment: "partial",
    status: "active",
  },
  {
    id: 3,
    username: "karim",
    fullname: "Karim Fawaz",
    city: "Saida",
    village: "Old Saida",
    due_date: "2025-11-20",
    amount: 30,
    invoiced: false,
    payment: "unpaid",
    status: "stopped",
  },
];

const InternnetManagerForm: React.FC = () => {
  const [filterDate, setFilterDate] = useState<string>("");
  const [selectedAddresses, setSelectedAddresses] = useState<string[]>([]);
  const [selectedDueDates, setSelectedDueDates] = useState<string[]>([]);
  const [isActive, setIsActive] = useState<boolean>(true);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("");
  const [searchName, setSearchName] = useState<string>("");

  // later you can apply filters to rows here
  const rows = DEMO_ROWS;

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
            Internet Manager
          </Typography>
          <Typography
            variant="body2"
            sx={{ opacity: 0.9, fontFamily: tableFontFamily }}
          >
            Configure and monitor internet-related settings and records.
          </Typography>
        </Box>

        <Stack direction="row" spacing={1.5} alignItems="center">
          {/* Placeholder for future buttons (Import / Export / Actions, etc.) */}
        </Stack>
      </Paper>

      {/* Filter panel */}
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
            Filters
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Use the filters below to narrow down internet records.
          </Typography>
        </Stack>

        <Divider sx={{ mb: 2 }} />

        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={2}
          alignItems={{ xs: "stretch", md: "flex-end" }}
        >
          {/* Date picker */}
          <TextField
            label="Date"
            type="date"
            size="small"
            fullWidth
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            InputLabelProps={{
              shrink: true,
              sx: {
                fontFamily: tableFontFamily,
                fontSize: "0.85rem",
              },
            }}
            InputProps={{
              sx: {
                fontFamily: tableFontFamily,
                fontSize: "0.9rem",
              },
            }}
          />

          {/* Username / Full name search */}
          <TextField
            label="Username / Full Name"
            variant="outlined"
            size="small"
            fullWidth
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
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

          {/* Addresses multi select */}
          <FormControl size="small" fullWidth>
            <InputLabel
              sx={{
                fontFamily: tableFontFamily,
                fontSize: "0.85rem",
              }}
            >
              Addresses
            </InputLabel>
            <Select
              multiple
              value={selectedAddresses}
              onChange={(e) =>
                setSelectedAddresses(e.target.value as string[])
              }
              input={
                <OutlinedInput
                  label="Addresses"
                  sx={{ fontFamily: tableFontFamily, fontSize: "0.9rem" }}
                />
              }
              renderValue={(selected) => (selected as string[]).join(", ")}
            >
              {ADDRESS_OPTIONS.map((addr) => (
                <MenuItem key={addr} value={addr}>
                  <Checkbox
                    checked={selectedAddresses.indexOf(addr) > -1}
                    size="small"
                  />
                  <ListItemText primary={addr} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Due date multi select */}
          <FormControl size="small" fullWidth>
            <InputLabel
              sx={{
                fontFamily: tableFontFamily,
                fontSize: "0.85rem",
              }}
            >
              Due Date
            </InputLabel>
            <Select
              multiple
              value={selectedDueDates}
              onChange={(e) => setSelectedDueDates(e.target.value as string[])}
              input={
                <OutlinedInput
                  label="Due Date"
                  sx={{ fontFamily: tableFontFamily, fontSize: "0.9rem" }}
                />
              }
              renderValue={(selected) => (selected as string[]).join(", ")}
            >
              {DUE_DATE_OPTIONS.map((opt) => (
                <MenuItem key={opt} value={opt}>
                  <Checkbox
                    checked={selectedDueDates.indexOf(opt) > -1}
                    size="small"
                  />
                  <ListItemText primary={opt} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>

        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={4}
          alignItems={{ xs: "flex-start", md: "center" }}
          sx={{ mt: 2 }}
        >
          {/* Active / Stopped switch */}
          <FormControlLabel
            control={
              <Switch
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
              />
            }
            label={isActive ? "Active" : "Stopped"}
            sx={{
              fontFamily: tableFontFamily,
              ".MuiFormControlLabel-label": {
                fontFamily: tableFontFamily,
                fontSize: "0.9rem",
              },
            }}
          />

          {/* Payment status radio group */}
          <Box>
            <RadioGroup
              row
              value={paymentStatus}
              onChange={(e) =>
                setPaymentStatus(
                  e.target.value as PaymentStatus
                )
              }
            >
              <FormControlLabel
                value="paid"
                control={<Radio size="small" />}
                label="Paid"
                sx={{
                  ".MuiFormControlLabel-label": {
                    fontFamily: tableFontFamily,
                    fontSize: "0.9rem",
                  },
                }}
              />
              <FormControlLabel
                value="unpaid"
                control={<Radio size="small" />}
                label="Unpaid"
                sx={{
                  ".MuiFormControlLabel-label": {
                    fontFamily: tableFontFamily,
                    fontSize: "0.9rem",
                  },
                }}
              />
              <FormControlLabel
                value="partial"
                control={<Radio size="small" />}
                label="Partial Paid"
                sx={{
                  ".MuiFormControlLabel-label": {
                    fontFamily: tableFontFamily,
                    fontSize: "0.9rem",
                  },
                }}
              />
              <FormControlLabel
                value="all"
                control={<Radio size="small" />}
                label="All"
                sx={{
                  ".MuiFormControlLabel-label": {
                    fontFamily: tableFontFamily,
                    fontSize: "0.9rem",
                  },
                }}
              />
            </RadioGroup>
          </Box>
        </Stack>
      </Paper>

      {/* Main content area with table */}
      <Paper
        sx={{
          p: 3,
          borderRadius: 2,
          boxShadow: 3,
          fontFamily: tableFontFamily,
          minHeight: "50vh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Typography
          variant="subtitle1"
          sx={{ fontWeight: 600, mb: 1, color: "text.secondary" }}
        >
          Internet Manager Panel
        </Typography>

        <Divider sx={{ mb: 2 }} />

        <TableContainer sx={{ maxHeight: "60vh" }}>
          <Table
            size="small"
            stickyHeader
            sx={{
              "& td, & th": {
                fontFamily: tableFontFamily,
                fontSize: "0.9rem",
              },
            }}
          >
            <TableHead>
              <TableRow>
                <TableCell>Username</TableCell>
                <TableCell>Full Name</TableCell>
                <TableCell>City</TableCell>
                <TableCell>Village</TableCell>
                <TableCell>Due Date</TableCell>
                <TableCell align="right">Amount</TableCell>
                <TableCell>Invoiced</TableCell>
                <TableCell>Payment</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center">
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ fontFamily: tableFontFamily }}
                    >
                      No records found.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow key={row.id} hover>
                    <TableCell>{row.username}</TableCell>
                    <TableCell>{row.fullname}</TableCell>
                    <TableCell>{row.city}</TableCell>
                    <TableCell>{row.village}</TableCell>
                    <TableCell>{row.due_date}</TableCell>
                    <TableCell align="right">
                      {row.amount.toFixed(2)}
                    </TableCell>
                    <TableCell>{row.invoiced ? "Yes" : "No"}</TableCell>
                    <TableCell>
                      {row.payment === "paid"
                        ? "Paid"
                        : row.payment === "partial"
                        ? "Partial"
                        : "Unpaid"}
                    </TableCell>
                    <TableCell>
                      {row.status === "active" ? "Active" : "Stopped"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
};

export default InternnetManagerForm;
