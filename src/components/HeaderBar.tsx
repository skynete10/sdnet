import React, { useState } from "react";
import {
  Box,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Divider,
  Avatar,
  useTheme,
} from "@mui/material";
import { useNavigate } from "react-router-dom";

import DashboardIcon from "@mui/icons-material/Dashboard";
import PeopleIcon from "@mui/icons-material/People";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import BadgeIcon from "@mui/icons-material/Badge";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import PaymentsIcon from "@mui/icons-material/Payments";
import WifiIcon from "@mui/icons-material/Wifi";
import SettingsIcon from "@mui/icons-material/Settings";
import LogoutIcon from "@mui/icons-material/Logout";

type NavKey =
  | "dashboard"
  | "customers"
  | "suppliers"
  | "employees"
  | "items"
  | "sales_invoice"
  | "purchase_invoice"
  | "expenses"
  | "employees_salary"
  | "internet_manager"
  | "settings"
  | "logout";

const HeaderBar: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<NavKey>("dashboard");

  const navItems: { key: NavKey; label: string; icon: React.ReactNode }[] = [
    { key: "dashboard", label: "Dashboard", icon: <DashboardIcon /> },
    { key: "customers", label: "Customers", icon: <PeopleIcon /> },
    { key: "suppliers", label: "Suppliers", icon: <LocalShippingIcon /> },
    { key: "employees", label: "Employees", icon: <BadgeIcon /> },
    { key: "items", label: "Items", icon: <Inventory2Icon /> },
    { key: "sales_invoice", label: "Sales Invoice", icon: <ReceiptLongIcon /> },
    { key: "purchase_invoice", label: "Purchase Invoice", icon: <ShoppingCartIcon /> },
    { key: "expenses", label: "Expenses", icon: <AccountBalanceWalletIcon /> },
    { key: "employees_salary", label: "Employees Salary", icon: <PaymentsIcon /> },
    { key: "internet_manager", label: "Internet Manager", icon: <WifiIcon /> },
    { key: "settings", label: "Settings", icon: <SettingsIcon /> },
    { key: "logout", label: "Logout", icon: <LogoutIcon /> },
  ];

  const handleClick = (key: NavKey) => {
    setSelected(key);

    switch (key) {
      case "dashboard":
        navigate("/home");
        break;
      case "customers":
        navigate("/customers");
        break;
      case "suppliers":
        navigate("/suppliers");
        break;
      case "employees":
        navigate("/employees");
        break;
      case "expenses":
        navigate("/expenses");
        break;
      case "employees_salary":
        navigate("/employesal");
        break;
      case "settings":
        navigate("/settings");
        break;
      case "internet_manager":
        navigate("/internetmanag");
        break;
      case "logout":
        navigate("/");
        break;
      default:
        // later: wire suppliers, employees, etc.
        break;
    }
  };

  return (
    <Box
      sx={{
        width: 260,
        height: "100vh",
        bgcolor: "#020617",
        color: "#e5e7eb",
        display: "flex",
        flexDirection: "column",
        boxShadow: 4,
      }}
    >
      <Box
        sx={{
          p: 2.5,
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          borderBottom: "1px solid rgba(148,163,184,0.25)",
          background: "linear-gradient(135deg, #0f172a, #1e293b)",
        }}
      >
        <Avatar
          sx={{
            width: 40,
            height: 40,
            bgcolor: theme.palette.primary.main,
            fontWeight: 700,
          }}
        >
          IS
        </Avatar>
        <Box>
          <Typography
            variant="subtitle1"
            sx={{ fontWeight: 700, color: "#f9fafb", letterSpacing: 0.5 }}
          >
            ISP Software
          </Typography>
          <Typography
            variant="caption"
            sx={{ color: "rgba(148,163,184,0.9)" }}
          >
            Management System
          </Typography>
        </Box>
      </Box>

      <Box sx={{ flex: 1, overflowY: "auto", py: 1 }}>
        <List component="nav" sx={{ py: 0 }}>
          {navItems.map((item) => {
            const isSelected = selected === item.key;
            const isDashboard = item.key === "dashboard";
            const isLogout = item.key === "logout";

            const bgColor = isSelected
              ? isDashboard
                ? theme.palette.primary.main
                : "rgba(148,163,184,0.25)"
              : "transparent";

            const color = isSelected
              ? isDashboard
                ? "#f9fafb"
                : "#e5e7eb"
              : "rgba(226,232,240,0.9)";

            return (
              <React.Fragment key={item.key}>
                {isLogout && (
                  <Divider
                    sx={{
                      my: 1.5,
                      mx: 2,
                      borderColor: "rgba(30,64,175,0.45)",
                    }}
                  />
                )}

                <ListItemButton
                  onClick={() => handleClick(item.key)}
                  sx={{
                    mx: 1,
                    mb: 0.4,
                    borderRadius: 2,
                    px: 2,
                    py: 1.05,
                    bgcolor: bgColor,
                    color,
                    "& .MuiListItemIcon-root": {
                      color,
                      minWidth: 34,
                    },
                    "&:hover": {
                      bgcolor: isSelected
                        ? bgColor
                        : "rgba(51,65,85,0.85)",
                    },
                    transition:
                      "background-color 0.15s ease, transform 0.08s ease",
                    "&:active": {
                      transform: "scale(0.99)",
                    },
                  }}
                >
                  <ListItemIcon>{item.icon}</ListItemIcon>
                  <ListItemText
                    primary={item.label}
                    primaryTypographyProps={{
                      fontSize: 14,
                      fontWeight: isDashboard ? 600 : 500,
                    }}
                  />
                </ListItemButton>

                {isDashboard && (
                  <Divider
                    sx={{
                      my: 1,
                      mx: 2,
                      borderColor: "rgba(55,65,81,0.9)",
                    }}
                  />
                )}
              </React.Fragment>
            );
          })}
        </List>
      </Box>

      <Box
        sx={{
          p: 2,
          borderTop: "1px solid rgba(30,64,175,0.5)",
          fontSize: 11,
          color: "rgba(148,163,184,0.9)",
          textAlign: "center",
        }}
      >
        © {new Date().getFullYear()} SDSoftware
      </Box>
    </Box>
  );
};

export default HeaderBar;
