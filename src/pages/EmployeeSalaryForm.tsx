import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Paper,
  Typography,
  Stack,
  TextField,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  Button,
  TableSortLabel,
  Divider,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  IconButton,
  Tooltip,
} from "@mui/material";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import DownloadIcon from "@mui/icons-material/Download";
import DeleteIcon from "@mui/icons-material/Delete";
import axios from "axios";
import * as XLSX from "xlsx";

const API_BASE_URL = "http://127.0.0.1:5100";

// ⚠️ Replace with your real USD↔LBP rate or pass as prop
const USD_RATE = 90000;

type Currency = "USD" | "LBP";

// Safely read env and map to Currency with fallback
const getCurrencyEnv = (key: string, fallback: Currency): Currency => {
  try {
    const val =
      typeof process !== "undefined" && process.env
        ? process.env[key]
        : undefined;

    if (val === "USD" || val === "LBP") {
      return val;
    }
    return fallback;
  } catch {
    return fallback;
  }
};

type Employee = {
  id: number;
  fullname: string;
  mobile: string;
  username: string;
  city: string;
  village: string;
  street: string;
  building: string;
  floor: string;
  type: string;

  salary_amount?: number;
  payment_method?: string;
  net_amount?: number;
  currency?: Currency;
};

type Order = "asc" | "desc";

type SortKey =
  | "username"
  | "fullname"
  | "salary_amount"
  | "payment_method"
  | "net_amount";

const tableFontFamily =
  '"Segoe UI", "Roboto", "Helvetica Neue", Arial, sans-serif';

// Base currencies from .env
const CURR_BASE1: Currency = getCurrencyEnv("REACT_APP_CURR_BASE1", "USD");
const CURR_BASE2: Currency = getCurrencyEnv("REACT_APP_CURR_BASE2", "LBP");

// helper: default YYYY-MM
const getCurrentMonthYYYYMM = () => {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${yyyy}-${mm}`;
};

// Simple conversion helper
const convertAmount = (
  amount: number,
  from: Currency,
  to: Currency,
  rate: number = USD_RATE
): number => {
  if (from === to) return amount;
  if (from === "USD" && to === "LBP") return amount * rate;
  if (from === "LBP" && to === "USD") return amount / rate;
  return amount;
};

// Extra rows added via dialog
type ExtraSalaryRow = {
  id: number;
  employeeId: number;
  amount: number;
  netAmount: number;
  currency: Currency;
  date: string;
};

const EmployeeSalaryForm: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [nameFilter, setNameFilter] = useState("");
  const [mobileFilter, setMobileFilter] = useState("");
  const [addressFilter, setAddressFilter] = useState("");

  // Month/year used both to load data and to save salary rows
  const [salaryMonthFilter, setSalaryMonthFilter] = useState<string>(
    getCurrentMonthYYYYMM
  );

  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [order, setOrder] = useState<Order>("asc");
  const [orderBy, setOrderBy] = useState<SortKey>("fullname");

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Extra child rows per employee (UI only)
  const [extraRows, setExtraRows] = useState<
    Record<number, ExtraSalaryRow[]>
  >({});

  // Dialog for adding extra salary row
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogEmployee, setDialogEmployee] = useState<Employee | null>(null);
  const [dialogAmount, setDialogAmount] = useState<string>("");
  const [dialogNet, setDialogNet] = useState<string>("");
  const [dialogDate, setDialogDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [dialogCurrency, setDialogCurrency] = useState<Currency>(CURR_BASE1);

  // ---- Load employees (with salary info) from API ----
  const loadEmployees = async (monthYYYYMM?: string) => {
    try {
      const params: Record<string, string> = {};

      if (monthYYYYMM) {
        params.salary_month = `${monthYYYYMM}-01`;
      }

      const res = await axios.get(`${API_BASE_URL}/api/employees-with-salary`, {
        params,
      });
      const apiData = res.data as any[];

      const mapped: Employee[] = apiData.map((row) => ({
        id: row.id,
        fullname: row.fullname,
        mobile: row.mobile,
        username: row.username,
        city: row.city ?? "",
        village: row.village ?? "",
        street: row.street ?? "",
        building: row.building ?? "",
        floor: row.floor ?? "",
        type: row.type ?? "",
        salary_amount:
          typeof row.salary_amount === "number"
            ? row.salary_amount
            : typeof row.base_salary === "number"
            ? row.base_salary
            : row.salary_amount ?? row.base_salary ?? undefined,
        payment_method:
          row.payment_method ?? row.payment_method ?? row.payment ?? undefined,
        net_amount:
          typeof row.net_amount === "number"
            ? row.net_amount
            : typeof row.net_salary === "number"
            ? row.net_salary
            : row.net_amount ?? row.net_salary ?? undefined,
        currency: (row.currency as Currency) ?? "LBP",
      }));

      setEmployees(mapped);
    } catch (e) {
      console.warn("Could not load employees from API.", e);
    }
  };

  // Initial load + reload when month changes
  useEffect(() => {
    loadEmployees(salaryMonthFilter);
  }, [salaryMonthFilter]);

  const handleRequestSort = (property: SortKey) => {
    const isAsc = orderBy === property && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(property);
  };

  const filteredAndSortedEmployees = useMemo(() => {
    const filtered = employees.filter((e) => {
      const nameMatch =
        !nameFilter ||
        e.fullname.toLowerCase().includes(nameFilter.toLowerCase()) ||
        e.username.toLowerCase().includes(nameFilter.toLowerCase());

      const mobileMatch =
        !mobileFilter ||
        e.mobile.toLowerCase().includes(mobileFilter.toLowerCase());

      const addressCombined = `${e.city} ${e.village} ${e.street} ${e.building} ${e.floor}`;
      const addressMatch =
        !addressFilter ||
        addressCombined.toLowerCase().includes(addressFilter.toLowerCase());

      return nameMatch && mobileMatch && addressMatch;
    });

    return [...filtered].sort((a, b) => {
      const aRaw = a[orderBy] as any;
      const bRaw = b[orderBy] as any;

      if (orderBy === "salary_amount" || orderBy === "net_amount") {
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
  }, [employees, nameFilter, mobileFilter, addressFilter, order, orderBy]);

  // ---- Helper: save any salary field to backend (including net_amount) ----
  const saveSalaryField = async (
    emp: Employee,
    field: "salary_amount" | "currency" | "net_amount",
    value: string
  ) => {
    setError(null);

    const monthYYYYMM = salaryMonthFilter || getCurrentMonthYYYYMM();
    const salaryMonthDate = `${monthYYYYMM}-01`;

    const payload = {
      employee_username: emp.username,
      salary_month: salaryMonthDate,
      field,
      value,
    };

    try {
      await axios.post(
        `${API_BASE_URL}/api/employee-salaries/inline-update`,
        payload
      );
    } catch (err: any) {
      console.error("Failed to update salary inline", err);
      const apiError = err?.response?.data?.error;
      setError(apiError || "Failed to update salary.");
    }
  };

  // ---- Local inline edit ONLY for salary_amount ----
  const handleSalaryFieldChange = (id: number, value: string) => {
    setEmployees((prev) =>
      prev.map((emp) =>
        emp.id === id
          ? {
              ...emp,
              salary_amount: value === "" ? undefined : Number(value),
            }
          : emp
      )
    );
  };

  // On blur / Enter: save salary and update net_amount as well
  const handleSalaryFieldBlur = async (emp: Employee, value: string) => {
    if (value === "") {
      return;
    }
    const num = Number(value);
    if (Number.isNaN(num)) {
      setError("Salary amount must be a valid number.");
      return;
    }

    setEmployees((prev) =>
      prev.map((e) =>
        e.id === emp.id
          ? {
              ...e,
              salary_amount: num,
              net_amount: num,
            }
          : e
      )
    );

    await saveSalaryField(emp, "salary_amount", value);
    await saveSalaryField(emp, "net_amount", value);
  };

  // ---- Toggle currency per row (USD / LBP) + convert amount ----
  const handleToggleCurrency = async (emp: Employee) => {
    const currentCurrency: Currency = emp.currency ?? "LBP";
    const targetCurrency: Currency =
      currentCurrency === "USD" ? "LBP" : "USD";

    let newAmount = emp.salary_amount;

    if (emp.salary_amount != null) {
      newAmount = convertAmount(
        emp.salary_amount,
        currentCurrency,
        targetCurrency
      );
    }

    setEmployees((prev) =>
      prev.map((e) =>
        e.id === emp.id
          ? {
              ...e,
              currency: targetCurrency,
              salary_amount: newAmount,
              net_amount:
                e.net_amount != null
                  ? convertAmount(e.net_amount, currentCurrency, targetCurrency)
                  : e.net_amount,
            }
          : e
      )
    );

    await saveSalaryField(emp, "currency", targetCurrency);

    if (newAmount != null) {
      await saveSalaryField(emp, "salary_amount", newAmount.toString());
      await saveSalaryField(emp, "net_amount", newAmount.toString());
    }
  };

  // ---- Double click row: open dialog to add extra row ----
  const handleRowDoubleClick = (emp: Employee) => {
    setDialogEmployee(emp);
    const defaultAmount = emp.salary_amount ?? 0;
    const defaultNet = emp.net_amount ?? defaultAmount;

    setDialogAmount(defaultAmount ? defaultAmount.toString() : "");
    setDialogNet(defaultNet ? defaultNet.toString() : "");
    setDialogDate(new Date().toISOString().slice(0, 10));
    setDialogCurrency(emp.currency ?? CURR_BASE1);
    setOpenDialog(true);
  };

  const handleDialogAmountChange = (value: string) => {
    // Amount change also updates net amount
    setDialogAmount(value);
    if (value === "") {
      setDialogNet("");
      return;
    }
    const num = Number(value);
    if (!Number.isNaN(num)) {
      setDialogNet(value); // net = amount (simple 1:1)
    }
  };

  const handleDialogAdd = () => {
    if (!dialogEmployee) return;

    const amountNum = Number(dialogAmount);
    const netNum = Number(dialogNet);

    if (Number.isNaN(amountNum) || Number.isNaN(netNum)) {
      setError("Amount and net salary must be valid numbers.");
      return;
    }

    const empId = dialogEmployee.id;

    // Create extra child row (stored in its own currency)
    const row: ExtraSalaryRow = {
      id: Date.now(),
      employeeId: empId,
      amount: amountNum,
      netAmount: netNum,
      currency: dialogCurrency,
      date: dialogDate,
    };

    setExtraRows((prev) => ({
      ...prev,
      [empId]: [...(prev[empId] || []), row],
    }));

    // ---- Update net amount in primary row ----
    const baseCurrency: Currency =
      dialogEmployee.currency ?? CURR_BASE1;

    const netInBase = convertAmount(netNum, dialogCurrency, baseCurrency);

    setEmployees((prev) =>
      prev.map((e) =>
        e.id === empId
          ? {
              ...e,
              net_amount: (e.net_amount ?? 0) + netInBase,
            }
          : e
      )
    );

    setOpenDialog(false);
  };

  const handleDialogClose = () => {
    setOpenDialog(false);
  };

  // ---- Delete extra row ----
  const handleDeleteExtraRow = (empId: number, rowId: number) => {
    setExtraRows((prev) => {
      const rows = prev[empId] || [];
      const rowToDelete = rows.find((r) => r.id === rowId);
      if (!rowToDelete) return prev;

      const updatedRows = rows.filter((r) => r.id !== rowId);

      // Adjust primary net_amount by subtracting this extra's net in base currency
      setEmployees((prevEmps) =>
        prevEmps.map((e) => {
          if (e.id !== empId) return e;

          const baseCurrency: Currency = e.currency ?? CURR_BASE1;
          const netInBase = convertAmount(
            rowToDelete.netAmount,
            rowToDelete.currency,
            baseCurrency
          );

          return {
            ...e,
            net_amount: (e.net_amount ?? 0) - netInBase,
          };
        })
      );

      return {
        ...prev,
        [empId]: updatedRows,
      };
    });
  };

  // ---- Import Excel ----
  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      await axios.post(
        `${API_BASE_URL}/api/employees/import-excel`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      await loadEmployees(salaryMonthFilter);
    } catch (err: any) {
      const apiError = err?.response?.data?.error;
      setError(apiError || "Failed to import Excel file.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // ---- Export Excel ----
  const handleExportExcel = () => {
    if (!filteredAndSortedEmployees.length) return;

    const exportData = filteredAndSortedEmployees.map((e) => {
      const baseCurrency = e.currency ?? CURR_BASE1;

      const netBase1 =
        e.net_amount != null
          ? convertAmount(e.net_amount, baseCurrency, CURR_BASE1)
          : null;
      const netBase2 =
        e.net_amount != null
          ? convertAmount(e.net_amount, baseCurrency, CURR_BASE2)
          : null;

      return {
        Username: e.username,
        "Full Name": e.fullname,
        "Salary Amount": e.salary_amount ?? "",
        Currency: e.currency ?? "LBP",
        Payment: e.payment_method ?? "",
        [`Net Amount (${CURR_BASE1})`]: netBase1 ?? "",
        [`Net Amount (${CURR_BASE2})`]: netBase2 ?? "",
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Employee Salaries");
    XLSX.writeFile(workbook, "employee_salaries.xlsx");
  };

  const renderSortableHeaderCell = (label: string, property: SortKey) => (
    <TableCell
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
            Employee Salaries
          </Typography>
          <Typography
            variant="body2"
            sx={{ opacity: 0.9, fontFamily: tableFontFamily }}
          >
            View and sync employee salary records with your database.
          </Typography>
        </Box>

        <Stack direction="row" spacing={1.5} alignItems="center">
          <input
            type="file"
            accept=".xlsx,.xls"
            ref={fileInputRef}
            style={{ display: "none" }}
            onChange={handleFileChange}
          />
          <Button
            variant="contained"
            size="small"
            startIcon={<UploadFileIcon />}
            onClick={handleImportClick}
            disabled={uploading}
            sx={{
              textTransform: "none",
              fontWeight: 600,
              fontFamily: tableFontFamily,
              backgroundColor: "#ffffff",
              color: "#00695c",
              "&:hover": {
                backgroundColor: "#e0f2f1",
              },
            }}
          >
            {uploading ? "Importing..." : "Import from Excel"}
          </Button>

          <Button
            variant="outlined"
            size="small"
            startIcon={<DownloadIcon />}
            onClick={handleExportExcel}
            disabled={!filteredAndSortedEmployees.length}
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
            Export to Excel
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
            Type to narrow down results. Export respects your filters.
          </Typography>
        </Stack>

        <Divider sx={{ mb: 2 }} />

        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={2}
          alignItems={{ xs: "stretch", md: "flex-end" }}
        >
          <TextField
            label="Name / Username"
            variant="outlined"
            size="small"
            fullWidth
            value={nameFilter}
            onChange={(e) => setNameFilter(e.target.value)}
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
          <TextField
            label="Mobile"
            variant="outlined"
            size="small"
            fullWidth
            value={mobileFilter}
            onChange={(e) => setMobileFilter(e.target.value)}
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
          <TextField
            label="Address / Floor / Type"
            variant="outlined"
            size="small"
            fullWidth
            value={addressFilter}
            onChange={(e) => setAddressFilter(e.target.value)}
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

          {/* Month/year filter for salary data */}
          <TextField
            label="Salary Month"
            variant="outlined"
            size="small"
            fullWidth
            type="month"
            value={salaryMonthFilter}
            onChange={(e) => setSalaryMonthFilter(e.target.value)}
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
        </Stack>
      </Paper>

      {/* Table */}
      <Paper
        sx={{
          borderRadius: 2,
          boxShadow: 3,
          overflow: "hidden",
        }}
      >
        <TableContainer
          sx={{
            maxHeight: "65vh",
            fontFamily: tableFontFamily,
            userSelect: "none",
          }}
        >
          <Table
            stickyHeader
            size="small"
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
                {renderSortableHeaderCell("Salary Amount", "salary_amount")}
                {renderSortableHeaderCell("Payment", "payment_method")}
                {renderSortableHeaderCell(
                  `Net Amount (${CURR_BASE1})`,
                  "net_amount"
                )}
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
                  {`Net Amount (${CURR_BASE2})`}
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredAndSortedEmployees.length === 0 ? (
                <TableRow tabIndex={-1}>
                  <TableCell colSpan={6} align="center">
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ fontFamily: tableFontFamily }}
                    >
                      No employees found.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredAndSortedEmployees.map((e, index) => {
                  const baseCurrency = e.currency ?? CURR_BASE1;

                  const netBase1 =
                    e.net_amount != null
                      ? convertAmount(
                          e.net_amount,
                          baseCurrency,
                          CURR_BASE1
                        )
                      : null;
                  const netBase2 =
                    e.net_amount != null
                      ? convertAmount(
                          e.net_amount,
                          baseCurrency,
                          CURR_BASE2
                        )
                      : null;

                  const childRows = extraRows[e.id] || [];

                  return (
                    <React.Fragment key={e.id}>
                      <TableRow
                        tabIndex={-1}
                        hover
                        onDoubleClick={() => handleRowDoubleClick(e)}
                        sx={{
                          backgroundColor:
                            index % 2 === 0
                              ? "background.paper"
                              : "#f5f5f5",
                          "&:hover": {
                            backgroundColor: "#e0f2f1",
                          },
                          "&:focus": {
                            outline: "none",
                          },
                          cursor: "pointer",
                        }}
                      >
                        <TableCell
                          sx={{
                            fontSize: "0.9rem",
                            fontWeight: 500,
                          }}
                        >
                          {e.username}
                        </TableCell>
                        <TableCell
                          sx={{
                            fontSize: "0.9rem",
                            fontWeight: 600,
                          }}
                        >
                          {e.fullname}
                        </TableCell>

                        {/* Editable salary_amount + USD/LBP switch */}
                        <TableCell
                          sx={{
                            fontSize: "0.9rem",
                            fontWeight: 500,
                          }}
                        >
                          <TextField
                            variant="outlined"
                            size="small"
                            type="number"
                            value={
                              e.salary_amount != null
                                ? e.salary_amount.toString()
                                : ""
                            }
                            onChange={(ev) =>
                              handleSalaryFieldChange(e.id, ev.target.value)
                            }
                            onBlur={(ev) =>
                              handleSalaryFieldBlur(e, ev.target.value)
                            }
                            onKeyDown={(ev) => {
                              if (ev.key === "Enter") {
                                ev.preventDefault();
                                const value = (ev.target as HTMLInputElement)
                                  .value;
                                handleSalaryFieldBlur(e, value);
                              }
                            }}
                            InputProps={{
                              endAdornment: (
                                <InputAdornment position="end">
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    sx={{
                                      ml: 1,
                                      textTransform: "none",
                                      borderRadius: 2,
                                      px: 1.5,
                                      py: 0.2,
                                      fontSize: "0.75rem",
                                      borderColor: "#009688",
                                      color: "#00695c",
                                    }}
                                    onClick={() => handleToggleCurrency(e)}
                                  >
                                    {/* show CURRENT currency */}
                                    {e.currency ?? "LBP"}
                                  </Button>
                                </InputAdornment>
                              ),
                              style: {
                                fontFamily: tableFontFamily,
                                fontSize: "0.85rem",
                                textAlign: "right",
                              },
                            }}
                          />
                        </TableCell>

                        {/* READ-ONLY payment_method */}
                        <TableCell
                          sx={{
                            fontSize: "0.9rem",
                            fontWeight: 500,
                            textTransform: "capitalize",
                          }}
                        >
                          {e.payment_method ?? ""}
                        </TableCell>

                        {/* READ-ONLY net_amount in CURR_BASE1 */}
                        <TableCell
                          sx={{
                            fontSize: "0.9rem",
                            fontWeight: 500,
                          }}
                        >
                          {netBase1 != null ? netBase1.toFixed(2) : ""}
                        </TableCell>

                        {/* READ-ONLY net_amount in CURR_BASE2 */}
                        <TableCell
                          sx={{
                            fontSize: "0.9rem",
                            fontWeight: 500,
                          }}
                        >
                          {netBase2 != null ? netBase2.toFixed(2) : ""}
                        </TableCell>
                      </TableRow>

                      {/* Extra rows added via dialog */}
                      {childRows.map((r) => {
                        const childBase = r.currency;
                        const childNetBase1 = convertAmount(
                          r.netAmount,
                          childBase,
                          CURR_BASE1
                        );
                        const childNetBase2 = convertAmount(
                          r.netAmount,
                          childBase,
                          CURR_BASE2
                        );

                        return (
                          <TableRow
                            key={`${e.id}-extra-${r.id}`}
                            tabIndex={-1}
                            sx={{
                              backgroundColor: "#fffde7",
                              "&:hover": {
                                backgroundColor: "#fff9c4",
                              },
                            }}
                          >
                            <TableCell
                              sx={{
                                fontSize: "0.85rem",
                                fontStyle: "italic",
                              }}
                            >
                              ↳ {e.username}
                            </TableCell>
                            <TableCell
                              sx={{
                                fontSize: "0.85rem",
                                fontStyle: "italic",
                              }}
                            >
                              Extra salary ({r.date})
                            </TableCell>
                            <TableCell
                              sx={{
                                fontSize: "0.85rem",
                              }}
                            >
                              {r.amount.toFixed(2)} {r.currency}
                            </TableCell>
                            <TableCell
                              sx={{
                                fontSize: "0.85rem",
                                fontStyle: "italic",
                              }}
                            >
                              Extra
                            </TableCell>
                            <TableCell
                              sx={{
                                fontSize: "0.85rem",
                              }}
                            >
                              {childNetBase1.toFixed(2)}
                            </TableCell>
                            <TableCell
                              sx={{
                                fontSize: "0.85rem",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                gap: 1,
                              }}
                            >
                              <span>{childNetBase2.toFixed(2)}</span>
                              <Tooltip title="Delete extra row">
                                <IconButton
                                  size="small"
                                  onClick={() =>
                                    handleDeleteExtraRow(e.id, r.id)
                                  }
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </React.Fragment>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Dialog to add extra row */}
      <Dialog
        open={openDialog}
        onClose={handleDialogClose}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            p: 1,
            bgcolor: "#fafafa",
          },
        }}
      >
        <DialogTitle
          sx={{
            fontFamily: tableFontFamily,
            fontWeight: 700,
            fontSize: "1.2rem",
            pb: 1.5,
          }}
        >
          Add Salary Entry
        </DialogTitle>
        <DialogContent sx={{ mt: 1 }}>
          <Stack spacing={2}>
            <Typography
              variant="body2"
              sx={{
                fontFamily: tableFontFamily,
                mb: 1,
              }}
            >
              {dialogEmployee
                ? `Employee: ${dialogEmployee.fullname} (${dialogEmployee.username})`
                : ""}
            </Typography>

            <TextField
              label="Amount"
              type="number"
              size="small"
              fullWidth
              value={dialogAmount}
              onChange={(e) => handleDialogAmountChange(e.target.value)}
              InputProps={{
                sx: {
                  fontFamily: tableFontFamily,
                },
              }}
              InputLabelProps={{
                sx: {
                  fontFamily: tableFontFamily,
                },
              }}
            />

            <TextField
              label="Net Salary"
              type="number"
              size="small"
              fullWidth
              value={dialogNet}
              onChange={(e) => setDialogNet(e.target.value)}
              InputProps={{
                sx: {
                  fontFamily: tableFontFamily,
                },
              }}
              InputLabelProps={{
                sx: {
                  fontFamily: tableFontFamily,
                },
              }}
            />

            <TextField
              label="Currency"
              select
              size="small"
              fullWidth
              value={dialogCurrency}
              onChange={(e) => setDialogCurrency(e.target.value as Currency)}
              InputProps={{
                sx: {
                  fontFamily: tableFontFamily,
                },
              }}
              InputLabelProps={{
                sx: {
                  fontFamily: tableFontFamily,
                },
              }}
            >
              <MenuItem value="USD">USD</MenuItem>
              <MenuItem value="LBP">LBP</MenuItem>
            </TextField>

            <TextField
              label="Date"
              type="date"
              size="small"
              fullWidth
              value={dialogDate}
              onChange={(e) => setDialogDate(e.target.value)}
              InputLabelProps={{
                shrink: true,
                sx: {
                  fontFamily: tableFontFamily,
                },
              }}
              InputProps={{
                sx: {
                  fontFamily: tableFontFamily,
                },
              }}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={handleDialogClose}
            sx={{
              textTransform: "none",
              fontFamily: tableFontFamily,
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleDialogAdd}
            sx={{
              textTransform: "none",
              fontFamily: tableFontFamily,
              fontWeight: 600,
            }}
          >
            Add
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default EmployeeSalaryForm;
