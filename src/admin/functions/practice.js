import { db } from '../firebase'; // the client-SDK db exported from your firebase.js
import {
  doc,
  getDoc,
  getDocs,
  deleteDoc,
  collection,
  writeBatch,
} from 'firebase/firestore';


class Practice {
  constructor(id) {
    this.id = id; // Firestore doc id for ONE practice, not an auth token
  }

  // ---- profile table ----

  async practiceProfile() {
    const docRef = doc(db, 'practiceProfiles', this.id);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? docSnap.data() : null;
    /**
     * fields:
     * name        - name of medical person
     * address
     * description
     * telephone
     * email
     * specialty
     * varsity
     */
  }

  async getAllProfiles() {
    const snapshot = await getDocs(collection(db, 'practiceProfiles'));
    return snapshot.empty
      ? []
      : snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  }

  async availability() {
    const daysRef = collection(db, 'availabilty', this.id, 'days');
    const snapshot = await getDocs(daysRef);
    return snapshot.docs.map(d => d.data()); 
  }

 
  async removePractice() {
    await deleteDoc(doc(db, 'practiceProfiles', this.id));

    const daysRef = collection(db, 'availabilty', this.id, 'days');
    const daysSnapshot = await getDocs(daysRef);

    const batch = writeBatch(db);
    daysSnapshot.docs.forEach(d => batch.delete(d.ref));
    batch.delete(doc(db, 'availabilty', this.id));
    await batch.commit();
  }
}


  


export { Practice };