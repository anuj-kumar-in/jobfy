import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, updateDoc, arrayUnion, collection, query, where, getDocs, orderBy } from 'firebase/firestore';

// Firebase configuration - Replace with your own config
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "YOUR_API_KEY",
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "YOUR_AUTH_DOMAIN",
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "YOUR_PROJECT_ID",
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "YOUR_STORAGE_BUCKET",
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "YOUR_MESSAGING_SENDER_ID",
    appId: import.meta.env.VITE_FIREBASE_APP_ID || "YOUR_APP_ID"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

// Auth functions
export const signInWithGoogle = async () => {
    try {
        const result = await signInWithPopup(auth, googleProvider);
        return result.user;
    } catch (error) {
        console.error("Error signing in with Google:", error);
        throw error;
    }
};

export const logOut = async () => {
    try {
        await signOut(auth);
    } catch (error) {
        console.error("Error signing out:", error);
        throw error;
    }
};

// Firestore functions for user profile
export const saveUserProfile = async (userId, profileData) => {
    try {
        await setDoc(doc(db, "users", userId), profileData, { merge: true });
        return true;
    } catch (error) {
        console.error("Error saving user profile:", error);
        throw error;
    }
};

export const getUserProfile = async (userId) => {
    try {
        const docRef = doc(db, "users", userId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return docSnap.data();
        }
        return null;
    } catch (error) {
        console.error("Error getting user profile:", error);
        throw error;
    }
};

export const addAppliedJob = async (userId, jobData) => {
    try {
        const applicationData = {
            ...jobData,
            appliedAt: new Date().toISOString(),
            status: jobData.status || 'applied',
            matchScore: jobData.matchScore || null,
            explanation: jobData.explanation || null,
            lastUpdated: new Date().toISOString()
        };

        await updateDoc(doc(db, "users", userId), {
            appliedJobs: arrayUnion(applicationData)
        });
        return true;
    } catch (error) {
        console.error("Error adding applied job:", error);
        throw error;
    }
};

// Update application status
export const updateApplicationStatus = async (userId, jobId, newStatus, notes = '') => {
    try {
        const userDoc = await getDoc(doc(db, "users", userId));
        if (!userDoc.exists()) {
            throw new Error("User not found");
        }

        const userData = userDoc.data();
        const appliedJobs = userData.appliedJobs || [];

        const updatedJobs = appliedJobs.map(job => {
            if (job.id === jobId || job.jobId === jobId) {
                return {
                    ...job,
                    status: newStatus,
                    statusNotes: notes,
                    lastUpdated: new Date().toISOString(),
                    statusHistory: [
                        ...(job.statusHistory || []),
                        {
                            status: newStatus,
                            date: new Date().toISOString(),
                            notes: notes
                        }
                    ]
                };
            }
            return job;
        });

        await updateDoc(doc(db, "users", userId), {
            appliedJobs: updatedJobs
        });

        return true;
    } catch (error) {
        console.error("Error updating application status:", error);
        throw error;
    }
};

// Get all applications for a user with filtering
export const getApplications = async (userId, filters = {}) => {
    try {
        const userDoc = await getDoc(doc(db, "users", userId));
        if (!userDoc.exists()) {
            return [];
        }

        let applications = userDoc.data().appliedJobs || [];

        // Apply filters
        if (filters.status) {
            applications = applications.filter(app => app.status === filters.status);
        }

        if (filters.dateFrom) {
            const fromDate = new Date(filters.dateFrom);
            applications = applications.filter(app => new Date(app.appliedAt) >= fromDate);
        }

        if (filters.dateTo) {
            const toDate = new Date(filters.dateTo);
            applications = applications.filter(app => new Date(app.appliedAt) <= toDate);
        }

        // Sort by date (most recent first)
        applications.sort((a, b) => new Date(b.appliedAt) - new Date(a.appliedAt));

        return applications;
    } catch (error) {
        console.error("Error getting applications:", error);
        throw error;
    }
};

// Get application statistics
export const getApplicationStats = async (userId) => {
    try {
        const applications = await getApplications(userId);

        const stats = {
            total: applications.length,
            byStatus: {},
            byCompany: {},
            avgMatchScore: 0,
            thisWeek: 0,
            thisMonth: 0
        };

        const now = new Date();
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        let totalMatchScore = 0;
        let matchScoreCount = 0;

        applications.forEach(app => {
            // Count by status
            const status = app.status || 'applied';
            stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;

            // Count by company
            const company = app.company || 'Unknown';
            stats.byCompany[company] = (stats.byCompany[company] || 0) + 1;

            // Average match score
            if (app.matchScore) {
                totalMatchScore += app.matchScore;
                matchScoreCount++;
            }

            // Time-based counts
            const appliedDate = new Date(app.appliedAt);
            if (appliedDate >= weekAgo) {
                stats.thisWeek++;
            }
            if (appliedDate >= monthAgo) {
                stats.thisMonth++;
            }
        });

        if (matchScoreCount > 0) {
            stats.avgMatchScore = Math.round(totalMatchScore / matchScoreCount);
        }

        return stats;
    } catch (error) {
        console.error("Error getting application stats:", error);
        throw error;
    }
};

// Save AI ranking results
export const saveRankingResults = async (userId, rankingData) => {
    try {
        await updateDoc(doc(db, "users", userId), {
            lastRanking: {
                timestamp: new Date().toISOString(),
                totalJobs: rankingData.total_jobs,
                topJobs: rankingData.ranked_jobs?.slice(0, 10) || []
            }
        });
        return true;
    } catch (error) {
        console.error("Error saving ranking results:", error);
        throw error;
    }
};

export default app;
