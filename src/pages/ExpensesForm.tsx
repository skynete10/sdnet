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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  InputAdornment,
} from "@mui/material";
import { Autocomplete } from "@mui/material";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import DownloadIcon from "@mui/icons-material/Download";
import axios from "axios";
import * as XLSX from "xlsx";

const API_BASE_URL = "http://127.0.0.1:5100";

type Expense = {
  id: number;
  expense_date: string; // YYYY-MM-DD
  category: string;
  description: string;
  amount: number; // stored in LBP in DB
  payment_method: "cash" | "card" | "bank" | "other";
  employee_name: string;
  supplier_name: string;
  receipt_number: string;
  notes: string;
};

type NewExpense = {
  expense_date: string;
  category: string;
  description: string;
  amount: string; // formatted with commas, USD or LBP in UI
  payment_method: "cash" | "card" | "bank" | "other";
  employee_name: string;
  supplier_name: string;
  receipt_number: string;
  notes: string;
};

type FormErrors = Partial<Record<keyof NewExpense, string>>;

type SaveExpensePayload = {
  id?: number;
  expense_date: string;
  category: string;
  description: string;
  amount: number; // always LBP
  payment_method: "cash" | "card" | "bank" | "other";
  employee_name: string;
  supplier_name: string;
  receipt_number: string;
  notes: string;
};

type Order = "asc" | "desc";

type SortKey = keyof Pick<
  Expense,
  | "expense_date"
  | "category"
  | "description"
  | "amount"
  | "payment_method"
  | "employee_name"
  | "supplier_name"
  | "receipt_number"
>;

const tableFontFamily =
  '"Segoe UI", "Roboto", "Helvetica Neue", Arial, sans-serif';

const expenseCategories: string[] = [
  "Internet Subscription",
  "Electricity / Generator",
  "Fuel / Transportation",
  "Rent",
  "Maintenance",
  "Hardware Purchase",
  "Software License",
  "Salaries",
  "Office Supplies",
  "Marketing",
  "Other",
];

const paymentMethods: Array<{
  value: "cash" | "card" | "bank" | "other";
  label: string;
}> = [
  { value: "cash", label: "Cash" },
  { value: "card", label: "Card" },
  { value: "bank", label: "Bank Transfer" },
  { value: "other", label: "Other" },
];

// ---- helpers ----
const normalizeNumberString = (value: string): string =>
  value.replace(/,/g, "").replace(/[^\d.]/g, "");

const formatWithCommas = (value: string, decimals: number = 0): string => {
  if (!value) return "";
  let num = Number(value);
  if (isNaN(num)) return "";
  if (decimals === 0) {
    num = Math.round(num);
    return num.toLocaleString("en-US", { maximumFractionDigits: 0 });
  }
  return num.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

const convertAmount = (
  value: string,
  from: "USD" | "LBP",
  to: "USD" | "LBP",
  usdRate: number
): string => {
  const raw = normalizeNumberString(value);
  const num = Number(raw);
  if (!raw || isNaN(num)) return "";

  if (from === to) return formatWithCommas(raw, to === "USD" ? 2 : 0);

  if (from === "USD" && to === "LBP") {
    const lbp = num * usdRate;
    return formatWithCommas(String(lbp), 0);
  }

  if (from === "LBP" && to === "USD") {
    const usd = num / usdRate;
    return formatWithCommas(String(usd), 2);
  }

  return formatWithCommas(raw, to === "USD" ? 2 : 0);
};

// ---- API helper: save expense ----
const saveExpense = async (data: SaveExpensePayload) => {
  const res = await axios.post(`${API_BASE_URL}/api/expenses/saveexpense`, data);
  return res.data;
};

const ExpensesForm: React.FC = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [searchFilter, setSearchFilter] = useState("");
  const [employeeFilter, setEmployeeFilter] = useState("");
  const [supplierFilter, setSupplierFilter] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [order, setOrder] = useState<Order>("asc");
  const [orderBy, setOrderBy] = useState<SortKey>("expense_date");

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Modal: Add / Edit expense
  const [openModal, setOpenModal] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");
  const [editingId, setEditingId] = useState<number | null>(null);

  const todayStr = new Date().toISOString().slice(0, 10);

  const emptyExpenseForm: NewExpense = {
    expense_date: todayStr,
    category: "",
    description: "",
    amount: "",
    payment_method: "cash",
    employee_name: "",
    supplier_name: "",
    receipt_number: "",
    notes: "",
  };

  const [newExpense, setNewExpense] = useState<NewExpense>(emptyExpenseForm);
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  // Currency UI state
  const [currency, setCurrency] = useState<"USD" | "LBP">("LBP");
  const [usdRate] = useState<number>(90000); // Example: 1 USD = 90,000 LBP

  // For dropdowns
  const [employeeOptions, setEmployeeOptions] = useState<string[]>([]);
  const [supplierOptions, setSupplierOptions] = useState<string[]>([]);

  // ---- load expenses + employees + suppliers ----
  const loadData = async () => {
    try {
      const [expRes, empRes, supRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/expenses`),
        axios.get(`${API_BASE_URL}/api/employees`),
        axios.get(`${API_BASE_URL}/api/suppliers`),
      ]);

      const expData = expRes.data as any[];
      const mappedExpenses: Expense[] = expData.map((row) => ({
        id: row.id,
        expense_date: row.expense_date?.slice(0, 10) || todayStr,
        category: row.category ?? "",
        description: row.description ?? "",
        amount: Number(row.amount ?? 0),
        payment_method: row.payment_method || "cash",
        employee_name: row.employee_name ?? "",
        supplier_name: row.supplier_name ?? "",
        receipt_number: row.receipt_number ?? "",
        notes: row.notes ?? "",
      }));
      setExpenses(mappedExpenses);

      const empData = empRes.data as any[];
      setEmployeeOptions(
        empData.map((e) => e.fullname || e.name).filter((x: string) => !!x)
      );

      const supData = supRes.data as any[];
      setSupplierOptions(
        supData.map((s) => s.name || s.fullname).filter((x: string) => !!x)
      );
    } catch (err) {
      console.warn("Failed loading expenses/employees/suppliers", err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRequestSort = (property: SortKey) => {
    const isAsc = orderBy === property && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(property);
  };

  const filteredAndSortedExpenses = useMemo(() => {
    const filtered = expenses.filter((e) => {
      const text = (
        e.category +
        " " +
        e.description +
        " " +
        e.employee_name +
        " " +
        e.supplier_name +
        " " +
        e.receipt_number
      )
        .toLowerCase()
        .trim();

      const searchMatch =
        !searchFilter ||
        text.includes(searchFilter.toLowerCase().trim());

      const employeeMatch =
        !employeeFilter ||
        e.employee_name
          .toLowerCase()
          .includes(employeeFilter.toLowerCase().trim());

      const supplierMatch =
        !supplierFilter ||
        e.supplier_name
          .toLowerCase()
          .includes(supplierFilter.toLowerCase().trim());

      return searchMatch && employeeMatch && supplierMatch;
    });

    return [...filtered].sort((a, b) => {
      let aVal: string | number = a[orderBy];
      let bVal: string | number = b[orderBy];

      if (typeof aVal === "number" && typeof bVal === "number") {
        return order === "asc" ? aVal - bVal : bVal - aVal;
      }

      aVal = (aVal ?? "").toString().toLowerCase();
      bVal = (bVal ?? "").toString().toLowerCase();
      if (aVal < bVal) return order === "asc" ? -1 : 1;
      if (aVal > bVal) return order === "asc" ? 1 : -1;
      return 0;
    });
  }, [expenses, searchFilter, employeeFilter, supplierFilter, order, orderBy]);

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
        `${API_BASE_URL}/api/expenses/import-excel`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      await loadData();
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
    if (!filteredAndSortedExpenses.length) return;

    const exportData = filteredAndSortedExpenses.map((e) => ({
      Date: e.expense_date,
      Category: e.category,
      Description: e.description,
      Amount_LBP: e.amount,
      Payment_Method: e.payment_method,
      Employee: e.employee_name,
      Supplier: e.supplier_name,
      Receipt: e.receipt_number,
      Notes: e.notes,
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Expenses");
    XLSX.writeFile(workbook, "expenses.xlsx");
  };

  // ---- Validation ----
  const validateForm = (): boolean => {
    const errors: FormErrors = {};

    if (!newExpense.expense_date.trim()) {
      errors.expense_date = "Date is required";
    }
    if (!newExpense.category.trim()) {
      errors.category = "Category is required";
    }
    if (!newExpense.amount.trim()) {
      errors.amount = "Amount is required";
    }
    if (!newExpense.payment_method) {
      errors.payment_method = "Payment method is required";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveExpense = async () => {
    if (!validateForm()) return;

    try {
      const rawAmount = normalizeNumberString(newExpense.amount);
      const num = Number(rawAmount) || 0;

      const normalizedAmountLBP =
        currency === "USD" ? num * usdRate : num;

      const payload: SaveExpensePayload = {
        id: modalMode === "edit" && editingId != null ? editingId : undefined,
        expense_date: newExpense.expense_date,
        category: newExpense.category,
        description: newExpense.description,
        amount: normalizedAmountLBP,
        payment_method: newExpense.payment_method,
        employee_name: newExpense.employee_name,
        supplier_name: newExpense.supplier_name,
        receipt_number: newExpense.receipt_number,
        notes: newExpense.notes,
      };

      await saveExpense(payload);
      setOpenModal(false);
      setNewExpense(emptyExpenseForm);
      setFormErrors({});
      setEditingId(null);
      setCurrency("LBP"); // reset
      await loadData();
    } catch (err) {
      console.error("Failed to save expense", err);
      alert("Failed to save expense");
    }
  };

  // ---- Double-click row to edit ----
  const handleRowDoubleClick = (exp: Expense) => {
    setModalMode("edit");
    setEditingId(exp.id);
    setCurrency("LBP"); // editing assumes DB amount is LBP

    setNewExpense({
      expense_date: exp.expense_date || todayStr,
      category: exp.category,
      description: exp.description,
      amount: formatWithCommas(String(exp.amount), 0),
      payment_method: exp.payment_method || "cash",
      employee_name: exp.employee_name,
      supplier_name: exp.supplier_name,
      receipt_number: exp.receipt_number,
      notes: exp.notes,
    });
    setFormErrors({});
    setOpenModal(true);
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

  const handleFieldChange = (key: keyof NewExpense, value: string) => {
    setNewExpense((prev) => ({ ...prev, [key]: value }));
    setFormErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const handleAmountChange = (value: string) => {
    const raw = normalizeNumberString(value);
    const formatted = formatWithCommas(raw, currency === "USD" ? 2 : 0);
    handleFieldChange("amount", formatted);
  };

  const openAddModal = () => {
    setModalMode("add");
    setEditingId(null);
    setCurrency("LBP");
    setNewExpense({
      ...emptyExpenseForm,
      expense_date: todayStr,
      payment_method: "cash",
    });
    setFormErrors({});
    setOpenModal(true);
  };

  return (
    <Box sx={{ p: 3, display: "flex", flexDirection: "column", gap: 2 }}>
      {/* Header bar – same style as CustomersForm */}
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
            Expenses
          </Typography>
          <Typography
            variant="body2"
            sx={{ opacity: 0.9, fontFamily: tableFontFamily }}
          >
            Manage and sync expenses from Excel with your database.
          </Typography>
        </Box>

        <Stack direction="row" spacing={1.5} alignItems="center">
          <Button
            variant="outlined"
            size="small"
            onClick={openAddModal}
            sx={{
              textTransform: "none",
              fontWeight: 600,
              fontFamily: tableFontFamily,
              borderColor: "#ffffff",
              color: "#ffffff",
              bgcolor: "rgba(255,255,255,0.15)",
              "&:hover": {
                backgroundColor: "rgba(255,255,255,0.25)",
                borderColor: "#fff",
              },
            }}
          >
            + Add New Expense
          </Button>

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
            disabled={!filteredAndSortedExpenses.length}
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

      {/* Filter panel – same style as CustomersForm */}
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
            label="Search (Category / Description / Receipt)"
            variant="outlined"
            size="small"
            fullWidth
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
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
            label="Employee"
            variant="outlined"
            size="small"
            fullWidth
            value={employeeFilter}
            onChange={(e) => setEmployeeFilter(e.target.value)}
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
            label="Supplier"
            variant="outlined"
            size="small"
            fullWidth
            value={supplierFilter}
            onChange={(e) => setSupplierFilter(e.target.value)}
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
      </Paper>

      {/* Table – same style as CustomersForm */}
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
                {renderSortableHeaderCell("Date", "expense_date")}
                {renderSortableHeaderCell("Category", "category")}
                {renderSortableHeaderCell("Description", "description")}
                {renderSortableHeaderCell("Amount (LBP)", "amount")}
                {renderSortableHeaderCell("Payment", "payment_method")}
                {renderSortableHeaderCell("Employee", "employee_name")}
                {renderSortableHeaderCell("Supplier", "supplier_name")}
                {renderSortableHeaderCell("Receipt", "receipt_number")}
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredAndSortedExpenses.length === 0 ? (
                <TableRow tabIndex={-1}>
                  <TableCell colSpan={8} align="center">
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ fontFamily: tableFontFamily }}
                    >
                      No expenses found.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredAndSortedExpenses.map((e, index) => (
                  <TableRow
                    key={e.id}
                    tabIndex={-1}
                    hover
                    onDoubleClick={() => handleRowDoubleClick(e)}
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
                    <TableCell sx={{ fontSize: "0.9rem", fontWeight: 500 }}>
                      {e.expense_date}
                    </TableCell>
                    <TableCell sx={{ fontSize: "0.9rem", fontWeight: 500 }}>
                      {e.category}
                    </TableCell>
                    <TableCell sx={{ fontSize: "0.9rem", fontWeight: 400 }}>
                      {e.description}
                    </TableCell>
                    <TableCell
                      sx={{
                        fontSize: "0.9rem",
                        fontWeight: 600,
                        textAlign: "right",
                      }}
                    >
                      {formatWithCommas(String(e.amount), 0)}
                    </TableCell>
                    <TableCell
                      sx={{
                        fontSize: "0.9rem",
                        fontWeight: 500,
                        textTransform: "capitalize",
                      }}
                    >
                      {e.payment_method}
                    </TableCell>
                    <TableCell sx={{ fontSize: "0.9rem", fontWeight: 500 }}>
                      {e.employee_name}
                    </TableCell>
                    <TableCell sx={{ fontSize: "0.9rem", fontWeight: 500 }}>
                      {e.supplier_name}
                    </TableCell>
                    <TableCell sx={{ fontSize: "0.9rem", fontWeight: 400 }}>
                      {e.receipt_number}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Add / Edit Expense Modal – same style as CustomersForm dialog */}
      <Dialog
        open={openModal}
        onClose={() => setOpenModal(false)}
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
            fontSize: "1.3rem",
            pb: 1.5,
            background:
              "linear-gradient(90deg, #00695c 0%, #00897b 50%, #009688 100%)",
            color: "white",
            borderRadius: "12px 12px 0 0",
          }}
        >
          {modalMode === "add" ? "Add New Expense" : "Edit Expense"}
        </DialogTitle>

        <DialogContent sx={{ mt: 2 }}>
          <Stack spacing={2}>
            {/* Date */}
            <TextField
              label="Date"
              type="date"
              fullWidth
              size="small"
              value={newExpense.expense_date}
              onChange={(e) => handleFieldChange("expense_date", e.target.value)}
              error={!!formErrors.expense_date}
              helperText={formErrors.expense_date || " "}
              InputLabelProps={{
                shrink: true,
                sx: { fontFamily: tableFontFamily },
              }}
              InputProps={{
                sx: { fontFamily: tableFontFamily },
              }}
            />

            {/* Category */}
            <Autocomplete
              options={expenseCategories}
              value={newExpense.category}
              onChange={(_, value) =>
                handleFieldChange("category", value || "")
              }
              freeSolo
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Category"
                  size="small"
                  error={!!formErrors.category}
                  helperText={formErrors.category || " "}
                  InputProps={{
                    ...params.InputProps,
                    sx: { fontFamily: tableFontFamily },
                  }}
                  InputLabelProps={{
                    sx: { fontFamily: tableFontFamily },
                  }}
                />
              )}
            />

            {/* Description */}
            <TextField
              label="Description"
              fullWidth
              size="small"
              multiline
              minRows={2}
              value={newExpense.description}
              onChange={(e) =>
                handleFieldChange("description", e.target.value)
              }
              InputProps={{
                sx: {
                  fontFamily: tableFontFamily,
                },
              }}
              InputLabelProps={{
                sx: { fontFamily: tableFontFamily },
              }}
            />

            {/* Amount with currency toggle */}
            <TextField
              label={`Amount (${currency})`}
              fullWidth
              size="small"
              value={newExpense.amount}
              onChange={(e) => handleAmountChange(e.target.value)}
              error={!!formErrors.amount}
              helperText={formErrors.amount || " "}
              InputProps={{
                sx: {
                  fontFamily: tableFontFamily,
                },
                inputMode: "decimal",
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
                      onClick={() => {
                        const targetCurrency =
                          currency === "USD" ? "LBP" : "USD";
                        const converted = convertAmount(
                          newExpense.amount,
                          currency,
                          targetCurrency,
                          usdRate
                        );
                        setCurrency(targetCurrency);
                        handleFieldChange("amount", converted);
                      }}
                    >
                      {currency === "USD" ? "LBP" : "USD"}
                    </Button>
                  </InputAdornment>
                ),
              }}
              InputLabelProps={{
                sx: { fontFamily: tableFontFamily },
              }}
            />

            {/* Payment method */}
            <TextField
              label="Payment Method"
              fullWidth
              size="small"
              select
              value={newExpense.payment_method}
              onChange={(e) =>
                handleFieldChange(
                  "payment_method",
                  e.target.value as NewExpense["payment_method"]
                )
              }
              error={!!formErrors.payment_method}
              helperText={formErrors.payment_method || " "}
              InputProps={{
                sx: { fontFamily: tableFontFamily },
              }}
              InputLabelProps={{
                sx: { fontFamily: tableFontFamily },
              }}
            >
              {paymentMethods.map((pm) => (
                <MenuItem key={pm.value} value={pm.value}>
                  {pm.label}
                </MenuItem>
              ))}
            </TextField>

            {/* Employee */}
            <Autocomplete
              options={employeeOptions}
              value={newExpense.employee_name}
              onChange={(_, value) =>
                handleFieldChange("employee_name", value || "")
              }
              freeSolo
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Employee"
                  size="small"
                  InputProps={{
                    ...params.InputProps,
                    sx: { fontFamily: tableFontFamily },
                  }}
                  InputLabelProps={{
                    sx: { fontFamily: tableFontFamily },
                  }}
                />
              )}
            />

            {/* Supplier */}
            <Autocomplete
              options={supplierOptions}
              value={newExpense.supplier_name}
              onChange={(_, value) =>
                handleFieldChange("supplier_name", value || "")
              }
              freeSolo
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Supplier"
                  size="small"
                  InputProps={{
                    ...params.InputProps,
                    sx: { fontFamily: tableFontFamily },
                  }}
                  InputLabelProps={{
                    sx: { fontFamily: tableFontFamily },
                  }}
                />
              )}
            />

            {/* Receipt number */}
            <TextField
              label="Receipt Number"
              fullWidth
              size="small"
              value={newExpense.receipt_number}
              onChange={(e) =>
                handleFieldChange("receipt_number", e.target.value)
              }
              InputProps={{
                sx: {
                  fontFamily: tableFontFamily,
                },
              }}
              InputLabelProps={{
                sx: { fontFamily: tableFontFamily },
              }}
            />

            {/* Notes */}
            <TextField
              label="Notes"
              fullWidth
              size="small"
              multiline
              minRows={2}
              value={newExpense.notes}
              onChange={(e) => handleFieldChange("notes", e.target.value)}
              InputProps={{
                sx: {
                  fontFamily: tableFontFamily,
                },
              }}
              InputLabelProps={{
                sx: { fontFamily: tableFontFamily },
              }}
            />
          </Stack>
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={() => {
              setOpenModal(false);
              setNewExpense(emptyExpenseForm);
              setFormErrors({});
              setEditingId(null);
              setCurrency("LBP");
            }}
            sx={{
              textTransform: "none",
              fontFamily: tableFontFamily,
              color: "#555",
            }}
          >
            Cancel
          </Button>

          <Button
            variant="contained"
            onClick={handleSaveExpense}
            sx={{
              textTransform: "none",
              fontWeight: 600,
              fontFamily: tableFontFamily,
              bgcolor: "#00897b",
              "&:hover": { bgcolor: "#00796b" },
            }}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ExpensesForm;
