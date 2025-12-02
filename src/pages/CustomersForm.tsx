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
  Menu,
} from "@mui/material";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import DownloadIcon from "@mui/icons-material/Download";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import HomeWorkOutlinedIcon from "@mui/icons-material/HomeWorkOutlined";
import axios from "axios";
import * as XLSX from "xlsx";

// ⚠️ Adjust this path to where your logo actually is
import wishMoneyLogo from "../assets/wishmoneylogo.png";

const API_BASE_URL = "http://127.0.0.1:5100";

type CustomerStatus = "active" | "inactive";

type Customer = {
  id: number;
  fullname: string;
  mobile: string;
  username: string;
  city: string;
  village: string;
  street: string;
  building: string;
  status?: CustomerStatus; // "active" | "inactive"
  wish?: boolean; // Wish Money flag
};

type NewCustomer = {
  fullname: string;
  mobile: string;
  username: string;
  city: string;
  village: string;
  street: string;
  building: string;
};

type FormErrors = Partial<Record<keyof NewCustomer, string>>;

type SaveCustomerPayload = {
  id?: number;
  fullname: string;
  mobile: string;
  username: string;
  city: string;
  village?: string;
  street?: string;
  building?: string;
};

type Order = "asc" | "desc";

type SortKey = keyof Pick<
  Customer,
  | "fullname"
  | "mobile"
  | "username"
  | "city"
  | "village"
  | "street"
  | "building"
  | "status"
>;

const tableFontFamily =
  '"Segoe UI", "Roboto", "Helvetica Neue", Arial, sans-serif';

const getFirstCityWord = (city: string | null | undefined): string => {
  if (!city) return "";
  return city.split("-")[0].trim();
};

// ---- API helpers ----
const saveCustomer = async (data: SaveCustomerPayload) => {
  const res = await axios.post(
    `${API_BASE_URL}/api/customers/savecustomer`,
    data
  );
  return res.data;
};

const updateCustomerStatus = async (id: number, status: CustomerStatus) => {
  await axios.post(`${API_BASE_URL}/api/customers/update-status`, {
    id,
    status,
  });
};

const updateCustomerWish = async (id: number, wish: boolean) => {
  await axios.post(`${API_BASE_URL}/api/customers/update-wish`, {
    id,
    wish,
  });
};

const CustomersForm: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [nameFilter, setNameFilter] = useState("");
  const [mobileFilter, setMobileFilter] = useState("");
  const [addressFilter, setAddressFilter] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [order, setOrder] = useState<Order>("asc");
  const [orderBy, setOrderBy] = useState<SortKey>("fullname");

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Modal: Add / Edit customer
  const [openNewCustomer, setOpenNewCustomer] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");
  const [editingId, setEditingId] = useState<number | null>(null);

  const emptyCustomerForm: NewCustomer = {
    fullname: "",
    mobile: "",
    username: "",
    city: "",
    village: "",
    street: "",
    building: "",
  };

  const [newCustomer, setNewCustomer] = useState<NewCustomer>(
    emptyCustomerForm
  );
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  // Full Name autofocus ref
  const fullNameRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (openNewCustomer) {
      const t = setTimeout(() => fullNameRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [openNewCustomer]);

  // ---- Status menu state ----
  const [statusMenuAnchorEl, setStatusMenuAnchorEl] =
    useState<HTMLElement | null>(null);
  const [statusMenuCustomer, setStatusMenuCustomer] = useState<Customer | null>(
    null
  );

  const handleOpenStatusMenu = (
    event: React.MouseEvent<HTMLElement>,
    customer: Customer
  ) => {
    setStatusMenuAnchorEl(event.currentTarget);
    setStatusMenuCustomer(customer);
  };

  const handleCloseStatusMenu = () => {
    setStatusMenuAnchorEl(null);
    setStatusMenuCustomer(null);
  };

  const handleChangeStatus = async (newStatus: CustomerStatus) => {
    if (!statusMenuCustomer) return;

    try {
      await updateCustomerStatus(statusMenuCustomer.id, newStatus);

      setCustomers((prev) =>
        prev.map((c) =>
          c.id === statusMenuCustomer.id ? { ...c, status: newStatus } : c
        )
      );
    } catch (err) {
      console.error("Failed to update status", err);
      alert("Failed to update status");
    } finally {
      handleCloseStatusMenu();
    }
  };

  const handleOpenNew = () => {
    setModalMode("add");
    setEditingId(null);
    setNewCustomer(emptyCustomerForm);
    setFormErrors({});
    setOpenNewCustomer(true);
  };

  const handleCloseNew = () => {
    setOpenNewCustomer(false);
    setNewCustomer(emptyCustomerForm);
    setFormErrors({});
    setEditingId(null);
  };

  // ---- Load customers from API (updated) ----
  const loadCustomers = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/customers`);
      const apiData = res.data as any[];

      const mapped: Customer[] = apiData.map((row) => {
        let status: CustomerStatus = "active";

        if (row.status === 0 || row.status === "0") {
          status = "inactive";
        } else if (row.customer_status === 0 || row.customer_status === "0") {
          status = "inactive";
        }

        const wish =
          row.wish === 1 ||
          row.wish === "1" ||
          row.wish === true ||
          row.is_wish === 1 ||
          row.is_wish === "1" ||
          row.is_wish === true;

        return {
          id: row.id,
          fullname: row.fullname,
          mobile: row.mobile,
          username: row.username,
          city: row.city ?? "",
          village: row.village ?? "",
          street: row.street ?? "",
          building: row.building ?? "",
          status,
          wish,
        };
      });

      setCustomers(mapped);
    } catch (e) {
      console.warn("Could not load customers from API.", e);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  const handleRequestSort = (property: SortKey) => {
    const isAsc = orderBy === property && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(property);
  };

  // ---- Build dropdown options from first word of each city ----
  const cityOptions = useMemo(() => {
    const set = new Set<string>();
    customers.forEach((c) => {
      const firstWord = getFirstCityWord(c.city);
      if (firstWord) {
        set.add(firstWord);
      }
    });
    return Array.from(set).sort();
  }, [customers]);

  const filteredAndSortedCustomers = useMemo(() => {
    const filtered = customers.filter((c) => {
      const nameMatch =
        !nameFilter ||
        c.fullname.toLowerCase().includes(nameFilter.toLowerCase()) ||
        c.username.toLowerCase().includes(nameFilter.toLowerCase());

      const mobileMatch =
        !mobileFilter ||
        c.mobile.toLowerCase().includes(mobileFilter.toLowerCase());

      const firstCityWord = getFirstCityWord(c.city).toLowerCase();

      const addressMatch =
        !addressFilter || firstCityWord === addressFilter.toLowerCase();

      return nameMatch && mobileMatch && addressMatch;
    });

    return [...filtered].sort((a, b) => {
      const aVal = (a[orderBy] || "").toString().toLowerCase();
      const bVal = (b[orderBy] || "").toString().toLowerCase();

      if (aVal < bVal) return order === "asc" ? -1 : 1;
      if (aVal > bVal) return order === "asc" ? 1 : -1;
      return 0;
    });
  }, [customers, nameFilter, mobileFilter, addressFilter, order, orderBy]);

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

      await axios.post(`${API_BASE_URL}/api/customers/import-excel`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      await loadCustomers();
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
    if (!filteredAndSortedCustomers.length) return;

    const exportData = filteredAndSortedCustomers.map((c) => ({
      "Full Name": c.fullname,
      Mobile: c.mobile,
      Username: c.username,
      City: c.city,
      Village: c.village,
      Street: c.street,
      Building: c.building,
      Status: c.status ?? "active",
      "Wish Money": c.wish ? "Yes" : "No",
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Customers");
    XLSX.writeFile(workbook, "customers.xlsx");
  };

  // ---- Validation ----
  const validateForm = (): boolean => {
    const errors: FormErrors = {};

    if (!newCustomer.fullname.trim()) {
      errors.fullname = "Full name is required";
    }
    if (!newCustomer.mobile.trim()) {
      errors.mobile = "Mobile is required";
    }
    if (!newCustomer.username.trim()) {
      errors.username = "Username is required";
    }
    if (!newCustomer.city.trim()) {
      errors.city = "City is required";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveCustomer = async () => {
    if (!validateForm()) return;

    try {
      await saveCustomer({
        id: modalMode === "edit" && editingId != null ? editingId : undefined,
        fullname: newCustomer.fullname,
        mobile: newCustomer.mobile,
        username: newCustomer.username,
        city: newCustomer.city,
        village: newCustomer.village,
        street: newCustomer.street,
        building: newCustomer.building,
      });

      handleCloseNew();
      loadCustomers();
    } catch (err: any) {
      console.error("Failed to save customer", err);
      alert("Failed to save customer");
    }
  };

  // ---- Double-click row to edit ----
  const handleRowDoubleClick = (c: Customer) => {
    setModalMode("edit");
    setEditingId(c.id);
    setNewCustomer({
      fullname: c.fullname,
      mobile: c.mobile,
      username: c.username,
      city: c.city,
      village: c.village,
      street: c.street,
      building: c.building,
    });
    setFormErrors({});
    setOpenNewCustomer(true);
  };

  // ---- Toggle Wish Money flag (local state only) ----
  const handleToggleWish = async (customer: Customer) => {
  const newWish = !customer.wish; // if undefined, becomes true

  try {
    await updateCustomerWish(customer.id, newWish);

    setCustomers((prev) =>
      prev.map((c) =>
        c.id === customer.id ? { ...c, wish: newWish } : c
      )
    );
  } catch (err) {
    console.error("Failed to update wish", err);
    alert("Failed to update Wish Money flag");
  }
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

  const handleFieldChange = (key: keyof NewCustomer, value: string) => {
    setNewCustomer((prev) => ({ ...prev, [key]: value }));
    setFormErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const renderStatusChip = (status?: CustomerStatus) => {
    const effectiveStatus: CustomerStatus =
      status === "inactive" ? "inactive" : "active";

    const isActive = effectiveStatus === "active";

    return (
      <Stack direction="row" alignItems="center" spacing={1}>
        <Box
          sx={{
            width: 10,
            height: 10,
            borderRadius: "50%",
            bgcolor: isActive ? "#43a047" : "#e53935",
            boxShadow: "0 0 0 2px rgba(0,0,0,0.08)",
          }}
        />
        <Typography
          variant="body2"
          sx={{
            fontFamily: tableFontFamily,
            fontWeight: 600,
            color: isActive ? "#2e7d32" : "#c62828",
            fontSize: "0.8rem",
          }}
        >
          {isActive ? "Active" : "Inactive"}
        </Typography>
      </Stack>
    );
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
            Customers
          </Typography>
          <Typography
            variant="body2"
            sx={{ opacity: 0.9, fontFamily: tableFontFamily }}
          >
            Manage and sync customers from Excel with your database.
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
            + Add New Customer
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
            disabled={!filteredAndSortedCustomers.length}
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
            Type / select to narrow down results. Export respects your filters.
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
            select
            label="City"
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
          >
            <MenuItem value="">
              <em>All cities</em>
            </MenuItem>
            {cityOptions.map((city) => (
              <MenuItem key={city} value={city}>
                {city}
              </MenuItem>
            ))}
          </TextField>
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
                {renderSortableHeaderCell("Full Name", "fullname")}
                {renderSortableHeaderCell("Mobile", "mobile")}
                {renderSortableHeaderCell("Username", "username")}
                {renderSortableHeaderCell("City", "city")}
                {renderSortableHeaderCell("Village", "village")}
                {renderSortableHeaderCell("Street", "street")}
                {renderSortableHeaderCell("Building", "building")}
                {renderSortableHeaderCell("Status", "status")}
                {/* Wish Money column (not sortable) */}
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
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                    }}
                  >
                    <Box
                      component="img"
                      src={wishMoneyLogo}
                      alt="Wish Money"
                      sx={{ height: 18 }}
                    />
                    <Typography
                      component="span"
                      sx={{
                        fontFamily: tableFontFamily,
                        fontWeight: 700,
                        fontSize: "0.9rem",
                      }}
                    >
                      Wish
                    </Typography>
                  </Box>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredAndSortedCustomers.length === 0 ? (
                <TableRow tabIndex={-1}>
                  <TableCell colSpan={9} align="center">
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ fontFamily: tableFontFamily }}
                    >
                      No customers found.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredAndSortedCustomers.map((c, index) => (
                  <TableRow
                    key={c.id}
                    tabIndex={-1}
                    hover
                    onDoubleClick={() => handleRowDoubleClick(c)}
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
                      {c.fullname}
                    </TableCell>
                    <TableCell sx={{ fontSize: "0.9rem", fontWeight: 500 }}>
                      {c.mobile}
                    </TableCell>
                    <TableCell sx={{ fontSize: "0.9rem", fontWeight: 500 }}>
                      {c.username}
                    </TableCell>
                    <TableCell sx={{ fontSize: "0.9rem", fontWeight: 500 }}>
                      {c.city}
                    </TableCell>
                    <TableCell sx={{ fontSize: "0.9rem", fontWeight: 500 }}>
                      {c.village}
                    </TableCell>
                    <TableCell sx={{ fontSize: "0.9rem", fontWeight: 500 }}>
                      {c.street}
                    </TableCell>
                    <TableCell sx={{ fontSize: "0.9rem", fontWeight: 500 }}>
                      {c.building}
                    </TableCell>
                    <TableCell
                      sx={{
                        fontSize: "0.9rem",
                        fontWeight: 500,
                        cursor: "pointer",
                      }}
                      onClick={(e) => handleOpenStatusMenu(e, c)}
                    >
                      {renderStatusChip(c.status)}
                    </TableCell>
                    {/* Wish Money cell - red/green circle */}
                    <TableCell
  sx={{
    textAlign: "center",
    cursor: "pointer",
  }}
  onClick={() => handleToggleWish(c)}
>
  <Box
    sx={{
      width: 16,
      height: 16,
      borderRadius: "50%",
      mx: "auto",
      bgcolor: c.wish ? "#43a047" : "#e53935", 
      boxShadow: "0 0 0 2px rgba(0,0,0,0.08)",
    }}
  />
</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Status dropdown menu */}
      <Menu
        anchorEl={statusMenuAnchorEl}
        open={Boolean(statusMenuAnchorEl)}
        onClose={handleCloseStatusMenu}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        transformOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <MenuItem onClick={() => handleChangeStatus("active")}>
          {renderStatusChip("active")}
        </MenuItem>
        <MenuItem onClick={() => handleChangeStatus("inactive")}>
          {renderStatusChip("inactive")}
        </MenuItem>
      </Menu>

      {/* Add / Edit Customer Modal */}
      <Dialog
        open={openNewCustomer}
        onClose={handleCloseNew}
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
          {modalMode === "add" ? "Add New Customer" : "Edit Customer"}
        </DialogTitle>

        <DialogContent sx={{ mt: 2 }}>
          <Stack spacing={2.2}>
            {/* General Info Section */}
            <Box
              sx={{
                p: 2,
                borderRadius: 2,
                bgcolor: "white",
                border: "1px solid #e0e0e0",
                boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
              }}
            >
              <Stack
                direction="row"
                alignItems="center"
                spacing={1}
                sx={{ mb: 1 }}
              >
                <PersonOutlineIcon sx={{ color: "#00695c" }} />
                <Typography
                  variant="subtitle1"
                  sx={{
                    fontFamily: tableFontFamily,
                    fontWeight: 700,
                    color: "#00695c",
                  }}
                >
                  General Info
                </Typography>
              </Stack>

              <Divider sx={{ mb: 2 }} />

              <Stack spacing={2}>
                {/* Full name */}
                <TextField
                  label="Full Name"
                  fullWidth
                  size="small"
                  value={newCustomer.fullname}
                  onChange={(e) =>
                    handleFieldChange("fullname", e.target.value)
                  }
                  error={!!formErrors.fullname}
                  helperText={formErrors.fullname || " "}
                  autoFocus
                  inputRef={fullNameRef}
                  InputProps={{ sx: { fontFamily: tableFontFamily } }}
                  InputLabelProps={{ sx: { fontFamily: tableFontFamily } }}
                />

                {/* Mobile + Username */}
                <Box
                  sx={{
                    display: "flex",
                    gap: 2,
                    flexDirection: { xs: "column", md: "row" },
                  }}
                >
                  <TextField
                    label="Mobile"
                    fullWidth
                    size="small"
                    value={newCustomer.mobile}
                    onChange={(e) =>
                      handleFieldChange("mobile", e.target.value)
                    }
                    error={!!formErrors.mobile}
                    helperText={formErrors.mobile || " "}
                    InputProps={{ sx: { fontFamily: tableFontFamily } }}
                    InputLabelProps={{ sx: { fontFamily: tableFontFamily } }}
                  />

                  <TextField
                    label="Username"
                    fullWidth
                    size="small"
                    value={newCustomer.username}
                    onChange={(e) =>
                      handleFieldChange("username", e.target.value)
                    }
                    error={!!formErrors.username}
                    helperText={formErrors.username || " "}
                    InputProps={{ sx: { fontFamily: tableFontFamily } }}
                    InputLabelProps={{ sx: { fontFamily: tableFontFamily } }}
                  />
                </Box>
              </Stack>
            </Box>

            {/* Address Section */}
            <Box
              sx={{
                p: 2,
                borderRadius: 2,
                bgcolor: "white",
                border: "1px solid #e0e0e0",
                boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
              }}
            >
              <Stack
                direction="row"
                alignItems="center"
                spacing={1}
                sx={{ mb: 1 }}
              >
                <HomeWorkOutlinedIcon sx={{ color: "#00695c" }} />
                <Typography
                  variant="subtitle1"
                  sx={{
                    fontFamily: tableFontFamily,
                    fontWeight: 700,
                    color: "#00695c",
                  }}
                >
                  Address
                </Typography>
              </Stack>

              <Divider sx={{ mb: 2 }} />

              <Stack spacing={2}>
                {/* City + Village */}
                <Box
                  sx={{
                    display: "flex",
                    gap: 2,
                    flexDirection: { xs: "column", md: "row" },
                  }}
                >
                  <TextField
                    label="City"
                    fullWidth
                    size="small"
                    value={newCustomer.city}
                    onChange={(e) =>
                      handleFieldChange("city", e.target.value)
                    }
                    error={!!formErrors.city}
                    helperText={formErrors.city || " "}
                    InputProps={{ sx: { fontFamily: tableFontFamily } }}
                    InputLabelProps={{ sx: { fontFamily: tableFontFamily } }}
                  />

                  <TextField
                    label="Village"
                    fullWidth
                    size="small"
                    value={newCustomer.village}
                    onChange={(e) =>
                      handleFieldChange("village", e.target.value)
                    }
                    InputProps={{ sx: { fontFamily: tableFontFamily } }}
                    InputLabelProps={{ sx: { fontFamily: tableFontFamily } }}
                  />
                </Box>

                {/* Street + Building */}
                <Box
                  sx={{
                    display: "flex",
                    gap: 2,
                    flexDirection: { xs: "column", md: "row" },
                  }}
                >
                  <TextField
                    label="Street"
                    fullWidth
                    size="small"
                    value={newCustomer.street}
                    onChange={(e) =>
                      handleFieldChange("street", e.target.value)
                    }
                    InputProps={{ sx: { fontFamily: tableFontFamily } }}
                    InputLabelProps={{ sx: { fontFamily: tableFontFamily } }}
                  />

                  <TextField
                    label="Building"
                    fullWidth
                    size="small"
                    value={newCustomer.building}
                    onChange={(e) =>
                      handleFieldChange("building", e.target.value)
                    }
                    InputProps={{ sx: { fontFamily: tableFontFamily } }}
                    InputLabelProps={{ sx: { fontFamily: tableFontFamily } }}
                  />
                </Box>
              </Stack>
            </Box>
          </Stack>
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={handleCloseNew}
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
            onClick={handleSaveCustomer}
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

export default CustomersForm;
