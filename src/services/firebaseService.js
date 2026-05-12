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

export const logEvent = async (buttonType) => {
  const now = new Date().toISOString();
  const docRef = await addDoc(collection(db, COLLECTION_NAME), {
    button_type: buttonType,
    start_time: now,
    created_at: serverTimestamp(),
  });
  return docRef;
};

export const deleteLog = async (logId) => {
  await deleteDoc(doc(db, COLLECTION_NAME, logId));
};

export const getTotalLogsCount = async () => {
  const snap = await getCountFromServer(query(collection(db, COLLECTION_NAME)));
  return snap.data().count;
};

export const getPaginatedLogs = async (pageSize = 20, lastDoc = null) => {
  let q = query(
    collection(db, COLLECTION_NAME),
    orderBy("start_time", "desc"),
    limit(pageSize)
  );

  if (lastDoc) {
    q = query(
      collection(db, COLLECTION_NAME),
      orderBy("start_time", "desc"),
      startAfter(lastDoc),
      limit(pageSize)
    );
  }

  const snap = await getDocs(q);
  return {
    logs: snap.docs.map((d) => ({ id: d.id, ...d.data() })),
    lastDoc: snap.docs[snap.docs.length - 1] || null,
    hasMore: snap.docs.length === pageSize,
  };
};
