import React, { useState, useEffect } from 'react';
import { collection, getDocs, deleteDoc, doc, query, where, writeBatch, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { signOut, deleteUser, getAuth, signInWithEmailAndPassword, reauthenticateWithCredential, EmailAuthProvider, onAuthStateChanged } from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { motion } from 'framer-motion';
import Papa from 'papaparse';

const SuperAdminDashboard = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState('student');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [bulkEmails, setBulkEmails] = useState('');
  const [bulkRole, setBulkRole] = useState('student');
  const [csvFile, setCsvFile] = useState(null);
  const [bulkUploadError, setBulkUploadError] = useState('');
  const [bulkUploadSuccess, setBulkUploadSuccess] = useState('');
  const navigate = useNavigate();

  // Animated background ripples
  const [ripples, setRipples] = useState([]);
  useEffect(() => {
    const createRipple = () => {
      setRipples(prev => [
        ...prev,
        {
          id: Date.now() + Math.random(),
          x: Math.random() * 100,
          y: Math.random() * 100,
          size: Math.random() * 30 + 40,
          opacity: 0.12 + Math.random() * 0.08
        }
      ].slice(-8));
    };
    createRipple();
    const interval = setInterval(createRipple, 2000);
    return () => clearInterval(interval);
  }, []);

  // Auto logout and route protection logic
  useEffect(() => {
    const auth = getAuth();
    const navigateAway = () => {
      signOut(auth).then(() => {
        navigate('/login', { replace: true });
      });
    };

    let timeout;
    const resetTimer = () => {
      clearTimeout(timeout);
      timeout = setTimeout(navigateAway, 15 * 60 * 1000); // 15 minutes
    };

    // Activity events to track
    const events = ['mousemove', 'keydown', 'click'];
    events.forEach((event) => window.addEventListener(event, resetTimer));

    // Check if user is logged in, if not redirect to login
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        navigate('/login', { replace: true });
      }
    });

    resetTimer(); // Start timer

    return () => {
      clearTimeout(timeout);
      events.forEach((event) => window.removeEventListener(event, resetTimer));
      unsubscribe();
    };
  }, [navigate]);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const usersCollection = collection(db, 'users');
      const usersSnapshot = await getDocs(usersCollection);
      const usersList = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setUsers(usersList);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching users:', error);
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (window.confirm('Are you sure you want to delete this user? This will delete all their data including questions, answers, reports, votes, and upvotes.')) {
      try {
        const user = users.find(u => u.id === userId);
        
        if (!user) {
          throw new Error('User not found');
        }

        // Get all questions first to handle nested data
        const questionsQuery = query(collection(db, 'questions'), where('askerId', '==', userId));
        const questionsSnapshot = await getDocs(questionsQuery);
        const questions = questionsSnapshot.docs.map(doc => ({ id: doc.id, ref: doc.ref }));

        // Get all answers from other questions
        const allQuestions = await getDocs(collection(db, 'questions'));
        const userAnswers = [];
        
        for (const questionDoc of allQuestions.docs) {
          const answersQuery = query(collection(questionDoc.ref, 'answers'), where('answererId', '==', userId));
          const answersSnapshot = await getDocs(answersQuery);
          userAnswers.push(...answersSnapshot.docs.map(doc => ({
            id: doc.id,
            questionId: questionDoc.id,
            ref: doc.ref
          })));
        }

        // Process deletions in batches
        const batchSize = 450; // Leave room for other operations
        let currentBatch = writeBatch(db);
        let operationCount = 0;

        const commitBatch = async () => {
          if (operationCount > 0) {
            await currentBatch.commit();
            currentBatch = writeBatch(db);
            operationCount = 0;
          }
        };

        // 1. Delete user's questions and their related data
        for (const question of questions) {
          // Delete votes on the question
          const votesQuery = query(collection(question.ref, 'votes'));
          const votesSnapshot = await getDocs(votesQuery);
          for (const voteDoc of votesSnapshot.docs) {
            currentBatch.delete(voteDoc.ref);
            operationCount++;
            if (operationCount >= batchSize) await commitBatch();
          }

          // Delete reports on the question
          const reportsQuery = query(collection(question.ref, 'reports'));
          const reportsSnapshot = await getDocs(reportsQuery);
          for (const reportDoc of reportsSnapshot.docs) {
            currentBatch.delete(reportDoc.ref);
            operationCount++;
            if (operationCount >= batchSize) await commitBatch();
          }

          // Delete answers and their related data
          const answersQuery = query(collection(question.ref, 'answers'));
          const answersSnapshot = await getDocs(answersQuery);
          for (const answerDoc of answersSnapshot.docs) {
            // Delete votes on the answer
            const answerVotesQuery = query(collection(answerDoc.ref, 'votes'));
            const answerVotesSnapshot = await getDocs(answerVotesQuery);
            for (const voteDoc of answerVotesSnapshot.docs) {
              currentBatch.delete(voteDoc.ref);
              operationCount++;
              if (operationCount >= batchSize) await commitBatch();
            }

            // Delete reports on the answer
            const answerReportsQuery = query(collection(answerDoc.ref, 'reports'));
            const answerReportsSnapshot = await getDocs(answerReportsQuery);
            for (const reportDoc of answerReportsSnapshot.docs) {
              currentBatch.delete(reportDoc.ref);
              operationCount++;
              if (operationCount >= batchSize) await commitBatch();
            }

            // Delete the answer itself
            currentBatch.delete(answerDoc.ref);
            operationCount++;
            if (operationCount >= batchSize) await commitBatch();
          }

          // Delete the question itself
          currentBatch.delete(question.ref);
          operationCount++;
          if (operationCount >= batchSize) await commitBatch();
        }

        // 2. Delete user's answers from other questions
        for (const answer of userAnswers) {
          // Delete votes on the answer
          const votesQuery = query(collection(answer.ref, 'votes'));
          const votesSnapshot = await getDocs(votesQuery);
          for (const voteDoc of votesSnapshot.docs) {
            currentBatch.delete(voteDoc.ref);
            operationCount++;
            if (operationCount >= batchSize) await commitBatch();
          }

          // Delete reports on the answer
          const reportsQuery = query(collection(answer.ref, 'reports'));
          const reportsSnapshot = await getDocs(reportsQuery);
          for (const reportDoc of reportsSnapshot.docs) {
            currentBatch.delete(reportDoc.ref);
            operationCount++;
            if (operationCount >= batchSize) await commitBatch();
          }

          // Delete the answer itself
          currentBatch.delete(answer.ref);
          operationCount++;
          if (operationCount >= batchSize) await commitBatch();
        }

        // 3. Delete user's upvotes
        const userUpvotesQuery = query(collection(db, 'upvotes'), where('userId', '==', userId));
        const userUpvotesSnapshot = await getDocs(userUpvotesQuery);
        for (const upvoteDoc of userUpvotesSnapshot.docs) {
          currentBatch.delete(upvoteDoc.ref);
          operationCount++;
          if (operationCount >= batchSize) await commitBatch();
        }

        // 4. Delete user's reports
        const userReportsQuery = query(collection(db, 'reports'), where('reporterId', '==', userId));
        const userReportsSnapshot = await getDocs(userReportsQuery);
        for (const reportDoc of userReportsSnapshot.docs) {
          currentBatch.delete(reportDoc.ref);
          operationCount++;
          if (operationCount >= batchSize) await commitBatch();
        }

        // 5. Delete user from allowed emails
        if (user?.email) {
          const allowedEmailDoc = doc(db, 'allowedEmails', user.email);
          currentBatch.delete(allowedEmailDoc);
          operationCount++;
          if (operationCount >= batchSize) await commitBatch();
        }

        // 6. Delete user document
        currentBatch.delete(doc(db, 'users', userId));
        operationCount++;
        if (operationCount >= batchSize) await commitBatch();

        // Commit any remaining operations
        await commitBatch();

        // 7. Delete user from Firebase Authentication
        if (user?.email) {
          try {
            const functions = getFunctions();
            const deleteUserFunction = httpsCallable(functions, 'deleteUser');
            await deleteUserFunction({ userId: user.id, email: user.email });
          } catch (authError) {
            console.error('Error deleting user from Firebase Auth:', authError);
            // Even if Firebase Auth deletion fails, we've already deleted all their data
            // So we can still consider this a success
            console.log('User data deleted, but Firebase Auth deletion failed. Please delete the user manually from Firebase Console > Authentication > Users');
          }
        }

        // Refresh users list
        fetchUsers();
        alert('User and all associated data deleted successfully!');
      } catch (error) {
        console.error('Error deleting user:', error);
        alert(`Error deleting user: ${error.message}`);
      }
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/login', { replace: true });
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleAddEmail = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!newEmail || !newRole) {
      setError('Please fill in all fields');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      setError('Please enter a valid email address');
      return;
    }

    try {
      // Check if email already exists
      const emailDoc = await getDoc(doc(db, 'allowedEmails', newEmail));
      if (emailDoc.exists()) {
        setError('This email is already in the allowed list');
        return;
      }

      // Add the new email to allowedEmails collection
      await setDoc(doc(db, 'allowedEmails', newEmail), {
        email: newEmail,
        role: newRole,
        createdAt: new Date().toISOString()
      });

      setSuccess('Email added successfully!');
      setNewEmail('');
      setNewRole('student');
    } catch (error) {
      console.error('Error adding email:', error);
      setError('Failed to add email. Please try again.');
    }
  };

  const handleBulkEmailUpload = async (e) => {
    e.preventDefault();
    setBulkUploadError('');
    setBulkUploadSuccess('');
    
    try {
      const emails = bulkEmails.split('\n').map(email => email.trim()).filter(email => email);
      if (emails.length === 0) {
        throw new Error('Please enter at least one email address');
      }

      const batch = writeBatch(db);
      let successCount = 0;
      let errorCount = 0;
      let invalidEmails = [];

      for (const email of emails) {
        if (!email.includes('@')) {
          errorCount++;
          invalidEmails.push(email);
          continue;
        }

        const emailDoc = doc(db, 'allowedEmails', email);
        const emailDocSnap = await getDoc(emailDoc);

        if (!emailDocSnap.exists()) {
          batch.set(emailDoc, {
            email: email,
            role: bulkRole,
            createdAt: new Date().toISOString()
          });
          successCount++;
        } else {
          errorCount++;
        }
      }

      await batch.commit();

      let message = `Successfully added ${successCount} email${successCount !== 1 ? 's' : ''}.`;
      if (errorCount > 0) {
        message += `\n${errorCount} email${errorCount !== 1 ? 's were' : ' was'} skipped.`;
        if (invalidEmails.length > 0) {
          message += `\nInvalid emails: ${invalidEmails.join(', ')}`;
        }
      }
      alert(message);
      setBulkEmails('');
      fetchUsers();
    } catch (error) {
      alert(`Error: ${error.message}`);
    }
  };

  const handleCsvUpload = async (e) => {
    e.preventDefault();
    setBulkUploadError('');
    setBulkUploadSuccess('');

    if (!csvFile) {
      alert('Please select a CSV file');
      return;
    }

    try {
      Papa.parse(csvFile, {
        complete: async (results) => {
          const emails = results.data
            .filter(row => row[0] && row[0].includes('@'))
            .map(row => ({
              email: row[0].trim(),
              role: row[1]?.trim() || 'student'
            }));

          if (emails.length === 0) {
            throw new Error('No valid emails found in the CSV file');
          }

          const batch = writeBatch(db);
          let successCount = 0;
          let errorCount = 0;
          let invalidEmails = [];

          for (const { email, role } of emails) {
            if (!email.includes('@')) {
              errorCount++;
              invalidEmails.push(email);
              continue;
            }

            const emailDoc = doc(db, 'allowedEmails', email);
            const emailDocSnap = await getDoc(emailDoc);

            if (!emailDocSnap.exists()) {
              batch.set(emailDoc, {
                email: email,
                role: role,
                createdAt: new Date().toISOString()
              });
              successCount++;
            } else {
              errorCount++;
            }
          }

          await batch.commit();
          setCsvFile(null);

          let message = `Successfully added ${successCount} email${successCount !== 1 ? 's' : ''}.`;
          if (errorCount > 0) {
            message += `\n${errorCount} email${errorCount !== 1 ? 's were' : ' was'} skipped.`;
            if (invalidEmails.length > 0) {
              message += `\nInvalid emails: ${invalidEmails.join(', ')}`;
            }
          }
          alert(message);
          fetchUsers();
        },
        error: (error) => {
          alert(`Error parsing CSV file: ${error.message}`);
        }
      });
    } catch (error) {
      alert(`Error: ${error.message}`);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-screen bg-[#1a1a2e] text-white font-sans">Loading...</div>;
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden',
      fontFamily: 'Inter, Roboto, Arial, sans-serif',
      padding: '40px 0'
    }}>
      {/* Animated background ripples */}
      {ripples.map(ripple => (
        <motion.div
          key={ripple.id}
          style={{
            position: 'absolute',
            left: `${ripple.x}%`,
            top: `${ripple.y}%`,
            width: ripple.size,
            height: ripple.size,
            background: 'rgba(59, 130, 246, 0.15)',
            borderRadius: '50%',
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none',
            border: '1px solid rgba(59, 130, 246, 0.08)',
            boxShadow: '0 0 10px rgba(59, 130, 246, 0.08)',
            zIndex: 0
          }}
          initial={{ scale: 0, opacity: 0 }}
          animate={{
            scale: 10,
            opacity: [0, ripple.opacity, 0],
            transition: {
              duration: 2.5,
              ease: 'easeOut',
              times: [0, 0.3, 1]
            }
          }}
          exit={{ opacity: 0 }}
        />
      ))}

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
        style={{
          background: 'rgba(255,255,255,0.08)',
          borderRadius: '24px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
          border: '1.5px solid rgba(255,255,255,0.13)',
          backdropFilter: 'blur(12px)',
          width: '100%',
          maxWidth: '520px',
          padding: '40px 32px',
          zIndex: 2,
          position: 'relative',
        }}
      >
        <h1 className="text-4xl font-extrabold text-white mb-8 text-center tracking-tight drop-shadow-lg">SuperAdmin Dashboard</h1>
        <button
          onClick={handleLogout}
          className="absolute top-8 right-8 bg-gradient-to-r from-red-500 to-pink-500 text-white px-5 py-2 rounded-xl shadow-lg font-semibold hover:from-red-600 hover:to-pink-600 transition-all duration-200"
        >
          Logout
        </button>

        {/* Add Email Form */}
        <div className="mb-10">
          <h2 className="text-2xl font-bold mb-4 text-white text-center">Add Allowed Email</h2>
          <form onSubmit={handleAddEmail} className="space-y-6">
            <div className="flex flex-col gap-4">
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="rounded-lg bg-[#121629] border border-[#393e46] text-white px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400 text-lg"
                placeholder="Enter email address"
              />
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                className="rounded-lg bg-[#121629] border border-[#393e46] text-white px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
              >
                <option value="student">Student</option>
                <option value="faculty">Faculty</option>
                <option value="admin">Admin</option>
                <option value="superadmin">SuperAdmin</option>
              </select>
              <button
                type="submit"
                className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-2 rounded-xl font-semibold shadow-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 text-lg"
              >
                Add Email
              </button>
              {error && <p className="text-red-400 text-sm font-medium text-center">{error}</p>}
              {success && <p className="text-green-400 text-sm font-medium text-center">{success}</p>}
            </div>
          </form>
        </div>

        {/* Bulk Email Upload */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 shadow-2xl mb-6">
          <h2 className="text-2xl font-bold text-white mb-4">Bulk Email Upload</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Text Area Input */}
            <div className="bg-white/5 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-white mb-2">Paste Emails</h3>
              <textarea
                className="w-full h-32 bg-white/10 text-white rounded-lg p-3 mb-3 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                placeholder="Enter emails (one per line)"
                value={bulkEmails}
                onChange={(e) => setBulkEmails(e.target.value)}
              />
              <select
                className="w-full bg-white/10 text-white rounded-lg p-3 mb-3 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                value={bulkRole}
                onChange={(e) => setBulkRole(e.target.value)}
              >
                <option value="student">Student</option>
                <option value="teacher">Teacher</option>
                <option value="admin">Admin</option>
              </select>
              <button
                onClick={handleBulkEmailUpload}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
              >
                Add Emails
              </button>
            </div>

            {/* CSV Upload */}
            <div className="bg-white/5 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-white mb-2">Upload CSV</h3>
              <p className="text-white/70 text-sm mb-3">CSV format: email,role (one per line)</p>
              <input
                type="file"
                accept=".csv"
                onChange={(e) => setCsvFile(e.target.files[0])}
                className="w-full bg-white/10 text-white rounded-lg p-3 mb-3 focus:ring-2 focus:ring-purple-500 focus:outline-none"
              />
              <button
                onClick={handleCsvUpload}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
              >
                Upload CSV
              </button>
            </div>
          </div>
        </div>

        {/* User Management Table */}
        <div className="rounded-2xl shadow-xl p-6 border border-[#393e46] bg-[#232946] bg-opacity-80">
          <h2 className="text-2xl font-bold mb-6 text-white text-center">User Management</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[#393e46]">
              <thead className="bg-[#121629]">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-300 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-300 uppercase tracking-wider">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-300 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-[#232946] divide-y divide-[#393e46]">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-[#121629] transition-colors duration-200">
                    <td className="px-6 py-4 whitespace-nowrap text-white font-medium">{user.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-white font-medium">{user.role}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => handleDeleteUser(user.id)}
                        className="bg-gradient-to-r from-red-500 to-pink-500 text-white px-5 py-1.5 rounded-lg font-semibold shadow hover:from-red-600 hover:to-pink-600 transition-all duration-200"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default SuperAdminDashboard; 