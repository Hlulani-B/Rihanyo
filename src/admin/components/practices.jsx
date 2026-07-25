import React, { useState, useEffect } from 'react';
import { Practice } from '../functions/practice';

export default function PracticeDashboard() {
  const [profiles, setProfiles] = useState([]);
  const [selectedPractice, setSelectedPractice] = useState(null);
  const [profileDetails, setProfileDetails] = useState(null);
  const [availability, setAvailability] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    setLoading(true);
    try {
      const pInstance = new Practice();
      const allProfiles = await pInstance.getAllProfiles();
      setProfiles(allProfiles);

      if (allProfiles.length > 0 && !selectedPractice) {
        handleSelectPractice(allProfiles[0].id);
      }
    } catch (error) {
      console.error("Error fetching profiles:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPractice = async (id) => {
    setSelectedPractice(id);
    setProfileDetails(null);
    setAvailability([]);

    try {
      const practiceInstance = new Practice(id);

      const [details, availData] = await Promise.all([
        practiceInstance.practiceProfile(),
        practiceInstance.availability()
      ]);

      setProfileDetails(details);
      setAvailability(availData);
    } catch (error) {
      console.error("Error fetching practice details:", error);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this practice and its availability data? This cannot be undone.")) {
      return;
    }

    try {
      const practiceInstance = new Practice(id);
      await practiceInstance.removePractice();

      setSelectedPractice(null);
      setProfileDetails(null);
      setAvailability([]);
      await fetchProfiles();
    } catch (error) {
      console.error("Error deleting practice:", error);
      alert("Failed to delete practice.");
    }
  };

  const initials = (name) =>
    (name || '?')
      .split(' ')
      .map(w => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();

  if (loading && profiles.length === 0) {
    return (
      <div style={styles.loading}>
        <div style={styles.spinner} />
        <span>Loading practices…</span>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <aside style={styles.sidebar}>
        <div style={styles.sidebarHeader}>
          <span style={styles.eyebrow}>Registry</span>
          <h3 style={styles.sidebarTitle}>Practice Profiles</h3>
        </div>
        <ul style={styles.list}>
          {profiles.map((p) => {
            const active = selectedPractice === p.id;
            return (
              <li
                key={p.id}
                onClick={() => handleSelectPractice(p.id)}
                style={{ ...styles.listItem, ...(active ? styles.listItemActive : {}) }}
              >
                <span style={styles.avatar}>{initials(p.name)}</span>
                <span style={{ ...styles.listName, ...(active ? styles.listNameActive : {}) }}>
                  {p.name || p.id}
                </span>
              </li>
            );
          })}
        </ul>
      </aside>

      <main style={styles.main}>
        {profileDetails ? (
          <div>
            <div style={styles.headerRow}>
              <div>
                <span style={styles.eyebrow}>Practice ID · {selectedPractice}</span>
                <h2 style={styles.title}>{profileDetails.name || 'Unnamed Practice'}</h2>
              </div>
              <button onClick={() => handleDelete(selectedPractice)} style={styles.deleteButton}>
                Delete Practice
              </button>
            </div>

            <div style={styles.grid}>
              <div style={styles.card}>
                <span style={styles.cardLabel}>Specialty</span>
                <p style={styles.cardValue}>{profileDetails.specialty || 'Not provided'}</p>
              </div>
              <div style={styles.card}>
                <span style={styles.cardLabel}>Varsity / University</span>
                <p style={styles.cardValue}>{profileDetails.varsity || 'Not provided'}</p>
              </div>
              <div style={styles.card}>
                <span style={styles.cardLabel}>Telephone</span>
                <p style={styles.cardValue}>{profileDetails.telephone || 'Not provided'}</p>
              </div>
              <div style={styles.card}>
                <span style={styles.cardLabel}>Email</span>
                <p style={styles.cardValue}>{profileDetails.email || 'Not provided'}</p>
              </div>
              <div style={{ ...styles.card, gridColumn: '1 / -1' }}>
                <span style={styles.cardLabel}>Address</span>
                <p style={styles.cardValue}>{profileDetails.address || 'Not provided'}</p>
              </div>
            </div>

            <section style={styles.section}>
              <span style={styles.cardLabel}>Description</span>
              <p style={styles.description}>
                {profileDetails.description || 'No description provided.'}
              </p>
            </section>

            <section style={styles.section}>
              <h3 style={styles.sectionTitle}>Availability Schedule</h3>
              {availability.length > 0 ? (
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Day</th>
                      <th style={styles.th}>Opening</th>
                      <th style={styles.th}>Closing</th>
                      <th style={styles.th}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {availability.map((avail, index) => {
                      const open = avail.status === 'opened';
                      return (
                        <tr key={index}>
                          <td style={{ ...styles.td, ...styles.day }}>{avail.day}</td>
                          <td style={styles.td}>{avail.opening_hours || '—'}</td>
                          <td style={styles.td}>{avail.closing_hours || '—'}</td>
                          <td style={styles.td}>
                            <span style={{ ...styles.badge, ...(open ? styles.badgeOpen : styles.badgeClosed) }}>
                              {avail.status ? avail.status.toUpperCase() : 'UNKNOWN'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <p style={styles.emptyNote}>No availability schedule found for this practice.</p>
              )}
            </section>
          </div>
        ) : (
          <div style={styles.emptyState}>
            <div style={styles.emptyMark} />
            <p>Select a practice profile to view details.</p>
          </div>
        )}
      </main>
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

const styles = {
  container: {
    display: 'flex',
    height: '100vh',
    background: colors.bg,
    color: colors.text,
    fontFamily: "'Segoe UI', -apple-system, sans-serif",
  },
  sidebar: {
    width: '280px',
    flexShrink: 0,
    borderRight: `1px solid ${colors.border}`,
    background: colors.surface,
    overflowY: 'auto',
  },
  sidebarHeader: {
    padding: '28px 20px 16px',
    borderBottom: `1px solid ${colors.border}`,
  },
  sidebarTitle: {
    margin: '4px 0 0',
    fontSize: '20px',
    fontWeight: 600,
    color: colors.primaryDeep,
  },
  eyebrow: {
    fontSize: '11px',
    fontWeight: 600,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: colors.textSoft,
  },
  list: { listStyle: 'none', margin: 0, padding: '12px' },
  listItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 12px',
    borderRadius: '10px',
    cursor: 'pointer',
    marginBottom: '4px',
  },
  listItemActive: {
    background: colors.tint,
    boxShadow: `inset 3px 0 0 ${colors.primary}`,
  },
  avatar: {
    width: '34px',
    height: '34px',
    flexShrink: 0,
    borderRadius: '50%',
    background: colors.primary,
    color: '#fff',
    fontSize: '12px',
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  listName: {
    fontSize: '14px',
    fontWeight: 500,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  listNameActive: { fontWeight: 600, color: colors.primaryDeep },
  main: { flex: 1, overflowY: 'auto', padding: '40px 48px' },
  headerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '28px',
    gap: '16px',
  },
  title: { margin: '6px 0 0', fontSize: '28px', fontWeight: 600, color: colors.primaryDeep },
  deleteButton: {
    background: colors.surface,
    color: colors.closed,
    border: '1px solid #EFD4CE',
    padding: '9px 16px',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '14px',
    marginBottom: '28px',
  },
  card: {
    background: colors.surface,
    border: `1px solid ${colors.border}`,
    borderRadius: '12px',
    padding: '16px 18px',
  },
  cardLabel: {
    fontSize: '11px',
    fontWeight: 600,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    color: colors.textSoft,
  },
  cardValue: { margin: '6px 0 0', fontSize: '15px', color: colors.text },
  section: { marginTop: '28px', paddingTop: '24px', borderTop: `1px solid ${colors.border}` },
  sectionTitle: { margin: '0 0 14px', fontSize: '18px', fontWeight: 600, color: colors.primaryDeep },
  description: {
    margin: '8px 0 0',
    padding: '16px 18px',
    background: colors.tint,
    borderRadius: '12px',
    fontSize: '14px',
    lineHeight: 1.6,
  },
  emptyNote: { fontSize: '14px', color: colors.textSoft },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    background: colors.surface,
    border: `1px solid ${colors.border}`,
    borderRadius: '12px',
  },
  th: {
    textAlign: 'left',
    fontSize: '11px',
    fontWeight: 600,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    color: colors.textSoft,
    background: colors.tint,
    padding: '12px 16px',
  },
  td: { padding: '12px 16px', fontSize: '14px', borderTop: `1px solid ${colors.border}` },
  day: { fontWeight: 600, color: colors.primaryDeep },
  badge: {
    display: 'inline-block',
    padding: '4px 10px',
    borderRadius: '20px',
    fontSize: '11px',
    fontWeight: 700,
  },
  badgeOpen: { color: colors.open, background: colors.openBg },
  badgeClosed: { color: colors.closed, background: colors.closedBg },
  emptyState: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '14px',
    color: colors.textSoft,
  },
  emptyMark: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    border: `2px solid ${colors.border}`,
    background: colors.tint,
  },
  loading: {
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '14px',
    background: colors.bg,
    color: colors.textSoft,
    fontSize: '14px',
  },
  spinner: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    border: `3px solid ${colors.border}`,
    borderTopColor: colors.primary,
  },
};