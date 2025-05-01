import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { auth, db } from '../firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { setDoc, doc, getDoc } from 'firebase/firestore';

function Signup() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [anonId, setAnonId] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [elements, setElements] = useState([]);

  useEffect(() => {
    // Create initial ripples
    const initialRipples = Array.from({ length: 3 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 50,
      color: "rgba(100, 200, 255, 0.1)",
      duration: 3,
      delay: i * 0.5
    }));
    setElements(initialRipples);
  }, []);

  // Function to create new ripples at random intervals
  useEffect(() => {
    const createRipples = () => {
      const numRipples = Math.floor(Math.random() * 3) + 1;
      const newRipples = Array.from({ length: numRipples }, (_, i) => ({
        id: Date.now() + i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: 50,
        color: "rgba(100, 200, 255, 0.1)",
        duration: 3,
        delay: i * 0.3
      }));
      
      setElements(prev => [...prev, ...newRipples].slice(-8));
    };

    const interval = setInterval(() => {
      createRipples();
    }, Math.random() * 2000 + 1000);

    return () => clearInterval(interval);
  }, []);

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

  const handleSignup = async () => {
    // Prevent multiple submissions
    if (isLoading) return;
    
    // Check if any field is empty
    if (!email || !anonId || !password || !confirmPassword) {
      setError("All fields are required");
      return;
    }

    // Ensure password and confirm password match
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    // Validate anonymous ID
    if (anonId.trim() === "") {
      setError("Anonymous ID is required.");
      return;
    }

    // Convert email to lowercase
    const normalizedEmail = email.toLowerCase();

    try {
      setIsLoading(true);
      setError("");

      // 🔍 Check if email exists in allowedEmails collection
      const docRef = doc(db, "allowedEmails", normalizedEmail);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        setError("This email is not authorized for signup.");
        return;
      }

      // Check if user already exists
      const userRef = doc(db, "users", normalizedEmail);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        setError("An account with this email already exists.");
        return;
      }

      // ✅ Create user in Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(auth, normalizedEmail, password);
      const user = userCredential.user;

      // ✅ Save user details to Firestore
      await setDoc(doc(db, "users", user.uid), {
        email: normalizedEmail,
        anonymousID: anonId,
        role: docSnap.data().role || "student", // Use role from allowedEmails if available
        createdAt: new Date(), // Add creation timestamp
      });

      alert(`✅ Account created for ${anonId}`);
      navigate("/login");
    } catch (error) {
      console.error("Signup error:", error.message);
      if (error.code === "auth/email-already-in-use") {
        setError("An account with this email already exists.");
      } else {
        setError(error.message);
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
      {/* Animated background elements */}
      {elements.map((element) => (
        <motion.div
          key={element.id}
          style={{
            position: "absolute",
            width: element.size,
            height: element.size,
            background: "transparent",
            borderRadius: "50%",
            left: `${element.x}%`,
            top: `${element.y}%`,
            transform: "translate(-50%, -50%)",
            zIndex: 0,
            border: `1px solid rgba(100, 200, 255, 0.3)`,
            boxShadow: `
              0 0 0 1px rgba(100, 200, 255, 0.2),
              0 0 0 2px rgba(100, 200, 255, 0.1)
            `
          }}
          animate={{
            scale: [1, 20],
            opacity: [0.3, 0]
          }}
          transition={{
            duration: element.duration,
            ease: "easeOut"
          }}
        />
      ))}

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
          Create Account
        </motion.h2>

        {error && (
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
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

        <motion.div variants={itemVariants}>
          <motion.input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="College Email"
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
            whileFocus={{
              scale: 1.02,
              boxShadow: "0 0 15px rgba(255, 255, 255, 0.1)",
              background: "rgba(255, 255, 255, 0.1)"
            }}
          />
        </motion.div>

        <motion.div variants={itemVariants}>
          <motion.input
            type="text"
            value={anonId}
            onChange={(e) => setAnonId(e.target.value)}
            placeholder="Anonymous ID"
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
            whileFocus={{
              scale: 1.02,
              boxShadow: "0 0 15px rgba(255, 255, 255, 0.1)",
              background: "rgba(255, 255, 255, 0.1)"
            }}
          />
        </motion.div>

        <motion.div variants={itemVariants}>
          <motion.input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
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
            whileFocus={{
              scale: 1.02,
              boxShadow: "0 0 15px rgba(255, 255, 255, 0.1)",
              background: "rgba(255, 255, 255, 0.1)"
            }}
          />
        </motion.div>

        <motion.div variants={itemVariants}>
          <motion.input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm Password"
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
            whileFocus={{
              scale: 1.02,
              boxShadow: "0 0 15px rgba(255, 255, 255, 0.1)",
              background: "rgba(255, 255, 255, 0.1)"
            }}
          />
        </motion.div>

        <motion.button
          variants={buttonVariants}
          whileHover={isLoading ? {} : "hover"}
          whileTap={isLoading ? {} : "tap"}
          onClick={handleSignup}
          disabled={isLoading}
          style={{
            width: "100%",
            padding: "12px",
            background: isLoading ? "rgba(255, 255, 255, 0.2)" : "rgba(255, 255, 255, 0.1)",
            color: "white",
            border: "1px solid rgba(255, 255, 255, 0.2)",
            borderRadius: "8px",
            cursor: isLoading ? "not-allowed" : "pointer",
            fontSize: "1rem",
            fontWeight: "bold",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            opacity: isLoading ? 0.7 : 1
          }}
        >
          <span>{isLoading ? "⏳" : "📝"}</span> {isLoading ? "Creating Account..." : "Sign Up"}
        </motion.button>

        <motion.p
          variants={itemVariants}
          style={{
            color: "#94a3b8",
            textAlign: "center",
            marginTop: "20px"
          }}
        >
          Already have an account?{" "}
          <motion.span
            whileHover={{ color: "#fff", scale: 1.05 }}
            style={{
              color: "#3b82f6",
              cursor: "pointer",
              fontWeight: "bold",
              display: "inline-block"
            }}
            onClick={() => navigate("/login")}
          >
            Login
          </motion.span>
        </motion.p>
      </motion.div>
    </div>
  );
}

export default Signup;
