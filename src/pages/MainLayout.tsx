// src/components/MainLayout.tsx
import React from "react";
import { Box } from "@mui/material";
import { Routes, Route } from "react-router-dom";

import HeaderBar from "../components/HeaderBar";
import HomeForm from "./HomeForm";
import CustomersForm from "./CustomersForm";
import SupplierForm from "./SupplierForm";
import EmployeeForm from "./EmployeesForm";
import ExpensesForm from "./ExpensesForm";
import EmployeeSalaryForm from "./EmployeeSalaryForm";
import SettingsForm from "./SettingsForm";
import InternnetManagerForm from "./InternnetManagerForm";
import ServicesForm from "./ServicesForm";
import CustomerSubscriptionForm from "./CustomerSubscriptionForm";

const MainLayout: React.FC = () => {
  return (
    <Box sx={{ display: "flex", height: "100vh", width: "100vw" }}>
      <HeaderBar />

      <Box
        component="main"
        sx={{
          flex: 1,
          p: 3,
          bgcolor: "#f9fafb",
          overflow: "auto",
        }}
      >
        <Routes>
          <Route path="/home" element={<HomeForm />} />
          <Route path="/customers" element={<CustomersForm />} />
          <Route path="/suppliers" element={<SupplierForm />} />
          <Route path="/employees" element={<EmployeeForm />} />
          <Route path="/expenses" element={<ExpensesForm />} />
          <Route path="/employesal" element={<EmployeeSalaryForm />} />
          <Route path="/settings" element={<SettingsForm />} />
          <Route path="/internetmanag" element={<InternnetManagerForm />}/>
          <Route path="/services" element={<ServicesForm />}/>
          <Route path="/customerssub" element={<CustomerSubscriptionForm />}/>
          {/* add more routes here later */}
        </Routes>
      </Box>
    </Box>
  );
};

export default MainLayout;
