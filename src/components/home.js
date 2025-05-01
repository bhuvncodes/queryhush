import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

function Home() {
  const navigate = useNavigate();
  const [text, setText] = useState("");
  const [showCursor, setShowCursor] = useState(true);
  const [backgroundRipples, setBackgroundRipples] = useState([]);
  const fullText = "QueryHush";

  useEffect(() => {
    let currentIndex = 0;
    const interval = setInterval(() => {
      if (currentIndex <= fullText.length) {
        setText(fullText.slice(0, currentIndex));
        currentIndex++;
      } else {
        clearInterval(interval);
        setShowCursor(false);
      }
    }, 150);

    return () => clearInterval(interval);
  }, []);

  // Create background ripples
  useEffect(() => {
    const createBackgroundRipple = () => {
      // Clean up any stuck ripples first
      setBackgroundRipples(prev => prev.filter(r => Date.now() - r.id < 2500));

      const newRipple = {
        id: Date.now(),
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 20 + 20,
        opacity: 0.15 + Math.random() * 0.1
      };
      setBackgroundRipples(prev => [...prev, newRipple]);

      // Remove ripple after animation
      setTimeout(() => {
        setBackgroundRipples(prev => prev.filter(r => r.id !== newRipple.id));
      }, 2500);
    };

    // Create initial ripples
    for (let i = 0; i < 2; i++) {
      setTimeout(() => {
        createBackgroundRipple();
      }, i * 2000);
    }

    // Create new ripples at random intervals
    const interval = setInterval(() => {
      createBackgroundRipple();
    }, 6000);

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

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        position: "relative",
        overflow: "hidden"
      }}
    >
      {/* Background ripples */}
      {backgroundRipples.map(ripple => (
        <motion.div
          key={ripple.id}
          style={{
            position: "absolute",
            left: `${ripple.x}%`,
            top: `${ripple.y}%`,
            width: ripple.size,
            height: ripple.size,
            background: "rgba(255, 255, 255, 0.2)",
            borderRadius: "50%",
            transform: "translate(-50%, -50%)",
            pointerEvents: "none",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            boxShadow: "0 0 10px rgba(255, 255, 255, 0.1)",
            zIndex: 0
          }}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ 
            scale: 10,
            opacity: [0, ripple.opacity, 0],
            transition: { 
              duration: 2.5,
              ease: "easeOut",
              times: [0, 0.3, 1]
            }
          }}
          exit={{ opacity: 0 }}
        />
      ))}

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        style={{
          textAlign: "center",
          zIndex: 2,
          maxWidth: "600px",
          position: "relative"
        }}
      >
        <motion.h1
          variants={itemVariants}
          style={{
            fontSize: "3.5rem",
            color: "#fff",
            marginBottom: "20px",
            textShadow: "0 2px 4px rgba(0, 0, 0, 0.3)",
            minHeight: "4.5rem"
          }}
        >
          Welcome to{" "}
          <span style={{
            color: "#3b82f6",
            position: "relative"
          }}>
            {text}
            {showCursor && (
              <motion.span
                animate={{ opacity: [0, 1, 0] }}
                transition={{ duration: 0.8, repeat: Infinity }}
                style={{
                  position: "absolute",
                  right: 0,
                  top: 0,
                  width: "2px",
                  height: "100%",
                  background: "#3b82f6"
                }}
              />
            )}
          </span>
        </motion.h1>

        <motion.p
          variants={itemVariants}
          style={{
            fontSize: "1.2rem",
            color: "#94a3b8",
            marginBottom: "40px",
            lineHeight: "1.6"
          }}
        >
          Your anonymous Q&A platform for students and faculty
        </motion.p>

        <motion.div
          variants={itemVariants}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "15px",
            alignItems: "center"
          }}
        >
          <motion.button
            variants={buttonVariants}
            whileHover="hover"
            whileTap="tap"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              window.location.href = '/login';
            }}
            style={{
              width: "100%",
              maxWidth: "300px",
              padding: "15px 30px",
              background: "rgba(255, 255, 255, 0.1)",
              color: "white",
              border: "1px solid rgba(255, 255, 255, 0.2)",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "1.1rem",
              fontWeight: "bold",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            Login
          </motion.button>

          <motion.button
            variants={buttonVariants}
            whileHover="hover"
            whileTap="tap"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              window.location.href = '/signup';
            }}
            style={{
              width: "100%",
              maxWidth: "300px",
              padding: "15px 30px",
              background: "rgba(255, 255, 255, 0.1)",
              color: "white",
              border: "1px solid rgba(255, 255, 255, 0.2)",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "1.1rem",
              fontWeight: "bold",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            Sign Up
          </motion.button>
        </motion.div>
      </motion.div>
    </div>
  );
}

export default Home;
