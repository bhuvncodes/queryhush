import React, { useState, useEffect } from 'react';
import { getFirestore, collection, getDocs, doc, getDoc, addDoc, query, where, orderBy, limit, updateDoc, increment, setDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import './modalStyles.css';  // Import the CSS file
import { motion, AnimatePresence } from "framer-motion";
import { signOut } from 'firebase/auth';

const buttonStyles = {
  base: {
    padding: "8px 16px",
    borderRadius: "5px",
    border: "none",
    cursor: "pointer",
    fontWeight: "bold",
  },
  action: {
    background: "#f97316",
    color: "white",
  },
  report: {
    background: "#ff6347",
    color: "white",
  },
};

// Responsive styles for header buttons and question cards
const responsiveHeaderStyles = `
@media (max-width: 600px) {
  .header-btns {
    display: none !important;
  }
  .hamburger-menu {
    display: flex !important;
  }
  .sidebar {
    transform: translateX(0) !important;
  }
  .sidebar-overlay {
    display: block !important;
  }
  .question-card {
    flex-direction: column !important;
    align-items: stretch !important;
    padding: 12px !important;
    font-size: 1rem !important;
    width: 100% !important;
    margin: 0 0 15px 0 !important;
    box-sizing: border-box !important;
  }
  .question-actions {
    display: flex !important;
    flex-direction: row !important;
    gap: 10px !important;
    margin-top: 16px !important;
    width: 100% !important;
  }
  .question-actions button, .question-actions .motion-button {
    flex: 1 1 0 !important;
    min-width: 0 !important;
    width: 100% !important;
    font-size: 1rem !important;
    padding: 10px 0 !important;
  }
}

.question-actions-mobile { display: none; }
@media (max-width: 600px) {
  .question-actions-desktop { display: none !important; }
  .question-actions-mobile { display: flex !important; }
  .question-card {
    flex-direction: column !important;
    align-items: stretch !important;
    padding: 12px !important;
    font-size: 1rem !important;
    width: 100% !important;
    margin: 0 0 15px 0 !important;
    box-sizing: border-box !important;
  }
  .question-actions {
    display: flex !important;
    flex-direction: row !important;
    gap: 10px !important;
    margin-top: 16px !important;
    width: 100% !important;
  }
  .question-actions button, .question-actions .motion-button {
    flex: 1 1 0 !important;
    min-width: 0 !important;
    width: 100% !important;
    font-size: 1rem !important;
    padding: 10px 0 !important;
  }
}
`;

const Feed = () => {
  const [questions, setQuestions] = useState([]);
  const [currentUserRole, setCurrentUserRole] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [newQuestion, setNewQuestion] = useState("");
  const [showAnswerModal, setShowAnswerModal] = useState(false);
  const [answerText, setAnswerText] = useState("");
  const [activeQuestionId, setActiveQuestionId] = useState(null);
  const [visibleAnswers, setVisibleAnswers] = useState(null);
  const [anonymousID, setAnonymousID] = useState("Anonymous"); // Add state for anonymousID
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [newAnswer, setNewAnswer] = useState("");
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [sortBy, setSortBy] = useState('random'); // 'most_upvotes', 'least_upvotes', or 'random'
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    role: 'all',
    date: 'all'
  });
  const [filteredQuestions, setFilteredQuestions] = useState([]);
  const [userVotes, setUserVotes] = useState({});
  const auth = getAuth(); // Add this line to properly reference auth

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

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const db = getFirestore();
        const questionsRef = collection(db, "questions");
        const querySnapshot = await getDocs(questionsRef);

        const questionsData = [];

        for (const docSnapshot of querySnapshot.docs) {
          const data = docSnapshot.data();
          const userDocRef = doc(db, "users", data.askerId);
          const userDoc = await getDoc(userDocRef);
          let anonymousID = "Unknown";
          let askerRole = "student";
          if (userDoc.exists()) {
            const userData = userDoc.data();
            anonymousID = userData.anonymousID ? userData.anonymousID : "Anonymous";
            askerRole = userData.role || "student";
          }

          const answersSnapshot = await getDocs(collection(docSnapshot.ref, "answers"));
          const answersData = await Promise.all(answersSnapshot.docs.map(async (aDoc) => {
            const aData = aDoc.data();
            const answererDocRef = doc(db, "users", aData.answererId);
            const answererDoc = await getDoc(answererDocRef);
            let answererAnonymousID = "Unknown";
            let answererRole = "student";
            if (answererDoc.exists()) {
              const answererData = answererDoc.data();
              answererAnonymousID = answererData.anonymousID || "Anonymous";
              answererRole = answererData.role || "student";
            }
          
            return {
              id: aDoc.id,
              answerText: aData.answerText,
              answererId: answererAnonymousID,
              answererRole: answererRole,
              timestamp: aData.timestamp,
              reportCount: aData.reportCount || 0,
              upvotes: aData.upvotes || 0
            };
          }));
          
          questionsData.push({
            id: docSnapshot.id,
            questionText: data.questionText || "",
            askerId: data.askerId,
            askerRole: askerRole,
            answers: answersData,
            anonymousID,
            upvotes: data.upvotes || 0,
            timestamp: data.timestamp,
            bestAnswerId: data.bestAnswerId || null
          });
        }

        setQuestions(questionsData);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching questions:", err);
      }
    };

    fetchQuestions();
  }, []);

  // Add useEffect for filtering and sorting
  useEffect(() => {
    let filtered = [...questions];

    // Apply search
    if (searchQuery) {
      filtered = filtered.filter(q => 
        q.questionText.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply role filter
    if (filters.role !== 'all') {
      filtered = filtered.filter(q => q.askerRole === filters.role);
    }

    // Apply single sort
    switch (sortBy) {
      case 'most_upvotes':
        filtered.sort((a, b) => (b.upvotes || 0) - (a.upvotes || 0));
        break;
      case 'least_upvotes':
        filtered.sort((a, b) => (a.upvotes || 0) - (b.upvotes || 0));
        break;
      case 'random':
        // Shuffle the array using Fisher-Yates algorithm
        for (let i = filtered.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [filtered[i], filtered[j]] = [filtered[j], filtered[i]];
        }
        break;
      default:
        break;
    }

    setFilteredQuestions(filtered);
  }, [questions, sortBy, searchQuery, filters]);

  const handleLogout = () => {
    const auth = getAuth();
    setIsSidebarOpen(false); // Reset sidebar state
    signOut(auth).then(() => {
      navigate('/login');
    });
  };

  // Add useEffect to reset sidebar state on mount
  useEffect(() => {
    setIsSidebarOpen(false);
  }, []);

  const handlePostQuestion = async () => {
    const auth = getAuth();
    const user = auth.currentUser;

    if (!user) return;

    const db = getFirestore();
    const userDocRef = doc(db, "users", user.uid);
    const userDocSnap = await getDoc(userDocRef);

    let anonymousID = "Anonymous";
    let userRole = "student";
    if (userDocSnap.exists()) {
      anonymousID = userDocSnap.data().anonymousID || "Anonymous";
      userRole = userDocSnap.data().role || "student";
    }

    const questionData = {
      questionText: newQuestion,
      askerId: user.uid,
      askerRole: userRole,
      answers: [],
      timestamp: new Date(),
      anonymousID,
      upvotes: 0
    };

    try {
      const docRef = await addDoc(collection(db, "questions"), questionData);

      setQuestions(prev => [
        {
          id: docRef.id,
          questionText: newQuestion,
          askerId: anonymousID,
          askerRole: userRole,
          answers: [],
          anonymousID,
          upvotes: 0,
          timestamp: new Date()
        },
        ...prev,
      ]);

      setShowModal(false);
      setNewQuestion('');
    } catch (error) {
      console.error("Error posting question: ", error);
    }
  };

  const handleAnswerPost = async (questionId) => {
    if (answerText.trim()) {
      const db = getFirestore();
      const questionRef = doc(db, "questions", questionId);
  
      const auth = getAuth();
      const user = auth.currentUser;
      let anonymousID = "Anonymous";
      let userRole = "student";
      if (user) {
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          anonymousID = userDocSnap.data().anonymousID || "Anonymous";
          userRole = userDocSnap.data().role || "student";
        }
      }
  
      const answerData = {
        answerText: answerText,
        answererId: user.uid,
        answererRole: userRole,
        timestamp: Date.now(),
        reportCount: 0,
        upvotes: 0
      };
  
      try {
        const answerRef = await addDoc(collection(questionRef, "answers"), answerData);
  
        setQuestions((prevQuestions) =>
          prevQuestions.map((q) =>
            q.id === questionId
              ? {
                  ...q,
                  answers: [
                    ...q.answers,
                    {
                      id: answerRef.id,
                      answerText: answerText,
                      answererId: anonymousID,
                      answererRole: userRole,
                      timestamp: Date.now(),
                      reportCount: 0,
                      upvotes: 0
                    },
                  ],
                }
              : q
          )
        );
  
        setAnswerText("");
        setShowAnswerModal(false);
        setActiveQuestionId(null);
      } catch (error) {
        console.error("Error posting answer:", error);
      }
    }
  };

  const handleReport = async (questionId) => {
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return;

      const db = getFirestore();
      const reportRef = collection(db, "questions", questionId, "reports");
      const questionDocRef = doc(db, "questions", questionId);

      // Check if the user already reported
      const q = query(reportRef, where("reporterId", "==", user.uid));
      const existingReports = await getDocs(q);

      if (!existingReports.empty) {
        alert("You've already reported this question.");
        return;
      }

      // Add new report entry
      await addDoc(reportRef, {
        reporterId: user.uid,
        timestamp: new Date(),
      });

      // Increment reportCount atomically
      await updateDoc(questionDocRef, {
        reportCount: increment(1),
      });

      alert("Reported successfully!");
    } catch (error) {
      console.error("Error reporting question:", error);
    }
  };

  const handleReportAnswer = async (questionId, answerId) => {
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return;

      const db = getFirestore();
      const reportRef = collection(db, "questions", questionId, "answers", answerId, "reports");
      const answerDocRef = doc(db, "questions", questionId, "answers", answerId);

      // Check if the user already reported
      const q = query(reportRef, where("reporterId", "==", user.uid));
      const existingReports = await getDocs(q);

      if (!existingReports.empty) {
        alert("You've already reported this answer.");
        return;
      }

      // Add new report entry
      await addDoc(reportRef, {
        reporterId: user.uid,
        timestamp: new Date(),
      });

      // Get current report count
      const answerDoc = await getDoc(answerDocRef);
      const currentReportCount = answerDoc.data()?.reportCount || 0;

      // Increment reportCount atomically
      await updateDoc(answerDocRef, {
        reportCount: increment(1),
      });

      // Update local state
      setQuestions(prevQuestions =>
        prevQuestions.map(q =>
          q.id === questionId
            ? {
                ...q,
                answers: q.answers.map(a =>
                  a.id === answerId
                    ? { ...a, reportCount: currentReportCount + 1 }
                    : a
                ),
              }
            : q
        )
      );

      console.log("Answer reported successfully:", {
        questionId,
        answerId,
        newReportCount: currentReportCount + 1
      });

      alert("Answer reported successfully!");
    } catch (error) {
      console.error("Error reporting answer:", error);
      alert("Failed to report answer. Please try again.");
    }
  };

  const handleAnswerSubmit = async (questionId) => {
    if (newAnswer.trim()) {
      const db = getFirestore();
      const questionRef = doc(db, "questions", questionId);
  
      const auth = getAuth();
      const user = auth.currentUser;
      let anonymousID = "Anonymous";
      if (user) {
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          anonymousID = userDocSnap.data().anonymousID || "Anonymous";
        }
      }
  
      const answerData = {
        answerText: newAnswer,
        answererId: user.uid,
        timestamp: Date.now(),
        reportCount: 0,
        upvotes: 0
      };
  
      try {
        const answerRef = await addDoc(collection(questionRef, "answers"), answerData);
  
        setQuestions((prevQuestions) =>
          prevQuestions.map((q) =>
            q.id === questionId
              ? {
                  ...q,
                  answers: [
                    ...q.answers,
                    {
                      id: answerRef.id,
                      answerText: newAnswer,
                      answererId: anonymousID,
                      timestamp: Date.now(),
                      reportCount: 0,
                      upvotes: 0
                    },
                  ],
                }
              : q
          )
        );
  
        setNewAnswer("");
        setSelectedQuestion(null);
      } catch (error) {
        console.error("Error posting answer:", error);
      }
    }
  };

  // Add function to fetch votes
  const fetchVotes = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const db = getFirestore();
      const votes = {};

      // Fetch question votes
      for (const question of questions) {
        const questionVoteRef = doc(db, "questions", question.id, "votes", user.uid);
        const questionVoteDoc = await getDoc(questionVoteRef);
        if (questionVoteDoc.exists()) {
          votes[`question_${question.id}`] = questionVoteDoc.data().voteType;
        }

        // Fetch answer votes
        for (const answer of question.answers || []) {
          const answerVoteRef = doc(db, "questions", question.id, "answers", answer.id, "votes", user.uid);
          const answerVoteDoc = await getDoc(answerVoteRef);
          if (answerVoteDoc.exists()) {
            votes[`answer_${answer.id}`] = answerVoteDoc.data().voteType;
          }
        }
      }

      setUserVotes(votes);
    } catch (error) {
      console.error("Error fetching votes:", error);
    }
  };

  // Add useEffect to fetch votes when questions change
  useEffect(() => {
    fetchVotes();
  }, [questions]);

  // Update the handleQuestionVote function
  const handleQuestionVote = async (questionId, voteType) => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const db = getFirestore();
      const voteRef = doc(db, "questions", questionId, "votes", user.uid);
      const voteDoc = await getDoc(voteRef);
      const questionRef = doc(db, "questions", questionId);

      // Update local state first
      setQuestions(prevQuestions =>
        prevQuestions.map(q =>
          q.id === questionId
            ? {
                ...q,
                upvotes: voteDoc.exists() && voteDoc.data().voteType === voteType
                  ? (q.upvotes || 0) - 1  // Remove vote
                  : (q.upvotes || 0) + 1  // Add vote
              }
            : q
        )
      );

      // Update user votes immediately
      setUserVotes(prev => ({
        ...prev,
        [`question_${questionId}`]: voteDoc.exists() && voteDoc.data().voteType === voteType ? null : voteType
      }));

      // Then update database
      if (voteDoc.exists()) {
        const currentVote = voteDoc.data().voteType;
        if (currentVote === voteType) {
          // Remove vote
          await setDoc(voteRef, { voteType: null });
          await updateDoc(questionRef, {
            upvotes: increment(-1)
          });
        } else {
          // Change vote
          await setDoc(voteRef, { voteType });
          await updateDoc(questionRef, {
            upvotes: increment(1)
          });
        }
      } else {
        // New vote
        await setDoc(voteRef, { voteType });
        await updateDoc(questionRef, {
          upvotes: increment(1)
        });
      }
    } catch (error) {
      console.error("Error voting on question:", error);
    }
  };

  // Update the handleVote function for answers
  const handleVote = async (questionId, answerId, voteType) => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const db = getFirestore();
      const voteRef = doc(db, "questions", questionId, "answers", answerId, "votes", user.uid);
      const voteDoc = await getDoc(voteRef);
      const answerRef = doc(db, "questions", questionId, "answers", answerId);

      // Update local state first
      setQuestions(prevQuestions =>
        prevQuestions.map(q =>
          q.id === questionId
            ? {
                ...q,
                answers: q.answers.map(a =>
                  a.id === answerId
                    ? {
                        ...a,
                        upvotes: voteDoc.exists() && voteDoc.data().voteType === voteType
                          ? (a.upvotes || 0) - 1  // Remove vote
                          : (a.upvotes || 0) + 1  // Add vote
                      }
                    : a
                )
              }
            : q
        )
      );

      // Update user votes immediately
      setUserVotes(prev => ({
        ...prev,
        [`answer_${answerId}`]: voteDoc.exists() && voteDoc.data().voteType === voteType ? null : voteType
      }));

      // Then update database
      if (voteDoc.exists()) {
        const currentVote = voteDoc.data().voteType;
        if (currentVote === voteType) {
          // Remove vote
          await setDoc(voteRef, { voteType: null });
          await updateDoc(answerRef, {
            upvotes: increment(-1)
          });
        } else {
          // Change vote
          await setDoc(voteRef, { voteType });
          await updateDoc(answerRef, {
            upvotes: increment(1)
          });
        }
      } else {
        // New vote
        await setDoc(voteRef, { voteType });
        await updateDoc(answerRef, {
          upvotes: increment(1)
        });
      }
    } catch (error) {
      console.error("Error voting:", error);
    }
  };

  // Add function to mark best answer
  const handleMarkBestAnswer = async (questionId, answerId) => {
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return;

      const db = getFirestore();
      const questionRef = doc(db, "questions", questionId);
      const questionDoc = await getDoc(questionRef);

      if (questionDoc.data().askerId !== user.uid) {
        alert("Only the question asker can mark the best answer");
        return;
      }

      // If this answer is already the best answer, remove it
      const newBestAnswerId = questionDoc.data().bestAnswerId === answerId ? null : answerId;
      await updateDoc(questionRef, { bestAnswerId: newBestAnswerId });

      // Update local state
      setQuestions(prevQuestions => 
        prevQuestions.map(q => 
          q.id === questionId 
            ? {
                ...q,
                bestAnswerId: newBestAnswerId
              }
            : q
        )
      );
    } catch (error) {
      console.error("Error marking best answer:", error);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const questionVariants = {
    hidden: { 
      opacity: 0,
      y: 20
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: [0.43, 0.13, 0.23, 0.96]
      }
    },
    exit: {
      opacity: 0,
      y: -20,
      transition: {
        duration: 0.3
      }
    }
  };

  const answerVariants = {
    hidden: { 
      opacity: 0,
      x: -20
    },
    visible: {
      opacity: 1,
      x: 0,
      transition: {
        duration: 0.4,
        ease: "easeOut"
      }
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
      padding: "10px",
      position: "relative",
      overflow: "hidden"
    }}>
      <style>{responsiveHeaderStyles}</style>
      
      {/* Bouncing Walls */}
      <motion.div
        animate={{
          scale: [1, 1.1, 1],
          opacity: [0.1, 0.2, 0.1]
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          border: "2px solid rgba(255, 255, 255, 0.1)",
          borderRadius: "20px",
          pointerEvents: "none",
          zIndex: 0
        }}
      />
      <motion.div
        animate={{
          scale: [1.1, 1, 1.1],
          opacity: [0.15, 0.25, 0.15]
        }}
        transition={{
          duration: 5,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        style={{
          position: "fixed",
          top: "10px",
          left: "10px",
          right: "10px",
          bottom: "10px",
          border: "2px solid rgba(255, 255, 255, 0.08)",
          borderRadius: "30px",
          pointerEvents: "none",
          zIndex: 0
        }}
      />

      {/* Bouncing Shapes */}
      <motion.div
        animate={{
          x: [0, window.innerWidth - 50],
          y: [0, window.innerHeight - 50]
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          repeatType: "reverse",
          ease: "linear"
        }}
        style={{
          position: "fixed",
          width: "50px",
          height: "50px",
          background: "rgba(255, 255, 255, 0.05)",
          borderRadius: "50%",
          pointerEvents: "none",
          zIndex: 0
        }}
      />
      <motion.div
        animate={{
          x: [window.innerWidth - 50, 0],
          y: [window.innerHeight - 50, 0]
        }}
        transition={{
          duration: 15,
          repeat: Infinity,
          repeatType: "reverse",
          ease: "linear"
        }}
        style={{
          position: "fixed",
          width: "30px",
          height: "30px",
          background: "rgba(255, 255, 255, 0.03)",
          borderRadius: "8px",
          pointerEvents: "none",
          zIndex: 0
        }}
      />
      <motion.div
        animate={{
          x: [0, window.innerWidth - 40],
          y: [window.innerHeight - 40, 0]
        }}
        transition={{
          duration: 18,
          repeat: Infinity,
          repeatType: "reverse",
          ease: "linear"
        }}
        style={{
          position: "fixed",
          width: "40px",
          height: "40px",
          background: "rgba(255, 255, 255, 0.04)",
          borderRadius: "12px",
          pointerEvents: "none",
          zIndex: 0
        }}
      />
      <motion.div
        animate={{
          x: [window.innerWidth - 35, 0],
          y: [0, window.innerHeight - 35]
        }}
        transition={{
          duration: 16,
          repeat: Infinity,
          repeatType: "reverse",
          ease: "linear"
        }}
        style={{
          position: "fixed",
          width: "35px",
          height: "35px",
          background: "rgba(255, 255, 255, 0.035)",
          borderRadius: "50%",
          pointerEvents: "none",
          zIndex: 0
        }}
      />
      <motion.div
        animate={{
          x: [0, window.innerWidth - 45],
          y: [window.innerHeight - 45, 0]
        }}
        transition={{
          duration: 22,
          repeat: Infinity,
          repeatType: "reverse",
          ease: "linear"
        }}
        style={{
          position: "fixed",
          width: "45px",
          height: "45px",
          background: "rgba(255, 255, 255, 0.045)",
          borderRadius: "15px",
          pointerEvents: "none",
          zIndex: 0
        }}
      />
      <motion.div
        animate={{
          x: [window.innerWidth - 25, 0],
          y: [0, window.innerHeight - 25]
        }}
        transition={{
          duration: 14,
          repeat: Infinity,
          repeatType: "reverse",
          ease: "linear"
        }}
        style={{
          position: "fixed",
          width: "25px",
          height: "25px",
          background: "rgba(255, 255, 255, 0.025)",
          borderRadius: "6px",
          pointerEvents: "none",
          zIndex: 0
        }}
      />

      {/* Content Container with higher z-index */}
      <div style={{ position: "relative", zIndex: 1 }}>
        {/* Header */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
          padding: "0 20px",
          gap: "20px",
          width: "100%",
          boxSizing: "border-box"
        }}>
          <motion.button
            whileHover={{ 
              scale: 1.05,
              backgroundColor: "#f97316"
            }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowModal(true)}
            style={{
              padding: "12px 24px",
              background: "#f97316",
              color: "white",
              fontWeight: "bold",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.2)",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "1rem",
              whiteSpace: "nowrap",
              width: "200px",
              justifyContent: "center"
            }}
          >
            <span>➕</span> Ask a Question
          </motion.button>

          {/* Desktop Buttons */}
          <div className="header-btns" style={{ 
            display: "flex", 
            gap: "10px",
            flexWrap: "nowrap",
            justifyContent: "flex-end",
            flex: "1"
          }}>
            <motion.button
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
                gap: "8px",
                whiteSpace: "nowrap",
                flex: "1",
                justifyContent: "center",
                maxWidth: "120px"
              }}
            >
              <span>👤</span> Profile
            </motion.button>
            <motion.button
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
                gap: "8px",
                whiteSpace: "nowrap",
                flex: "1",
                justifyContent: "center",
                maxWidth: "120px"
              }}
            >
              <span>🚪</span> Logout
            </motion.button>
          </div>

          {/* Mobile Hamburger Menu */}
          <motion.button
            className="hamburger-menu"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsSidebarOpen(true)}
            style={{
              display: "none",
              padding: "10px",
              background: "rgba(255, 255, 255, 0.1)",
              color: "white",
              border: "1px solid rgba(255, 255, 255, 0.2)",
              borderRadius: "8px",
              cursor: "pointer",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <span>☰</span>
          </motion.button>
        </div>

        {/* Mobile Sidebar and Overlay Container */}
        <AnimatePresence>
          {isSidebarOpen && (
            <>
              {/* Overlay */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsSidebarOpen(false)}
                style={{
                  position: "fixed",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: "rgba(0, 0, 0, 0.5)",
                  zIndex: 999,
                  backdropFilter: "blur(2px)"
                }}
              />

              {/* Sidebar */}
              <motion.div
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                style={{
                  position: "fixed",
                  top: 0,
                  right: 0,
                  bottom: 0,
                  width: "250px",
                  background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
                  padding: "20px",
                  boxShadow: "-2px 0 10px rgba(0, 0, 0, 0.3)",
                  zIndex: 1000,
                  display: "flex",
                  flexDirection: "column",
                  gap: "20px"
                }}
              >
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setIsSidebarOpen(false)}
                    style={{
                      padding: "10px",
                      background: "rgba(255, 255, 255, 0.1)",
                      color: "white",
                      border: "1px solid rgba(255, 255, 255, 0.2)",
                      borderRadius: "8px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: "40px",
                      height: "40px"
                    }}
                  >
                    ✕
                  </motion.button>
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    navigate('/profile');
                    setIsSidebarOpen(false);
                  }}
                  style={{
                    padding: "15px",
                    background: "rgba(255, 255, 255, 0.1)",
                    color: "white",
                    border: "1px solid rgba(255, 255, 255, 0.2)",
                    borderRadius: "8px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    fontSize: "1.1rem"
                  }}
                >
                  <span>👤</span> Profile
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    handleLogout();
                    setIsSidebarOpen(false);
                  }}
                  style={{
                    padding: "15px",
                    background: "rgba(255, 255, 255, 0.1)",
                    color: "white",
                    border: "1px solid rgba(255, 255, 255, 0.2)",
                    borderRadius: "8px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    fontSize: "1.1rem"
                  }}
                >
                  <span>🚪</span> Logout
                </motion.button>
              </motion.div>
            </>
          )}
        </AnimatePresence>

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

        <div style={{
          position: "relative",
          zIndex: 1,
          maxWidth: "800px",
          margin: "0 auto"
        }}>
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.6,
              ease: [0.43, 0.13, 0.23, 0.96]
            }}
            style={{ 
              textAlign: "center",
              marginBottom: "30px"
            }}
          >
            <motion.h2
              style={{ 
                color: "#fff", 
                marginBottom: "10px",
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
            <motion.p
              style={{ 
                color: "#94a3b8",
                fontSize: "1.1rem",
                marginTop: "10px"
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              Your anonymous Q&A platform
            </motion.p>
          </motion.div>

          {/* Search and Filters Section */}
          <div style={{
            maxWidth: "800px",
            margin: "0 auto 20px",
            padding: "20px",
            background: "rgba(255, 255, 255, 0.05)",
            borderRadius: "12px",
            backdropFilter: "blur(10px)"
          }}>
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "15px" }}>
              {/* Search Input */}
              <div style={{ flex: "1", minWidth: "200px" }}>
                <input
                  type="text"
                  placeholder="Search questions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: "8px",
                    border: "1px solid rgba(255, 255, 255, 0.2)",
                    background: "rgba(255, 255, 255, 0.1)",
                    color: "white",
                    fontSize: "1rem"
                  }}
                />
              </div>

              {/* Sort Dropdown */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                style={{
                  padding: "10px",
                  borderRadius: "8px",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  background: "rgba(255, 255, 255, 0.1)",
                  color: "white",
                  fontSize: "1rem",
                  minWidth: "150px",
                  cursor: "pointer",
                  appearance: "none",
                  backgroundImage: "url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23FFFFFF%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E')",
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "right 10px center",
                  backgroundSize: "12px",
                  paddingRight: "30px"
                }}
              >
                <option value="most_upvotes" style={{ background: "#1a1a2e", color: "white" }}>Most Upvotes First</option>
                <option value="least_upvotes" style={{ background: "#1a1a2e", color: "white" }}>Least Upvotes First</option>
                <option value="random" style={{ background: "#1a1a2e", color: "white" }}>Random</option>
              </select>

              {/* Role Filter Dropdown */}
              <select
                value={filters.role}
                onChange={(e) => setFilters(prev => ({ ...prev, role: e.target.value }))}
                style={{
                  padding: "10px",
                  borderRadius: "8px",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  background: "rgba(255, 255, 255, 0.1)",
                  color: "white",
                  fontSize: "1rem",
                  minWidth: "150px",
                  cursor: "pointer",
                  appearance: "none",
                  backgroundImage: "url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23FFFFFF%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E')",
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "right 10px center",
                  backgroundSize: "12px",
                  paddingRight: "30px"
                }}
              >
                <option value="all" style={{ background: "#1a1a2e", color: "white" }}>All Questions</option>
                <option value="student" style={{ background: "#1a1a2e", color: "white" }}>Student Questions</option>
                <option value="faculty" style={{ background: "#1a1a2e", color: "white" }}>Faculty Questions</option>
              </select>
            </div>
          </div>

          <div style={{
            position: "relative",
            zIndex: 1,
            maxWidth: "800px",
            margin: "0 auto"
          }}>
            {loading ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{ textAlign: "center", color: "#fff" }}
              >
                Loading questions...
              </motion.div>
            ) : (
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                style={{ display: "flex", flexDirection: "column", gap: "20px" }}
              >
                <AnimatePresence>
                  {filteredQuestions.map((question) => (
                    <motion.div
                      key={question.id}
                      className="question-card"
                      variants={questionVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      whileHover={{ 
                        scale: 1.02,
                        transition: { duration: 0.2 }
                      }}
                      style={{
                        padding: "20px",
                        borderRadius: "12px",
                        background: "rgba(255, 255, 255, 0.1)",
                        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.2)",
                        borderLeft: "5px solid #ef4444",
                        cursor: "pointer",
                        backdropFilter: "blur(10px)",
                        transition: "all 0.3s ease",
                        marginBottom: "20px",
                        display: "flex",
                        flexDirection: "column"
                      }}
                      onClick={() => {
                        if (!selectedQuestion || selectedQuestion !== question.id) {
                          setSelectedQuestion(question.id);
                        }
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "10px", flex: 1 }}>
                          <p style={{ 
                            marginBottom: "15px", 
                            fontWeight: "bold",
                            fontSize: "1.2rem",
                            color: "#fff"
                          }}>
                            {question.questionText}
                          </p>
                          
                          {/* Question Vote Button */}
                          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleQuestionVote(question.id, 'up');
                              }}
                              style={{
                                padding: "6px 12px",
                                background: userVotes[`question_${question.id}`] === 'up'
                                  ? "rgba(16, 185, 129, 0.4)"
                                  : "rgba(16, 185, 129, 0.2)",
                                color: "#10b981",
                                border: "none",
                                borderRadius: "6px",
                                cursor: "pointer",
                                fontSize: "0.9rem",
                                display: "flex",
                                alignItems: "center",
                                gap: "6px"
                              }}
                            >
                              <span>⬆️</span> {question.upvotes || 0}
                            </motion.button>
                          </div>
                        </div>
                      </div>

                      <p style={{ 
                        color: "#e2e8f0",
                        fontSize: "0.9rem",
                        marginBottom: "10px",
                        display: "flex",
                        alignItems: "center",
                        gap: "5px"
                      }}>
                        Posted by: {question.anonymousID || "Anonymous"}
                        {question.askerRole === "faculty" && (
                          <span style={{ color: "#3b82f6" }} title="Verified Faculty">✓</span>
                        )}
                      </p>

                      {/* Action Buttons */}
                      <div style={{ 
                        display: "flex", 
                        gap: "10px", 
                        marginTop: "15px",
                        justifyContent: "space-between"
                      }}>
                        {/* Left side - Show Answers */}
                        {question.answers && question.answers.length > 0 && (
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setVisibleAnswers(visibleAnswers === question.id ? null : question.id);
                            }}
                            style={{
                              padding: "8px 16px",
                              background: "rgba(255, 255, 255, 0.1)",
                              color: "white",
                              border: "none",
                              borderRadius: "8px",
                              cursor: "pointer",
                              fontSize: "0.9rem",
                              display: "flex",
                              alignItems: "center",
                              gap: "8px"
                            }}
                          >
                            {visibleAnswers === question.id ? "🔽 Hide Answers" : "🔍 Show Answers"}
                          </motion.button>
                        )}

                        {/* Right side - Answer and Report */}
                        <div style={{ display: "flex", gap: "10px" }}>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedQuestion(selectedQuestion === question.id ? null : question.id);
                            }}
                            style={{
                              padding: "8px 16px",
                              background: "rgba(255, 255, 255, 0.1)",
                              color: "white",
                              border: "none",
                              borderRadius: "8px",
                              cursor: "pointer",
                              fontSize: "0.9rem",
                              display: "flex",
                              alignItems: "center",
                              gap: "8px"
                            }}
                          >
                            {selectedQuestion === question.id ? "🔽 Close" : "💬 Answer"}
                          </motion.button>
                          <motion.button
                            whileHover={{ 
                              scale: 1.05,
                              backgroundColor: "rgba(239, 68, 68, 0.3)"
                            }}
                            whileTap={{ scale: 0.95 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleReport(question.id);
                            }}
                            style={{
                              padding: "8px 16px",
                              background: "rgba(239, 68, 68, 0.2)",
                              color: "#ef4444",
                              border: "none",
                              borderRadius: "8px",
                              cursor: "pointer",
                              fontSize: "0.9rem",
                              display: "flex",
                              alignItems: "center",
                              gap: "8px"
                            }}
                          >
                            <span>🚩</span> Report
                          </motion.button>
                        </div>
                      </div>

                      {/* Answer Box */}
                      <AnimatePresence>
                        {question.id === selectedQuestion && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.3 }}
                            style={{ marginTop: "15px" }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <motion.textarea
                              value={newAnswer}
                              onChange={(e) => setNewAnswer(e.target.value)}
                              placeholder="Write your answer..."
                              style={{
                                width: "100%",
                                padding: "12px",
                                borderRadius: "8px",
                                border: "1px solid rgba(255, 255, 255, 0.1)",
                                background: "rgba(255, 255, 255, 0.05)",
                                color: "#fff",
                                marginBottom: "10px",
                                minHeight: "100px",
                                resize: "vertical",
                                fontSize: "1rem"
                              }}
                              whileFocus={{
                                scale: 1.02,
                                border: "1px solid rgba(255, 255, 255, 0.2)",
                                boxShadow: "0 0 10px rgba(255, 255, 255, 0.1)"
                              }}
                            />
                            <motion.button
                              whileHover={{ 
                                scale: 1.05,
                                backgroundColor: "#2563eb"
                              }}
                              whileTap={{ scale: 0.95 }}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAnswerSubmit(question.id);
                              }}
                              style={{
                                padding: "10px 20px",
                                background: "#3b82f6",
                                color: "white",
                                border: "none",
                                borderRadius: "8px",
                                cursor: "pointer",
                                fontSize: "1rem",
                                fontWeight: "bold",
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                                transition: "all 0.2s ease"
                              }}
                            >
                              <span>💬</span> Post Answer
                            </motion.button>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Answers Section */}
                      {question.answers && question.answers.length > 0 && (
                        <AnimatePresence>
                          {visibleAnswers === question.id && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ 
                                duration: 0.2,
                                ease: "easeOut"
                              }}
                              style={{ marginTop: "20px" }}
                            >
                              {question.answers.map((answer, index) => (
                                <motion.div
                                  key={answer.id}
                                  variants={answerVariants}
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: -10 }}
                                  transition={{ 
                                    duration: 0.15,
                                    delay: index * 0.05
                                  }}
                                  whileHover={{ 
                                    scale: 1.02,
                                    backgroundColor: "rgba(255, 255, 255, 0.08)"
                                  }}
                                  style={{
                                    padding: "15px",
                                    marginBottom: "10px",
                                    background: "rgba(255, 255, 255, 0.05)",
                                    borderRadius: "8px",
                                    borderLeft: "3px solid #3b82f6",
                                    transition: "all 0.15s ease",
                                    position: "relative"
                                  }}
                                >
                                  {/* Best Answer Badge */}
                                  {question.bestAnswerId === answer.id && (
                                    <div style={{
                                      position: "absolute",
                                      top: "10px",
                                      right: "10px",
                                      background: "#10b981",
                                      color: "white",
                                      padding: "4px 8px",
                                      borderRadius: "4px",
                                      fontSize: "0.8rem",
                                      display: "flex",
                                      alignItems: "center",
                                      gap: "4px"
                                    }}>
                                      <span>🏆</span> Best Answer
                                    </div>
                                  )}

                                  <p style={{ color: "#e2e8f0", marginBottom: "5px" }}>
                                    {answer.answerText}
                                  </p>
                                  <p style={{ 
                                    color: "#94a3b8", 
                                    fontSize: "0.8rem",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "5px"
                                  }}>
                                    Answered by: {answer.answererId || "Anonymous"}
                                    {answer.answererRole === "faculty" && (
                                      <span style={{ color: "#3b82f6" }} title="Verified Faculty">✓</span>
                                    )}
                                  </p>

                                  {/* Voting Buttons */}
                                  <div style={{
                                    display: "flex",
                                    gap: "10px",
                                    marginTop: "10px"
                                  }}>
                                    <motion.button
                                      whileHover={{ scale: 1.05 }}
                                      whileTap={{ scale: 0.95 }}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleVote(question.id, answer.id, 'up');
                                      }}
                                      style={{
                                        padding: "6px 12px",
                                        background: userVotes[`answer_${answer.id}`] === 'up'
                                          ? "rgba(16, 185, 129, 0.4)"
                                          : "rgba(16, 185, 129, 0.2)",
                                        color: "#10b981",
                                        border: "none",
                                        borderRadius: "6px",
                                        cursor: "pointer",
                                        fontSize: "0.8rem",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "6px"
                                      }}
                                    >
                                      <span>⬆️</span> {answer.upvotes || 0}
                                    </motion.button>

                                    {/* Mark as Best Answer Button */}
                                    {question.askerId === auth.currentUser?.uid && (
                                      <motion.button
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleMarkBestAnswer(question.id, answer.id);
                                        }}
                                        style={{
                                          padding: "6px 12px",
                                          background: question.bestAnswerId === answer.id 
                                            ? "rgba(16, 185, 129, 0.2)"
                                            : "rgba(255, 255, 255, 0.1)",
                                          color: question.bestAnswerId === answer.id 
                                            ? "#10b981"
                                            : "white",
                                          border: "none",
                                          borderRadius: "6px",
                                          cursor: "pointer",
                                          fontSize: "0.8rem",
                                          display: "flex",
                                          alignItems: "center",
                                          gap: "6px"
                                        }}
                                      >
                                        <span>🏆</span> {question.bestAnswerId === answer.id ? "Best Answer" : "Mark as Best"}
                                      </motion.button>
                                    )}

                                    <motion.button
                                      whileHover={{ 
                                        scale: 1.05,
                                        backgroundColor: "rgba(239, 68, 68, 0.3)"
                                      }}
                                      whileTap={{ scale: 0.95 }}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleReportAnswer(question.id, answer.id);
                                      }}
                                      style={{
                                        padding: "6px 12px",
                                        background: "rgba(239, 68, 68, 0.2)",
                                        color: "#ef4444",
                                        border: "none",
                                        borderRadius: "6px",
                                        cursor: "pointer",
                                        fontSize: "0.8rem",
                                        marginTop: "8px",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "6px",
                                        transition: "all 0.15s ease"
                                      }}
                                    >
                                      <span>🚩</span> Report
                                    </motion.button>
                                  </div>
                                </motion.div>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* Ask Modal */}
      {showModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.7)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
            backdropFilter: "blur(5px)"
          }}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{
              background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
              padding: "30px",
              borderRadius: "12px",
              width: "90%",
              maxWidth: "500px",
              boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
              border: "1px solid rgba(255, 255, 255, 0.1)"
            }}
          >
            <h3 style={{ 
              color: "#fff", 
              marginBottom: "20px",
              fontSize: "1.5rem",
              textAlign: "center"
            }}>
              📝 Ask a New Question
            </h3>
            <motion.textarea
              value={newQuestion}
              onChange={(e) => setNewQuestion(e.target.value)}
              placeholder="Type your question here..."
              style={{
                width: "100%",
                padding: "15px",
                borderRadius: "8px",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                background: "rgba(255, 255, 255, 0.05)",
                color: "#fff",
                marginBottom: "20px",
                minHeight: "120px",
                resize: "vertical",
                fontSize: "1rem"
              }}
              whileFocus={{
                scale: 1.02,
                border: "1px solid rgba(255, 255, 255, 0.2)",
                boxShadow: "0 0 10px rgba(255, 255, 255, 0.1)"
              }}
            />
            <div style={{ 
              display: "flex", 
              justifyContent: "flex-end", 
              gap: "10px" 
            }}>
              <motion.button
                whileHover={{ 
                  scale: 1.05,
                  backgroundColor: "rgba(255, 255, 255, 0.1)"
                }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowModal(false)}
                style={{
                  padding: "10px 20px",
                  background: "rgba(255, 255, 255, 0.1)",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontSize: "1rem",
                  fontWeight: "bold"
                }}
              >
                Cancel
              </motion.button>
              <motion.button
                whileHover={{ 
                  scale: 1.05,
                  backgroundColor: "#f97316"
                }}
                whileTap={{ scale: 0.95 }}
                onClick={handlePostQuestion}
                style={{
                  padding: "10px 20px",
                  background: "#f97316",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontSize: "1rem",
                  fontWeight: "bold"
                }}
              >
                Post Question
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Answer Modal */}
      {showAnswerModal && activeQuestionId && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.7)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
            backdropFilter: "blur(5px)"
          }}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{
              background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
              padding: "30px",
              borderRadius: "12px",
              width: "90%",
              maxWidth: "500px",
              boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
              border: "1px solid rgba(255, 255, 255, 0.1)"
            }}
          >
            <h3 style={{ 
              color: "#fff", 
              marginBottom: "20px",
              fontSize: "1.5rem",
              textAlign: "center"
            }}>
              📝 Write Your Answer
            </h3>
            <motion.textarea
              value={answerText}
              onChange={(e) => setAnswerText(e.target.value)}
              placeholder="Type your answer here..."
              style={{
                width: "100%",
                padding: "15px",
                borderRadius: "8px",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                background: "rgba(255, 255, 255, 0.05)",
                color: "#fff",
                marginBottom: "20px",
                minHeight: "120px",
                resize: "vertical",
                fontSize: "1rem"
              }}
              whileFocus={{
                scale: 1.02,
                border: "1px solid rgba(255, 255, 255, 0.2)",
                boxShadow: "0 0 10px rgba(255, 255, 255, 0.1)"
              }}
            />
            <div style={{ 
              display: "flex", 
              justifyContent: "flex-end", 
              gap: "10px" 
            }}>
              <motion.button
                whileHover={{ 
                  scale: 1.05,
                  backgroundColor: "rgba(255, 255, 255, 0.1)"
                }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  setShowAnswerModal(false);
                  setAnswerText("");
                  setActiveQuestionId(null);
                }}
                style={{
                  padding: "10px 20px",
                  background: "rgba(255, 255, 255, 0.1)",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontSize: "1rem",
                  fontWeight: "bold"
                }}
              >
                Cancel
              </motion.button>
              <motion.button
                whileHover={{ 
                  scale: 1.05,
                  backgroundColor: "#f97316"
                }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  handleAnswerPost(activeQuestionId);
                  setShowAnswerModal(false);
                  setAnswerText("");
                  setActiveQuestionId(null);
                }}
                style={{
                  padding: "10px 20px",
                  background: "#f97316",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontSize: "1rem",
                  fontWeight: "bold"
                }}
              >
                Post Answer
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
};

export default Feed;
