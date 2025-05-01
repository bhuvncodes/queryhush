import React from "react";
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { uploadEmails } from "./emailuploader"; // ✅ this is correct


// Import your components
import Home from "./components/home";
import Signup from "./components/signup";
import Login from "./components/login";
import Feed from "./components/feed";
import AdminFeed from "./components/adminfeed";
import ResetPassword from "./components/ResetPassword";
import Profile from "./components/Profile";
import ProtectedRoute from './ProtectedRoute';
import SuperAdminDashboard from './components/SuperAdminDashboard';

import { useEffect } from "react";
import "./App.css";

function App() {
  useEffect(() => {
    //uploadEmails(); // ⚠️ only ONCE
  }, []);

  return (
    <Router>
      <div className="App" style={{
        backgroundColor: "#1a1a2e",
        minHeight: "100vh",
        position: "relative",
        overflow: "hidden"
      }}>
        <AnimatedRoutes />
      </div>
    </Router>
  );
}

function AnimatedRoutes() {
  const location = useLocation();
  useEffect(() => {
    let title = "queryhush";
    if (location.pathname === "/login") title = "queryhush-login";
    else if (location.pathname === "/signup") title = "queryhush-signup";
    else if (location.pathname === "/profile") title = "queryhush-profile";
    else if (location.pathname === "/adminfeed") title = "queryhush";
    else if (location.pathname === "/feed") title = "queryhush";
    else if (location.pathname === "/") title = "queryhush";
    document.title = title;
  }, [location.pathname]);

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Home />} />

        <Route
          path="/signup"
          element={
            <motion.div
              key="signup"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{
                duration: 0.2,
                ease: "easeInOut"
              }}
              style={{
                width: '100%',
                height: '100vh',
                position: 'absolute',
                top: 0,
                left: 0,
                backgroundColor: "#1a1a2e",
                zIndex: 1
              }}
            >
              <Signup />
            </motion.div>
          }
        />

        <Route
          path="/login"
          element={
            <motion.div
              key="login"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{
                duration: 0.2,
                ease: "easeInOut"
              }}
              style={{
                width: '100%',
                height: '100vh',
                position: 'absolute',
                top: 0,
                left: 0,
                backgroundColor: "#1a1a2e",
                zIndex: 1
              }}
            >
              <Login />
            </motion.div>
          }
        />

        <Route
          path="/feed"
          element={
            <motion.div
              key="feed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{
                duration: 0.2,
                ease: "easeInOut"
              }}
              style={{
                width: '100%',
                height: '100vh',
                position: 'absolute',
                top: 0,
                left: 0,
                backgroundColor: "#1a1a2e",
                zIndex: 1,
                overflowY: "scroll"
              }}
            >
              <ProtectedRoute>
                <Feed />
              </ProtectedRoute>

            </motion.div>
          }
        />

        <Route
          path="/adminfeed"
          element={
            <motion.div
              key="adminfeed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{
                duration: 0.2,
                ease: "easeInOut"
              }}
              style={{
                width: '100%',
                height: '100vh',
                position: 'absolute',
                top: 0,
                left: 0,
                backgroundColor: "#1a1a2e",
                zIndex: 1,
                overflowY: "scroll"
              }}
            >
              <ProtectedRoute>
                <AdminFeed />
              </ProtectedRoute>

            </motion.div>
          }
        />

        <Route
          path="/reset-password"
          element={
            <motion.div
              key="reset-password"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{
                duration: 0.2,
                ease: "easeInOut"
              }}
              style={{
                width: '100%',
                height: '100vh',
                position: 'absolute',
                top: 0,
                left: 0,
                backgroundColor: "#1a1a2e",
                zIndex: 1
              }}
            >
              <ResetPassword />
            </motion.div>
          }
        />

        <Route
          path="/profile"
          element={
            <motion.div
              key="profile"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{
                duration: 0.2,
                ease: "easeInOut"
              }}
              style={{
                width: '100%',
                height: '100vh',
                position: 'absolute',
                top: 0,
                left: 0,
                backgroundColor: "#1a1a2e",
                zIndex: 1,
                overflowY: "scroll"
              }}
            >
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            </motion.div>
          }
        />

        <Route path="/superadmin" element={<SuperAdminDashboard />} />
      </Routes>
    </AnimatePresence>
  );
}

export default App;
