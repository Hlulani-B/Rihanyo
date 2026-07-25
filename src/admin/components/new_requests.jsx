import React, { useState, useEffect } from 'react';
import { newRequests } from '../functions/new_requests'; // adjust path to where newRequests/Response are exported
import { db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';

// TODO: replace with wherever your Google sign-in stores the Gmail access token
const ACCESS_TOKEN = localStorage.getItem("token");

export default function NewRequestsDashboard() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtering, setFiltering] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [attachmentsById, setAttachmentsById] = useState({});
  const [actingId, setActingId] = useState(null);

  const nr = new newRequests(ACCESS_TOKEN);

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const list = await nr.getNewRequests();
      setRequests(list);
    } catch (err) {
      console.error('Failed to load requests:', err);
    } finally {
      setLoading(false);
    }
  };

  const runFilter = async () => {
    setFiltering(true);
    try {
      await nr.addNewRequests(); // fetches Gmail, screens via Groq, writes to newRequests
      await loadRequests();
    } catch (err) {
      console.error('Filter run failed:', err);
      alert('AI filter run failed — check console.');
    } finally {
      setFiltering(false);
    }
  };

  const toggleAttachments = async (requestId) => {
    if (expandedId === requestId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(requestId);

    if (!attachmentsById[requestId]) {
      try {
        const snapshot = await getDocs(collection(db, 'newRequests', requestId, 'attachments'));
        const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        setAttachmentsById(prev => ({ ...prev, [requestId]: docs }));
      } catch (err) {
        console.error('Failed to load attachments:', err);
        setAttachmentsById(prev => ({ ...prev, [requestId]: [] }));
      }
    }
  };

  const handleDecision = async (request, accept) => {
    setActingId(request.id);
    try {
      const resp = nr.createResponse(accept ? 'true' : 'false', request.id, request);
      await resp.sendResponse();
      await loadRequests();
    } catch (err) {
      console.error('Failed to send response:', err);
      alert('Failed to process this request — check console.');
    } finally {
      setActingId(null);
    }
  };

  return (
    <div style={s.container}>
      <div style={s.headerRow}>
        <div>
          <span style={s.eyebrow}>Admin</span>
          <h2 style={s.title}>New Practice Requests</h2>
        </div>
        <button onClick={runFilter} disabled={filtering} style={s.filterBtn}>
          {filtering ? 'Running AI Filter…' : 'Run AI Filter'}
        </button>
      </div>

      {loading ? (
        <p style={s.muted}>Loading requests…</p>
      ) : requests.length === 0 ? (
        <p style={s.muted}>No new requests. Try running the AI filter to pull from Gmail.</p>
      ) : (
        <div style={s.list}>
          {requests.map((req) => (
            <div key={req.id} style={s.card}>
              <div style={s.cardTop}>
                <div>
                  <h3 style={s.cardName}>{req.name || req.id}</h3>
                  <span style={s.muted}>{req.email}</span>
                </div>
                {'valid' in req && (
                  <span style={{ ...s.badge, ...(req.valid ? s.badgeValid : s.badgeInvalid) }}>
                    {req.valid ? 'VALID' : 'FLAGGED'}
                  </span>
                )}
              </div>

              <div style={s.grid}>
                {req.specialty && <div><span style={s.label}>Specialty</span><p style={s.value}>{req.specialty}</p></div>}
                {req.telephone && <div><span style={s.label}>Telephone</span><p style={s.value}>{req.telephone}</p></div>}
                {req.varsity && <div><span style={s.label}>Varsity</span><p style={s.value}>{req.varsity}</p></div>}
                {req.address && <div><span style={s.label}>Address</span><p style={s.value}>{req.address}</p></div>}
              </div>

              {req.description && <p style={s.description}>{req.description}</p>}
              {req.message && <p style={s.description}>{req.message}</p>}
              {req.reason && <p style={s.reason}>AI note: {req.reason}</p>}

              <button onClick={() => toggleAttachments(req.id)} style={s.linkBtn}>
                {expandedId === req.id ? 'Hide attachments' : 'View attachments'}
              </button>

              {expandedId === req.id && (
                <div style={s.attachmentBox}>
                  {(attachmentsById[req.id] || []).length === 0 ? (
                    <span style={s.muted}>No attachments found.</span>
                  ) : (
                    attachmentsById[req.id].map((att) => (
                      <div key={att.id} style={s.attachmentRow}>
                        <span style={s.attachmentName}>{att.id}</span>
                        {att.url && (
                          <a href={att.url} target="_blank" rel="noreferrer" style={s.attachmentLink}>
                            Open
                          </a>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}

              <div style={s.actionsRow}>
                <button
                  onClick={() => handleDecision(req, true)}
                  disabled={actingId === req.id}
                  style={s.acceptBtn}
                >
                  {actingId === req.id ? 'Working…' : 'Accept'}
                </button>
                <button
                  onClick={() => handleDecision(req, false)}
                  disabled={actingId === req.id}
                  style={s.rejectBtn}
                >
                  {actingId === req.id ? 'Working…' : 'Reject'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const colors = {
  bg: '#F3F8FC',
  surface: '#FFFFFF',
  border: '#DCE9F2',
  primary: '#2F6690',
  primaryDeep: '#1F4C6E',
  tint: '#E8F2FA',
  text: '#16324A',
  textSoft: '#5C7A8E',
  open: '#2E7D5B',
  openBg: '#E4F4EC',
  closed: '#B4483A',
  closedBg: '#FBEAE7',
};

const s = {
  container: {
    minHeight: '100vh',
    background: colors.bg,
    color: colors.text,
    fontFamily: "'Segoe UI', -apple-system, sans-serif",
    padding: '40px 48px',
  },
  headerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '28px',
    flexWrap: 'wrap',
    gap: '12px',
  },
  eyebrow: {
    fontSize: '11px',
    fontWeight: 600,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: colors.textSoft,
  },
  title: { margin: '4px 0 0', fontSize: '26px', fontWeight: 600, color: colors.primaryDeep },
  filterBtn: {
    background: colors.primary,
    color: '#fff',
    border: 'none',
    padding: '11px 20px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  muted: { color: colors.textSoft, fontSize: '14px' },
  list: { display: 'flex', flexDirection: 'column', gap: '16px' },
  card: {
    background: colors.surface,
    border: `1px solid ${colors.border}`,
    borderRadius: '14px',
    padding: '20px 22px',
  },
  cardTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '14px',
    gap: '12px',
  },
  cardName: { margin: 0, fontSize: '18px', fontWeight: 600, color: colors.primaryDeep },
  badge: {
    padding: '4px 10px',
    borderRadius: '20px',
    fontSize: '11px',
    fontWeight: 700,
    whiteSpace: 'nowrap',
  },
  badgeValid: { color: colors.open, background: colors.openBg },
  badgeInvalid: { color: colors.closed, background: colors.closedBg },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
    gap: '10px',
    marginBottom: '12px',
  },
  label: {
    fontSize: '11px',
    fontWeight: 600,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    color: colors.textSoft,
  },
  value: { margin: '4px 0 0', fontSize: '14px' },
  description: {
    margin: '10px 0',
    padding: '12px 14px',
    background: colors.tint,
    borderRadius: '10px',
    fontSize: '14px',
    lineHeight: 1.5,
  },
  reason: { margin: '6px 0', fontSize: '13px', color: colors.textSoft, fontStyle: 'italic' },
  linkBtn: {
    background: 'none',
    border: 'none',
    color: colors.primary,
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    padding: 0,
    marginTop: '6px',
  },
  attachmentBox: {
    marginTop: '10px',
    padding: '12px 14px',
    background: colors.tint,
    borderRadius: '10px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  attachmentRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  attachmentName: { fontSize: '13px' },
  attachmentLink: { fontSize: '13px', color: colors.primary, fontWeight: 600 },
  actionsRow: { display: 'flex', gap: '10px', marginTop: '16px' },
  acceptBtn: {
    background: colors.open,
    color: '#fff',
    border: 'none',
    padding: '9px 18px',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  rejectBtn: {
    background: colors.surface,
    color: colors.closed,
    border: '1px solid #EFD4CE',
    padding: '9px 18px',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
  },
};