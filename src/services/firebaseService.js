import {
  collection,
  addDoc,
  query,
  orderBy,
  limit,
  getDocs,
  serverTimestamp,
  doc,
  deleteDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../firebase/config";

// Collection name for button press logs
const COLLECTION_NAME = "button_presses";

/**
 * Log a button press to Firestore
 * @param {string} buttonType - The type of button pressed
 * @returns {Promise<Object>} - The created document reference
 */
export const logButtonPress = async (buttonType) => {
  try {
    // Create timestamp in Hawaii Standard Time (HST)
    // Since the user is already in Hawaii, use the current local time
    const now = new Date();
    const timestamp = now.toISOString();

    // Add document to Firestore
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      button_type: buttonType,
      timestamp: timestamp,
      created_at: serverTimestamp(), // Firestore server timestamp as backup
    });

    console.log("Button press logged successfully:", docRef.id);
    return docRef;
  } catch (error) {
    console.error("Error logging button press:", error);
    throw error;
  }
};

/**
 * Get recent button press logs
 * @param {number} limitCount - Number of recent logs to retrieve (default: 50)
 * @returns {Promise<Array>} - Array of button press logs
 */
export const getRecentLogs = async (limitCount = 50) => {
  try {
    // Query Firestore for recent logs, ordered by timestamp descending
    const q = query(
      collection(db, COLLECTION_NAME),
      orderBy("timestamp", "desc"),
      limit(limitCount)
    );

    const querySnapshot = await getDocs(q);
    const logs = [];

    querySnapshot.forEach((doc) => {
      logs.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    return logs;
  } catch (error) {
    console.error("Error fetching recent logs:", error);
    throw error;
  }
};

/**
 * Get logs for a specific date range
 * @param {Date} startDate - Start date for the range
 * @param {Date} endDate - End date for the range
 * @returns {Promise<Array>} - Array of button press logs in the date range
 */
export const getLogsByDateRange = async (startDate, endDate) => {
  try {
    // Convert dates to ISO strings for comparison
    const startISO = startDate.toISOString();
    const endISO = endDate.toISOString();

    // Query Firestore for logs in date range
    const q = query(
      collection(db, COLLECTION_NAME),
      orderBy("timestamp", "desc")
    );

    const querySnapshot = await getDocs(q);
    const logs = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.timestamp >= startISO && data.timestamp <= endISO) {
        logs.push({
          id: doc.id,
          ...data,
        });
      }
    });

    return logs;
  } catch (error) {
    console.error("Error fetching logs by date range:", error);
    throw error;
  }
};

/**
 * Delete a button press log from Firestore
 * @param {string} logId - The ID of the log to delete
 * @returns {Promise<void>}
 */
export const deleteLog = async (logId) => {
  try {
    await deleteDoc(doc(db, COLLECTION_NAME, logId));
    console.log("Log deleted successfully:", logId);
  } catch (error) {
    console.error("Error deleting log:", error);
    throw error;
  }
};

/**
 * Update a button press log in Firestore
 * @param {string} logId - The ID of the log to update
 * @param {Object} updates - The fields to update
 * @returns {Promise<void>}
 */
export const updateLog = async (logId, updates) => {
  try {
    await updateDoc(doc(db, COLLECTION_NAME, logId), updates);
    console.log("Log updated successfully:", logId);
  } catch (error) {
    console.error("Error updating log:", error);
    throw error;
  }
};
