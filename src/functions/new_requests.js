import { Resend } from "resend";
import { GmailService } from "./gmail";
import { db } from '../firebase';
import {
  doc,
  getDocs,
  deleteDoc,
  setDoc,
  collection,
  writeBatch,
  serverTimestamp,
} from 'firebase/firestore';
import { Filter } from "./ai";
import { Rejected } from "./rejected";

const api = import.meta.env.VITE_RESEND_API;

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

class Response {
    constructor(response, id, data) {
        this.response = response; // "true" or "false"
        this.id = id;             // the newRequests doc id
        this.data = data;         // full request data (name, email, address, description, telephone, specialty, varsity, attachments, etc)
        this.email = data?.email;
        this.name = data?.name;
    }
// dont forget to  send link where they can register
  async Accept() {
        const resend = new Resend(api);

        // move the request data into practiceProfiles
        const { attachments, ...profileData } = this.data;
        await setDoc(doc(db, 'practiceProfiles', this.id), profileData);

        // seed default availability for the new practice (7 empty days)
        const batch = writeBatch(db);
        for (const day of DAYS) {
            const ref = doc(db, 'practiceAvailability', this.id, 'days', day);
            batch.set(ref, {
                day,
                openingTime: null,
                closingTime: null,
                availabilityStatus: false,
            });
        }
        // remove from newRequests now that it's been accepted
        batch.delete(doc(db, 'newRequests', this.id));
        await batch.commit();

        const { error } = await resend.emails.send({
            from: "baloyihlulani91@gmail.com",
            to: this.email,
            subject: "Your Application Has Been Accepted",
            html: `<p>Hi ${this.name || ""},</p>
                   <p>Congratulations! We're happy to let you know that your application has been <strong>accepted</strong>.</p>
                   <p>We'll be in touch soon with the next steps.</p>`,
        });

        if (error) {
            console.error("Failed to send acceptance email:", error);
            throw error;
        }
    }

    async Reject() {
        const resend = new Resend(api);

        // move the request data into rejected, then remove from newRequests
        const rejected = new Rejected(this.id);
        await rejected.addRejected(this.id, this.data);
        await deleteDoc(doc(db, 'newRequests', this.id));

        const { error } = await resend.emails.send({
            from: "baloyihlulani91@gmail.com",
            to: this.email,
            subject: "Update on Your Application",
            html: `<p>Hi ${this.name || ""},</p>
                   <p>Thank you for taking the time to apply. After careful consideration, we regret to inform you that your application was <strong>not successful</strong> this time.</p>
                   <p>We wish you the best in your future endeavors.</p>`,
        });

        if (error) {
            console.error("Failed to send rejection email:", error);
            throw error;
        }
    }

    async sendResponse() {
        if (this.response === "true") {
            await this.Accept();
        } else {
            await this.Reject();
        }
    }
}


class newRequests {
    constructor(token) {
        this.token = token;
        this.gmail = new GmailService(token);
        this.filter = new Filter(token);
    }

    // create a Response instance per-request -- id is the newRequests doc id,
    // data is that request's full data (name, email, etc)
    createResponse(response, id, data) {
        return new Response(response, id, data);
    }

    async getAllProfiles() {
        const snapshot = await getDocs(collection(db, 'practiceProfiles'));
        return snapshot.empty
            ? []
            : snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    }

    async getNewRequests() {
        const snapshot = await getDocs(collection(db, 'newRequests'));
        return snapshot.empty
            ? []
            : snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    }


   async addNewRequests() {
    const results = await this.filter.run();
    const batch = writeBatch(db);

    for (const request of results) {
        const { attachments, ...requestData } = request;   // <-- strips raw attachments out
        const attachmentMeta = [];

        if (attachments && attachments.length > 0) {
            for (const att of attachments) {
                const storagePath = await this.gmail.uploadAttachment(
                    request.id, att.filename, att.mimeType, att.attachment
                );
                const meta = { filename: att.filename, mimeType: att.mimeType, storagePath };
                const attRef = doc(collection(db, 'newRequests', request.id, 'attachments'), att.attachment_id || att.filename);
                batch.set(attRef, meta);
                attachmentMeta.push(meta);
            }
        }

        const ref = doc(db, 'newRequests', request.id);
        batch.set(ref, { ...requestData, attachmentCount: attachmentMeta.length });  // <-- no raw attachments here
    }

    await batch.commit();
    return results;
}
}

export { newRequests, Response };