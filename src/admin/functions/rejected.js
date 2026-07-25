import { db } from '../firebase';
import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  collection,
  serverTimestamp,
} from 'firebase/firestore';

class Rejected {
  constructor(id) {
    this.id = id; // Firestore doc id for one rejected request
  }

  async getProfile() {
    const docRef = doc(db, 'rejected', this.id);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? docSnap.data() : null;
  }

  async getRejectedProfiles() {
    const snapshot = await getDocs(collection(db, 'rejected'));
    return snapshot.empty
      ? []
      : snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  }

  // FIX: This provides the missing function your frontend dashboard calls
  async getAttachments() {
    const attachmentsRef = collection(db, 'rejected', this.id, 'attachments');
    const snapshot = await getDocs(attachmentsRef);
    return snapshot.empty
      ? []
      : snapshot.docs.map(d => ({ documentName: d.id, ...d.data() }));
  }

  async addRejected(id, data, reason = null) {
    await setDoc(doc(db, 'rejected', id), {
      ...data,
      reason,
      rejectedAt: serverTimestamp(),
    });
  }

  async removeRejected() {
    await deleteDoc(doc(db, 'rejected', this.id));
  }
}

export { Rejected };