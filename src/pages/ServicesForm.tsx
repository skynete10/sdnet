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
} from "@mui/material";
import axios from "axios";

const API_BASE_URL = "http://127.0.0.1:5100";

type ServiceStatus = "active" | "inactive";

type Service = {
  idservice: number;
  service_code: string;
  service_name: string;
  service_price: number;
  service_status: ServiceStatus;
};

type NewService = {
  service_code: string;
  service_name: string;
  service_price: string; // use string for controlled TextField
  service_status: ServiceStatus;
};

type FormErrors = Partial<Record<keyof NewService, string>>;

type SaveServicePayload = {
  idservice?: number;
  service_code: string;
  service_name: string;
  service_price: string | number;
  service_status: ServiceStatus;
};

type Order = "asc" | "desc";

type SortKey = keyof Pick<
  Service,
  "service_code" | "service_name" | "service_price" | "service_status"
>;

const tableFontFamily =
  '"Segoe UI", "Roboto", "Helvetica Neue", Arial, sans-serif';

// ---- API helper: save service (add or edit) ----
const saveService = async (data: SaveServicePayload) => {
  const res = await axios.post(
    `${API_BASE_URL}/api/services/saveservice`,
    data
  );
  return res.data;
};

const ServicesForm: React.FC = () => {
  const [services, setServices] = useState<Service[]>([]);

  const [nameFilter, setNameFilter] = useState("");
  const [codeFilter, setCodeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | ServiceStatus>("");

  const [error, setError] = useState<string | null>(null);

  const [order, setOrder] = useState<Order>("asc");
  const [orderBy, setOrderBy] = useState<SortKey>("service_name");

  // Modal: Add / Edit service
  const [openServiceModal, setOpenServiceModal] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");
  const [editingId, setEditingId] = useState<number | null>(null);

  const emptyServiceForm: NewService = {
    service_code: "",
    service_name: "",
    service_price: "",
    service_status: "active",
  };

  const [newService, setNewService] = useState<NewService>(emptyServiceForm);
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  // ---- Load services from API ----
  const loadServices = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/services`);
      const apiData = res.data as any[];

      const mapped: Service[] = apiData.map((row) => ({
        idservice: row.idservice,
        service_code: row.service_code ?? "",
        service_name: row.service_name ?? "",
        service_price:
          typeof row.service_price === "number"
            ? row.service_price
            : Number(row.service_price ?? 0),
        service_status: (row.service_status || "active") as ServiceStatus,
      }));

      setServices(mapped);
    } catch (e) {
      console.warn("Could not load services from API.", e);
    }
  };

  useEffect(() => {
    loadServices();
  }, []);

  const handleRequestSort = (property: SortKey) => {
    const isAsc = orderBy === property && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(property);
  };

  const filteredAndSortedServices = useMemo(() => {
    const filtered = services.filter((s) => {
      const nameMatch =
        !nameFilter ||
        s.service_name.toLowerCase().includes(nameFilter.toLowerCase());

      const codeMatch =
        !codeFilter ||
        s.service_code.toLowerCase().includes(codeFilter.toLowerCase());

      const statusMatch =
        !statusFilter || s.service_status === statusFilter;

      return nameMatch && codeMatch && statusMatch;
    });

    return [...filtered].sort((a, b) => {
      const aVal = a[orderBy];
      const bVal = b[orderBy];

      // numeric sort for price
      if (orderBy === "service_price") {
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
  }, [services, nameFilter, codeFilter, statusFilter, order, orderBy]);

  // ---- Open "Add New Service" modal + get max code ----
  const handleOpenNew = async () => {
    setModalMode("add");
    setEditingId(null);
    setFormErrors({});
    setError(null);

    let code = "";
    try {
      const res = await axios.get(`${API_BASE_URL}/api/services/maxcode`);
      code = res.data?.next_code || "";
    } catch (e) {
      console.warn("Could not fetch next service code, using empty string.", e);
    }

    setNewService({
      service_code: code,
      service_name: "",
      service_price: "",
      service_status: "active",
    });

    setOpenServiceModal(true);
  };

  const handleCloseServiceModal = () => {
    setOpenServiceModal(false);
    setNewService(emptyServiceForm);
    setFormErrors({});
    setEditingId(null);
  };

  // ---- Validation ----
  const validateForm = (): boolean => {
    const errors: FormErrors = {};

    if (!newService.service_name.trim()) {
      errors.service_name = "Service name is required";
    }

    if (!newService.service_price.trim()) {
      errors.service_price = "Price is required";
    } else if (isNaN(Number(newService.service_price))) {
      errors.service_price = "Price must be numeric";
    } else if (Number(newService.service_price) < 0) {
      errors.service_price = "Price cannot be negative";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveService = async () => {
    setError(null);

    if (!validateForm()) {
      return;
    }

    try {
      await saveService({
        idservice: modalMode === "edit" && editingId != null ? editingId : undefined,
        service_code: newService.service_code,
        service_name: newService.service_name,
        service_price: newService.service_price,
        service_status: newService.service_status,
      });

      handleCloseServiceModal();
      await loadServices();
    } catch (err: any) {
      console.error("Failed to save service", err);
      const apiError = err?.response?.data?.error;
      setError(apiError || "Failed to save service");
    }
  };

  // ---- Double-click row to edit ----
  const handleRowDoubleClick = (s: Service) => {
    setModalMode("edit");
    setEditingId(s.idservice);
    setFormErrors({});
    setError(null);

    setNewService({
      service_code: s.service_code || "",
      service_name: s.service_name || "",
      service_price:
        s.service_price != null ? s.service_price.toString() : "",
      service_status: s.service_status || "active",
    });

    setOpenServiceModal(true);
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

  const handleFieldChange = (key: keyof NewService, value: string) => {
    setNewService((prev) => ({ ...prev, [key]: value as any }));
    setFormErrors((prev) => ({ ...prev, [key]: undefined }));
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
            Services
          </Typography>
          <Typography
            variant="body2"
            sx={{ opacity: 0.9, fontFamily: tableFontFamily }}
          >
            Manage internet and other services in your system.
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
            + Add New Service
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
            Type to narrow down services.
          </Typography>
        </Stack>

        <Divider sx={{ mb: 2 }} />

        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={2}
          alignItems={{ xs: "stretch", md: "flex-end" }}
        >
          <TextField
            label="Service Name"
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
            label="Service Code"
            variant="outlined"
            size="small"
            fullWidth
            value={codeFilter}
            onChange={(e) => setCodeFilter(e.target.value)}
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
            label="Status"
            variant="outlined"
            size="small"
            select
            fullWidth
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as "" | ServiceStatus)
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
            <MenuItem value="">All</MenuItem>
            <MenuItem value="active">Active</MenuItem>
            <MenuItem value="inactive">Inactive</MenuItem>
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
      textAlign: "center",        // 🔥 centers body + header
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
                {renderSortableHeaderCell("Service Code", "service_code")}
                {renderSortableHeaderCell("Service Name", "service_name")}
                {renderSortableHeaderCell("Price", "service_price")}
                {renderSortableHeaderCell("Status", "service_status")}
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredAndSortedServices.length === 0 ? (
                <TableRow tabIndex={-1}>
                  <TableCell colSpan={4} align="center">
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ fontFamily: tableFontFamily }}
                    >
                      No services found.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredAndSortedServices.map((s, index) => (
                  <TableRow
                    key={s.idservice}
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
                    <TableCell
                      sx={{
                        fontSize: "0.9rem",
                        fontWeight: 600,
                      }}
                    >
                      {s.service_code}
                    </TableCell>
                    <TableCell
                      sx={{
                        fontSize: "0.9rem",
                        fontWeight: 500,
                      }}
                    >
                      {s.service_name}
                    </TableCell>
                    <TableCell
                      sx={{
                        fontSize: "0.9rem",
                        fontWeight: 500,
                        textAlign: "right",
                      }}
                    >
                      {s.service_price.toFixed(2)}
                    </TableCell>
                    <TableCell
                      sx={{
                        fontSize: "0.9rem",
                        fontWeight: 500,
                        textTransform: "capitalize",
                      }}
                    >
                      {s.service_status}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Add / Edit Service Modal */}
      <Dialog
        open={openServiceModal}
        onClose={handleCloseServiceModal}
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
          {modalMode === "add" ? "Add New Service" : "Edit Service"}
        </DialogTitle>

        <DialogContent sx={{ mt: 2 }}>
          <Stack spacing={2}>
            <TextField
              label="Service Code"
              fullWidth
              size="small"
              value={newService.service_code}
              disabled
              InputProps={{
                sx: {
                  fontFamily: tableFontFamily,
                  backgroundColor: "#e0e0e0",
                  borderRadius: 1,
                },
              }}
              InputLabelProps={{
                sx: { fontFamily: tableFontFamily },
              }}
            />
            <TextField
              label="Service Name"
              fullWidth
              size="small"
              value={newService.service_name}
              onChange={(e) =>
                handleFieldChange("service_name", e.target.value)
              }
              error={!!formErrors.service_name}
              helperText={formErrors.service_name || " "}
              InputProps={{
                sx: {
                  fontFamily: tableFontFamily,
                },
              }}
              InputLabelProps={{
                sx: { fontFamily: tableFontFamily },
              }}
            />
            <TextField
              label="Price"
              fullWidth
              size="small"
              type="number"
              value={newService.service_price}
              onChange={(e) =>
                handleFieldChange("service_price", e.target.value)
              }
              error={!!formErrors.service_price}
              helperText={formErrors.service_price || " "}
              InputProps={{
                sx: {
                  fontFamily: tableFontFamily,
                },
              }}
              InputLabelProps={{
                sx: { fontFamily: tableFontFamily },
              }}
            />
            <TextField
              label="Status"
              fullWidth
              size="small"
              select
              value={newService.service_status}
              onChange={(e) =>
                handleFieldChange(
                  "service_status",
                  e.target.value as ServiceStatus
                )
              }
              InputProps={{
                sx: {
                  fontFamily: tableFontFamily,
                },
              }}
              InputLabelProps={{
                sx: { fontFamily: tableFontFamily },
              }}
            >
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="inactive">Inactive</MenuItem>
            </TextField>
          </Stack>
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={handleCloseServiceModal}
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
            onClick={handleSaveService}
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

export default ServicesForm;
