import React, { useEffect, useMemo, useState } from "react";
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
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  InputAdornment,
  IconButton,
  Tooltip,
} from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import axios from "axios";
import WishLogo from "../assets/wishmoneylogo.png";

const API_BASE_URL = "http://127.0.0.1:5100";

const tableFontFamily =
  '"Segoe UI", "Roboto", "Helvetica Neue", Arial, sans-serif';

type PaymentStatus = "" | "paid" | "unpaid" | "partial" | "all";

type InternetRecord = {
  id: number;
  username: string;
  fullname: string;
  city: string;
  village: string;
  due_date: string | null;
  amount: number;
  invoiced: boolean;
  invoice_number?: number | null;
  payment: "paid" | "unpaid" | "partial";
  status: "active" | "stopped";
  // 0 => disabled customer, 1 => normal
  customer_status: 0 | 1;
  wish: 0 | 1;
  // employee manager fields
  emp_username?: string;
  emp_fullname?: string;
  emp_manager?: string; // username of manager/employee responsible
};

// 🔹 NOW includes payment_status coming from invoices API
type InvoiceRow = {
  customer_username: string;
  invoice_number: number | null;
  invoiced: 0 | 1;
  payment_status?: "paid" | "unpaid" | "partial" | null;
};

type PaymentRow = {
  id: number;
  payment_date: string;
  amount: number;
  method: string;
};

type EmployeeOption = {
  username: string;
  fullname: string;
};

const getDisabledRowColor = () => "#b71c1c";

type Order = "asc" | "desc";
type SortKey =
  | "username"
  | "fullname"
  | "city"
  | "village"
  | "due_date"
  | "amount"
  | "payment"
  | "status"
  | "invoice_number";

const getCurrentDateValue = (): string => {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
};

const getCurrentMonthValue = (): string => {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${d.getFullYear()}-${m}`;
};

const getCityKey = (city: string): string => {
  if (!city) return "";
  return city.split(/[-–—]/)[0].trim();
};

// 🌈 row background color by payment status
const getPaymentRowColor = (payment: InternetRecord["payment"]) => {
  switch (payment) {
    case "paid":
      return "#e8f5e9"; // light green
    case "partial":
      return "#fffde7"; // light yellow
    case "unpaid":
    default:
      return "#ffebee"; // light red
  }
};

const InternnetManagerForm: React.FC = () => {
  const [rows, setRows] = useState<InternetRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [draftFilterDate, setDraftFilterDate] = useState<string>(() =>
    getCurrentMonthValue()
  );
  const [filterDate, setFilterDate] = useState<string>("");

  const [selectedAddresses, setSelectedAddresses] = useState<string[]>([]);
  const [isActive, setIsActive] = useState<boolean>(true);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("all");
  const [searchName, setSearchName] = useState<string>("");

  const [order, setOrder] = useState<Order>("asc");
  const [orderBy, setOrderBy] = useState<SortKey>("username");

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const [openPayModal, setOpenPayModal] = useState(false);
  const [activeRow, setActiveRow] = useState<InternetRecord | null>(null);

  const [modalAmount, setModalAmount] = useState<string>("");
  const [modalDeduction, setModalDeduction] = useState<string>("0");
  const [modalNetAmount, setModalNetAmount] = useState<string>("0");

  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);

  const [newPayAmount, setNewPayAmount] = useState<string>("");
  const [newPayDate, setNewPayDate] = useState<string>(() =>
    getCurrentDateValue()
  );
  const [newPayMethod, setNewPayMethod] = useState<string>("cash");

  const [invoicesByUser, setInvoicesByUser] = useState<
    Record<string, InvoiceRow>
  >({});

  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<string>(""); // username (emp_manager)

  // 🔹 Merge invoices into base rows INCLUDING payment from payment_status
  const mergeInvoicesIntoRows = (
    baseRows: InternetRecord[],
    invMap: Record<string, InvoiceRow>
  ) =>
    baseRows.map((r) => {
      const inv = invMap[r.username];
      if (!inv) return r;

      // decide payment field based on payment_status from invoices
      let payment: InternetRecord["payment"] = "unpaid";
      if (inv.payment_status === "paid") payment = "paid";
      else if (inv.payment_status === "partial") payment = "partial";

      return {
        ...r,
        invoiced: inv.invoiced === 1,
        invoice_number: inv.invoice_number,
        payment, // 🔥 override payment from invoices.payment_status
      };
    });

  const loadInternetCustomers = async (
    invMap?: Record<string, InvoiceRow>
  ) => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(
        `${API_BASE_URL}/api/internet-manager/customers`
      );
      const apiData = Array.isArray(res.data) ? res.data : [];

      const mapped: InternetRecord[] = apiData.map((r: any) => {
        const due =
          r?.due_date && typeof r.due_date === "string"
            ? r.due_date.slice(0, 10)
            : null;

        return {
          id: Number(r.id),
          username: r.username ?? "",
          fullname: r.fullname ?? "",
          city: r.city ?? "",
          village: r.village ?? "",
          due_date: due,
          amount:
            typeof r.amount === "number" ? r.amount : Number(r.amount ?? 0),
          // default payment (will be overridden by invoices if available)
          payment:
            r.payment === "paid" || r.payment === "partial"
              ? r.payment
              : "unpaid",
          status: r.status === "stopped" ? "stopped" : "active",
          invoiced: Boolean(r.invoiced),
          invoice_number: r.invoice_number ?? null,
          customer_status:
            typeof r.customer_status === "number"
              ? (r.customer_status as 0 | 1)
              : ((Number(r.customer_status ?? 1) || 1) as 0 | 1),

          // normalize wish to 0 | 1
          wish:
            typeof r.wish === "number"
              ? ((r.wish ? 1 : 0) as 0 | 1)
              : ((Number(r.wish ?? 0) ? 1 : 0) as 0 | 1),

          // employee manager fields from backend
          emp_username:
            r.emp_username ?? r.employee_username ?? r.manager_username ?? "",
          emp_fullname:
            r.emp_fullname ??
            r.employee_fullname ??
            r.manager_fullname ??
            "",
          emp_manager: r.emp_manager ?? r.emp_username ?? r.employee_username ?? "",
        };
      });

      const merged = invMap ? mergeInvoicesIntoRows(mapped, invMap) : mapped;

      setRows(merged);
      setSelectedIds(new Set());
    } catch (e: any) {
      setError(e?.response?.data?.error || "Failed to load data");
      setRows([]);
      setSelectedIds(new Set());
    } finally {
      setLoading(false);
    }
  };

  const isNetZero = useMemo(
    () => Number(modalNetAmount || "0") <= 0,
    [modalNetAmount]
  );

  const loadInvoicesForMonth = async (month: string) => {
    if (!month) {
      setInvoicesByUser({});
      return;
    }

    try {
      const res = await axios.get(
        `${API_BASE_URL}/api/internet-manager/invoices`,
        { params: { month } }
      );

      const apiData: any[] = Array.isArray(res.data) ? res.data : [];
      const map: Record<string, InvoiceRow> = {};

      apiData.forEach((x) => {
        if (x.customer_username) {
          map[x.customer_username] = {
            customer_username: x.customer_username,
            invoice_number: x.invoice_number ?? null,
            invoiced: x.invoiced === 1 ? 1 : 0,
            // 🔹 read payment_status from API
            payment_status: x.payment_status ?? null,
          };
        }
      });

      setInvoicesByUser(map);
      // 🔹 merge into existing rows so payment column gets updated from invoices
      setRows((prev) => mergeInvoicesIntoRows(prev, map));
    } catch {
      setInvoicesByUser({});
    }
  };

  const loadPaymentsForInvoice = async (
    invoiceNumber: number,
    invoiceMonth?: string
  ) => {
    setPaymentsLoading(true);
    try {
      const res = await axios.get(
        `${API_BASE_URL}/api/internet-manager/payments`,
        {
          params: {
            invoice_number: invoiceNumber,
            invoice_month: invoiceMonth || undefined,
          },
        }
      );
      const apiData = Array.isArray(res.data) ? res.data : [];
      const mapped: PaymentRow[] = apiData.map((p: any, i: number) => ({
        id: Number(p.id ?? i + 1),
        payment_date:
          typeof p.payment_date === "string"
            ? p.payment_date.slice(0, 10)
            : "",
        amount:
          typeof p.amount === "number" ? p.amount : Number(p.amount ?? 0),
        method: p.method ?? "",
      }));
      setPayments(mapped);
    } catch {
      setPayments([]);
    } finally {
      setPaymentsLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      const m = getCurrentMonthValue();
      setDraftFilterDate(m);
      setFilterDate(m);
      await loadInternetCustomers();
      await loadInvoicesForMonth(m);

      // load employees for filter
      try {
        const res = await axios.get(`${API_BASE_URL}/api/employees`);
        const apiData = Array.isArray(res.data) ? res.data : [];
        const mapped: EmployeeOption[] = apiData.map((row: any) => ({
          username: row.username ?? "",
          fullname: row.fullname ?? "",
        }));
        setEmployees(mapped);
      } catch (e) {
        console.warn("Could not load employees list", e);
      }
    })();
  }, []);

  const ADDRESS_OPTIONS = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => {
      const key = getCityKey(r.city || "");
      if (key) set.add(key);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, "ar"));
  }, [rows]);

  const handleApplyDateFilter = async () => {
    setFilterDate(draftFilterDate);
    setSelectedIds(new Set());
    await loadInternetCustomers();
    await loadInvoicesForMonth(draftFilterDate);
  };

  const handleClearFilters = () => {
    const thisMonth = getCurrentMonthValue();

    setDraftFilterDate(thisMonth);
    setFilterDate("");

    setSelectedAddresses([]);
    setIsActive(true);
    setPaymentStatus("all");
    setSearchName("");
    setSelectedEmployee("");

    setSelectedIds(new Set());
    setInvoicesByUser({});

    // reload customers with no extra filters
    loadInternetCustomers();
  };

  const handleRequestSort = (property: SortKey) => {
    const isAsc = orderBy === property && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(property);
  };

  const filteredAndSortedRows = useMemo(() => {
    const filtered = rows.filter((row) => {
      const nameMatch =
        !searchName ||
        row.fullname.toLowerCase().includes(searchName.toLowerCase()) ||
        row.username.toLowerCase().includes(searchName.toLowerCase());

      const cityKey = getCityKey(row.city || "");
      const addressMatch =
        selectedAddresses.length === 0 ||
        selectedAddresses.includes(cityKey);

      const statusFilter = isActive ? "active" : "stopped";
      const statusMatch = row.status === statusFilter;

      const paymentMatch =
        paymentStatus === "" ||
        paymentStatus === "all" ||
        row.payment === paymentStatus;

      // employee filter (by emp_manager username)
      const employeeMatch =
        !selectedEmployee || row.emp_manager === selectedEmployee;

      return (
        nameMatch &&
        addressMatch &&
        statusMatch &&
        paymentMatch &&
        employeeMatch
      );
    });

    return [...filtered].sort((a, b) => {
      const aRaw = a[orderBy] as any;
      const bRaw = b[orderBy] as any;

      if (orderBy === "amount" || orderBy === "invoice_number") {
        const aNum = Number(aRaw ?? 0);
        const bNum = Number(bRaw ?? 0);
        if (aNum < bNum) return order === "asc" ? -1 : 1;
        if (aNum > bNum) return order === "asc" ? 1 : -1;
        return 0;
      }

      if (orderBy === "due_date") {
        const aDate = a.due_date ? new Date(a.due_date).getTime() : 0;
        const bDate = b.due_date ? new Date(b.due_date).getTime() : 0;
        if (aDate < bDate) return order === "asc" ? -1 : 1;
        if (aDate > bDate) return order === "asc" ? 1 : -1;
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
    isActive,
    paymentStatus,
    selectedEmployee,
    order,
    orderBy,
  ]);

  // Only selectable IDs (exclude disabled customers)
  const visibleIds = filteredAndSortedRows
    .filter((r) => r.customer_status !== 0)
    .map((r) => r.id);

  const allVisibleSelected =
    visibleIds.length > 0 &&
    visibleIds.every((id) => selectedIds.has(id));
  const someVisibleSelected =
    visibleIds.some((id) => selectedIds.has(id)) && !allVisibleSelected;

  const handleToggleAllVisible = (checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) visibleIds.forEach((id) => next.add(id));
      else visibleIds.forEach((id) => next.delete(id));
      return next;
    });
  };

  const handleToggleOne = (id: number, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const handleRowDoubleClick = async (row: InternetRecord) => {
    if (row.customer_status === 0) return;

    setActiveRow(row);
    setModalAmount(row.amount.toString());
    setModalDeduction("0");
    setModalNetAmount(row.amount.toString());
    setOpenPayModal(true);

    setNewPayAmount("");
    setNewPayDate(getCurrentDateValue());
    setNewPayMethod("cash");

    const invoiceMonth =
      filterDate || draftFilterDate || getCurrentMonthValue();

    if (row.invoice_number) {
      await loadPaymentsForInvoice(row.invoice_number, invoiceMonth);
    } else {
      setPayments([]);
    }
  };

  // Auto compute Deduction = sum(payments) and Net = Amount − sum(payments)
  useEffect(() => {
    const base = Number(modalAmount || 0);
    const totalPaid = payments.reduce(
      (sum, p) => sum + (p.amount || 0),
      0
    );
    const net = Math.max(base - totalPaid, 0);

    setModalDeduction(totalPaid.toFixed(2));
    setModalNetAmount(net.toFixed(2));
  }, [modalAmount, payments]);

  const handleRemovePayment = async (id: number) => {
    if (!activeRow?.invoice_number) return;

    try {
      await axios.delete(
        `${API_BASE_URL}/api/internet-manager/payments/${id}`
      );

      const invoiceMonth =
        filterDate || draftFilterDate || getCurrentMonthValue();
      await loadPaymentsForInvoice(activeRow.invoice_number, invoiceMonth);
    } catch (e) {
      console.error("Failed to delete payment", e);
    }
  };

  const handleBillingSelected = async () => {
    const selectedRows = rows.filter(
      (r) => selectedIds.has(r.id) && r.customer_status !== 0
    );
    if (selectedRows.length === 0) return;

    setRows((prev) =>
      prev.map((r) =>
        selectedIds.has(r.id) && r.customer_status !== 0
          ? { ...r, invoiced: true }
          : r
      )
    );

    const items = selectedRows.map((r) => ({
      id: r.id,
      customer_username: r.username,
      invoice_number: r.invoice_number ?? null,
      amount: r.amount ?? 0,
    }));

    try {
      await axios.post(`${API_BASE_URL}/api/internet-manager/billing`, {
        items,
      });

      if (filterDate) await loadInvoicesForMonth(filterDate);
    } catch (e) {
      // optional rollback if you want
    }
  };

  const handleInvoiceRow = async (row: InternetRecord) => {
    if (!row || row.customer_status === 0) return;

    setRows((prev) =>
      prev.map((r) =>
        r.id === row.id ? { ...r, invoiced: true } : r
      )
    );

    const items = [
      {
        id: row.id,
        customer_username: row.username,
        invoice_number: row.invoice_number ?? null,
        amount: row.amount ?? 0,
      },
    ];

    try {
      await axios.post(`${API_BASE_URL}/api/internet-manager/billing`, {
        items,
      });
    } catch (e) {
      // optional rollback that single row if needed
    } finally {
      if (filterDate) await loadInvoicesForMonth(filterDate);
    }
  };

  const handlePayInvoiceSelected = async () => {
    const selectedRows = rows.filter(
      (r) => selectedIds.has(r.id) && r.customer_status !== 0
    );
    if (selectedRows.length === 0) return;

    const paymentDate = getCurrentDateValue();

    const items = selectedRows
      .filter((r) => r.invoice_number != null)
      .map((r) => {
        const amount = r.amount ?? 0;
        const payment = amount;
        const net_amount = amount - payment;

        return {
          invoice_number: r.invoice_number,
          payment_date: paymentDate,
          amount,
          payment,
          net_amount,
          currency: "USD",
        };
      });

    if (items.length === 0) return;

    setRows((prev) =>
      prev.map((r) =>
        selectedIds.has(r.id) && r.customer_status !== 0
          ? { ...r, payment: "paid", invoiced: true }
          : r
      )
    );

    try {
      await axios.post(`${API_BASE_URL}/api/internet-manager/pay-invoice`, {
        items,
      });

      if (filterDate) await loadInvoicesForMonth(filterDate);
    } catch (e) {
      // optional: rollback / snackbar
    }
  };

  const handlePayRow = async (row: InternetRecord) => {
    if (!row.invoice_number || row.customer_status === 0) return;

    const paymentDate = getCurrentDateValue();
    const amount = row.amount ?? 0;
    const payment = amount;
    const net_amount = amount - payment;

    const items = [
      {
        invoice_number: row.invoice_number,
        payment_date: paymentDate,
        amount,
        payment,
        net_amount,
        currency: "USD",
      },
    ];

    setRows((prev) =>
      prev.map((r) =>
        r.id === row.id
          ? { ...r, payment: "paid", invoiced: true }
          : r
      )
    );

    try {
      await axios.post(`${API_BASE_URL}/api/internet-manager/pay-invoice`, {
        items,
      });
      if (filterDate) await loadInvoicesForMonth(filterDate);
    } catch (e) {
      // optional rollback that single row
    }
  };

  const handleUndoInvoiceSelected = async () => {
    const ids = rows
      .filter((r) => selectedIds.has(r.id) && r.customer_status !== 0)
      .map((r) => r.id);

    if (ids.length === 0) return;

    setRows((prev) =>
      prev.map((r) =>
        ids.includes(r.id) ? { ...r, invoiced: false } : r
      )
    );

    try {
      await axios.post(`${API_BASE_URL}/api/internet-manager/undo-invoice`, {
        ids,
      });
      if (filterDate) await loadInvoicesForMonth(filterDate);
    } catch {}
  };

  const handleCancelInvoiceSelected = async () => {
    const ids = rows
      .filter((r) => selectedIds.has(r.id) && r.customer_status !== 0)
      .map((r) => r.id);

    if (ids.length === 0) return;

    setRows((prev) =>
      prev.map((r) =>
        ids.includes(r.id)
          ? {
              ...r,
              invoiced: false,
              payment: "unpaid",
              invoice_number: null,
            }
          : r
      )
    );
    setSelectedIds(new Set());

    try {
      await axios.post(
        `${API_BASE_URL}/api/internet-manager/cancel-invoice`,
        { ids }
      );
      if (filterDate) await loadInvoicesForMonth(filterDate);
    } catch {}
  };

  const handlePrintInvoices = () => {
    const selectedRows = rows.filter(
      (r) => selectedIds.has(r.id) && r.customer_status !== 0
    );
    if (selectedRows.length === 0) return;

    sessionStorage.setItem(
      "print_invoices_rows",
      JSON.stringify(selectedRows)
    );

    window.open("/print-invoices", "_blank");
  };

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
        textAlign: "center",
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
          justifyContent: "center",
        }}
      >
        {label}
      </TableSortLabel>
    </TableCell>
  );

  const selectedHasInvoiced = useMemo(
    () =>
      rows.some(
        (r) =>
          selectedIds.has(r.id) &&
          r.invoiced &&
          r.customer_status !== 0
      ),
    [rows, selectedIds]
  );

  const handleAppendPayment = async () => {
    const amtNum = Number(newPayAmount);
    if (!activeRow?.invoice_number) return;
    if (!newPayAmount.trim() || isNaN(amtNum) || amtNum <= 0) return;

    const invoiceAmount = Number(modalAmount || 0);
    const payment = amtNum;
    const net_amount = Math.max(invoiceAmount - payment, 0);
    const paymentDate = newPayDate || getCurrentDateValue();

    const items = [
      {
        invoice_number: activeRow.invoice_number,
        payment_date: paymentDate,
        amount: invoiceAmount,
        payment,
        net_amount,
        currency: "USD",
      },
    ];

    try {
      await axios.post(`${API_BASE_URL}/api/internet-manager/pay-invoice`, {
        items,
      });

      const invoiceMonth =
        filterDate || draftFilterDate || getCurrentMonthValue();
      await loadPaymentsForInvoice(activeRow.invoice_number, invoiceMonth);

      setNewPayAmount("");
    } catch (e) {
      // optional error handling
    }
  };

  return (
    <Box sx={{ p: 3, display: "flex", flexDirection: "column", gap: 2 }}>
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

        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            size="small"
            onClick={() => {
              loadInternetCustomers(invoicesByUser);
              if (filterDate) loadInvoicesForMonth(filterDate);
            }}
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
            Reload
          </Button>
        </Stack>
      </Paper>

      {error && (
        <Typography
          color="error"
          variant="body2"
          sx={{ textAlign: "right", fontFamily: tableFontFamily }}
        >
          {error}
        </Typography>
      )}

      <Paper
        sx={{
          p: 2.5,
          borderRadius: 2,
          boxShadow: 2,
          borderLeft: "4px solid #ef5350",
          backgroundColor: "#fffafa",
          fontFamily: tableFontFamily,
        }}
      >
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={2}
          alignItems={{ xs: "stretch", md: "center" }}
          justifyContent="space-between"
        >
          <Box>
            <Typography
              variant="subtitle1"
              sx={{ fontWeight: 700, color: "text.secondary" }}
            >
              Load Invoices by Month
            </Typography>
            <Typography variant="caption" color="text.secondary">
              This does not filter rows — it only updates invoiced status /
              numbers.
            </Typography>
          </Box>

          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1.5}
            sx={{ minWidth: { md: 420 } }}
          >
            <TextField
              label="Invoice Month"
              type="month"
              size="small"
              fullWidth
              value={draftFilterDate}
              onChange={(e) => setDraftFilterDate(e.target.value)}
              InputLabelProps={{
                shrink: true,
                sx: { fontFamily: tableFontFamily, fontSize: "0.85rem" },
              }}
              InputProps={{
                sx: { fontFamily: tableFontFamily, fontSize: "0.9rem" },
              }}
            />

            <Button
              variant="contained"
              onClick={handleApplyDateFilter}
              sx={{
                textTransform: "none",
                fontWeight: 700,
                bgcolor: "#ef5350",
                "&:hover": { bgcolor: "#e53935" },
                fontFamily: tableFontFamily,
                whiteSpace: "nowrap",
                px: 2.5,
              }}
            >
              Apply Date
            </Button>
          </Stack>
        </Stack>
      </Paper>

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
          <Box>
            <Typography
              variant="subtitle1"
              sx={{ fontWeight: 700, color: "text.secondary" }}
            >
              Live Filters
            </Typography>
            <Typography variant="caption" color="text.secondary">
              These filters update the grid instantly.
            </Typography>
          </Box>

          <Button
            variant="outlined"
            size="small"
            onClick={handleClearFilters}
            sx={{
              textTransform: "none",
              fontWeight: 700,
              borderColor: "#00897b",
              color: "#00695c",
              fontFamily: tableFontFamily,
            }}
          >
            Clear All
          </Button>
        </Stack>

        <Divider sx={{ mb: 2 }} />

        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={2}
          alignItems={{ xs: "stretch", md: "flex-end" }}
        >
          <TextField
            label="Username / Full Name"
            variant="outlined"
            size="small"
            fullWidth
            value={searchName}
            onChange={(e) => {
              setSearchName(e.target.value);
              setSelectedIds(new Set());
            }}
            InputProps={{
              sx: { fontFamily: tableFontFamily, fontSize: "0.9rem" },
            }}
            InputLabelProps={{
              sx: { fontFamily: tableFontFamily, fontSize: "0.85rem" },
            }}
          />

          <FormControl size="small" fullWidth>
            <InputLabel
              sx={{ fontFamily: tableFontFamily, fontSize: "0.85rem" }}
            >
              Addresses
            </InputLabel>
            <Select
              multiple
              value={selectedAddresses}
              onChange={(e) => {
                setSelectedAddresses(e.target.value as string[]);
                setSelectedIds(new Set());
              }}
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

          {/* Employee filter (by emp_manager username) */}
          <FormControl size="small" fullWidth>
            <InputLabel
              sx={{ fontFamily: tableFontFamily, fontSize: "0.85rem" }}
            >
              Employee
            </InputLabel>
            <Select
              label="Employee"
              value={selectedEmployee}
              onChange={(e) => {
                const val = e.target.value as string;
                setSelectedEmployee(val);
                setSelectedIds(new Set());
              }}
              sx={{ fontFamily: tableFontFamily, fontSize: "0.9rem" }}
            >
              <MenuItem value="">
                <em>All Employees</em>
              </MenuItem>
              {employees.map((emp) => (
                <MenuItem key={emp.username} value={emp.username}>
                  {emp.fullname} ({emp.username})
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
          <FormControlLabel
            control={
              <Switch
                checked={isActive}
                onChange={(e) => {
                  setIsActive(e.target.checked);
                  setSelectedIds(new Set());
                }}
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

          <Box>
            <RadioGroup
              row
              value={paymentStatus}
              onChange={(e) => {
                setPaymentStatus(e.target.value as PaymentStatus);
                setSelectedIds(new Set());
              }}
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

      <Paper
        sx={{
          borderRadius: 2,
          boxShadow: 3,
          overflow: "hidden",
          fontFamily: tableFontFamily,
        }}
      >
        <Box
          sx={{
            p: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 2,
          }}
        >
          <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
            <Typography
              variant="subtitle1"
              sx={{ fontWeight: 600, color: "text.secondary" }}
            >
              Internet Manager Panel
            </Typography>

            {/* Legend / hint for row colors */}
            <Stack
              direction="row"
              spacing={2}
              alignItems="center"
              sx={{ mt: 0.5 }}
            >
              <Typography
                variant="caption"
                sx={{ fontFamily: tableFontFamily, color: "text.secondary" }}
              >
                Row colors:
              </Typography>

              <Stack direction="row" spacing={1} alignItems="center">
                <Box
                  sx={{
                    width: 14,
                    height: 14,
                    borderRadius: 0.7,
                    bgcolor: "#e8f5e9",
                    border: "1px solid #c8e6c9",
                  }}
                />
                <Typography
                  variant="caption"
                  sx={{ fontFamily: tableFontFamily }}
                >
                  Paid
                </Typography>
              </Stack>

              <Stack direction="row" spacing={1} alignItems="center">
                <Box
                  sx={{
                    width: 14,
                    height: 14,
                    borderRadius: 0.7,
                    bgcolor: "#fffde7",
                    border: "1px solid #fff9c4",
                  }}
                />
                <Typography
                  variant="caption"
                  sx={{ fontFamily: tableFontFamily }}
                >
                  Partial
                </Typography>
              </Stack>

              <Stack direction="row" spacing={1} alignItems="center">
                <Box
                  sx={{
                    width: 14,
                    height: 14,
                    borderRadius: 0.7,
                    bgcolor: "#ffebee",
                    border: "1px solid #ffcdd2",
                  }}
                />
                <Typography
                  variant="caption"
                  sx={{ fontFamily: tableFontFamily }}
                >
                  Unpaid
                </Typography>
              </Stack>
            </Stack>
          </Box>

          <Stack direction="row" spacing={1}>
            <Button
              variant="contained"
              size="small"
              onClick={handleBillingSelected}
              disabled={selectedIds.size === 0}
              sx={{
                textTransform: "none",
                fontWeight: 700,
                bgcolor: "#00695c",
                "&:hover": { bgcolor: "#005b50" },
                fontFamily: tableFontFamily,
              }}
            >
              Billing
            </Button>

            <Button
              variant="outlined"
              size="small"
              onClick={handlePayInvoiceSelected}
              disabled={selectedIds.size === 0}
              sx={{
                textTransform: "none",
                fontWeight: 700,
                borderColor: "#16a34a",
                color: "#166534",
                fontFamily: tableFontFamily,
                bgcolor: "white",
                "&:hover": { bgcolor: "#f0fdf4", borderColor: "#16a34a" },
              }}
            >
              Pay selected invoices
            </Button>

            <Button
              variant="outlined"
              size="small"
              onClick={handleUndoInvoiceSelected}
              disabled={selectedIds.size === 0 || !selectedHasInvoiced}
              sx={{
                textTransform: "none",
                fontWeight: 700,
                borderColor: "#f59e0b",
                color: "#b45309",
                fontFamily: tableFontFamily,
                bgcolor: "white",
                "&:hover": { bgcolor: "#fffbeb", borderColor: "#f59e0b" },
              }}
            >
              Undo selected invoices
            </Button>

            <Button
              variant="outlined"
              size="small"
              onClick={handleCancelInvoiceSelected}
              disabled={selectedIds.size === 0 || !selectedHasInvoiced}
              sx={{
                textTransform: "none",
                fontWeight: 700,
                borderColor: "#ef5350",
                color: "#b71c1c",
                fontFamily: tableFontFamily,
                bgcolor: "white",
                "&:hover": { bgcolor: "#fff5f5", borderColor: "#ef5350" },
              }}
            >
              Cancel selected invoices
            </Button>

            <Button
              variant="outlined"
              size="small"
              onClick={handlePrintInvoices}
              disabled={selectedIds.size === 0}
              sx={{
                textTransform: "none",
                fontWeight: 700,
                borderColor: "#00695c",
                color: "#00695c",
                fontFamily: tableFontFamily,
                bgcolor: "white",
                "&:hover": { bgcolor: "#f1f59" },
              }}
            >
              Print selected invoices
            </Button>
          </Stack>
        </Box>
        <Divider />

        <TableContainer sx={{ maxHeight: "60vh", userSelect: "none" }}>
          <Table
            size="small"
            stickyHeader
            sx={{
              "& th, & td": {
                fontFamily: tableFontFamily,
                textAlign: "center",
                verticalAlign: "middle",
              },
              "& th .MuiTableSortLabel-root": {
                marginLeft: "auto",
                marginRight: "auto",
                justifyContent: "center",
              },
            }}
          >
            <TableHead>
              <TableRow sx={{ "& th": { backgroundColor: "#004d40" } }}>
                <TableCell
                  sx={{
                    width: 50,
                    backgroundColor: "#004d40",
                    textAlign: "center",
                  }}
                >
                  <img
                    src={WishLogo}
                    alt="Wish Money"
                    style={{ width: 38, height: 38, borderRadius: 4 }}
                  />
                </TableCell>

                <TableCell sx={{ width: 40, backgroundColor: "#004d40" }}>
                  <Checkbox
                    size="small"
                    sx={{ color: "#fff" }}
                    checked={allVisibleSelected}
                    indeterminate={someVisibleSelected}
                    onChange={(e) => handleToggleAllVisible(e.target.checked)}
                  />
                </TableCell>

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
                    fontWeight: 700,
                    fontSize: "0.95rem",
                    color: "#fff",
                    whiteSpace: "nowrap",
                    backgroundColor: "#004d40",
                    textAlign: "center",
                  }}
                >
                  Invoiced
                </TableCell>

                <TableCell
                  sx={{
                    fontWeight: 700,
                    fontSize: "0.95rem",
                    color: "#fff",
                    whiteSpace: "nowrap",
                    backgroundColor: "#004d40",
                    textAlign: "center",
                  }}
                >
                  Invoice
                </TableCell>

                <TableCell
                  sx={{
                    fontWeight: 700,
                    fontSize: "0.95rem",
                    color: "#fff",
                    whiteSpace: "nowrap",
                    backgroundColor: "#004d40",
                    textAlign: "center",
                  }}
                >
                  Pay
                </TableCell>

                {renderSortableHeaderCell(
                  "Invoice No",
                  "invoice_number",
                  "right"
                )}

                {/* Last column: Employee Manager */}
                <TableCell
                  sx={{
                    fontWeight: 700,
                    fontSize: "0.95rem",
                    color: "#fff",
                    whiteSpace: "nowrap",
                    backgroundColor: "#004d40",
                    textAlign: "center",
                  }}
                >
                  Employee Manager
                </TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={15} align="center">
                    <Typography variant="body2" color="text.secondary">
                      Loading...
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : filteredAndSortedRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={15} align="center">
                    <Typography variant="body2" color="text.secondary">
                      No records found.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredAndSortedRows.map((row) => {
                  const isChecked = selectedIds.has(row.id);
                  const isDisabledRow = row.customer_status === 0;

                  return (
                    <TableRow
                      key={row.id}
                      hover={row.status !== "stopped"}
                      onDoubleClick={() => {
                        if (row.status !== "stopped")
                          handleRowDoubleClick(row);
                      }}
                      sx={{
                        cursor:
                          row.status === "stopped" ? "not-allowed" : "pointer",
                        backgroundColor:
                          row.status === "stopped"
                            ? getDisabledRowColor()
                            : getPaymentRowColor(row.payment),
                        opacity: row.status === "stopped" ? 0.7 : 1,
                        "&:hover": {
                          backgroundColor:
                            row.status === "stopped"
                              ? getDisabledRowColor()
                              : getPaymentRowColor(row.payment),
                          filter:
                            row.status === "stopped"
                              ? "none"
                              : "brightness(0.97)",
                        },
                      }}
                    >
                      <TableCell sx={{ width: 50, textAlign: "center" }}>
                        {row.wish === 1 ? (
                          <img
                            src={WishLogo}
                            alt="Wish Money"
                            style={{ width: 38, height: 38, borderRadius: 4 }}
                          />
                        ) : null}
                      </TableCell>

                      <TableCell sx={{ width: 40, textAlign: "center" }}>
                        <Checkbox
                          size="small"
                          checked={isChecked}
                          disabled={isDisabledRow}
                          onChange={(e) =>
                            handleToggleOne(row.id, e.target.checked)
                          }
                          onClick={(e) => e.stopPropagation()}
                        />
                      </TableCell>

                      <TableCell>{row.username}</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>
                        {row.fullname}
                      </TableCell>
                      <TableCell>{row.city}</TableCell>
                      <TableCell>{row.village}</TableCell>
                      <TableCell>{row.due_date || ""}</TableCell>
                      <TableCell align="right">
                        {row.amount.toFixed(2)}
                      </TableCell>
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

                      <TableCell
                        sx={{
                          fontWeight: 800,
                          color: row.invoiced ? "#1b5e20" : "text.primary",
                        }}
                      >
                        {row.invoiced ? "Yes" : "No"}
                      </TableCell>

                      <TableCell>
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleInvoiceRow(row);
                          }}
                          disabled={row.invoiced || isDisabledRow}
                          sx={{
                            textTransform: "none",
                            fontSize: "0.75rem",
                            px: 1.5,
                          }}
                        >
                          Invoice
                        </Button>
                      </TableCell>

                      <TableCell>
                        <Button
                          variant="contained"
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePayRow(row);
                          }}
                          disabled={
                            isDisabledRow ||
                            !row.invoice_number ||
                            !row.invoiced ||
                            row.payment === "paid"
                          }
                          sx={{
                            textTransform: "none",
                            fontSize: "0.75rem",
                            px: 1.5,
                            bgcolor: "#16a34a",
                            "&:hover": { bgcolor: "#15803d" },
                          }}
                        >
                          Pay
                        </Button>
                      </TableCell>

                      <TableCell align="right">
                        {row.invoice_number ?? ""}
                      </TableCell>

                      {/* Employee Manager cell */}
                      <TableCell>
                        {row.emp_fullname
                          ? `${row.emp_fullname}${
                              row.emp_username ? ` (${row.emp_username})` : ""
                            }`
                          : row.emp_username || row.emp_manager || ""}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Dialog
        open={openPayModal}
        onClose={() => setOpenPayModal(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            p: 0.5,
            bgcolor: "#fafafa",
            fontFamily: tableFontFamily,
          },
        }}
      >
        <DialogTitle
          sx={{
            fontFamily: tableFontFamily,
            fontWeight: 700,
            fontSize: "1.2rem",
            pb: 1.5,
            background:
              "linear-gradient(90deg, #00695c 0%, #00897b 50%, #009688 100%)",
            color: "white",
            borderRadius: "12px 12px 0 0",
          }}
        >
          {activeRow
            ? `${activeRow.fullname} (${activeRow.username}) - Invoice: ${
                activeRow.invoice_number ?? "N/A"
              }`
            : "Payments"}
        </DialogTitle>

        <DialogContent sx={{ mt: 2 }}>
          <Stack spacing={2}>
            <Paper
              elevation={0}
              sx={{
                p: 2,
                borderRadius: 2,
                border: "1px solid #e0e0e0",
                backgroundColor: "#fff",
              }}
            >
              <Typography
                variant="subtitle1"
                sx={{
                  fontWeight: 800,
                  mb: 1.5,
                  fontFamily: tableFontFamily,
                  color: "#00695c",
                }}
              >
                Info
              </Typography>

              <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                <TextField
                  label="Amount"
                  size="small"
                  fullWidth
                  type="number"
                  value={modalAmount}
                  disabled
                  InputProps={{
                    readOnly: true,
                    endAdornment: (
                      <InputAdornment position="end">USD</InputAdornment>
                    ),
                    sx: { fontFamily: tableFontFamily },
                  }}
                  InputLabelProps={{ sx: { fontFamily: tableFontFamily } }}
                />

                <TextField
                  label="Deduction"
                  size="small"
                  fullWidth
                  type="number"
                  value={modalDeduction}
                  disabled
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">USD</InputAdornment>
                    ),
                    sx: { fontFamily: tableFontFamily },
                  }}
                  InputLabelProps={{ sx: { fontFamily: tableFontFamily } }}
                />

                <TextField
                  label="Net Amount"
                  size="small"
                  fullWidth
                  type="number"
                  value={modalNetAmount}
                  disabled
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">USD</InputAdornment>
                    ),
                    sx: { fontFamily: tableFontFamily },
                  }}
                  InputLabelProps={{ sx: { fontFamily: tableFontFamily } }}
                />
              </Stack>
            </Paper>

            <Typography
              variant="subtitle1"
              sx={{ fontWeight: 700, fontFamily: tableFontFamily }}
            >
              Add Payment
            </Typography>

            <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
              <TextField
                label="Payment Amount"
                size="small"
                fullWidth
                type="number"
                value={newPayAmount}
                onChange={(e) => setNewPayAmount(e.target.value)}
                disabled={isNetZero}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">USD</InputAdornment>
                  ),
                  sx: { fontFamily: tableFontFamily },
                }}
                InputLabelProps={{ sx: { fontFamily: tableFontFamily } }}
              />

              <TextField
                label="Payment Date"
                size="small"
                fullWidth
                type="date"
                value={newPayDate}
                onChange={(e) => setNewPayDate(e.target.value)}
                InputLabelProps={{
                  shrink: true,
                  sx: { fontFamily: tableFontFamily },
                }}
                InputProps={{ sx: { fontFamily: tableFontFamily } }}
              />

              <FormControl size="small" fullWidth>
                <InputLabel sx={{ fontFamily: tableFontFamily }}>
                  Method
                </InputLabel>
                <Select
                  label="Method"
                  value={newPayMethod}
                  onChange={(e) => setNewPayMethod(e.target.value)}
                  sx={{ fontFamily: tableFontFamily }}
                >
                  <MenuItem value="cash">Cash</MenuItem>
                  <MenuItem value="wish">Wish Money</MenuItem>
                  <MenuItem value="bank">Bank Transfer</MenuItem>
                  <MenuItem value="other">Other</MenuItem>
                </Select>
              </FormControl>

              <Button
                variant="contained"
                onClick={handleAppendPayment}
                sx={{
                  textTransform: "none",
                  fontWeight: 700,
                  bgcolor: "#00897b",
                  "&:hover": { bgcolor: "#00796b" },
                  fontFamily: tableFontFamily,
                  px: 3,
                  whiteSpace: "nowrap",
                }}
              >
                Add
              </Button>
            </Stack>

            <Typography
              variant="subtitle1"
              sx={{ fontWeight: 700, fontFamily: tableFontFamily }}
            >
              Payments
            </Typography>

            <TableContainer sx={{ maxHeight: 320 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell
                      sx={{
                        fontWeight: 700,
                        textAlign: "center",
                        backgroundColor: "#004d40",
                        color: "white",
                        fontFamily: tableFontFamily,
                      }}
                    >
                      Date
                    </TableCell>
                    <TableCell
                      sx={{
                        fontWeight: 700,
                        textAlign: "center",
                        backgroundColor: "#004d40",
                        color: "white",
                        fontFamily: tableFontFamily,
                      }}
                    >
                      Amount
                    </TableCell>
                    <TableCell
                      sx={{
                        fontWeight: 700,
                        textAlign: "center",
                        backgroundColor: "#004d40",
                        color: "white",
                        fontFamily: tableFontFamily,
                      }}
                    >
                      Method
                    </TableCell>
                    <TableCell
                      sx={{
                        fontWeight: 700,
                        textAlign: "center",
                        backgroundColor: "#004d40",
                        color: "white",
                        width: 60,
                        fontFamily: tableFontFamily,
                      }}
                    >
                      Remove
                    </TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {paymentsLoading ? (
                    <TableRow>
                      <TableCell colSpan={4} align="center">
                        Loading...
                      </TableCell>
                    </TableRow>
                  ) : payments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} align="center">
                        No payments.
                      </TableCell>
                    </TableRow>
                  ) : (
                    payments.map((p, idx) => (
                      <TableRow
                        key={p.id}
                        hover
                        sx={{
                          backgroundColor:
                            idx % 2 === 0 ? "background.paper" : "#f5f5f5",
                          "&:hover": { backgroundColor: "#e0f2f1" },
                        }}
                      >
                        <TableCell sx={{ textAlign: "center" }}>
                          {p.payment_date}
                        </TableCell>
                        <TableCell sx={{ textAlign: "center" }}>
                          {p.amount.toFixed(2)}
                        </TableCell>
                        <TableCell sx={{ textAlign: "center" }}>
                          {p.method}
                        </TableCell>
                        <TableCell sx={{ textAlign: "center" }}>
                          <Tooltip title="Remove">
                            <IconButton
                              size="small"
                              onClick={() => handleRemovePayment(p.id)}
                            >
                              <DeleteOutlineIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Stack>
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={() => setOpenPayModal(false)}
            sx={{
              textTransform: "none",
              fontFamily: tableFontFamily,
              color: "#555",
            }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default InternnetManagerForm;
