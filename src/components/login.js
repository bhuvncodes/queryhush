import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { getAuth, signInWithEmailAndPassword, updatePassword } from "firebase/auth";
import { getFirestore, doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { auth } from '../firebase';
import { sendPasswordResetEmail } from "firebase/auth";
import { fetchSignInMethodsForEmail } from "firebase/auth";
function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isResetLinkSent, setIsResetLinkSent] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [showResetForm, setShowResetForm] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [showNewPasswordForm, setShowNewPasswordForm] = useState(false);
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

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      const db = getFirestore();
      const userDoc = await getDoc(doc(db, "users", user.uid));

      if (userDoc.exists() && userDoc.data().role === "admin") {
        navigate("/adminfeed");
      } else {
        navigate("/feed");
      }
    } catch (error) {
      console.error("Login error:", error);
      if (error.code === "auth/invalid-credential") {
        setError("Invalid email or password. Please try again.");
      } else if (error.code === "auth/too-many-requests") {
        setError("Too many failed attempts. Please try again later.");
      } else {
        setError("An error occurred. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };
  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!resetEmail) {
      setError("Please enter your email to reset your password.");
      return;
    }
  
    try {
      // Check if user exists in Firestore
      const db = getFirestore();
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("email", "==", resetEmail.toLowerCase()));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setError("No account found with this email address.");
        return;
      }

      // If user exists, send reset email
      await sendPasswordResetEmail(auth, resetEmail.toLowerCase());
      setIsResetLinkSent(true);
      setError("");
      setShowResetForm(false);
    } catch (error) {
      console.error("Password reset error:", error);
      if (error.code === "auth/invalid-email") {
        setError("Please enter a valid email address.");
      } else if (error.code === "auth/too-many-requests") {
        setError("Too many attempts. Please try again later.");
      } else if (error.code === "auth/user-not-found") {
        setError("No account found with this email address.");
      } else {
        setError("Something went wrong. Please try again later.");
      }
      setIsResetLinkSent(false);
    }
  };

  const handleNewPassword = async (e) => {
    e.preventDefault();
    if (!newPassword || !confirmPassword) {
      setError("Please enter and confirm your new password.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    try {
      await updatePassword(auth.currentUser, newPassword);
      setError("");
      setShowNewPasswordForm(false);
      setNewPassword("");
      setConfirmPassword("");
      navigate("/login");
    } catch (error) {
      console.error("Password update error:", error);
      setError("Failed to update password. Please try again.");
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

      {/* Water surface effect */}
      <div style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: "150px",
        background: "linear-gradient(to bottom, rgba(0, 0, 0, 0.2), transparent)",
        pointerEvents: "none"
      }} />

      {/* Background decorative elements */}
      <div style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "radial-gradient(circle at 20% 20%, rgba(255, 255, 255, 0.05) 0%, transparent 50%)",
        pointerEvents: "none"
      }} />
      <div style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "radial-gradient(circle at 80% 80%, rgba(255, 255, 255, 0.05) 0%, transparent 50%)",
        pointerEvents: "none"
      }} />

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
        {/* Animated border effect */}
        <motion.div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "2px",
            background: "linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.5), transparent)",
            transform: "translateX(-100%)"
          }}
          animate={{
            transform: ["translateX(-100%)", "translateX(100%)"]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "linear"
          }}
        />

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
          Welcome Back
        </motion.h2>

        <form onSubmit={handleLogin}>
          <motion.div variants={itemVariants}>
            <motion.input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
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
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
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
                <span>🔑</span> Login
              </>
            )}
          </motion.button>
        </form>

        <motion.p
          variants={itemVariants}
          style={{
            color: "#94a3b8",
            textAlign: "center",
            marginTop: "20px"
          }}
        >
          Don't have an account?{" "}
          <motion.span
            whileHover={{ color: "#fff", scale: 1.05 }}
            style={{
              color: "#3b82f6",
              cursor: "pointer",
              fontWeight: "bold",
              display: "inline-block"
            }}
            onClick={() => navigate("/signup")}
          >
            Sign up
          </motion.span>
        </motion.p>
        <motion.p
          variants={itemVariants}
          style={{
            color: "#94a3b8",
            textAlign: "center",
            marginTop: "10px",
            marginRight: "10px"
          }}
        >
          <motion.span
            whileHover={{ color: "#fff", scale: 1.05 }}
            style={{
              color: "#3b82f6",
              cursor: "pointer",
              fontWeight: "bold",
              display: "inline-block"
            }}
            onClick={() => setShowResetForm(true)}
          >
            Forgot password?
          </motion.span>
        </motion.p>

        <AnimatePresence>
          {showResetForm && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              style={{
                marginTop: "20px",
                padding: "20px",
                background: "rgba(255, 255, 255, 0.05)",
                borderRadius: "8px",
                border: "1px solid rgba(255, 255, 255, 0.1)"
              }}
            >
              <h3 style={{ color: "#fff", marginBottom: "15px" }}>Reset Password</h3>
              <motion.input
                type="email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                placeholder="Enter your email"
                whileFocus="focus"
                variants={inputVariants}
                style={{
                  width: "100%",
                  padding: "12px",
                  marginBottom: "15px",
                  borderRadius: "8px",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  background: "rgba(255, 255, 255, 0.05)",
                  color: "#fff",
                  fontSize: "1rem"
                }}
              />
              <div style={{ display: "flex", gap: "10px" }}>
                <motion.button
                  variants={buttonVariants}
                  whileHover="hover"
                  whileTap="tap"
                  onClick={handleForgotPassword}
                  style={{
                    padding: "8px 16px",
                    background: "rgba(255, 255, 255, 0.1)",
                    color: "white",
                    border: "1px solid rgba(255, 255, 255, 0.2)",
                    borderRadius: "8px",
                    cursor: "pointer"
                  }}
                >
                  Send Reset Link
                </motion.button>
                <motion.button
                  variants={buttonVariants}
                  whileHover="hover"
                  whileTap="tap"
                  onClick={() => {
                    setShowResetForm(false);
                    setResetEmail("");
                    setError("");
                  }}
                  style={{
                    padding: "8px 16px",
                    background: "rgba(255, 255, 255, 0.05)",
                    color: "white",
                    border: "1px solid rgba(255, 255, 255, 0.2)",
                    borderRadius: "8px",
                    cursor: "pointer"
                  }}
                >
                  Cancel
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showNewPasswordForm && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              style={{
                marginTop: "20px",
                padding: "20px",
                background: "rgba(255, 255, 255, 0.05)",
                borderRadius: "8px",
                border: "1px solid rgba(255, 255, 255, 0.1)"
              }}
            >
              <h3 style={{ color: "#fff", marginBottom: "15px" }}>Set New Password</h3>
              <motion.input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                whileFocus="focus"
                variants={inputVariants}
                style={{
                  width: "100%",
                  padding: "12px",
                  marginBottom: "15px",
                  borderRadius: "8px",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  background: "rgba(255, 255, 255, 0.05)",
                  color: "#fff",
                  fontSize: "1rem"
                }}
              />
              <motion.input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                whileFocus="focus"
                variants={inputVariants}
                style={{
                  width: "100%",
                  padding: "12px",
                  marginBottom: "15px",
                  borderRadius: "8px",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  background: "rgba(255, 255, 255, 0.05)",
                  color: "#fff",
                  fontSize: "1rem"
                }}
              />
              <div style={{ display: "flex", gap: "10px" }}>
                <motion.button
                  variants={buttonVariants}
                  whileHover="hover"
                  whileTap="tap"
                  onClick={handleNewPassword}
                  style={{
                    padding: "8px 16px",
                    background: "rgba(255, 255, 255, 0.1)",
                    color: "white",
                    border: "1px solid rgba(255, 255, 255, 0.2)",
                    borderRadius: "8px",
                    cursor: "pointer"
                  }}
                >
                  Update Password
                </motion.button>
                <motion.button
                  variants={buttonVariants}
                  whileHover="hover"
                  whileTap="tap"
                  onClick={() => {
                    setShowNewPasswordForm(false);
                    setNewPassword("");
                    setConfirmPassword("");
                    setError("");
                  }}
                  style={{
                    padding: "8px 16px",
                    background: "rgba(255, 255, 255, 0.05)",
                    color: "white",
                    border: "1px solid rgba(255, 255, 255, 0.2)",
                    borderRadius: "8px",
                    cursor: "pointer"
                  }}
                >
                  Cancel
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isResetLinkSent && (
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
              Password reset link sent! Check your email and click the link to set a new password.
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

export default Login;