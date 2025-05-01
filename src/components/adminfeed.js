import React, { useState, useEffect } from "react";
import { getFirestore, collection, getDocs, doc, deleteDoc, updateDoc, getDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

const buttonStyles = {
  base: {
    padding: "10px 20px",
    borderRadius: "8px",
    border: "none",
    cursor: "pointer",
    fontWeight: "bold",
    fontSize: "1rem",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.2)"
  },
  delete: {
    background: "#ef4444",
    color: "white",
  },
  ignore: {
    background: "#34d399",
    color: "white",
  },
  close: {
    background: "rgba(255, 255, 255, 0.1)",
    color: "white",
    padding: "8px",
    borderRadius: "50%",
    width: "32px",
    height: "32px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  }
};

function AdminFeed() {
  const [reportedContent, setReportedContent] = useState([]);
  const [currentUserRole, setCurrentUserRole] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [anonymousID, setAnonymousID] = useState("Anonymous"); 
  const navigate = useNavigate();
  useEffect(() => {
    const auth = getAuth();
    const navigateAway = () => {
      auth.signOut().then(() => {
        navigate("/login");
      });
    };

    let timeout;

    const resetTimer = () => {
      clearTimeout(timeout);
      timeout = setTimeout(navigateAway, 15 * 60 * 1000); // 3 minutes timeout for auto logout
    };

    // Activity events to track
    const events = ["mousemove", "keydown", "click"];

    events.forEach((event) => window.addEventListener(event, resetTimer));

    // Check if user is logged in, if not redirect to login
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        navigate("/login");
      }
    });

    resetTimer(); // Start timer

    return () => {
      clearTimeout(timeout);
      events.forEach((event) => window.removeEventListener(event, resetTimer));
      unsubscribe(); // Cleanup auth state listener
    };
  }, [navigate]);
  useEffect(() => {
  const fetchUserRoleAndAnonymousID = async () => {
    const auth = getAuth();
    const user = auth.currentUser;
    if (user) {
      const db = getFirestore();
      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists()) {
        setCurrentUserRole(userDoc.data().role);
        setAnonymousID(userDoc.data().anonymousID || "Anonymous"); // Store anonymousID here
      }
    }
  };

  fetchUserRoleAndAnonymousID();
}, []);

  const fetchReportedAnswers = async (db) => {
    try {
      const reportedAnswers = [];
      const questionsRef = collection(db, "questions");
      const questionsSnapshot = await getDocs(questionsRef);

      console.log("Starting to fetch reported answers...");
      console.log("Total questions to check:", questionsSnapshot.size);

      for (const questionDoc of questionsSnapshot.docs) {
        const questionId = questionDoc.id;
        const questionData = questionDoc.data();

        console.log(`\nChecking question ${questionId} for answers...`);

        // Get the answers subcollection
        const answersRef = collection(db, "questions", questionId, "answers");
        const answersSnapshot = await getDocs(answersRef);

        console.log(`Found ${answersSnapshot.size} answers for question ${questionId}`);

        for (const answerDoc of answersSnapshot.docs) {
          const answerId = answerDoc.id;
          const answerData = answerDoc.data();

          // Log the full answer data to see what fields are available
          console.log(`\nAnswer ${answerId} data:`, {
            questionId,
            answerId,
            fullData: answerData,
            reportCount: answerData.reportCount,
            hasReportCount: 'reportCount' in answerData,
            answererId: answerData.answererId,
            answerText: answerData.answerText
          });

          // Check if reportCount exists and is a number
          const reportCount = typeof answerData.reportCount === 'number' ? answerData.reportCount : 0;
          console.log(`Report count for answer ${answerId}:`, reportCount);

          if (reportCount >= 5) {
            console.log(`\n!!! Found reported answer !!!`, {
              questionId,
              answerId,
              reportCount,
              answerText: answerData.answerText
            });

            try {
              const answererDocRef = doc(db, "users", answerData.answererId);
              const answererDoc = await getDoc(answererDocRef);

              if (answererDoc.exists()) {
                const answererData = answererDoc.data();
                const reportedAnswer = {
                  type: 'answer',
                  id: answerId,
                  questionId: questionId,
                  questionText: questionData.questionText,
                  content: answerData.answerText,
                  user: {
                    anonId: answererData.anonymousID || "Anonymous",
                    email: answererData.email,
                    role: answererData.role,
                    signupDate: answererData.createdAt?.toDate().toISOString().split('T')[0] || "Unknown"
                  },
                  reports: reportCount,
                  timestamp: answerData.timestamp?.toDate?.()?.toISOString() || new Date(answerData.timestamp).toISOString() || "Unknown"
                };

                reportedAnswers.push(reportedAnswer);
                console.log(`Added reported answer to list:`, reportedAnswer);
              } else {
                console.log(`Answerer document not found for answer ${answerId}`);
              }
            } catch (error) {
              console.error(`Error processing answerer data for answer ${answerId}:`, error);
            }
          }
        }
      }

      console.log("\nFinal reported answers:", {
        count: reportedAnswers.length,
        answers: reportedAnswers.map(a => ({
          id: a.id,
          questionId: a.questionId,
          reports: a.reports,
          content: a.content
        }))
      });

      return reportedAnswers;
    } catch (error) {
      console.error("Error in fetchReportedAnswers:", error);
      return [];
    }
  };

  useEffect(() => {
    const fetchReportedContent = async () => {
      try {
        const db = getFirestore();
        const questionsRef = collection(db, "questions");
        const querySnapshot = await getDocs(questionsRef);

        console.log("Total questions found:", querySnapshot.size);
        const reportedItems = [];

        // Fetch reported questions
        for (const docSnapshot of querySnapshot.docs) {
          try {
            const data = docSnapshot.data();
            const questionId = docSnapshot.id;

            if (data.reportCount >= 5) {
              console.log("Found reported question:", questionId);
              const userDocRef = doc(db, "users", data.askerId);
              const userDoc = await getDoc(userDocRef);

              if (userDoc.exists()) {
                const userData = userDoc.data();
                reportedItems.push({
                  type: 'question',
                  id: questionId,
                  content: data.questionText,
                  user: {
                    anonId: userData.anonymousID || "Anonymous",
                    email: userData.email,
                    role: userData.role,
                    signupDate: userData.createdAt?.toDate().toISOString().split('T')[0] || "Unknown"
                  },
                  reports: data.reportCount,
                  timestamp: data.timestamp?.toDate().toISOString() || "Unknown"
                });
              }
            }
          } catch (error) {
            console.error("Error processing question:", docSnapshot.id, error);
          }
        }

        // Fetch reported answers separately
        const reportedAnswers = await fetchReportedAnswers(db);
        reportedItems.push(...reportedAnswers);

        console.log("Final reported items:", {
          totalCount: reportedItems.length,
          questions: reportedItems.filter(item => item.type === 'question').length,
          answers: reportedItems.filter(item => item.type === 'answer').length,
          items: reportedItems
        });

        setReportedContent(reportedItems);
        setLoading(false);
      } catch (error) {
        console.error("Error in fetchReportedContent:", error);
        setLoading(false);
      }
    };

    fetchReportedContent();
  }, []);

  const handleDelete = async (type, id, questionId = null) => {
    try {
      const db = getFirestore();
      if (type === 'question') {
        // First, get all answers for this question
        const answersRef = collection(db, "questions", id, "answers");
        const answersSnapshot = await getDocs(answersRef);

        // Delete all reports and answers for each answer
        for (const answerDoc of answersSnapshot.docs) {
          const answerId = answerDoc.id;
          
          // Delete all reports for this answer
          const reportsRef = collection(db, "questions", id, "answers", answerId, "reports");
          const reportsSnapshot = await getDocs(reportsRef);
          const deleteReportPromises = reportsSnapshot.docs.map(doc => deleteDoc(doc.ref));
          await Promise.all(deleteReportPromises);

          // Delete the answer itself
          await deleteDoc(doc(db, "questions", id, "answers", answerId));
        }

        // Delete any reports directly on the question
        const questionReportsRef = collection(db, "questions", id, "reports");
        const questionReportsSnapshot = await getDocs(questionReportsRef);
        const deleteQuestionReportPromises = questionReportsSnapshot.docs.map(doc => deleteDoc(doc.ref));
        await Promise.all(deleteQuestionReportPromises);

        // Finally, delete the question itself
        await deleteDoc(doc(db, "questions", id));
      } else {
        // Delete answer and its associated data
        const answerRef = doc(db, "questions", questionId, "answers", id);

        // First, get the answer data to log before deletion
        const answerDoc = await getDoc(answerRef);
        if (answerDoc.exists()) {
          const answerData = answerDoc.data();
          console.log("Deleting answer:", {
            id,
            questionId,
            answerText: answerData.answerText,
            reportCount: answerData.reportCount
          });
        }

        // Delete any reports associated with this answer
        const reportsRef = collection(db, "questions", questionId, "answers", id, "reports");
        const reportsSnapshot = await getDocs(reportsRef);

        // Delete all reports
        const deletePromises = reportsSnapshot.docs.map(doc =>
          deleteDoc(doc.ref)
        );

        // Wait for all reports to be deleted
        await Promise.all(deletePromises);

        // Then delete the answer itself
        await deleteDoc(answerRef);

        console.log(`Successfully deleted answer ${id} and its ${reportsSnapshot.size} reports`);
      }

      // Update state by filtering out the deleted item
      setReportedContent(prev => prev.filter(item => item.id !== id));

      // Close the details view if the deleted item was selected
      setSelectedItem(null);

      alert(`🚨 ${type === 'question' ? 'Question' : 'Answer'} deleted successfully!`);
    } catch (error) {
      console.error(`Error deleting ${type}:`, error);
      alert(`Failed to delete ${type}. Please try again.`);
    }
  };

  const handleIgnore = async (type, id, questionId = null) => {
    try {
      const db = getFirestore();
      if (type === 'question') {
        const questionRef = doc(db, "questions", id);
        await updateDoc(questionRef, {
          reportCount: 0
        });
      } else {
        const answerRef = doc(db, "questions", questionId, "answers", id);
        await updateDoc(answerRef, {
          reportCount: 0
        });
      }

      // Update state by filtering out the ignored item
      setReportedContent(prev => prev.filter(item => item.id !== id));
      alert(`✅ ${type === 'question' ? 'Question' : 'Answer'} report count reset. Users can report it again if needed.`);
    } catch (error) {
      console.error(`Error resetting report count:`, error);
      alert(`Failed to reset report count. Please try again.`);
    }
  };

  const handleLogout = () => {
    const auth = getAuth();
    auth.signOut().then(() => {
      navigate('/login');
    });
  };

  if (loading) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background: "#f4f6f8"
      }}>
        <p style={{ fontSize: "18px", color: "#555" }}>Loading reported content...</p>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
      padding: "20px",
      position: "relative"
    }}>
      <div style={{
        display: "flex",
        justifyContent: "flex-end",
        alignItems: "center",
        marginBottom: "20px",
        padding: "0 20px"
      }}>
        <div style={{ display: "flex", gap: "10px" }}>
          <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/profile')}
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
            <span>👤</span> Profile
          </motion.button>
          <motion.button
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleLogout}
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
            <span>🚪</span> Logout
          </motion.button>
        </div>
      </div>

      <div style={{
        display: "flex",
        justifyContent: "center",
        marginBottom: "10px"
      }}>
        <motion.h2
          style={{ 
            color: "#fff", 
            marginBottom: "5px",
            textShadow: "0 2px 4px rgba(0,0,0,0.3)",
            fontSize: "2rem",
            fontWeight: "bold"
          }}
          animate={{
            scale: [1, 1.05, 1],
            textShadow: [
              "0 2px 4px rgba(0,0,0,0.3)",
              "0 4px 8px rgba(0,0,0,0.4)",
              "0 2px 4px rgba(0,0,0,0.3)"
            ]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          Welcome, {anonymousID}!
        </motion.h2>
      </div>

      {/* Content Container */}
      <div style={{
        position: "relative",
        zIndex: 1,
        width: "100%",
        display: "flex",
        flexDirection: "column",
        gap: "40px",
        overflow: "visible"
      }}>
        {/* Heading */}
        <motion.h2 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          style={{
            color: "#fff",
            marginBottom: "30px",
            textAlign: "center",
            textShadow: "0 2px 4px rgba(0,0,0,0.3)",
            fontSize: "1.1rem"
          }}
        >
          🛡️ Reported Content
        </motion.h2>

        {/* Animated Background Elements */}
        <div style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          overflow: "hidden",
          zIndex: 0,
          pointerEvents: "none"
        }}>
          {/* Floating Orbs */}
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={`orb-${i}`}
              initial={{
                x: `${Math.random() * 100}vw`,
                y: `${Math.random() * 100}vh`,
                scale: Math.random() * 0.8 + 0.2,
                opacity: Math.random() * 0.3 + 0.1
              }}
              animate={{
                x: [
                  `${Math.random() * 100}vw`,
                  `${Math.random() * 100}vw`,
                  `${Math.random() * 100}vw`
                ],
                y: [
                  `${Math.random() * 100}vh`,
                  `${Math.random() * 100}vh`,
                  `${Math.random() * 100}vh`
                ],
                scale: [
                  Math.random() * 0.8 + 0.2,
                  Math.random() * 0.8 + 0.2,
                  Math.random() * 0.8 + 0.2
                ],
                opacity: [
                  Math.random() * 0.3 + 0.1,
                  Math.random() * 0.3 + 0.1,
                  Math.random() * 0.3 + 0.1
                ]
              }}
              transition={{
                duration: Math.random() * 30 + 30,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              style={{
                position: "absolute",
                width: `${Math.random() * 200 + 100}px`,
                height: `${Math.random() * 200 + 100}px`,
                background: `radial-gradient(circle, 
                  rgba(${Math.random() * 100 + 100}, ${Math.random() * 100 + 100}, ${Math.random() * 100 + 150}, 0.1) 0%,
                  rgba(${Math.random() * 100 + 100}, ${Math.random() * 100 + 100}, ${Math.random() * 100 + 150}, 0) 70%
                )`,
                borderRadius: "50%",
                pointerEvents: "none",
                filter: "blur(20px)"
              }}
            />
          ))}
        </div>

        {/* Main Content Area */}
        <div style={{
          display: "flex",
          gap: "40px",
          position: "relative"
        }}>
          {/* Left Side - Reported Content List */}
          <div style={{
            flex: 1,
            maxWidth: "800px",
            overflow: "visible"
          }}>
            {reportedContent.length === 0 ? (
              <p style={{
                textAlign: "center",
                color: "#fff",
                animation: "fadeIn 0.5s ease-out"
              }}>
                🎉 No reported content!
              </p>
            ) : (
              <div style={{
                display: "flex",
                flexDirection: "column",
                gap: "20px",
                animation: "slideIn 0.5s ease-out"
              }}>
                {reportedContent.map((item) => (
                  <motion.div
                    key={item.id}
                    whileHover={{
                      scale: 1.02,
                      backgroundColor: "rgba(255, 255, 255, 0.15)"
                    }}
                    whileTap={{ scale: 0.98 }}
                    style={{
                      padding: "20px",
                      borderRadius: "12px",
                      background: "rgba(255, 255, 255, 0.1)",
                      boxShadow: "0 4px 12px rgba(0, 0, 0, 0.2)",
                      borderLeft: "5px solid #ef4444",
                      cursor: "pointer",
                      transition: "all 0.3s ease",
                      backdropFilter: "blur(10px)",
                      marginBottom: "20px"
                    }}
                    onClick={() => setSelectedItem(item)}
                  >
                    <p style={{
                      marginBottom: "15px",
                      fontWeight: "bold",
                      fontSize: "1.2rem",
                      color: selectedItem?.id === item.id ? "#3b82f6" : "#fff"
                    }}>
                      {item.type === 'question' ? '❓ Question' : '💬 Answer'}
                    </p>

                    {item.type === 'answer' ? (
                      <>
                        <p style={{
                          marginBottom: "10px",
                          color: "#e2e8f0",
                          fontSize: "1.1rem",
                          lineHeight: "1.4"
                        }}>
                          <strong>Question:</strong> {item.questionText}
                        </p>
                        <p style={{
                          marginBottom: "10px",
                          color: "#e2e8f0",
                          fontSize: "1.1rem",
                          lineHeight: "1.4"
                        }}>
                          <strong>Answer:</strong> {item.content}
                        </p>
                      </>
                    ) : (
                      <p style={{
                        marginBottom: "10px",
                        color: "#e2e8f0",
                        fontSize: "1.1rem",
                        lineHeight: "1.4"
                      }}>
                        {item.content}
                      </p>
                    )}

                    <p style={{
                      color: "#ef4444",
                      fontSize: "1rem",
                      fontWeight: "bold"
                    }}>
                      🚩 {item.reports} reports
                    </p>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Details Card */}
          {selectedItem && (
            <div style={{
              position: "fixed",
              top: "50%",
              right: "40px",
              transform: "translateY(-50%)",
              zIndex: 100,
              maxWidth: "350px",
              width: "100%",
              animation: "slideInRight 0.3s ease-out"
            }}>
              <div style={{
                padding: "20px",
                borderRadius: "12px",
                background: "rgba(255, 255, 255, 0.1)",
                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.2)",
                borderLeft: "5px solid #3b82f6",
                backdropFilter: "blur(10px)",
                transition: "all 0.3s ease"
              }}>
                <h3 style={{
                  marginBottom: "15px",
                  color: "#3b82f6",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  fontSize: "1.1rem"
                }}>
                  <span>
                    {selectedItem.type === 'question' ? '❓ Question Details' : '💬 Answer Details'}
                  </span>
                  <motion.button
                    whileHover={{
                      scale: 1.05,
                      backgroundColor: "rgba(255, 255, 255, 0.2)"
                    }}
                    whileTap={{ scale: 0.95 }}
                    style={buttonStyles.close}
                    onClick={() => setSelectedItem(null)}
                  >
                    ✕
                  </motion.button>
                </h3>

                <div style={{ marginBottom: "15px" }}>
                  <p style={{ marginBottom: "8px", fontSize: "0.9rem" }}>
                    <strong>🆔 Anonymous ID:</strong> {selectedItem.user.anonId}
                  </p>
                  <p style={{ marginBottom: "8px", fontSize: "0.9rem" }}>
                    <strong>📧 Email:</strong> {selectedItem.user.email}
                  </p>
                  <p style={{ marginBottom: "8px", fontSize: "0.9rem" }}>
                    <strong>🧑‍🎓 Role:</strong> {selectedItem.user.role}
                  </p>
                  <p style={{ marginBottom: "8px", fontSize: "0.9rem" }}>
                    <strong>🕒 Posted:</strong> {new Date(selectedItem.timestamp).toLocaleString()}
                  </p>
                </div>

                {selectedItem.type === 'answer' && (
                  <div style={{ marginBottom: "15px" }}>
                    <p style={{ fontSize: "0.9rem" }}><strong>Question:</strong> {selectedItem.questionText}</p>
                    <p style={{ marginTop: "8px", fontSize: "0.9rem" }}><strong>Answer:</strong> {selectedItem.content}</p>
                  </div>
                )}

                {selectedItem.type === 'question' && (
                  <div style={{ marginBottom: "15px" }}>
                    <p style={{ fontSize: "0.9rem" }}><strong>Question:</strong> {selectedItem.content}</p>
                  </div>
                )}

                <div style={{ display: "flex", gap: "10px" }}>
                  <motion.button
                    whileHover={{
                      scale: 1.05,
                      backgroundColor: "#dc2626"
                    }}
                    whileTap={{ scale: 0.95 }}
                    style={{ ...buttonStyles.base, ...buttonStyles.delete }}
                    onClick={() => handleDelete(selectedItem.type, selectedItem.id, selectedItem.questionId)}
                  >
                    <span>❌</span> Delete {selectedItem.type === 'question' ? 'Question' : 'Answer'}
                  </motion.button>

                  <motion.button
                    whileHover={{
                      scale: 1.05,
                      backgroundColor: "#10b981"
                    }}
                    whileTap={{ scale: 0.95 }}
                    style={{ ...buttonStyles.base, ...buttonStyles.ignore }}
                    onClick={() => handleIgnore(selectedItem.type, selectedItem.id, selectedItem.questionId)}
                  >
                    <span>✅</span> Ignore
                  </motion.button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>
        {`
          @keyframes float {
            0% {
              transform: translateY(0) translateX(0);
            }
            50% {
              transform: translateY(-20px) translateX(10px);
            }
            100% {
              transform: translateY(0) translateX(0);
            }
          }

          @keyframes gridMove {
            0% {
              background-position: 0 0;
            }
            100% {
              background-position: 50px 50px;
            }
          }

          @keyframes fadeIn {
            from {
              opacity: 0;
            }
            to {
              opacity: 1;
            }
          }

          @keyframes slideIn {
            from {
              transform: translateY(20px);
              opacity: 0;
            }
            to {
              transform: translateY(0);
              opacity: 1;
            }
          }

          @keyframes slideInRight {
            from {
              transform: translateX(20px) translateY(-50%);
              opacity: 0;
            }
            to {
              transform: translateX(0) translateY(-50%);
              opacity: 1;
            }
          }
        `}
      </style>
    </div>
  );
}

export default AdminFeed;
