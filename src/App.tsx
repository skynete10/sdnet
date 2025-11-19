import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import LoginForm from "./pages/LoginForm";
import MainLayout from "./pages/MainLayout";

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Login page – no header bar */}
        <Route path="/" element={<LoginForm />} />

        {/* All other pages – with header bar */}
        <Route path="/*" element={<MainLayout />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
