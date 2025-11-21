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
} from "@mui/material";
import axios from "axios";

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
  billing_date?: string | null; // backend field (YYYY-MM-DD)
  service_currency?: Currency | null; // for grid display
};

type NewSubscription = {
  customer_username: string;
  service_code: string;
  amount: string;
  billing_date: string; // full date in "YYYY-MM-DD"
};

type FormErrors = Partial<Record<keyof NewSubscription, string>>;

type SaveSubscriptionPayload = {
  id?: number;
  customer_username: string;
  service_code: string;
  amount: string | number;
  billing_date?: string;
};

type SortKey = keyof Pick<
  CustomerSubscription,
  | "customer_username"
  | "customer_fullname"
  | "service_code"
  | "service_name"
  | "amount"
  | "billing_date"
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

const saveSubscription = async (data: SaveSubscriptionPayload) => {
  const res = await axios.post(
    `${API_BASE_URL}/api/customer-subscriptions/savesubscription`,
    data
  );
  return res.data;
};

// helper for "YYYY-MM" (used for filter)
const getCurrentMonthValue = (): string => {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${d.getFullYear()}-${m}`;
};

// helper for "YYYY-MM-DD" (used for dialog)
const getCurrentDateValue = (): string => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

// pretty display for grid
const formatBillingDate = (val?: string | null) => {
  if (!val) return "";
  // expects YYYY-MM-DD
  try {
    const d = new Date(val);
    if (Number.isNaN(d.getTime())) return val.toString().slice(0, 10);
    return d.toLocaleDateString();
  } catch {
    return val.toString().slice(0, 10);
  }
};

const CustomerSubscriptionForm: React.FC = () => {
  const [subscriptions, setSubscriptions] = useState<CustomerSubscription[]>([]);
  const [customerFilter, setCustomerFilter] = useState("");
  const [serviceFilter, setServiceFilter] = useState("");

  const [monthFilter, setMonthFilter] = useState<string>(() =>
    getCurrentMonthValue()
  );

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
  };

  const [newSub, setNewSub] = useState<NewSubscription>(emptySubForm);
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  const [customerOptions, setCustomerOptions] = useState<CustomerOption[]>([]);
  const [serviceOptions, setServiceOptions] = useState<ServiceOption[]>([]);
  const [priceCurrency, setPriceCurrency] = useState<Currency>("USD");

  const loadSubscriptions = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/customer-subscriptions`);
      const apiData = res.data as any[];

      const mapped: CustomerSubscription[] = apiData.map((row) => ({
        id: row.id,
        customer_username: row.customer_username ?? "",
        customer_fullname: row.customer_fullname ?? "",
        service_code: row.service_code ?? "",
        service_name: row.service_name ?? "",
        amount:
          typeof row.amount === "number" ? row.amount : Number(row.amount ?? 0),
        billing_date: row.billing_date ?? null,
        service_currency: (row.service_currency ||
          row.currency ||
          null) as Currency | null,
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
        username: row.username ?? "",
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
        service_code: row.service_code ?? "",
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

  useEffect(() => {
    loadSubscriptions();
    loadCustomers();
    loadServices();
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

      const monthMatch =
        !monthFilter ||
        (!!s.billing_date &&
          s.billing_date.toString().startsWith(monthFilter)); // YYYY-MM match

      return customerMatch && serviceMatch && monthMatch;
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

      if (orderBy === "billing_date") {
        const aTime = aVal ? new Date(String(aVal)).getTime() : 0;
        const bTime = bVal ? new Date(String(bVal)).getTime() : 0;
        if (aTime < bTime) return order === "asc" ? -1 : 1;
        if (aTime > bTime) return order === "asc" ? 1 : -1;
        return 0;
      }

      const aStr = (aVal ?? "").toString().toLowerCase();
      const bStr = (bVal ?? "").toString().toLowerCase();

      if (aStr < bStr) return order === "asc" ? -1 : 1;
      if (aStr > bStr) return order === "asc" ? 1 : -1;
      return 0;
    });
  }, [
    subscriptions,
    customerFilter,
    serviceFilter,
    monthFilter,
    order,
    orderBy,
  ]);

  const handleOpenNew = () => {
    setModalMode("add");
    setEditingId(null);
    setFormErrors({});
    setError(null);
    setNewSub({
      ...emptySubForm,
      billing_date: getCurrentDateValue(),
    });
    setPriceCurrency("USD");
    setOpenSubModal(true);
  };

  const handleCloseSubModal = () => {
    setOpenSubModal(false);
    setNewSub(emptySubForm);
    setFormErrors({});
    setEditingId(null);
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
    if (!validateForm()) return;

    try {
      await saveSubscription({
        id: modalMode === "edit" && editingId != null ? editingId : undefined,
        customer_username: newSub.customer_username,
        service_code: newSub.service_code,
        amount: newSub.amount,
        billing_date: newSub.billing_date || undefined,
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

    setNewSub({
      customer_username: s.customer_username,
      service_code: s.service_code,
      amount: s.amount != null ? s.amount.toString() : "",
      billing_date: s.billing_date
        ? s.billing_date.toString().slice(0, 10)
        : getCurrentDateValue(),
    });

    const found = serviceOptions.find(
      (opt) => opt.service_code === s.service_code
    );
    setPriceCurrency(found?.service_currency || s.service_currency || "USD");

    setOpenSubModal(true);
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
        }}
      >
        {label}
      </TableSortLabel>
    </TableCell>
  );

  const handleFieldChange = (key: keyof NewSubscription, value: string) => {
    setNewSub((prev) => ({ ...prev, [key]: value }));
    setFormErrors((prev) => ({ ...prev, [key]: undefined }));
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

  const getRowCurrency = (s: CustomerSubscription): Currency => {
    if (s.service_currency) return s.service_currency;
    const found = serviceOptions.find(
      (opt) => opt.service_code === s.service_code
    );
    return found?.service_currency || "USD";
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
            label="Month"
            variant="outlined"
            size="small"
            type="month"
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
            InputProps={{
              sx: {
                fontFamily: tableFontFamily,
                fontSize: "0.9rem",
              },
            }}
            InputLabelProps={{
              shrink: true,
              sx: {
                fontFamily: tableFontFamily,
                fontSize: "0.85rem",
              },
            }}
            sx={{ minWidth: 180 }}
          />

          <TextField
            label="Customer (Code / Name)"
            variant="outlined"
            size="small"
            fullWidth
            value={customerFilter}
            onChange={(e) => setCustomerFilter(e.target.value)}
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
            label="Service (Code / Name)"
            variant="outlined"
            size="small"
            fullWidth
            value={serviceFilter}
            onChange={(e) => setServiceFilter(e.target.value)}
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
                textAlign: "center",
              },
              "& th .MuiTableSortLabel-root": {
                marginLeft: "auto",
                marginRight: "auto",
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
                {renderSortableHeaderCell("Customer Code", "customer_username")}
                {renderSortableHeaderCell(
                  "Customer Name",
                  "customer_fullname"
                )}
                {renderSortableHeaderCell("Service Code", "service_code")}
                {renderSortableHeaderCell("Service Name", "service_name")}
                {renderSortableHeaderCell("Price", "amount")}
                {renderSortableHeaderCell("Billing Date", "billing_date")}
                <TableCell
                  sx={{
                    fontFamily: tableFontFamily,
                    fontWeight: 700,
                    fontSize: "0.95rem",
                    color: "#fff",
                    whiteSpace: "nowrap",
                    userSelect: "none",
                    textAlign: "center",
                  }}
                >
                  Currency
                </TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {filteredAndSortedSubscriptions.length === 0 ? (
                <TableRow tabIndex={-1}>
                  <TableCell colSpan={7} align="center">
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ fontFamily: tableFontFamily }}
                    >
                      No subscriptions found.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredAndSortedSubscriptions.map((s, index) => (
                  <TableRow
                    key={s.id}
                    tabIndex={-1}
                    hover
                    onDoubleClick={() => handleRowDoubleClick(s)}
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
                    <TableCell sx={{ fontSize: "0.9rem", fontWeight: 600 }}>
                      {s.customer_username}
                    </TableCell>
                    <TableCell sx={{ fontSize: "0.9rem", fontWeight: 500 }}>
                      {s.customer_fullname}
                    </TableCell>
                    <TableCell sx={{ fontSize: "0.9rem", fontWeight: 500 }}>
                      {s.service_code}
                    </TableCell>
                    <TableCell sx={{ fontSize: "0.9rem", fontWeight: 500 }}>
                      {s.service_name}
                    </TableCell>
                    <TableCell
                      sx={{
                        fontSize: "0.9rem",
                        fontWeight: 500,
                        textAlign: "right",
                      }}
                    >
                      {s.amount.toFixed(2)}
                    </TableCell>
                    <TableCell sx={{ fontSize: "0.9rem", fontWeight: 500 }}>
                      {formatBillingDate(s.billing_date)}
                    </TableCell>
                    <TableCell sx={{ fontSize: "0.9rem", fontWeight: 600 }}>
                      {getRowCurrency(s)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Dialog
        open={openSubModal}
        onClose={handleCloseSubModal}
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
          {modalMode === "add" ? "Add New Subscription" : "Edit Subscription"}
        </DialogTitle>

        <DialogContent sx={{ mt: 2 }}>
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
              InputProps={{ sx: { fontFamily: tableFontFamily } }}
              InputLabelProps={{ sx: { fontFamily: tableFontFamily } }}
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
              InputProps={{ sx: { fontFamily: tableFontFamily } }}
              InputLabelProps={{ sx: { fontFamily: tableFontFamily } }}
            >
              {serviceOptions.map((s) => (
                <MenuItem key={s.service_code} value={s.service_code}>
                  {s.service_name} ({s.service_code})
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
              InputProps={{
                sx: {
                  fontFamily: tableFontFamily,
                  fontSize: "0.9rem",
                },
              }}
              InputLabelProps={{
                shrink: true,
                sx: { fontFamily: tableFontFamily },
              }}
            />

            <TextField
              label="Price"
              fullWidth
              size="small"
              type="number"
              value={newSub.amount}
              onChange={(e) => handleFieldChange("amount", e.target.value)}
              error={!!formErrors.amount}
              helperText={formErrors.amount || " "}
              disabled
              InputProps={{
                sx: { fontFamily: tableFontFamily },
                endAdornment: (
                  <InputAdornment position="end">
                    {priceCurrency}
                  </InputAdornment>
                ),
              }}
              InputLabelProps={{ sx: { fontFamily: tableFontFamily } }}
            />
          </Stack>
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={handleCloseSubModal}
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
            onClick={handleSaveSubscription}
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

export default CustomerSubscriptionForm;
