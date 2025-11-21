import React, { useState } from "react";
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  InputAdornment,
  IconButton,
} from "@mui/material";
import { Visibility, VisibilityOff, Lock, AccountCircle } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import logo from "../assets/sdnet_logo.jpg";
import bg from "../assets/login_bg.jpg";
import { getEnv } from "../utils/env_functions";

const API_BASE_URL =getEnv("REACT_APP_API_BASE_URL", "http://127.0.0.1:5100");

const LoginForm: React.FC = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await axios.post(`${API_BASE_URL}/api/login`, {
        username,
        password,
        // token: "optional-device-token-here",
      });

      if (response.data?.status === "success") {
        // Optionally store user info in localStorage
         localStorage.setItem("fullname", JSON.stringify(response.data.fullname));

        navigate("/home");
      } else {
        setError("Invalid username or password");
      }
    } catch (err: any) {
      const apiError = err?.response?.data?.error;
      setError(apiError || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        height: "100vh",
        width: "100vw",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        backgroundImage: `url(${bg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        position: "relative",
      }}
    >
      <Paper
        elevation={8}
        sx={{
          p: 5,
          width: 380,
          borderRadius: 3,
          backdropFilter: "blur(10px)",
          backgroundColor: "rgba(255, 255, 255, 0.92)",
        }}
      >
        <Box sx={{ display: "flex", justifyContent: "center", mb: 2 }}>
          <Box component="img" src={logo} alt="SDNet Logo" sx={{ height: 150 }} />
        </Box>

        <Typography
          textAlign="center"
          mb={3}
          sx={{
            fontSize: "1.3rem",
            fontWeight: 600,
            color: "#004d40",
            letterSpacing: 0.6,
          }}
        >
          ISP Software Manager
        </Typography>

        <form onSubmit={handleSubmit}>
          <TextField
            label="Username"
            type="text"
            fullWidth
            margin="normal"
            autoFocus
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <AccountCircle color="action" />
                </InputAdornment>
              ),
            }}
            required
          />

          <TextField
            label="Password"
            type={showPassword ? "text" : "password"}
            fullWidth
            margin="normal"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Lock color="action" />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
            required
          />

          {error && (
            <Typography
              variant="body2"
              color="error"
              sx={{ mt: 1, textAlign: "center" }}
            >
              {error}
            </Typography>
          )}

          <Button
            variant="contained"
            color="primary"
            type="submit"
            fullWidth
            sx={{
              mt: 3,
              py: 1.3,
              textTransform: "none",
              fontWeight: 600,
              borderRadius: 2,
            }}
            disabled={loading}
          >
            {loading ? "Signing in..." : "Sign In"}
          </Button>
        </form>

        <Typography variant="body2" textAlign="center" mt={3} color="text.secondary">
          Forgot your password?{" "}
          <Typography
            component="span"
            color="primary"
            sx={{ cursor: "pointer", fontWeight: 500 }}
          >
            Reset here
          </Typography>
        </Typography>

        <Typography
          variant="caption"
          textAlign="center"
          display="block"
          mt={4}
          color="text.secondary"
        >
          © SDSoftware {new Date().getFullYear()}–{new Date().getFullYear() + 1}
        </Typography>
      </Paper>
    </Box>
  );
};

export default LoginForm;
