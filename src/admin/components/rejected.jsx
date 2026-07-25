import React, { useState, useEffect } from 'react';
import { Rejected } from '../functions/rejected'; 

export default function RejectedDashboard() {
  const [profiles, setProfiles] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [profileDetails, setProfileDetails] = useState(null);
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch all rejected records on mount
  useEffect(() => {
    fetchRejectedProfiles();
  }, []);

  const fetchRejectedProfiles = async () => {
    setLoading(true);
    try {
      const rejectInstance = new Rejected();
      const data = await rejectInstance.getRejectedProfiles();
      setProfiles(data);
      
      if (data.length > 0 && !selectedId) {
        handleSelectProfile(data[0].id);
      }
    } catch (error) {
      console.error("Error fetching profiles:", error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch the main details along with all arbitrary subcollection documents
  const handleSelectProfile = async (id) => {
    setSelectedId(id);
    setProfileDetails(null);
    setAttachments([]);
    
    try {
      const rejectInstance = new Rejected(id);
      
      const [details, files] = await Promise.all([
        rejectInstance.getProfile(),
        rejectInstance.getAttachments()
      ]);

      setProfileDetails(details);
      setAttachments(files);
    } catch (error) {
      console.error("Error fetching profile details:", error);
    }
  };

  // Permanently delete archive record
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to permanently delete this record from the archive?")) {
      return;
    }

    try {
      const rejectInstance = new Rejected(id);
      await rejectInstance.removeRejected();
      
      setSelectedId(null);
      setProfileDetails(null);
      setAttachments([]);
      await fetchRejectedProfiles();
    } catch (error) {
      console.error("Error deleting record:", error);
    }
  };

  if (loading && profiles.length === 0) {
    return <div style={styles.loading}>Loading archived records...</div>;
  }

  return (
    <div style={styles.container}>
      {/* Sidebar Navigation */}
      <div style={styles.sidebar}>
        <h3 style={styles.sidebarTitle}>Rejected Requests</h3>
        <ul style={styles.list}>
          {profiles.map((p) => (
            <li 
              key={p.id} 
              onClick={() => handleSelectProfile(p.id)}
              style={{
                ...styles.listItem,
                backgroundColor: selectedId === p.id ? '#e3f2fd' : 'transparent',
                fontWeight: selectedId === p.id ? 'bold' : 'normal',
                borderLeft: selectedId === p.id ? '4px solid #0066cc' : '4px solid transparent'
              }}
            >
              {p.name || p.id}
            </li>
          ))}
        </ul>
      </div>

      {/* Detail Content Area */}
      <div style={styles.mainContent}>
        {profileDetails ? (
          <div>
            <div style={styles.headerRow}>
              <div>
                <h2>{profileDetails.name || 'Unnamed Record'}</h2>
                <p style={styles.subtext}>ID: {selectedId}</p>
              </div>
              <button 
                onClick={() => handleDelete(selectedId)} 
                style={styles.deleteButton}
              >
                Delete Record Permanently
              </button>
            </div>

            {/* Rejection Details Banner */}
            <div style={styles.rejectionBanner}>
              <h4>Reason for Rejection</h4>
              <p>{profileDetails.reason || 'No reason specified.'}</p>
              {profileDetails.rejectedAt && (
                <span style={styles.timestamp}>
                  Archived on: {profileDetails.rejectedAt.toDate ? profileDetails.rejectedAt.toDate().toLocaleString() : 'Recent'}
                </span>
              )}
            </div>
            
            <hr style={styles.divider} />

            {/* Standard Profile Fields */}
            <div style={styles.grid}>
              <div style={styles.card}>
                <h4>Specialty</h4>
                <p>{profileDetails.specialty || 'N/A'}</p>
              </div>
              <div style={styles.card}>
                <h4>Varsity / University</h4>
                <p>{profileDetails.varsity || 'N/A'}</p>
              </div>
              <div style={styles.card}>
                <h4>Contact Details</h4>
                <p>Phone: {profileDetails.telephone || 'N/A'}</p>
                <p>Email: {profileDetails.email || 'N/A'}</p>
              </div>
              <div style={styles.card}>
                <h4>Address</h4>
                <p>{profileDetails.address || 'N/A'}</p>
              </div>
            </div>

            <div style={{ marginTop: '25px' }}>
              <h4>Description</h4>
              <p style={styles.description}>{profileDetails.description || 'No description provided.'}</p>
            </div>

            <hr style={styles.divider} />

            {/* Dynamic Arbitrary Attachments Section */}
            <h3>Submitted Attachments</h3>
            {attachments.length > 0 ? (
              <div style={styles.attachmentsGrid}>
                {attachments.map((file, idx) => {
                  // Destructure documentName out, the rest are arbitrary database fields
                  const { documentName, ...arbitraryFields } = file;
                  return (
                    <div key={idx} style={styles.attachmentCard}>
                      <div style={styles.attachmentHeader}>{documentName.toUpperCase()}</div>
                      <div style={styles.attachmentBody}>
                        {Object.entries(arbitraryFields).map(([key, value]) => (
                          <div key={key} style={styles.fieldRow}>
                            <span style={styles.fieldKey}>{key}:</span>
                            {key === 'url' && typeof value === 'string' ? (
                              <a href={value} target="_blank" rel="noopener noreferrer" style={styles.link}>
                                View Document Link
                              </a>
                            ) : (
                              <span style={styles.fieldValue}>{String(value)}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p style={styles.subtext}>No attachments found for this request.</p>
            )}
          </div>
        ) : (
          <div style={styles.emptyState}>Select an archived profile from the sidebar to view detailed audit data.</div>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: { display: 'flex', height: '100vh', fontFamily: 'Segoe UI, Arial, sans-serif', color: '#333' },
  sidebar: { width: '280px', borderRight: '1px solid #d0e1f9', padding: '20px', backgroundColor: '#f4f8fc', overflowY: 'auto' },
  sidebarTitle: { margin: '0 0 20px 0', color: '#004499', fontSize: '16px', letterSpacing: '0.5px' },
  list: { listStyle: 'none', padding: 0, margin: 0 },
  listItem: { padding: '12px 14px', cursor: 'pointer', borderRadius: '4px', marginBottom: '6px', transition: '0.15s ease', fontSize: '14px', color: '#445566' },
  mainContent: { flex: 1, padding: '40px', overflowY: 'auto', backgroundColor: '#fff' },
  headerRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' },
  deleteButton: { backgroundColor: '#c23934', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: '4px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' },
  subtext: { color: '#778899', fontSize: '13px', marginTop: '4px' },
  rejectionBanner: { marginTop: '20px', padding: '15px 20px', backgroundColor: '#fff0f0', borderLeft: '4px solid #c23934', borderRadius: '4px' },
  timestamp: { display: 'block', marginTop: '8px', fontSize: '11px', color: '#995555' },
  divider: { margin: '30px 0', border: 'none', borderTop: '1px solid #e1ecf8' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' },
  card: { border: '1px solid #e1ecf8', padding: '18px', borderRadius: '6px', backgroundColor: '#fafcff' },
  description: { backgroundColor: '#f7faff', padding: '15px 20px', borderRadius: '6px', lineHeight: '1.6', color: '#445566', border: '1px solid #edf4fc' },
  
  // Dynamic attachment layout elements
  attachmentsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginTop: '15px' },
  attachmentCard: { border: '1px solid #d0e1f9', borderRadius: '6px', overflow: 'hidden', boxShadow: '0 2px 5px rgba(0,68,153,0.03)' },
  attachmentHeader: { backgroundColor: '#e6f0fa', padding: '10px 15px', fontWeight: 'bold', fontSize: '12px', color: '#004499', letterSpacing: '0.5px', borderBottom: '1px solid #d0e1f9' },
  attachmentBody: { padding: '15px', backgroundColor: '#fff' },
  fieldRow: { display: 'flex', marginBottom: '8px', fontSize: '13px', lineHeight: '1.4' },
  fieldKey: { fontWeight: '600', color: '#667788', width: '110px', flexShrink: 0 },
  fieldValue: { color: '#223344', wordBreak: 'break-all' },
  link: { color: '#0066cc', textDecoration: 'none', fontWeight: '600' },
  
  emptyState: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: '#99aabb', fontSize: '15px' },
  loading: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontSize: '16px', color: '#0066cc', backgroundColor: '#f4f8fc' }
};