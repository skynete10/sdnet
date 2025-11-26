import React, { useEffect, useMemo, useState } from "react";
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
  Switch,
  FormControlLabel,
  IconButton,
  Tooltip,
} from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import axios from "axios";
import wishMoneyLogo from "../assets/wishmoneylogo.png";

const API_BASE_URL = "http://127.0.0.1:5100";

type Order = "asc" | "desc";

const tableFontFamily =
  '"Segoe UI", "Roboto", "Helvetica Neue", Arial, sans-serif';

type Currency = "USD" | "LBP";

type CustomerSubscription = {
  id: number;
  customer_username: string;
  customer_fullname: string;
  service_code: string;
  service_name: string;
  amount: number;
  service_currency?: Currency | null;
  billing_date?: string | null;
  payment_method?: string | null;
  manager_empcode?: string | null;
  manager_fullname?: string | null;
  manager_username?: string | null;

  // status in UI (derived from subscription_status INT)
  status?: "active" | "stopped" | null;
};

type NewSubscription = {
  customer_username: string;
  service_code: string;
  amount: string;
  billing_date: string;
  manager_empcode: string;

  // form status
  status: "active" | "stopped";
};

type FormErrors = Partial<Record<keyof NewSubscription, string>>;

type SaveSubscriptionPayload = {
  id?: number;
  customer_username: string;
  service_code: string;
  amount: string | number;
  billing_date?: string;
  payment_method?: string;
  manager_empcode?: string;

  // send to backend (backend converts to 0/1)
  subscription_status?: "active" | "stopped";
};

type SortKey = keyof Pick<
  CustomerSubscription,
  | "customer_username"
  | "customer_fullname"
  | "service_code"
  | "service_name"
  | "service_currency"
  | "amount"
>;

type CustomerOption = {
  username: string;
  fullname: string;
};

type ServiceOption = {
  service_code: string;
  service_name: string;
  service_price: number;
  service_currency: Currency;
};

type EmployeeOption = {
  empcode: string;
  fullname: string;
  username?: string;
};

const saveSubscription = async (data: SaveSubscriptionPayload) => {
  const res = await axios.post(
    `${API_BASE_URL}/api/customer-subscriptions/savesubscription`,
    data
  );
  return res.data;
};

const deleteSubscription = async (id: number) => {
  const res = await axios.delete(
    `${API_BASE_URL}/api/customer-subscriptions/delete/${id}`
  );
  return res.data;
};

const getCurrentDateValue = (): string => {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
};

// helper: normalize backend INT/STRING to UI status
const mapApiStatus = (row: any): "active" | "stopped" => {
  const v =
    row.subscription_status ??
    row.subscriptionStatus ??
    row.status ??
    row.subscription_status_value;

  if (v === 0 || v === "0") return "stopped";
  if (v === 1 || v === "1") return "active";

  if (typeof v === "string") {
    const t = v.toLowerCase().trim();
    if (t === "stopped" || t === "stop" || t === "inactive") return "stopped";
  }

  return "active";
};

const CustomerSubscriptionForm: React.FC = () => {
  const [subscriptions, setSubscriptions] = useState<CustomerSubscription[]>([]);
  const [customerFilter, setCustomerFilter] = useState("");
  const [serviceFilter, setServiceFilter] = useState("");

  const [order, setOrder] = useState<Order>("asc");
  const [orderBy, setOrderBy] = useState<SortKey>("customer_fullname");

  const [error, setError] = useState<string | null>(null);

  const [openSubModal, setOpenSubModal] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");
  const [editingId, setEditingId] = useState<number | null>(null);

  const emptySubForm: NewSubscription = {
    customer_username: "",
    service_code: "",
    amount: "",
    billing_date: getCurrentDateValue(),
    manager_empcode: "",
    status: "active",
  };

  const [newSub, setNewSub] = useState<NewSubscription>(emptySubForm);
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  const [customerOptions, setCustomerOptions] = useState<CustomerOption[]>([]);
  const [serviceOptions, setServiceOptions] = useState<ServiceOption[]>([]);
  const [employeeOptions, setEmployeeOptions] = useState<EmployeeOption[]>([]);

  const [priceCurrency, setPriceCurrency] = useState<Currency>("USD");
  const [wishMoney, setWishMoney] = useState<boolean>(false);

  const [duplicateError, setDuplicateError] = useState<string | null>(null);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] =
    useState<CustomerSubscription | null>(null);

  const loadSubscriptions = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/customer-subscriptions`);
      const apiData = res.data as any[];

      const mapped: CustomerSubscription[] = apiData.map((row) => ({
        id: row.id,
        customer_username: (row.customer_username ?? "").toString().trim(),
        customer_fullname: row.customer_fullname ?? row.fullname ?? "",
        service_code: (row.service_code ?? "").toString().trim(),
        service_name: row.service_name ?? "",
        amount:
          typeof row.amount === "number" ? row.amount : Number(row.amount ?? 0),
        service_currency: (row.service_currency ?? null) as Currency | null,
        billing_date: row.billing_date
          ? new Date(row.billing_date).toISOString().slice(0, 10)
          : null,
        payment_method: row.payment_method ?? null,
        manager_empcode:
          row.manager_empcode ??
          row.emp_manager ??
          row.EmpManager ??
          row.empcode_manager ??
          row.manager_code ??
          row.managerEmpCode ??
          null,
        manager_fullname:
          row.manager_fullname ??
          row.manager_name ??
          row.emp_manager_fullname ??
          row.emp_manager_name ??
          row.employee_manager ??
          null,
        manager_username:
          row.manager_username ??
          row.emp_manager_username ??
          row.manager_user ??
          row.emp_manager_user ??
          row.managerUsername ??
          null,

        // ✅ INT -> UI status
        status: mapApiStatus(row),
      }));

      setSubscriptions(mapped);
    } catch (e) {
      console.warn("Could not load customer subscriptions from API.", e);
    }
  };

  const loadCustomers = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/customers`);
      const apiData = res.data as any[];

      const mapped: CustomerOption[] = apiData.map((row) => ({
        username: (row.username ?? "").toString().trim(),
        fullname: row.fullname ?? "",
      }));

      setCustomerOptions(mapped);
    } catch (e) {
      console.warn("Could not load customers for dropdown.", e);
    }
  };

  const loadServices = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/services`);
      const apiData = res.data as any[];

      const mapped: ServiceOption[] = apiData.map((row) => ({
        service_code: (row.service_code ?? "").toString().trim(),
        service_name: row.service_name ?? "",
        service_price:
          typeof row.service_price === "number"
            ? row.service_price
            : Number(row.service_price ?? 0),
        service_currency: (row.service_currency || "USD") as Currency,
      }));

      setServiceOptions(mapped);
    } catch (e) {
      console.warn("Could not load services for dropdown.", e);
    }
  };

  const loadEmployees = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/employees`);
      const apiData = Array.isArray(res.data) ? res.data : [];

      const mapped: EmployeeOption[] = apiData
        .map((row: any) => {
          const empcode = (row.EmpCode ?? row.empcode ?? row.code ?? row.id ?? "")
            .toString()
            .trim();
          const username = (
            row.username ??
            row.EmpUser ??
            row.user ??
            row.UserName ??
            row.emp_username ??
            ""
          )
            .toString()
            .trim();
          const fullname =
            row.fullname ??
            row.FullName ??
            row.name ??
            row.empname ??
            row.EnglishName ??
            "";

          return {
            empcode: username || empcode,
            fullname: fullname || username || empcode,
            username: username || undefined,
          };
        })
        .filter((e: EmployeeOption) => e.empcode);

      setEmployeeOptions(mapped);
    } catch (e) {
      console.warn("Could not load employees for dropdown.", e);
      setEmployeeOptions([]);
    }
  };

  useEffect(() => {
    loadSubscriptions();
    loadCustomers();
    loadServices();
    loadEmployees();
  }, []);

  const handleRequestSort = (property: SortKey) => {
    const isAsc = orderBy === property && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(property);
  };

  const filteredAndSortedSubscriptions = useMemo(() => {
    const filtered = subscriptions.filter((s) => {
      const customerCombined = `${s.customer_username} ${s.customer_fullname}`;
      const serviceCombined = `${s.service_code} ${s.service_name}`;

      const customerMatch =
        !customerFilter ||
        customerCombined.toLowerCase().includes(customerFilter.toLowerCase());

      const serviceMatch =
        !serviceFilter ||
        serviceCombined.toLowerCase().includes(serviceFilter.toLowerCase());

      return customerMatch && serviceMatch;
    });

    return [...filtered].sort((a, b) => {
      const aVal = a[orderBy];
      const bVal = b[orderBy];

      if (orderBy === "amount") {
        const aNum = Number(aVal ?? 0);
        const bNum = Number(bVal ?? 0);
        if (aNum < bNum) return order === "asc" ? -1 : 1;
        if (aNum > bNum) return order === "asc" ? 1 : -1;
        return 0;
      }

      const aStr = (aVal ?? "").toString().toLowerCase();
      const bStr = (bVal ?? "").toString().toLowerCase();

      if (aStr < bStr) return order === "asc" ? -1 : 1;
      if (aStr > bStr) return order === "asc" ? 1 : -1;
      return 0;
    });
  }, [subscriptions, customerFilter, serviceFilter, order, orderBy]);

  const handleOpenNew = () => {
    setModalMode("add");
    setEditingId(null);
    setFormErrors({});
    setError(null);
    setDuplicateError(null);
    setNewSub({
      ...emptySubForm,
      billing_date: getCurrentDateValue(),
      status: "active",
    });
    setPriceCurrency("USD");
    setWishMoney(false);
    setOpenSubModal(true);
  };

  const handleCloseSubModal = () => {
    setOpenSubModal(false);
    setNewSub(emptySubForm);
    setFormErrors({});
    setEditingId(null);
    setWishMoney(false);
    setDuplicateError(null);
  };

  const validateForm = (): boolean => {
    const errors: FormErrors = {};

    if (!newSub.customer_username.trim()) {
      errors.customer_username = "Customer is required";
    }
    if (!newSub.service_code.trim()) {
      errors.service_code = "Service is required";
    }
    if (!newSub.amount.trim()) {
      errors.amount = "Price is required";
    } else if (isNaN(Number(newSub.amount))) {
      errors.amount = "Price must be numeric";
    } else if (Number(newSub.amount) < 0) {
      errors.amount = "Price cannot be negative";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveSubscription = async () => {
    setError(null);
    setDuplicateError(null);

    if (!validateForm()) return;

    try {
      const latestRes = await axios.get(
        `${API_BASE_URL}/api/customer-subscriptions`
      );
      const latestData = latestRes.data as any[];

      const latestSubs: CustomerSubscription[] = latestData.map((row) => ({
        id: row.id,
        customer_username: (row.customer_username ?? "").toString().trim(),
        customer_fullname: row.customer_fullname ?? row.fullname ?? "",
        service_code: (row.service_code ?? "").toString().trim(),
        service_name: row.service_name ?? "",
        amount:
          typeof row.amount === "number" ? row.amount : Number(row.amount ?? 0),
        service_currency: (row.service_currency ?? null) as Currency | null,
        billing_date: row.billing_date
          ? new Date(row.billing_date).toISOString().slice(0, 10)
          : null,
        payment_method: row.payment_method ?? null,
        manager_empcode:
          row.manager_empcode ??
          row.emp_manager ??
          row.EmpManager ??
          row.empcode_manager ??
          row.manager_code ??
          null,
        manager_fullname:
          row.manager_fullname ??
          row.manager_name ??
          row.emp_manager_fullname ??
          row.employee_manager ??
          null,
        manager_username:
          row.manager_username ??
          row.emp_manager_username ??
          row.manager_user ??
          null,
        status: mapApiStatus(row),
      }));

      const normalizedCustomer = newSub.customer_username.trim();

      if (modalMode === "add") {
        const existsForCustomer = latestSubs.some(
          (x) => x.customer_username === normalizedCustomer
        );
        if (existsForCustomer) {
          setDuplicateError("This client already has a subscription.");
          return;
        }
      }

      await saveSubscription({
        id: modalMode === "edit" && editingId != null ? editingId : undefined,
        customer_username: normalizedCustomer,
        service_code: newSub.service_code.trim(),
        amount: newSub.amount,
        billing_date: newSub.billing_date || undefined,
        payment_method: wishMoney ? "wish_money" : undefined,
        manager_empcode: newSub.manager_empcode.trim() || undefined,
        // ✅ send status string; backend converts to 0/1
        subscription_status: newSub.status,
      });

      handleCloseSubModal();
      await loadSubscriptions();
    } catch (err: any) {
      console.error("Failed to save subscription", err);
      const apiError = err?.response?.data?.error;
      setError(apiError || "Failed to save subscription");
    }
  };

  const handleRowDoubleClick = (s: CustomerSubscription) => {
    setModalMode("edit");
    setEditingId(s.id);
    setFormErrors({});
    setError(null);
    setDuplicateError(null);

    setNewSub({
      customer_username: s.customer_username,
      service_code: s.service_code,
      amount: s.amount != null ? s.amount.toString() : "",
      billing_date: s.billing_date
        ? s.billing_date.toString().slice(0, 10)
        : getCurrentDateValue(),
      manager_empcode:
        (s.manager_empcode ?? s.manager_username ?? "").toString(),
      status: s.status === "stopped" ? "stopped" : "active",
    });

    const found = serviceOptions.find(
      (opt) => opt.service_code === s.service_code
    );
    setPriceCurrency(s.service_currency || found?.service_currency || "USD");

    setWishMoney((s.payment_method || "").toLowerCase() === "wish_money");
    setOpenSubModal(true);
  };

  const askDeleteSubscription = (sub: CustomerSubscription) => {
    setDeleteTarget(sub);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteSubscription = async () => {
    if (!deleteTarget) return;

    try {
      await deleteSubscription(deleteTarget.id);
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
      await loadSubscriptions();
    } catch (err: any) {
      console.error("Failed to delete subscription", err);
      const apiError = err?.response?.data?.error;
      setError(apiError || "Failed to delete subscription");
    }
  };

  const cancelDeleteSubscription = () => {
    setDeleteDialogOpen(false);
    setDeleteTarget(null);
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

  const handleFieldChange = (key: keyof NewSubscription, value: any) => {
    setNewSub((prev) => ({ ...prev, [key]: value }));
    setFormErrors((prev) => ({ ...prev, [key]: undefined }));
    setDuplicateError(null);
  };

  const handleServiceChange = (serviceCode: string) => {
    handleFieldChange("service_code", serviceCode);
    const found = serviceOptions.find((s) => s.service_code === serviceCode);
    if (found) {
      handleFieldChange("amount", found.service_price.toString());
      setPriceCurrency(found.service_currency);
    } else {
      setPriceCurrency("USD");
    }
  };

  const renderManagerCell = (s: CustomerSubscription) => {
    const emp =
      s.manager_empcode
        ? employeeOptions.find(
            (e) =>
              e.empcode === s.manager_empcode ||
              e.username === s.manager_empcode
          )
        : undefined;

    const name =
      s.manager_fullname ||
      emp?.fullname ||
      (s.manager_username || emp?.username) ||
      "";

    const user =
      s.manager_username ||
      emp?.username ||
      (s.manager_empcode || "");

    if (!name && !user) return "—";
    if (name && user) return `${name} (${user})`;
    return name || user;
  };

  const renderStatusDot = (status?: "active" | "stopped" | null) => {
    const active = status !== "stopped";
    return (
      <Box
        sx={{
          display: "inline-flex",
          alignItems: "center",
          gap: 0.8,
          justifyContent: "center",
        }}
      >
        <Box
          sx={{
            width: 10,
            height: 10,
            borderRadius: "50%",
            bgcolor: active ? "#16a34a" : "#ef4444",
            boxShadow: active
              ? "0 0 0 3px rgba(22,163,74,0.12)"
              : "0 0 0 3px rgba(239,68,68,0.12)",
          }}
        />
        <Typography
          variant="caption"
          sx={{
            fontFamily: tableFontFamily,
            fontWeight: 700,
            color: active ? "#166534" : "#991b1b",
            letterSpacing: 0.2,
          }}
        >
          {active ? "Active" : "Stopped"}
        </Typography>
      </Box>
    );
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
            Customer Subscriptions
          </Typography>
          <Typography
            variant="body2"
            sx={{ opacity: 0.9, fontFamily: tableFontFamily }}
          >
            Manage which services are attached to each customer.
          </Typography>
        </Box>

        <Stack direction="row" spacing={1.5} alignItems="center">
          <Button
            variant="outlined"
            size="small"
            onClick={handleOpenNew}
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
            + Add New Subscription
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
            Narrow down customer subscriptions.
          </Typography>
        </Stack>

        <Divider sx={{ mb: 2 }} />

        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={2}
          alignItems={{ xs: "stretch", md: "flex-end" }}
        >
          <TextField
            label="Customer (Code / Name)"
            variant="outlined"
            size="small"
            fullWidth
            value={customerFilter}
            onChange={(e) => setCustomerFilter(e.target.value)}
            InputProps={{
              sx: { fontFamily: tableFontFamily, fontSize: "0.9rem" },
            }}
            InputLabelProps={{
              sx: { fontFamily: tableFontFamily, fontSize: "0.85rem" },
            }}
          />
          <TextField
            label="Service (Code / Name)"
            variant="outlined"
            size="small"
            fullWidth
            value={serviceFilter}
            onChange={(e) => setServiceFilter(e.target.value)}
            InputProps={{
              sx: { fontFamily: tableFontFamily, fontSize: "0.9rem" },
            }}
            InputLabelProps={{
              sx: { fontFamily: tableFontFamily, fontSize: "0.85rem" },
            }}
          />
        </Stack>
      </Paper>

      <Paper sx={{ borderRadius: 2, boxShadow: 3, overflow: "hidden" }}>
        <TableContainer sx={{ maxHeight: "65vh", userSelect: "none" }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow sx={{ "& th": { backgroundColor: "#004d40" } }}>
                {renderSortableHeaderCell("Customer Code", "customer_username")}
                {renderSortableHeaderCell("Customer Name", "customer_fullname")}

                <TableCell
                  sx={{
                    fontFamily: tableFontFamily,
                    fontWeight: 700,
                    fontSize: "0.95rem",
                    color: "#fff",
                    whiteSpace: "nowrap",
                    textAlign: "center",
                  }}
                >
                  Status
                </TableCell>

                <TableCell
                  sx={{
                    fontFamily: tableFontFamily,
                    fontWeight: 700,
                    fontSize: "0.95rem",
                    color: "#fff",
                    whiteSpace: "nowrap",
                  }}
                >
                  Manager
                </TableCell>

                {renderSortableHeaderCell("Service Code", "service_code")}
                {renderSortableHeaderCell("Service Name", "service_name")}
                {renderSortableHeaderCell("Currency", "service_currency")}
                {renderSortableHeaderCell("Price", "amount")}
                <TableCell
                  sx={{
                    fontFamily: tableFontFamily,
                    fontWeight: 700,
                    fontSize: "0.95rem",
                    color: "#fff",
                    whiteSpace: "nowrap",
                    textAlign: "center",
                  }}
                >
                  Delete
                </TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {filteredAndSortedSubscriptions.length === 0 ? (
                <TableRow tabIndex={-1}>
                  <TableCell colSpan={9} align="center">
                    <Typography variant="body2" color="text.secondary">
                      No subscriptions found.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredAndSortedSubscriptions.map((s, index) => {
                  const fallbackCurrency =
                    s.service_currency ||
                    serviceOptions.find(
                      (x) => x.service_code === s.service_code
                    )?.service_currency ||
                    "USD";

                  return (
                    <TableRow
                      key={s.id}
                      hover
                      onDoubleClick={() => handleRowDoubleClick(s)}
                      sx={{
                        backgroundColor:
                          index % 2 === 0 ? "background.paper" : "#f5f5f5",
                        "&:hover": { backgroundColor: "#e0f2f1" },
                        cursor: "default",
                      }}
                    >
                      <TableCell sx={{ fontWeight: 600 }}>
                        {s.customer_username}
                      </TableCell>
                      <TableCell>{s.customer_fullname}</TableCell>

                      <TableCell sx={{ textAlign: "center" }}>
                        {renderStatusDot(s.status)}
                      </TableCell>

                      <TableCell>{renderManagerCell(s)}</TableCell>
                      <TableCell>{s.service_code}</TableCell>
                      <TableCell>{s.service_name}</TableCell>
                      <TableCell sx={{ fontWeight: 600, textAlign: "center" }}>
                        {fallbackCurrency}
                      </TableCell>
                      <TableCell sx={{ textAlign: "right" }}>
                        {s.amount.toFixed(2)}
                      </TableCell>

                      <TableCell sx={{ textAlign: "center" }}>
                        <Tooltip title="Delete subscription">
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              askDeleteSubscription(s);
                            }}
                            sx={{
                              color: "#c62828",
                              "&:hover": {
                                bgcolor: "rgba(198,40,40,0.08)",
                              },
                            }}
                          >
                            <DeleteOutlineIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* ===== Add/Edit Dialog ===== */}
      <Dialog
        open={openSubModal}
        onClose={handleCloseSubModal}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, p: 1, bgcolor: "#fafafa" } }}
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
          {modalMode === "add" ? "Add New Subscription" : "Edit Subscription"}
        </DialogTitle>

        <DialogContent sx={{ mt: 2 }}>
          <Paper
            elevation={0}
            sx={{
              p: 2,
              borderRadius: 2,
              border: "1px solid #e0e0e0",
              bgcolor: "#ffffff",
            }}
          >
            <Stack spacing={1.25} sx={{ mb: 1.5 }}>
              <Typography
                variant="subtitle2"
                sx={{
                  fontFamily: tableFontFamily,
                  fontWeight: 800,
                  color: "#00695c",
                  letterSpacing: 0.3,
                  textTransform: "uppercase",
                  fontSize: "0.8rem",
                }}
              >
                General Info
              </Typography>
              <Divider />
            </Stack>

            <Stack spacing={2}>
              <TextField
                label="Customer"
                fullWidth
                size="small"
                select
                value={newSub.customer_username}
                onChange={(e) =>
                  handleFieldChange("customer_username", e.target.value)
                }
                error={!!formErrors.customer_username}
                helperText={formErrors.customer_username || " "}
              >
                {customerOptions.map((c) => (
                  <MenuItem key={c.username} value={c.username}>
                    {c.fullname} ({c.username})
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                label="Service"
                fullWidth
                size="small"
                select
                value={newSub.service_code}
                onChange={(e) => handleServiceChange(e.target.value)}
                error={!!formErrors.service_code}
                helperText={formErrors.service_code || " "}
              >
                {serviceOptions.map((s) => (
                  <MenuItem key={s.service_code} value={s.service_code}>
                    {s.service_name} ({s.service_code})
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                label="Employee Manager"
                fullWidth
                size="small"
                select
                value={newSub.manager_empcode}
                onChange={(e) =>
                  handleFieldChange("manager_empcode", e.target.value)
                }
                helperText=" "
              >
                <MenuItem value="">
                  <em>None</em>
                </MenuItem>
                {employeeOptions.map((emp) => (
                  <MenuItem key={emp.empcode} value={emp.empcode}>
                    {emp.fullname}
                    {emp.username ? ` (${emp.username})` : ` (${emp.empcode})`}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                label="Billing Date"
                fullWidth
                size="small"
                type="date"
                value={newSub.billing_date}
                onChange={(e) =>
                  handleFieldChange("billing_date", e.target.value)
                }
                InputLabelProps={{ shrink: true }}
              />

              {/* ✅ Status Switch */}
              <FormControlLabel
                sx={{
                  mt: 0.5,
                  ml: 0,
                  px: 1,
                  py: 0.5,
                  borderRadius: 2,
                  border: "1px solid #e5e7eb",
                  bgcolor: newSub.status === "active" ? "#ecfdf5" : "#fff1f2",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  fontFamily: tableFontFamily,
                  ".MuiFormControlLabel-label": {
                    fontFamily: tableFontFamily,
                    fontSize: "0.95rem",
                    fontWeight: 700,
                    color:
                      newSub.status === "active" ? "#065f46" : "#9f1239",
                  },
                }}
                control={
                  <Switch
                    checked={newSub.status === "active"}
                    onChange={(e) =>
                      handleFieldChange(
                        "status",
                        e.target.checked ? "active" : "stopped"
                      )
                    }
                    sx={{
                      "& .MuiSwitch-switchBase.Mui-checked": {
                        color: "#10b981",
                      },
                      "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track":
                        {
                          backgroundColor: "#10b981",
                        },
                      "& .MuiSwitch-track": { backgroundColor: "#f43f5e" },
                    }}
                  />
                }
                label={
                  newSub.status === "active"
                    ? "Subscription Active"
                    : "Subscription Stopped"
                }
              />

              {/* Wish Money */}
              <FormControlLabel
                sx={{
                  mt: 0.5,
                  ml: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  fontFamily: tableFontFamily,
                  ".MuiFormControlLabel-label": {
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    fontFamily: tableFontFamily,
                    fontSize: "0.95rem",
                    fontWeight: 600,
                  },
                }}
                control={
                  <Switch
                    checked={wishMoney}
                    onChange={(e) => setWishMoney(e.target.checked)}
                  />
                }
                label={
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <img
                      src={wishMoneyLogo}
                      alt="Wish Money"
                      style={{ height: 32, width: "auto" }}
                    />
                    Wish Money
                  </span>
                }
              />

              <TextField
                label="Price"
                fullWidth
                size="small"
                type="number"
                value={newSub.amount}
                onChange={(e) => {
                  const val = e.target.value;
                  setNewSub((prev) => ({ ...prev, amount: val }));
                  setFormErrors((prev) => ({ ...prev, amount: undefined }));
                  setDuplicateError(null);
                }}
                error={!!formErrors.amount}
                helperText={formErrors.amount || " "}
                inputProps={{ min: 0, step: "any" }}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      {priceCurrency}
                    </InputAdornment>
                  ),
                }}
              />
            </Stack>
          </Paper>
        </DialogContent>

        <DialogActions
          sx={{
            p: 2,
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            gap: 1,
          }}
        >
          {duplicateError && (
            <Typography
              color="error"
              sx={{ fontWeight: 700, fontSize: "0.9rem" }}
            >
              {duplicateError}
            </Typography>
          )}

          <Box sx={{ display: "flex", gap: 1 }}>
            <Button onClick={handleCloseSubModal} sx={{ textTransform: "none" }}>
              Cancel
            </Button>

            <Button
              variant="contained"
              onClick={handleSaveSubscription}
              sx={{
                textTransform: "none",
                fontWeight: 600,
                bgcolor: "#00897b",
                "&:hover": { bgcolor: "#00796b" },
              }}
            >
              Save
            </Button>
          </Box>
        </DialogActions>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={cancelDeleteSubscription}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2.5,
            border: "1px solid #ffcdd2",
            bgcolor: "#fff5f5",
          },
        }}
      >
        <DialogTitle
          sx={{
            fontFamily: tableFontFamily,
            fontWeight: 700,
            fontSize: "1.05rem",
            color: "#b71c1c",
            pb: 1,
          }}
        >
          Delete subscription?
        </DialogTitle>

        <DialogContent sx={{ pt: 0 }}>
          <Typography
            sx={{
              fontFamily: tableFontFamily,
              fontSize: "0.95rem",
              color: "#444",
              mb: 1,
            }}
          >
            This action cannot be undone.
          </Typography>

          {deleteTarget && (
            <Box
              sx={{
                p: 1.2,
                borderRadius: 1.5,
                bgcolor: "white",
                border: "1px solid #ffe0e0",
              }}
            >
              <Typography sx={{ fontWeight: 700, fontFamily: tableFontFamily }}>
                {deleteTarget.customer_fullname}
              </Typography>
              <Typography
                variant="body2"
                sx={{ color: "text.secondary", fontFamily: tableFontFamily }}
              >
                {deleteTarget.service_name} ({deleteTarget.service_code})
              </Typography>
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={cancelDeleteSubscription}
            sx={{
              textTransform: "none",
              fontWeight: 600,
              fontFamily: tableFontFamily,
              color: "#555",
            }}
          >
            Cancel
          </Button>

          <Button
            variant="contained"
            onClick={confirmDeleteSubscription}
            sx={{
              textTransform: "none",
              fontWeight: 700,
              fontFamily: tableFontFamily,
              bgcolor: "#ef5350",
              color: "white",
              borderRadius: 2,
              px: 2.5,
              "&:hover": { bgcolor: "#e53935" },
            }}
            startIcon={<DeleteOutlineIcon />}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CustomerSubscriptionForm;
