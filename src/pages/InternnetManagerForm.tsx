import React, { useState, useMemo } from "react";
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
  TableSortLabel,
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

type Order = "asc" | "desc";
type SortKey =
  | "username"
  | "fullname"
  | "city"
  | "village"
  | "due_date"
  | "amount"
  | "payment"
  | "status";

const InternnetManagerForm: React.FC = () => {
  const [filterDate, setFilterDate] = useState<string>("");
  const [selectedAddresses, setSelectedAddresses] = useState<string[]>([]);
  const [selectedDueDates, setSelectedDueDates] = useState<string[]>([]);
  const [isActive, setIsActive] = useState<boolean>(true);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("");
  const [searchName, setSearchName] = useState<string>("");

  const [order, setOrder] = useState<Order>("asc");
  const [orderBy, setOrderBy] = useState<SortKey>("username");

  const rows = DEMO_ROWS;

  const handleRequestSort = (property: SortKey) => {
    const isAsc = orderBy === property && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(property);
  };

  const filteredAndSortedRows = useMemo(() => {
    const today = new Date();
    const todayDateOnly = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );

    const filtered = rows.filter((row) => {
      // Name / username search
      const nameMatch =
        !searchName ||
        row.fullname.toLowerCase().includes(searchName.toLowerCase()) ||
        row.username.toLowerCase().includes(searchName.toLowerCase());

      // City filter (Addresses)
      const addressMatch =
        selectedAddresses.length === 0 ||
        selectedAddresses.includes(row.city);

      // Active / Stopped switch
      const statusFilter = isActive ? "active" : "stopped";
      const statusMatch = row.status === statusFilter;

      // Payment radio
      const paymentMatch =
        paymentStatus === "" ||
        paymentStatus === "all" ||
        row.payment === paymentStatus;

      // Date picker (exact due date)
      const dateMatch =
        !filterDate || row.due_date === filterDate; // same YYYY-MM-DD

      // Due date bucket (Today, This Week, This Month, Overdue)
      const due = new Date(row.due_date);
      const dueDateOnly = new Date(
        due.getFullYear(),
        due.getMonth(),
        due.getDate()
      );
      const diffMs = dueDateOnly.getTime() - todayDateOnly.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      const isToday = diffDays === 0;
      const isThisWeek = diffDays > 0 && diffDays <= 7;
      const isThisMonth =
        dueDateOnly.getFullYear() === todayDateOnly.getFullYear() &&
        dueDateOnly.getMonth() === todayDateOnly.getMonth();
      const isOverdue = diffDays < 0;

      const dueBucketMatch =
        selectedDueDates.length === 0 ||
        selectedDueDates.some((opt) => {
          if (opt === "Today") return isToday;
          if (opt === "This Week") return isThisWeek;
          if (opt === "This Month") return isThisMonth;
          if (opt === "Overdue") return isOverdue;
          return false;
        });

      return (
        nameMatch &&
        addressMatch &&
        statusMatch &&
        paymentMatch &&
        dateMatch &&
        dueBucketMatch
      );
    });

    return [...filtered].sort((a, b) => {
      const aRaw = a[orderBy] as any;
      const bRaw = b[orderBy] as any;

      if (orderBy === "amount") {
        const aNum = Number(aRaw ?? 0);
        const bNum = Number(bRaw ?? 0);
        if (aNum < bNum) return order === "asc" ? -1 : 1;
        if (aNum > bNum) return order === "asc" ? 1 : -1;
        return 0;
      }

      const aVal = (aRaw ?? "").toString().toLowerCase();
      const bVal = (bRaw ?? "").toString().toLowerCase();

      if (aVal < bVal) return order === "asc" ? -1 : 1;
      if (aVal > bVal) return order === "asc" ? 1 : -1;
      return 0;
    });
  }, [
    rows,
    searchName,
    selectedAddresses,
    selectedDueDates,
    isActive,
    paymentStatus,
    filterDate,
    order,
    orderBy,
  ]);

  const renderSortableHeaderCell = (
    label: string,
    property: SortKey,
    align: "left" | "right" = "left"
  ) => (
    <TableCell
      align={align}
      sx={{
        fontFamily: tableFontFamily,
        fontWeight: 700,
        fontSize: "0.95rem",
        color: "#fff",
        whiteSpace: "nowrap",
        userSelect: "none",
      }}
      sortDirection={orderBy === property ? order : false}
    >
      <TableSortLabel
        active={orderBy === property}
        direction={orderBy === property ? order : "asc"}
        onClick={() => handleRequestSort(property)}
        sx={{
          "&.MuiTableSortLabel-root": { color: "#fff" },
          "&.MuiTableSortLabel-root.Mui-active": { color: "#fff" },
          "& .MuiTableSortLabel-icon": { color: "#fff !important" },
        }}
      >
        {label}
      </TableSortLabel>
    </TableCell>
  );

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
                setPaymentStatus(e.target.value as PaymentStatus)
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

      {/* Main content area with datagrid-style table */}
      <Paper
        sx={{
          borderRadius: 2,
          boxShadow: 3,
          overflow: "hidden",
          fontFamily: tableFontFamily,
        }}
      >
        <Box sx={{ p: 2 }}>
          <Typography
            variant="subtitle1"
            sx={{ fontWeight: 600, mb: 1, color: "text.secondary" }}
          >
            Internet Manager Panel
          </Typography>
          <Divider />
        </Box>

        <TableContainer
          sx={{
            maxHeight: "60vh",
            fontFamily: tableFontFamily,
            userSelect: "none",
          }}
        >
          <Table
            size="small"
            stickyHeader
            sx={{
              "& td, & th": {
                fontFamily: tableFontFamily,
              },
            }}
          >
            <TableHead>
              <TableRow
                sx={{
                  "& th": {
                    backgroundColor: "#004d40",
                  },
                }}
              >
                {renderSortableHeaderCell("Username", "username")}
                {renderSortableHeaderCell("Full Name", "fullname")}
                {renderSortableHeaderCell("City", "city")}
                {renderSortableHeaderCell("Village", "village")}
                {renderSortableHeaderCell("Due Date", "due_date")}
                {renderSortableHeaderCell("Amount", "amount", "right")}
                {renderSortableHeaderCell("Payment", "payment")}
                {renderSortableHeaderCell("Status", "status")}
                <TableCell
                  sx={{
                    fontFamily: tableFontFamily,
                    fontWeight: 700,
                    fontSize: "0.95rem",
                    color: "#fff",
                    whiteSpace: "nowrap",
                    userSelect: "none",
                  }}
                >
                  Invoiced
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredAndSortedRows.length === 0 ? (
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
                filteredAndSortedRows.map((row, index) => (
                  <TableRow
                    key={row.id}
                    hover
                    tabIndex={-1}
                    sx={{
                      backgroundColor:
                        index % 2 === 0 ? "background.paper" : "#f5f5f5",
                      "&:hover": {
                        backgroundColor: "#e0f2f1",
                      },
                      "&:focus": {
                        outline: "none",
                      },
                      cursor: "default",
                    }}
                  >
                    <TableCell
                      sx={{
                        fontSize: "0.9rem",
                        fontWeight: 500,
                      }}
                    >
                      {row.username}
                    </TableCell>
                    <TableCell
                      sx={{
                        fontSize: "0.9rem",
                        fontWeight: 600,
                      }}
                    >
                      {row.fullname}
                    </TableCell>
                    <TableCell sx={{ fontSize: "0.9rem" }}>
                      {row.city}
                    </TableCell>
                    <TableCell sx={{ fontSize: "0.9rem" }}>
                      {row.village}
                    </TableCell>
                    <TableCell sx={{ fontSize: "0.9rem" }}>
                      {row.due_date}
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{ fontSize: "0.9rem", fontWeight: 500 }}
                    >
                      {row.amount.toFixed(2)}
                    </TableCell>
                    <TableCell sx={{ fontSize: "0.9rem" }}>
                      {row.payment === "paid"
                        ? "Paid"
                        : row.payment === "partial"
                        ? "Partial"
                        : "Unpaid"}
                    </TableCell>
                    <TableCell sx={{ fontSize: "0.9rem" }}>
                      {row.status === "active" ? "Active" : "Stopped"}
                    </TableCell>
                    <TableCell sx={{ fontSize: "0.9rem" }}>
                      {row.invoiced ? "Yes" : "No"}
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
