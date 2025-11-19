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
} from "@mui/material";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import DownloadIcon from "@mui/icons-material/Download";
import axios from "axios";
import * as XLSX from "xlsx";

const API_BASE_URL = "http://127.0.0.1:5100";

type Supplier = {
  id: number;
  supplier_name: string;
  contact_person: string;
  mobile: string;
  supplier_code: string;
  email: string;
  category: string;
  city: string;
  village: string;
  street: string;
  building: string;
};

type NewSupplier = {
  supplier_name: string;
  contact_person: string;
  mobile: string;
  supplier_code: string;
  email: string;
  category: string;
  city: string;
  village: string;
  street: string;
  building: string;
};

type FormErrors = Partial<Record<keyof NewSupplier, string>>;

type SaveSupplierPayload = {
  id?: number; // omit for add, set for edit
  supplier_name: string;
  contact_person?: string;
  mobile: string;
  supplier_code: string;
  email?: string;
  category?: string;
  city: string;
  village?: string;
  street?: string;
  building?: string;
};

type Order = "asc" | "desc";

type SortKey = keyof Pick<
  Supplier,
  | "supplier_name"
  | "contact_person"
  | "mobile"
  | "supplier_code"
  | "email"
  | "category"
  | "city"
  | "village"
  | "street"
  | "building"
>;

const tableFontFamily =
  '"Segoe UI", "Roboto", "Helvetica Neue", Arial, sans-serif';

// ---- API helper: save supplier (add or edit) ----
const saveSupplier = async (data: SaveSupplierPayload) => {
  const res = await axios.post(`${API_BASE_URL}/api/suppliers/save`, data);
  return res.data;
};

const SupplierForm: React.FC = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [nameFilter, setNameFilter] = useState("");
  const [mobileFilter, setMobileFilter] = useState("");
  const [addressFilter, setAddressFilter] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [order, setOrder] = useState<Order>("asc");
  const [orderBy, setOrderBy] = useState<SortKey>("supplier_name");

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Modal: Add / Edit supplier
  const [openModal, setOpenModal] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");
  const [editingId, setEditingId] = useState<number | null>(null);

  const emptySupplierForm: NewSupplier = {
    supplier_name: "",
    contact_person: "",
    mobile: "",
    supplier_code: "",
    email: "",
    category: "",
    city: "",
    village: "",
    street: "",
    building: "",
  };

  const [newSupplier, setNewSupplier] = useState<NewSupplier>(
    emptySupplierForm
  );
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  const handleOpenNew = () => {
    setModalMode("add");
    setEditingId(null);
    setNewSupplier(emptySupplierForm);
    setFormErrors({});
    setOpenModal(true);
  };

  const handleCloseModal = () => {
    setOpenModal(false);
    setNewSupplier(emptySupplierForm);
    setFormErrors({});
    setEditingId(null);
  };

  // ---- Load suppliers from API ----
  const loadSuppliers = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/suppliers`);
      const apiData = res.data as any[];

      const mapped: Supplier[] = apiData.map((row) => ({
        id: row.id,
        supplier_name: row.supplier_name,
        contact_person: row.contact_person ?? "",
        mobile: row.mobile,
        supplier_code: row.supplier_code,
        email: row.email ?? "",
        category: row.category ?? "",
        city: row.city ?? "",
        village: row.village ?? "",
        street: row.street ?? "",
        building: row.building ?? "",
      }));

      setSuppliers(mapped);
    } catch (e) {
      console.warn("Could not load suppliers from API.", e);
    }
  };

  useEffect(() => {
    loadSuppliers();
  }, []);

  const handleRequestSort = (property: SortKey) => {
    const isAsc = orderBy === property && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(property);
  };

  const filteredAndSortedSuppliers = useMemo(() => {
    const filtered = suppliers.filter((s) => {
      const nameMatch =
        !nameFilter ||
        s.supplier_name.toLowerCase().includes(nameFilter.toLowerCase()) ||
        s.supplier_code.toLowerCase().includes(nameFilter.toLowerCase());

      const mobileMatch =
        !mobileFilter ||
        s.mobile.toLowerCase().includes(mobileFilter.toLowerCase());

      const addressCombined = `${s.city} ${s.village} ${s.street} ${s.building}`;
      const addressMatch =
        !addressFilter ||
        addressCombined.toLowerCase().includes(addressFilter.toLowerCase());

      return nameMatch && mobileMatch && addressMatch;
    });

    return [...filtered].sort((a, b) => {
      const aVal = (a[orderBy] || "").toString().toLowerCase();
      const bVal = (b[orderBy] || "").toString().toLowerCase();

      if (aVal < bVal) return order === "asc" ? -1 : 1;
      if (aVal > bVal) return order === "asc" ? 1 : -1;
      return 0;
    });
  }, [suppliers, nameFilter, mobileFilter, addressFilter, order, orderBy]);

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
        `${API_BASE_URL}/api/suppliers/import-excel`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      await loadSuppliers();
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
    if (!filteredAndSortedSuppliers.length) return;

    const exportData = filteredAndSortedSuppliers.map((s) => ({
      "Supplier Name": s.supplier_name,
      "Contact Person": s.contact_person,
      Mobile: s.mobile,
      "Supplier Code": s.supplier_code,
      Email: s.email,
      Category: s.category,
      City: s.city,
      Village: s.village,
      Street: s.street,
      Building: s.building,
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Suppliers");
    XLSX.writeFile(workbook, "suppliers.xlsx");
  };

  // ---- Validation ----
  const validateForm = (): boolean => {
    const errors: FormErrors = {};

    if (!newSupplier.supplier_name.trim()) {
      errors.supplier_name = "Supplier name is required";
    }
    if (!newSupplier.mobile.trim()) {
      errors.mobile = "Mobile is required";
    }
    if (!newSupplier.supplier_code.trim()) {
      errors.supplier_code = "Supplier code is required";
    }
    if (!newSupplier.city.trim()) {
      errors.city = "City is required";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveSupplier = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      await saveSupplier({
        id: modalMode === "edit" && editingId != null ? editingId : undefined,
        supplier_name: newSupplier.supplier_name,
        contact_person: newSupplier.contact_person,
        mobile: newSupplier.mobile,
        supplier_code: newSupplier.supplier_code,
        email: newSupplier.email,
        category: newSupplier.category,
        city: newSupplier.city,
        village: newSupplier.village,
        street: newSupplier.street,
        building: newSupplier.building,
      });

      handleCloseModal();
      loadSuppliers();
    } catch (err: any) {
      console.error("Failed to save supplier", err);
      alert("Failed to save supplier");
    }
  };

  // ---- Double-click row to edit ----
  const handleRowDoubleClick = (s: Supplier) => {
    setModalMode("edit");
    setEditingId(s.id);
    setNewSupplier({
      supplier_name: s.supplier_name,
      contact_person: s.contact_person,
      mobile: s.mobile,
      supplier_code: s.supplier_code,
      email: s.email,
      category: s.category,
      city: s.city,
      village: s.village,
      street: s.street,
      building: s.building,
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

  const handleFieldChange = (key: keyof NewSupplier, value: string) => {
    setNewSupplier((prev) => ({ ...prev, [key]: value }));
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
            Suppliers
          </Typography>
          <Typography
            variant="body2"
            sx={{ opacity: 0.9, fontFamily: tableFontFamily }}
          >
            Manage and sync suppliers from Excel with your database.
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
            + Add New Supplier
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
            disabled={!filteredAndSortedSuppliers.length}
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
            label="Name / Code"
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
            label="Address (City / Village / Street / Building)"
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
                {renderSortableHeaderCell("Supplier Name", "supplier_name")}
                {renderSortableHeaderCell("Contact Person", "contact_person")}
                {renderSortableHeaderCell("Mobile", "mobile")}
                {renderSortableHeaderCell("Code", "supplier_code")}
                {renderSortableHeaderCell("Email", "email")}
                {renderSortableHeaderCell("Category", "category")}
                {renderSortableHeaderCell("City", "city")}
                {renderSortableHeaderCell("Village", "village")}
                {renderSortableHeaderCell("Street", "street")}
                {renderSortableHeaderCell("Building", "building")}
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredAndSortedSuppliers.length === 0 ? (
                <TableRow tabIndex={-1}>
                  <TableCell colSpan={10} align="center">
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ fontFamily: tableFontFamily }}
                    >
                      No suppliers found.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredAndSortedSuppliers.map((s, index) => (
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
                    <TableCell
                      sx={{
                        fontSize: "0.9rem",
                        fontWeight: 600,
                      }}
                    >
                      {s.supplier_name}
                    </TableCell>
                    <TableCell
                      sx={{
                        fontSize: "0.9rem",
                        fontWeight: 500,
                      }}
                    >
                      {s.contact_person}
                    </TableCell>
                    <TableCell
                      sx={{
                        fontSize: "0.9rem",
                        fontWeight: 500,
                      }}
                    >
                      {s.mobile}
                    </TableCell>
                    <TableCell
                      sx={{
                        fontSize: "0.9rem",
                        fontWeight: 500,
                      }}
                    >
                      {s.supplier_code}
                    </TableCell>
                    <TableCell
                      sx={{
                        fontSize: "0.9rem",
                        fontWeight: 500,
                      }}
                    >
                      {s.email}
                    </TableCell>
                    <TableCell
                      sx={{
                        fontSize: "0.9rem",
                        fontWeight: 500,
                      }}
                    >
                      {s.category}
                    </TableCell>
                    <TableCell
                      sx={{
                        fontSize: "0.9rem",
                        fontWeight: 500,
                      }}
                    >
                      {s.city}
                    </TableCell>
                    <TableCell
                      sx={{
                        fontSize: "0.9rem",
                        fontWeight: 500,
                      }}
                    >
                      {s.village}
                    </TableCell>
                    <TableCell
                      sx={{
                        fontSize: "0.9rem",
                        fontWeight: 500,
                      }}
                    >
                      {s.street}
                    </TableCell>
                    <TableCell
                      sx={{
                        fontSize: "0.9rem",
                        fontWeight: 500,
                      }}
                    >
                      {s.building}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Add / Edit Supplier Modal */}
      <Dialog
        open={openModal}
        onClose={handleCloseModal}
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
          {modalMode === "add" ? "Add New Supplier" : "Edit Supplier"}
        </DialogTitle>

        <DialogContent sx={{ mt: 2 }}>
          <Stack spacing={2}>
            <TextField
              label="Supplier Name"
              fullWidth
              size="small"
              value={newSupplier.supplier_name}
              onChange={(e) =>
                handleFieldChange("supplier_name", e.target.value)
              }
              error={!!formErrors.supplier_name}
              helperText={formErrors.supplier_name || " "}
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
              label="Contact Person"
              fullWidth
              size="small"
              value={newSupplier.contact_person}
              onChange={(e) =>
                handleFieldChange("contact_person", e.target.value)
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
            <TextField
              label="Mobile"
              fullWidth
              size="small"
              value={newSupplier.mobile}
              onChange={(e) => handleFieldChange("mobile", e.target.value)}
              error={!!formErrors.mobile}
              helperText={formErrors.mobile || " "}
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
              label="Supplier Code"
              fullWidth
              size="small"
              value={newSupplier.supplier_code}
              onChange={(e) =>
                handleFieldChange("supplier_code", e.target.value)
              }
              error={!!formErrors.supplier_code}
              helperText={formErrors.supplier_code || " "}
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
              label="Email"
              fullWidth
              size="small"
              value={newSupplier.email}
              onChange={(e) => handleFieldChange("email", e.target.value)}
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
              label="Category"
              fullWidth
              size="small"
              value={newSupplier.category}
              onChange={(e) => handleFieldChange("category", e.target.value)}
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
              label="City"
              fullWidth
              size="small"
              value={newSupplier.city}
              onChange={(e) => handleFieldChange("city", e.target.value)}
              error={!!formErrors.city}
              helperText={formErrors.city || " "}
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
              label="Village"
              fullWidth
              size="small"
              value={newSupplier.village}
              onChange={(e) => handleFieldChange("village", e.target.value)}
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
              label="Street"
              fullWidth
              size="small"
              value={newSupplier.street}
              onChange={(e) => handleFieldChange("street", e.target.value)}
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
              label="Building"
              fullWidth
              size="small"
              value={newSupplier.building}
              onChange={(e) => handleFieldChange("building", e.target.value)}
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
            onClick={handleCloseModal}
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
            onClick={handleSaveSupplier}
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

export default SupplierForm;
