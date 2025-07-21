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
  getCountFromServer,
  startAfter,
} from "firebase/firestore";
import { db } from "../firebase/config";

const COLLECTION_NAME = "hold_logs";

/**
 * Logs a completed hold cycle to Firestore.
 * @param {string} buttonType - The type of item that was held.
 * @param {string} startTime - The ISO string of when the hold began.
 * @param {string} endTime - The ISO string of when the hold ended.
 * @returns {Promise<Object>} - The created document reference.
 */
export const logHold = async (
  buttonType,
  startTime,
  endTime,
  autoReleased = false
) => {
  try {
    const holdDuration = new Date(endTime) - new Date(startTime);

    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      button_type: buttonType,
      start_time: startTime,
      end_time: endTime,
      duration_ms: holdDuration, // Duration in milliseconds
      auto_released: autoReleased, // Flag for auto-release
      created_at: serverTimestamp(),
    });

    console.log("Hold cycle logged successfully:", docRef.id);
    return docRef;
  } catch (error) {
    console.error("Error logging hold cycle:", error);
    throw error;
  }
};

/**
 * Get recent hold logs.
 * @param {number} limitCount - Number of recent logs to retrieve.
 * @returns {Promise<Array>} - Array of hold logs.
 */
export const getRecentLogs = async (limitCount = 50) => {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      orderBy("end_time", "desc"),
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
 * Deletes a log from Firestore.
 * @param {string} logId - The ID of the log to delete.
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
 * Get total count of hold logs.
 * @returns {Promise<number>} - Total number of logs.
 */
export const getTotalLogsCount = async () => {
  try {
    const q = query(collection(db, COLLECTION_NAME));
    const snapshot = await getCountFromServer(q);
    return snapshot.data().count;
  } catch (error) {
    console.error("Error getting total logs count:", error);
    throw error;
  }
};

/**
 * Get paginated hold logs.
 * @param {number} pageSize - Number of logs per page.
 * @param {Object} lastDoc - Last document from previous page for cursor-based pagination.
 * @returns {Promise<Array>} - Array of hold logs.
 */
export const getPaginatedLogs = async (pageSize = 20, lastDoc = null) => {
  try {
    let q = query(
      collection(db, COLLECTION_NAME),
      orderBy("end_time", "desc"),
      limit(pageSize)
    );

    // If we have a last document, start after it
    if (lastDoc) {
      q = query(
        collection(db, COLLECTION_NAME),
        orderBy("end_time", "desc"),
        startAfter(lastDoc),
        limit(pageSize)
      );
    }

    const querySnapshot = await getDocs(q);
    const logs = [];

    querySnapshot.forEach((doc) => {
      logs.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    return {
      logs,
      lastDoc: querySnapshot.docs[querySnapshot.docs.length - 1] || null,
      hasMore: querySnapshot.docs.length === pageSize,
    };
  } catch (error) {
    console.error("Error fetching paginated logs:", error);
    throw error;
  }
};
