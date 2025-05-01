import React, { useState, useEffect } from 'react';
import { getAuth, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { getFirestore, doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';

const Profile = () => {
  const [userData, setUserData] = useState(null);
  const [myQuestions, setMyQuestions] = useState([]);
  const [myAnswers, setMyAnswers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [activeTab, setActiveTab] = useState(null); // null, 'questions', or 'answers'
  const navigate = useNavigate();
  const auth = getAuth();

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const user = auth.currentUser;
        if (!user) {
          navigate('/login');
          return;
        }

        const db = getFirestore();
        const userDoc = await getDoc(doc(db, "users", user.uid));
        
        if (userDoc.exists()) {
          setUserData(userDoc.data());
        }

        // Fetch user's questions
        const questionsQuery = query(
          collection(db, "questions"),
          where("askerId", "==", user.uid)
        );
        const questionsSnapshot = await getDocs(questionsQuery);
        const questionsData = questionsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setMyQuestions(questionsData);

        // Fetch user's answers
        const allQuestions = await getDocs(collection(db, "questions"));
        const answersData = [];
        
        for (const questionDoc of allQuestions.docs) {
          const answersSnapshot = await getDocs(collection(questionDoc.ref, "answers"));
          const userAnswers = answersSnapshot.docs
            .filter(doc => doc.data().answererId === user.uid)
            .map(doc => ({
              id: doc.id,
              questionId: questionDoc.id,
              questionText: questionDoc.data().questionText,
              ...doc.data()
            }));
          answersData.push(...userAnswers);
        }
        
        setMyAnswers(answersData);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching user data:", error);
        setLoading(false);
      }
    };

    fetchUserData();
  }, [navigate, auth]);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError("All fields are required");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match");
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters long");
      return;
    }

    try {
      const user = auth.currentUser;

      // Reauthenticate user before changing password
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);

      // Change password
      await updatePassword(user, newPassword);
      
      setPasswordSuccess("Password updated successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setShowChangePassword(false);
    } catch (error) {
      console.error("Password change error:", error);
      if (error.code === "auth/wrong-password") {
        setPasswordError("Current password is incorrect");
      } else if (error.code === "auth/requires-recent-login") {
        setPasswordError("Please log out and log in again before changing your password");
      } else {
        setPasswordError("Failed to update password. Please try again.");
      }
    }
  };

  const handleBack = () => {
    navigate('/feed');
  };

  if (loading) {
    return (
      <div style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        color: "white"
      }}>
        Loading...
      </div>
    );
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
      padding: "20px",
      position: "relative",
      overflow: "hidden"
    }}>
      {/* Animated Background Elements */}
      <motion.div
        initial={{ rotate: 0, opacity: 0 }}
        animate={{ rotate: 360, opacity: 1 }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "150%",
          height: "150%",
          background: "radial-gradient(circle at center, rgba(255, 255, 255, 0.03) 0%, transparent 70%)",
          pointerEvents: "none"
        }}
      />
      <motion.div
        initial={{ rotate: 0, opacity: 0 }}
        animate={{ rotate: -360, opacity: 1 }}
        transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "120%",
          height: "120%",
          background: "radial-gradient(circle at center, rgba(255, 255, 255, 0.02) 0%, transparent 60%)",
          pointerEvents: "none"
        }}
      />

      {/* Header */}
      <div style={{
        maxWidth: "800px",
        margin: "0 auto 20px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center"
      }}>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleBack}
          style={{
            padding: "10px 20px",
            background: "rgba(255, 255, 255, 0.1)",
            color: "white",
            border: "1px solid rgba(255, 255, 255, 0.2)",
            borderRadius: "8px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "8px"
          }}
        >
          ← Back to Feed
        </motion.button>
      </div>

      {/* Profile Content */}
      <div style={{
        maxWidth: "800px",
        margin: "0 auto",
        background: "rgba(255, 255, 255, 0.05)",
        borderRadius: "12px",
        padding: "20px",
        backdropFilter: "blur(10px)",
        maxHeight: "calc(100vh - 200px)",
        overflowY: "auto"
      }}>
        {/* User Info */}
        <div style={{ marginBottom: "30px" }}>
          <h2 style={{ color: "white", marginBottom: "10px" }}>Profile</h2>
          <p style={{ color: "#94a3b8" }}>Anonymous ID: {userData?.anonymousID || "Anonymous"}</p>
          <p style={{ color: "#94a3b8" }}>Role: {userData?.role || "Student"}</p>
          {userData?.role === 'superadmin' && (
            <div className="mt-6">
              <Link
                to="/superadmin"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Super Admin Dashboard
              </Link>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div style={{
          display: "flex",
          gap: "10px",
          marginBottom: "20px"
        }}>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setActiveTab(activeTab === 'questions' ? null : 'questions')}
            style={{
              padding: "10px 20px",
              background: activeTab === 'questions' ? "#f97316" : "rgba(255, 255, 255, 0.1)",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer"
            }}
          >
            My Questions ({myQuestions.length})
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setActiveTab(activeTab === 'answers' ? null : 'answers')}
            style={{
              padding: "10px 20px",
              background: activeTab === 'answers' ? "#f97316" : "rgba(255, 255, 255, 0.1)",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer"
            }}
          >
            My Answers ({myAnswers.length})
          </motion.button>
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          {activeTab === 'questions' ? (
            <motion.div
              key="questions"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
            >
              {myQuestions.length === 0 ? (
                <p style={{ color: "#94a3b8", textAlign: "center" }}>You haven't asked any questions yet.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
                  {myQuestions.map(question => (
                    <motion.div
                      key={question.id}
                      whileHover={{ scale: 1.02 }}
                      style={{
                        padding: "15px",
                        background: "rgba(255, 255, 255, 0.05)",
                        borderRadius: "8px",
                        borderLeft: "4px solid #f97316"
                      }}
                    >
                      <p style={{ color: "white", marginBottom: "10px" }}>{question.questionText}</p>
                      <p style={{ color: "#94a3b8", fontSize: "0.9rem" }}>
                        {question.answers?.length || 0} answers • {question.timestamp?.toDate?.()?.toLocaleDateString() || new Date(question.timestamp).toLocaleDateString()}
                      </p>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          ) : activeTab === 'answers' ? (
            <motion.div
              key="answers"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
            >
              {myAnswers.length === 0 ? (
                <p style={{ color: "#94a3b8", textAlign: "center" }}>You haven't answered any questions yet.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
                  {myAnswers.map(answer => (
                    <motion.div
                      key={answer.id}
                      whileHover={{ scale: 1.02 }}
                      style={{
                        padding: "15px",
                        background: "rgba(255, 255, 255, 0.05)",
                        borderRadius: "8px",
                        borderLeft: "4px solid #3b82f6"
                      }}
                    >
                      <p style={{ color: "#94a3b8", fontSize: "0.9rem", marginBottom: "5px" }}>
                        Question: {answer.questionText}
                      </p>
                      <p style={{ color: "white", marginBottom: "10px" }}>{answer.answerText}</p>
                      <p style={{ color: "#94a3b8", fontSize: "0.9rem" }}>
                        {new Date(answer.timestamp).toLocaleDateString()}
                      </p>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ textAlign: "center", color: "#94a3b8" }}
            >
              Select a tab to view your questions or answers
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowChangePassword(!showChangePassword)}
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
            marginTop: "20px",
            marginBottom: "20px"
          }}
        >
          <span>🔒</span> {showChangePassword ? "Cancel Password Change" : "Change Password"}
        </motion.button>

        <AnimatePresence>
          {showChangePassword && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              style={{ marginTop: "10px", marginBottom: "20px" }}
            >
              <form onSubmit={handleChangePassword}>
                <div style={{ marginBottom: "15px" }}>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Current Password"
                    style={{
                      width: "100%",
                      padding: "12px",
                      borderRadius: "8px",
                      border: "1px solid rgba(255, 255, 255, 0.2)",
                      background: "rgba(255, 255, 255, 0.05)",
                      color: "#fff",
                      fontSize: "1rem"
                    }}
                  />
                </div>

                <div style={{ marginBottom: "15px" }}>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="New Password"
                    style={{
                      width: "100%",
                      padding: "12px",
                      borderRadius: "8px",
                      border: "1px solid rgba(255, 255, 255, 0.2)",
                      background: "rgba(255, 255, 255, 0.05)",
                      color: "#fff",
                      fontSize: "1rem"
                    }}
                  />
                </div>

                <div style={{ marginBottom: "15px" }}>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm New Password"
                    style={{
                      width: "100%",
                      padding: "12px",
                      borderRadius: "8px",
                      border: "1px solid rgba(255, 255, 255, 0.2)",
                      background: "rgba(255, 255, 255, 0.05)",
                      color: "#fff",
                      fontSize: "1rem"
                    }}
                  />
                </div>

                {passwordError && (
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{
                      color: "#ef4444",
                      textAlign: "center",
                      marginBottom: "15px"
                    }}
                  >
                    {passwordError}
                  </motion.p>
                )}

                {passwordSuccess && (
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{
                      color: "#10b981",
                      textAlign: "center",
                      marginBottom: "15px"
                    }}
                  >
                    {passwordSuccess}
                  </motion.p>
                )}

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  type="submit"
                  style={{
                    width: "100%",
                    padding: "12px",
                    background: "rgba(255, 255, 255, 0.1)",
                    color: "white",
                    border: "1px solid rgba(255, 255, 255, 0.2)",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontSize: "1rem",
                    fontWeight: "bold"
                  }}
                >
                  Update Password
                </motion.button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Profile; 