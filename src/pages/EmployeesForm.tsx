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
  Checkbox,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  OutlinedInput,
  ListItemText,
  IconButton,
} from "@mui/material";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import DownloadIcon from "@mui/icons-material/Download";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import axios from "axios";
import * as XLSX from "xlsx";

const API_BASE_URL = "http://127.0.0.1:5100";

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
};

type NewEmployee = {
  fullname: string;
  mobile: string;
  username: string;
  city: string;
  village: string;
  street: string;
  building: string;
  floor: string;
  type: string;
};

type FormErrors = Partial<Record<keyof NewEmployee, string>>;

type SaveEmployeePayload = {
  id?: number;
  fullname: string;
  mobile: string;
  username: string;
  city: string;
  village?: string;
  street?: string;
  building?: string;
  floor?: string;
  type?: string;
};

type Order = "asc" | "desc";

type SortKey = keyof Pick<
  Employee,
  | "fullname"
  | "mobile"
  | "username"
  | "city"
  | "village"
  | "street"
  | "building"
  | "floor"
  | "type"
>;

type ModalCustomer = {
  username: string;
  fullname: string;
  mobile: string;
  address?: string;
};

const tableFontFamily =
  '"Segoe UI", "Roboto", "Helvetica Neue", Arial, sans-serif';

const saveEmployee = async (data: SaveEmployeePayload) => {
  const res = await axios.post(
    `${API_BASE_URL}/api/employees/saveemployee`,
    data
  );
  return res.data;
};

const getAddressFirstWord = (address?: string): string => {
  if (!address) return "";
  const beforeDash = address.split("-")[0];
  const firstToken = beforeDash.split(/\s+/)[0];
  return firstToken.trim();
};

const EmployeesForm: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [nameFilter, setNameFilter] = useState("");
  const [mobileFilter, setMobileFilter] = useState("");
  const [addressFilter, setAddressFilter] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [order, setOrder] = useState<Order>("asc");
  const [orderBy, setOrderBy] = useState<SortKey>("fullname");

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [openNewEmployee, setOpenNewEmployee] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");
  const [editingId, setEditingId] = useState<number | null>(null);

  const emptyEmployeeForm: NewEmployee = {
    fullname: "",
    mobile: "",
    username: "",
    city: "",
    village: "",
    street: "",
    building: "",
    floor: "",
    type: "",
  };

  const [newEmployee, setNewEmployee] = useState<NewEmployee>(
    emptyEmployeeForm
  );
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  const [assignOpen, setAssignOpen] = useState(false);
  const [assignEmp, setAssignEmp] = useState<Employee | null>(null);
  const [assignCustomers, setAssignCustomers] = useState<ModalCustomer[]>([]);
  const [assignSelected, setAssignSelected] = useState<string[]>([]);
  const [assignLoading, setAssignLoading] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);

  const [assignedCustomers, setAssignedCustomers] = useState<ModalCustomer[]>(
    []
  );
  const [assignedLoading, setAssignedLoading] = useState(false);
  const [assignedError, setAssignedError] = useState<string | null>(null);

  // usernames of assigned customers marked for deletion (trash icon)
  const [toUnassign, setToUnassign] = useState<string[]>([]);

  // multi-select address filter for available customers
  const [assignAddressFilter, setAssignAddressFilter] = useState<string[]>([]);

  const handleOpenNew = () => {
    setModalMode("add");
    setEditingId(null);
    setNewEmployee(emptyEmployeeForm);
    setFormErrors({});
    setOpenNewEmployee(true);
  };

  const handleCloseNew = () => {
    setOpenNewEmployee(false);
    setNewEmployee(emptyEmployeeForm);
    setFormErrors({});
    setEditingId(null);
  };

  const loadEmployees = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/employees`);
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
      }));

      setEmployees(mapped);
    } catch (e) {
      console.warn("Could not load employees from API.", e);
    }
  };

  useEffect(() => {
    loadEmployees();
  }, []);

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
      const aVal = (a[orderBy] || "").toString().toLowerCase();
      const bVal = (b[orderBy] || "").toString().toLowerCase();

      if (aVal < bVal) return order === "asc" ? -1 : 1;
      if (aVal > bVal) return order === "asc" ? 1 : -1;
      return 0;
    });
  }, [employees, nameFilter, mobileFilter, addressFilter, order, orderBy]);

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

      await loadEmployees();
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

  const handleExportExcel = () => {
    if (!filteredAndSortedEmployees.length) return;

    const exportData = filteredAndSortedEmployees.map((e) => ({
      "Full Name": e.fullname,
      Mobile: e.mobile,
      Username: e.username,
      City: e.city,
      Village: e.village,
      Street: e.street,
      Building: e.building,
      Floor: e.floor,
      Type: e.type,
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Employees");
    XLSX.writeFile(workbook, "employees.xlsx");
  };

  const validateForm = (): boolean => {
    const errors: FormErrors = {};

    if (!newEmployee.fullname.trim()) {
      errors.fullname = "Full name is required";
    }
    if (!newEmployee.mobile.trim()) {
      errors.mobile = "Mobile is required";
    }
    if (!newEmployee.username.trim()) {
      errors.username = "Username is required";
    }
    if (!newEmployee.city.trim()) {
      errors.city = "City is required";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveEmployee = async () => {
    if (!validateForm()) return;

    try {
      await saveEmployee({
        id: modalMode === "edit" && editingId != null ? editingId : undefined,
        fullname: newEmployee.fullname,
        mobile: newEmployee.mobile,
        username: newEmployee.username,
        city: newEmployee.city,
        village: newEmployee.village,
        street: newEmployee.street,
        building: newEmployee.building,
        floor: newEmployee.floor,
        type: newEmployee.type,
      });

      handleCloseNew();
      loadEmployees();
    } catch (err: any) {
      console.error("Failed to save employee", err);
      alert("Failed to save employee");
    }
  };

  const handleRowDoubleClick = (e: Employee) => {
    setModalMode("edit");
    setEditingId(e.id);
    setNewEmployee({
      fullname: e.fullname,
      mobile: e.mobile,
      username: e.username,
      city: e.city,
      village: e.village,
      street: e.street,
      building: e.building,
      floor: e.floor,
      type: e.type,
    });
    setFormErrors({});
    setOpenNewEmployee(true);
  };

  const handleAddCustomersClick = async (emp: Employee) => {
    setAssignEmp(emp);
    setAssignOpen(true);
    setAssignCustomers([]);
    setAssignSelected([]);
    setAssignError(null);
    setAssignLoading(true);
    setAssignAddressFilter([]);

    setAssignedCustomers([]);
    setAssignedError(null);
    setAssignedLoading(true);

    setToUnassign([]);

    try {
      const [resAssigned, resAvailable] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/employees/customers-for-employee`, {
          params: { emp_username: emp.username },
        }),
        axios.get(
          `${API_BASE_URL}/api/employees/customers-not-in-relation`,
          { params: { emp_username: emp.username } }
        ),
      ]);

      const assignedData = resAssigned.data as any[];
      const availableData = resAvailable.data as any[];

      const mappedAssigned: ModalCustomer[] = assignedData.map((row) => ({
        username: (row.username ?? "").toString().trim(),
        fullname: row.fullname ?? "",
        mobile: row.mobile ?? "",
        address: row.customeraddress ?? row.address ?? "",
      }));

      const mappedAvailable: ModalCustomer[] = availableData.map((row) => ({
        username: (row.username ?? "").toString().trim(),
        fullname: row.fullname ?? "",
        mobile: row.mobile ?? "",
        address: row.customeraddress ?? row.address ?? "",
      }));

      setAssignedCustomers(mappedAssigned);
      setAssignCustomers(mappedAvailable);
    } catch (err: any) {
      console.error("Failed to load customers for employee", err);
      const apiError = err?.response?.data?.error;
      setAssignError(apiError || "Failed to load customers list.");
      setAssignedError(apiError || "Failed to load assigned customers.");
    } finally {
      setAssignLoading(false);
      setAssignedLoading(false);
    }
  };

  const handleCloseAssign = () => {
    setAssignOpen(false);
    setAssignEmp(null);
    setAssignCustomers([]);
    setAssignSelected([]);
    setAssignError(null);
    setAssignLoading(false);

    setAssignedCustomers([]);
    setAssignedError(null);
    setAssignedLoading(false);

    setAssignAddressFilter([]);
    setToUnassign([]);
  };

  const toggleAssignCustomer = (username: string) => {
    setAssignSelected((prev) =>
      prev.includes(username)
        ? prev.filter((u) => u !== username)
        : [...prev, username]
    );
  };

  const toggleUnassignCustomer = (username: string) => {
    setToUnassign((prev) =>
      prev.includes(username)
        ? prev.filter((u) => u !== username)
        : [...prev, username]
    );
  };

  const addressOptions = useMemo(() => {
    const s = new Set<string>();
    assignCustomers.forEach((c) => {
      const w = getAddressFirstWord(c.address);
      if (w) s.add(w);
    });
    return Array.from(s).sort((a, b) => a.localeCompare(b, "ar"));
  }, [assignCustomers]);

  const filteredAssignCustomers = useMemo(() => {
    if (!assignAddressFilter.length) return assignCustomers;

    return assignCustomers.filter((c) => {
      const firstWord = getAddressFirstWord(c.address).toLowerCase();
      if (!firstWord) return false;
      return assignAddressFilter
        .map((w) => w.toLowerCase())
        .includes(firstWord);
    });
  }, [assignCustomers, assignAddressFilter]);

  const toggleAssignAll = (list: ModalCustomer[]) => {
    if (!list.length) return;

    const usernames = list.map((c) => c.username);
    const allSelected = usernames.every((u) => assignSelected.includes(u));

    if (allSelected) {
      setAssignSelected((prev) => prev.filter((u) => !usernames.includes(u)));
    } else {
      setAssignSelected((prev) =>
        Array.from(new Set([...prev, ...usernames]))
      );
    }
  };

  const handleConfirmAssign = async () => {
    if (!assignEmp) return;

    try {
      // 1) Assign new relations
      if (assignSelected.length > 0) {
        await axios.post(`${API_BASE_URL}/api/employees/assign-customers`, {
          emp_username: assignEmp.username,
          cust_usernames: assignSelected,
        });
      }

      // 2) Unassign + delete customer users fully
      if (toUnassign.length > 0) {
        // Remove relation from emp_cust_relation
        await axios.post(`${API_BASE_URL}/api/employees/unassign-customers`, {
          emp_username: assignEmp.username,
          cust_usernames: toUnassign,
        });

        // Delete customer users (and their addresses) from DB
        //await axios.post(`${API_BASE_URL}/api/employees/delete-customers`, {
         // cust_usernames: toUnassign,
       // });
      }

      // Reload lists so dialog stays in sync
      await handleAddCustomersClick(assignEmp);

      // Clear local state
      setAssignSelected([]);
      setToUnassign([]);
    } catch (err: any) {
      console.error("Failed to save changes", err);
      const apiError = err?.response?.data?.error;
      setAssignError(apiError || "Failed to save changes.");
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

  const handleFieldChange = (key: keyof NewEmployee, value: string) => {
    setNewEmployee((prev) => ({ ...prev, [key]: value }));
    setFormErrors((prev) => ({ ...prev, [key]: undefined }));
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
            Employees
          </Typography>
          <Typography
            variant="body2"
            sx={{ opacity: 0.9, fontFamily: tableFontFamily }}
          >
            Manage and sync employees from Excel with your database.
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
            + Add New Employee
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
                {renderSortableHeaderCell("Floor", "floor")}
                {renderSortableHeaderCell("Type", "type")}
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
                  Add Customers
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredAndSortedEmployees.length === 0 ? (
                <TableRow tabIndex={-1}>
                  <TableCell colSpan={10} align="center">
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
                filteredAndSortedEmployees.map((e, index) => (
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
                    <TableCell
                      sx={{
                        fontSize: "0.9rem",
                        fontWeight: 600,
                      }}
                    >
                      {e.fullname}
                    </TableCell>
                    <TableCell
                      sx={{
                        fontSize: "0.9rem",
                        fontWeight: 500,
                      }}
                    >
                      {e.mobile}
                    </TableCell>
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
                        fontWeight: 500,
                      }}
                    >
                      {e.city}
                    </TableCell>
                    <TableCell
                      sx={{
                        fontSize: "0.9rem",
                        fontWeight: 500,
                      }}
                    >
                      {e.village}
                    </TableCell>
                    <TableCell
                      sx={{
                        fontSize: "0.9rem",
                        fontWeight: 500,
                      }}
                    >
                      {e.street}
                    </TableCell>
                    <TableCell
                      sx={{
                        fontSize: "0.9rem",
                        fontWeight: 500,
                      }}
                    >
                      {e.building}
                    </TableCell>
                    <TableCell
                      sx={{
                        fontSize: "0.9rem",
                        fontWeight: 500,
                      }}
                    >
                      {e.floor}
                    </TableCell>
                    <TableCell
                      sx={{
                        fontSize: "0.9rem",
                        fontWeight: 500,
                        textTransform: "capitalize",
                      }}
                    >
                      {e.type}
                    </TableCell>
                    <TableCell
                      sx={{
                        textAlign: "center",
                      }}
                    >
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={(ev) => {
                          ev.stopPropagation();
                          handleAddCustomersClick(e);
                        }}
                        sx={{
                          textTransform: "none",
                          fontFamily: tableFontFamily,
                          fontSize: "0.8rem",
                          borderRadius: 999,
                          px: 2,
                          py: 0.5,
                          borderColor: "#00897b",
                          color: "#00695c",
                          "&:hover": {
                            borderColor: "#00695c",
                            backgroundColor: "#e0f2f1",
                          },
                        }}
                      >
                        Add Customers
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Dialog
        open={openNewEmployee}
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
          {modalMode === "add" ? "Add New Employee" : "Edit Employee"}
        </DialogTitle>

        <DialogContent sx={{ mt: 2 }}>
          <Stack spacing={2}>
            <TextField
              label="Full Name"
              fullWidth
              size="small"
              value={newEmployee.fullname}
              onChange={(e) => handleFieldChange("fullname", e.target.value)}
              error={!!formErrors.fullname}
              helperText={formErrors.fullname || " "}
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
              value={newEmployee.mobile}
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
              label="Username"
              fullWidth
              size="small"
              value={newEmployee.username}
              onChange={(e) => handleFieldChange("username", e.target.value)}
              error={!!formErrors.username}
              helperText={formErrors.username || " "}
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
              value={newEmployee.city}
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
              value={newEmployee.village}
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
              value={newEmployee.street}
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
              value={newEmployee.building}
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
            <TextField
              label="Floor"
              fullWidth
              size="small"
              value={newEmployee.floor}
              onChange={(e) => handleFieldChange("floor", e.target.value)}
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
              label="Type (home / work / other)"
              fullWidth
              size="small"
              value={newEmployee.type}
              onChange={(e) => handleFieldChange("type", e.target.value)}
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
            onClick={handleSaveEmployee}
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

      <Dialog
        open={assignOpen}
        onClose={handleCloseAssign}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            p: 1,
            bgcolor: "#f4f7f7",
          },
        }}
      >
        <DialogTitle
          sx={{
            fontFamily: tableFontFamily,
            fontWeight: 700,
            fontSize: "1.2rem",
            pb: 1.2,
            background:
              "linear-gradient(90deg, #00695c 0%, #00897b 50%, #00acc1 100%)",
            color: "white",
            borderRadius: "12px 12px 0 0",
          }}
        >
          {assignEmp
            ? `Assign Customers to ${assignEmp.fullname}`
            : "Assign Customers"}
        </DialogTitle>

        <DialogContent
          sx={{
            mt: 2,
          }}
        >
          {/* Already assigned customers */}
          <Box sx={{ mb: 3 }}>
            <Typography
              variant="subtitle2"
              sx={{
                mb: 1,
                fontFamily: tableFontFamily,
                fontWeight: 600,
                color: "text.secondary",
              }}
            >
              Already assigned customers
            </Typography>
            <Paper
              elevation={0}
              sx={{
                borderRadius: 2,
                border: "1px solid #e0e0e0",
                overflow: "hidden",
              }}
            >
              <TableContainer sx={{ maxHeight: 200 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow
                      sx={{
                        "& th": {
                          backgroundColor: "#006064",
                          color: "#fff",
                          fontFamily: tableFontFamily,
                          fontWeight: 700,
                        },
                      }}
                    >
                      <TableCell>Customer Name</TableCell>
                      <TableCell>Username</TableCell>
                      <TableCell>Address</TableCell>
                      <TableCell>Mobile</TableCell>
                      <TableCell align="center">Remove</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {assignedLoading ? (
                      <TableRow>
                        <TableCell colSpan={5} align="center">
                          <Typography
                            sx={{
                              fontFamily: tableFontFamily,
                              fontSize: "0.9rem",
                              color: "text.secondary",
                            }}
                          >
                            Loading assigned customers...
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : assignedCustomers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} align="center">
                          <Typography
                            sx={{
                              fontFamily: tableFontFamily,
                              fontSize: "0.9rem",
                              color: "text.secondary",
                            }}
                          >
                            No customers assigned yet.
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      assignedCustomers.map((c, idx) => {
                        const markedForDelete = toUnassign.includes(
                          c.username
                        );
                        return (
                          <TableRow
                            key={c.username}
                            sx={{
                              backgroundColor:
                                idx % 2 === 0
                                  ? "background.paper"
                                  : "#f5f5f5",
                              opacity: markedForDelete ? 0.6 : 1,
                            }}
                          >
                            <TableCell
                              sx={{
                                fontFamily: tableFontFamily,
                                fontSize: "0.9rem",
                                fontWeight: 600,
                                textDecoration: markedForDelete
                                  ? "line-through"
                                  : "none",
                              }}
                            >
                              {c.fullname}
                            </TableCell>
                            <TableCell
                              sx={{
                                fontFamily: tableFontFamily,
                                fontSize: "0.85rem",
                                textDecoration: markedForDelete
                                  ? "line-through"
                                  : "none",
                              }}
                            >
                              {c.username}
                            </TableCell>
                            <TableCell
                              sx={{
                                fontFamily: tableFontFamily,
                                fontSize: "0.85rem",
                                textDecoration: markedForDelete
                                  ? "line-through"
                                  : "none",
                              }}
                            >
                              {c.address || ""}
                            </TableCell>
                            <TableCell
                              sx={{
                                fontFamily: tableFontFamily,
                                fontSize: "0.85rem",
                                textDecoration: markedForDelete
                                  ? "line-through"
                                  : "none",
                              }}
                            >
                              {c.mobile}
                            </TableCell>
                            <TableCell align="center">
                              <IconButton
                                size="small"
                                onClick={() =>
                                  toggleUnassignCustomer(c.username)
                                }
                                sx={{
                                  color: markedForDelete
                                    ? "error.main"
                                    : "text.secondary",
                                }}
                              >
                                <DeleteOutlineIcon fontSize="small" />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
            {assignedError && (
              <Typography
                color="error"
                sx={{
                  mt: 1,
                  fontFamily: tableFontFamily,
                  fontSize: "0.85rem",
                  textAlign: "right",
                }}
              >
                {assignedError}
              </Typography>
            )}
          </Box>

          {/* Address filter for available customers */}
          <Box sx={{ mb: 2 }}>
            <FormControl fullWidth size="small">
              <InputLabel
                sx={{
                  fontFamily: tableFontFamily,
                  fontSize: "0.85rem",
                }}
              >
                Filter by address (first word)
              </InputLabel>
              <Select
                multiple
                value={assignAddressFilter}
                onChange={(e) =>
                  setAssignAddressFilter(
                    typeof e.target.value === "string"
                      ? e.target.value.split(",")
                      : (e.target.value as string[])
                  )
                }
                input={
                  <OutlinedInput
                    label="Filter by address (first word)"
                    sx={{ fontFamily: tableFontFamily, fontSize: "0.9rem" }}
                  />
                }
                renderValue={(selected) => (selected as string[]).join(", ")}
              >
                {addressOptions.map((option) => (
                  <MenuItem key={option} value={option}>
                    <Checkbox
                      checked={assignAddressFilter.indexOf(option) > -1}
                    />
                    <ListItemText
                      primary={option}
                      primaryTypographyProps={{
                        sx: {
                          fontFamily: tableFontFamily,
                          fontSize: "0.9rem",
                        },
                      }}
                    />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          {/* Available customers */}
          <Paper
            elevation={0}
            sx={{
              borderRadius: 2,
              border: "1px solid #e0e0e0",
              overflow: "hidden",
            }}
          >
            <TableContainer sx={{ maxHeight: 400 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow
                    sx={{
                      "& th": {
                        backgroundColor: "#004d40",
                        color: "#fff",
                        fontFamily: tableFontFamily,
                        fontWeight: 700,
                      },
                    }}
                  >
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={
                          filteredAssignCustomers.length > 0 &&
                          filteredAssignCustomers.every((c) =>
                            assignSelected.includes(c.username)
                          )
                        }
                        indeterminate={
                          filteredAssignCustomers.length > 0 &&
                          filteredAssignCustomers.some((c) =>
                            assignSelected.includes(c.username)
                          ) &&
                          !filteredAssignCustomers.every((c) =>
                            assignSelected.includes(c.username)
                          )
                        }
                        onChange={() => toggleAssignAll(filteredAssignCustomers)}
                        sx={{
                          color: "#e0f2f1",
                          "&.Mui-checked": {
                            color: "#00e676",
                          },
                        }}
                      />
                    </TableCell>
                    <TableCell>Customer Name</TableCell>
                    <TableCell>Username</TableCell>
                    <TableCell>Address</TableCell>
                    <TableCell>Mobile</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {assignLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center">
                        <Typography
                          sx={{
                            fontFamily: tableFontFamily,
                            fontSize: "0.9rem",
                            color: "text.secondary",
                          }}
                        >
                          Loading customers...
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : filteredAssignCustomers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center">
                        <Typography
                          sx={{
                            fontFamily: tableFontFamily,
                            fontSize: "0.9rem",
                            color: "text.secondary",
                          }}
                        >
                          No available customers to assign.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAssignCustomers.map((c, idx) => {
                      const checked = assignSelected.includes(c.username);
                      return (
                        <TableRow
                          key={c.username}
                          hover
                          onClick={() => toggleAssignCustomer(c.username)}
                          sx={{
                            cursor: "pointer",
                            backgroundColor:
                              idx % 2 === 0 ? "background.paper" : "#f5f5f5",
                            "&:hover": {
                              backgroundColor: "#e0f2f1",
                            },
                          }}
                        >
                          <TableCell padding="checkbox">
                            <Checkbox
                              checked={checked}
                              onClick={(e) => e.stopPropagation()}
                              sx={{
                                color: "#00acc1",
                                "&.Mui-checked": {
                                  color: "#00e676",
                                },
                              }}
                            />
                          </TableCell>
                          <TableCell
                            sx={{
                              fontFamily: tableFontFamily,
                              fontSize: "0.9rem",
                              fontWeight: 600,
                            }}
                          >
                            {c.fullname}
                          </TableCell>
                          <TableCell
                            sx={{
                              fontFamily: tableFontFamily,
                              fontSize: "0.85rem",
                            }}
                          >
                            {c.username}
                          </TableCell>
                          <TableCell
                            sx={{
                              fontFamily: tableFontFamily,
                              fontSize: "0.85rem",
                            }}
                          >
                            {c.address || ""}
                          </TableCell>
                          <TableCell
                            sx={{
                              fontFamily: tableFontFamily,
                              fontSize: "0.85rem",
                            }}
                          >
                            {c.mobile}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>

          {assignError && (
            <Typography
              color="error"
              sx={{
                mt: 1,
                fontFamily: tableFontFamily,
                fontSize: "0.85rem",
                textAlign: "right",
              }}
            >
              {assignError}
            </Typography>
          )}
        </DialogContent>

        <DialogActions
          sx={{
            p: 2,
            pt: 1,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 1,
          }}
        >
          <Typography
            sx={{
              fontFamily: tableFontFamily,
              fontSize: "0.8rem",
              color: "text.secondary",
            }}
          >
            {assignSelected.length} customer
            {assignSelected.length === 1 ? "" : "s"} selected
          </Typography>

          <Box sx={{ display: "flex", gap: 1 }}>
            <Button
              onClick={handleCloseAssign}
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
              onClick={handleConfirmAssign}
              disabled={assignSelected.length === 0 && toUnassign.length === 0}
              sx={{
                textTransform: "none",
                fontWeight: 600,
                fontFamily: tableFontFamily,
                bgcolor:
                  assignSelected.length === 0 && toUnassign.length === 0
                    ? "#9e9e9e"
                    : "#00897b",
                "&:hover": {
                  bgcolor:
                    assignSelected.length === 0 && toUnassign.length === 0
                      ? "#9e9e9e"
                      : "#00796b",
                },
              }}
            >
              Save Changes
            </Button>
          </Box>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default EmployeesForm;
