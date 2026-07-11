import { storage } from '../firebase'; // add `export const storage = getStorage(app);` to your firebase.js
import { ref, uploadBytes, getDownloadURL, listAll } from 'firebase/storage';

class GmailService {
  constructor(accessToken) {
    this.accessToken = accessToken;
  }

  decodeAttachment(base64urlData) {
  const base64 = base64urlData.replace(/-/g, '+').replace(/_/g, '/');
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

  async getAttachmentFile(messageId, attachmentId) {
    const res = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/attachments/${attachmentId}`,
      { headers: { Authorization: `Bearer ${this.accessToken}` } }
    );
    const result = await res.json();
    return this.decodeAttachment(result.data);
  }

  async getEmail(body) {
  const id = body.id;
  const message = body.snippet;
  const from = body.payload.headers.find(h => h.name === "From")?.value;
  const attachments = [];

  const walkParts = async (parts) => {
    if (!parts) return;
    for (let part of parts) {
      if (part.parts) {
        // nested container (multipart/alternative, multipart/related, etc.)
        await walkParts(part.parts);
      } else if (part.body?.attachmentId) {
        // real attachment
        const attachment_id = part.body.attachmentId;
        const filename = part.filename;
        const mimeType = part.mimeType;
        const attachment = await this.getAttachmentFile(id, attachment_id);
        attachments.push({ attachment_id, filename, mimeType, attachment });
      }
      // else: it's an inline text/html or text/plain part with no attachmentId — skip
    }
  };

  await walkParts(body.payload?.parts);

  return { id, message, from, attachments };
}

  async getAllEmails() {
    const messages = await this.getIDs(); // was missing await before -- messages was a Promise, not an array
    const result = [];

    for (let object of messages) {
      let id = object.id;
      const res2 = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}`,
        { headers: { Authorization: `Bearer ${this.accessToken}` } }
      );
      const emailData = await res2.json();
      let email = await this.getEmail(emailData);
      result.push(email);
    }

    return result;
  }

  async getIDs() {
    const res = await fetch(
      'https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=40',
      { headers: { Authorization: `Bearer ${this.accessToken}` } }
    );
    const data = await res.json();
    return data.messages;
  }

  async uploadAttachment(messageId, filename, mimeType, buffer) {
    const filePath = `emails/${messageId}/attachments/${filename}`;
    const storageRef = ref(storage, filePath);

    await uploadBytes(storageRef, buffer, { contentType: mimeType });

    return filePath;
  }

  // list every attachment stored for a given email
  async getAttachmentsList(messageId) {
    const folderRef = ref(storage, `emails/${messageId}/attachments/`);
    const result = await listAll(folderRef);

    return result.items.map(item => ({
      filename: item.name,
      storagePath: item.fullPath,
    }));
  }

  // get a downloadable url for one attachment (by its storage path)
  async getAttachmentDownloadURL(storagePath) {
    const storageRef = ref(storage, storagePath);
    return getDownloadURL(storageRef);
  }

  // get download urls for every attachment under an email in one call
  async getAllAttachmentDownloadURLs(messageId) {
    const files = await this.getAttachmentsList(messageId);

    const withUrls = await Promise.all(
      files.map(async (f) => ({
        ...f,
        url: await this.getAttachmentDownloadURL(f.storagePath),
      }))
    );

    return withUrls;
  }
}

export { GmailService };