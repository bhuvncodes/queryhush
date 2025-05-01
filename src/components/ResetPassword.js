import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { auth } from "../firebase";
import { confirmPasswordReset } from "firebase/auth";
import { sendPasswordResetEmail } from "firebase/auth";

function ResetPassword() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.3
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 10
      }
    }
  };

  const buttonVariants = {
    hover: {
      scale: 1.05,
      boxShadow: "0 8px 16px rgba(0, 0, 0, 0.2)",
      background: "rgba(255, 255, 255, 0.15)",
      transition: {
        type: "spring",
        stiffness: 300
      }
    },
    tap: {
      scale: 0.95,
      background: "rgba(255, 255, 255, 0.2)"
    }
  };

  const inputVariants = {
    focus: {
      scale: 1.02,
      boxShadow: "0 0 15px rgba(255, 255, 255, 0.1)",
      background: "rgba(255, 255, 255, 0.1)",
      transition: {
        type: "spring",
        stiffness: 300
      }
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    if (!newPassword || !confirmPassword) {
      setError("Please enter and confirm your new password.");
      setIsLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      setIsLoading(false);
      return;
    }

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters long.");
      setIsLoading(false);
      return;
    }

    try {
      const oobCode = searchParams.get("oobCode");
      if (!oobCode) {
        setError("Invalid reset link. Please request a new password reset.");
        return;
      }

      // Convert email to lowercase
      const normalizedEmail = searchParams.get("email").toLowerCase();

      await confirmPasswordReset(auth, oobCode, newPassword);
      setIsSuccess(true);
      setTimeout(() => {
        navigate("/login");
      }, 3000);
    } catch (error) {
      console.error("Password reset error:", error);
      if (error.code === "auth/expired-action-code") {
        setError("Password reset link has expired. Please request a new one.");
      } else if (error.code === "auth/invalid-action-code") {
        setError("Invalid reset link. Please request a new password reset.");
      } else {
        setError("Failed to reset password. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "20px",
      position: "relative",
      overflow: "hidden"
    }}>
      {/* Background bubbles animation */}
      <div className="background-bubbles">
        {Array.from({ length: 30 }).map((_, i) => (
          <motion.div
            key={i}
            className="bubble"
            style={{
              left: `${Math.random() * 100}%`,
              width: `${20 + Math.random() * 30}px`,
              height: `${20 + Math.random() * 30}px`,
            }}
            initial={{
              y: "100vh",
              opacity: 0.2,
              rotate: 0
            }}
            animate={{
              y: "-100px",
              opacity: 0.5,
              rotate: 360
            }}
            transition={{
              duration: 10 + Math.random() * 10,
              ease: "linear",
              repeat: Infinity
            }}
          />
        ))}
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        style={{
          background: "rgba(255, 255, 255, 0.1)",
          padding: "40px",
          borderRadius: "12px",
          width: "100%",
          maxWidth: "400px",
          backdropFilter: "blur(10px)",
          border: "1px solid rgba(255, 255, 255, 0.2)",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
          position: "relative",
          overflow: "hidden",
          zIndex: 1
        }}
      >
        <motion.h2
          variants={itemVariants}
          style={{
            color: "#fff",
            textAlign: "center",
            marginBottom: "30px",
            fontSize: "2rem",
            textShadow: "0 2px 4px rgba(0, 0, 0, 0.3)"
          }}
        >
          Reset Password
        </motion.h2>

        <form onSubmit={handleResetPassword}>
          <motion.div variants={itemVariants}>
            <motion.input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
              required
              whileFocus="focus"
              variants={inputVariants}
              style={{
                width: "100%",
                padding: "12px",
                marginBottom: "20px",
                borderRadius: "8px",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                background: "rgba(255, 255, 255, 0.05)",
                color: "#fff",
                fontSize: "1rem",
                transition: "all 0.3s ease"
              }}
            />
          </motion.div>

          <motion.div variants={itemVariants}>
            <motion.input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              required
              whileFocus="focus"
              variants={inputVariants}
              style={{
                width: "100%",
                padding: "12px",
                marginBottom: "20px",
                borderRadius: "8px",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                background: "rgba(255, 255, 255, 0.05)",
                color: "#fff",
                fontSize: "1rem",
                transition: "all 0.3s ease"
              }}
            />
          </motion.div>

          <AnimatePresence>
            {error && (
              <motion.p
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                style={{
                  color: "#ef4444",
                  textAlign: "center",
                  marginBottom: "20px",
                  textShadow: "0 1px 2px rgba(0, 0, 0, 0.2)"
                }}
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>

          <motion.button
            variants={buttonVariants}
            whileHover="hover"
            whileTap="tap"
            type="submit"
            disabled={isLoading}
            style={{
              width: "100%",
              padding: "12px",
              background: "rgba(255, 255, 255, 0.1)",
              color: "white",
              border: "1px solid rgba(255, 255, 255, 0.2)",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "1rem",
              fontWeight: "bold",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              position: "relative",
              overflow: "hidden"
            }}
          >
            {isLoading ? (
              <motion.span
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                style={{
                  display: "inline-block",
                  width: "20px",
                  height: "20px",
                  border: "2px solid rgba(255, 255, 255, 0.3)",
                  borderTopColor: "white",
                  borderRadius: "50%"
                }}
              />
            ) : (
              <>
                <span>🔒</span> Reset Password
              </>
            )}
          </motion.button>
        </form>

        <AnimatePresence>
          {isSuccess && (
            <motion.p
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              style={{
                color: "#10b981",
                textAlign: "center",
                marginTop: "20px",
                textShadow: "0 1px 2px rgba(0, 0, 0, 0.2)"
              }}
            >
              Password reset successful! Redirecting to login...
            </motion.p>
          )}
        </AnimatePresence>
      </motion.div>

      <style jsx>{`
        .background-bubbles {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
        }

        .bubble {
          position: absolute;
          background: rgba(255, 255, 255, 0.4);
          border-radius: 50%;
          border: 1px solid rgba(255, 255, 255, 0.3);
          box-shadow: 0 0 8px rgba(255, 255, 255, 0.2);
        }
      `}</style>
    </div>
  );
}

export default ResetPassword; 