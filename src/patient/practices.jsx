import React, { useState, useEffect } from 'react';
import { Practice } from '../admin/functions/practice';

export default function Practicedashboard() {
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
      <div style={styles.brandBar}>
        <span style={styles.brandDot} />
        <span style={styles.brandName}>Rihanyo</span>
        <span style={styles.brandSub}>— practice registry</span>
      </div>

      <div style={styles.body}>
        <aside style={styles.sidebar}>
          <div style={styles.sidebarHeader}>
            <span style={styles.eyebrow}>— registry</span>
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
                  <span style={styles.eyebrow}>practice id · {selectedPractice}</span>
                  <h2 style={styles.title}>{profileDetails.name || 'Unnamed Practice'}</h2>
                </div>
                
              </div>

              <div style={styles.grid}>
                <div style={{ ...styles.card, transform: 'rotate(-0.4deg)' }}>
                  <span style={styles.cardLabel}>Specialty</span>
                  <p style={styles.cardValue}>{profileDetails.specialty || 'Not provided'}</p>
                </div>
                <div style={{ ...styles.card, transform: 'rotate(0.3deg)' }}>
                  <span style={styles.cardLabel}>Varsity / University</span>
                  <p style={styles.cardValue}>{profileDetails.varsity || 'Not provided'}</p>
                </div>
                <div style={{ ...styles.card, transform: 'rotate(0.5deg)' }}>
                  <span style={styles.cardLabel}>Telephone</span>
                  <p style={styles.cardValue}>{profileDetails.telephone || 'Not provided'}</p>
                </div>
                <div style={{ ...styles.card, transform: 'rotate(-0.3deg)' }}>
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
                <div style={styles.sectionTitleRow}>
                  <h3 style={styles.sectionTitle}>Availability Schedule</h3>
                  <span style={styles.stamp}>received<br />&amp; confirmed</span>
                </div>
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
    </div>
  );
}

const colors = {
  bg: '#EDEAE0',
  bgGrad: 'linear-gradient(135deg, #F1EEE4 0%, #E4E7DE 45%, #C9D3CE 100%)',
  paper: '#FBF9F2',
  ink: '#1C2B22',
  inkSoft: '#5B6B60',
  green: '#1F3D2B',
  greenSoft: '#DCE7DC',
  rust: '#C1502E',
  rustSoft: '#F4E1D8',
  border: '#DAD5C4',
  open: '#2E6B47',
  openBg: '#E1EEE2',
  closed: '#B4483A',
  closedBg: '#F8E4DF',
};

const mono = "'JetBrains Mono', 'Courier New', ui-monospace, SFMono-Regular, monospace";

const styles = {
  container: {
    minHeight: '100vh',
    background: colors.bgGrad,
    color: colors.ink,
    fontFamily: mono,
  },
  brandBar: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '10px',
    padding: '22px 40px',
    borderBottom: `1px solid ${colors.border}`,
  },
  brandDot: {
    width: '9px',
    height: '9px',
    borderRadius: '50%',
    background: colors.open,
    display: 'inline-block',
  },
  brandName: { fontSize: '18px', fontWeight: 700, letterSpacing: '-0.02em' },
  brandSub: { fontSize: '13px', color: colors.inkSoft },
  body: { display: 'flex', height: 'calc(100vh - 65px)' },
  sidebar: {
    width: '280px',
    flexShrink: 0,
    borderRight: `1px solid ${colors.border}`,
    background: 'rgba(251,249,242,0.6)',
    overflowY: 'auto',
  },
  sidebarHeader: {
    padding: '28px 20px 16px',
    borderBottom: `1px solid ${colors.border}`,
  },
  sidebarTitle: {
    margin: '6px 0 0',
    fontSize: '19px',
    fontWeight: 700,
    color: colors.green,
    letterSpacing: '-0.01em',
  },
  eyebrow: {
    fontSize: '11px',
    fontWeight: 600,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    color: colors.rust,
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
    border: '1px solid transparent',
  },
  listItemActive: {
    background: colors.paper,
    border: `1px solid ${colors.border}`,
    boxShadow: `inset 3px 0 0 ${colors.rust}`,
  },
  avatar: {
    width: '32px',
    height: '32px',
    flexShrink: 0,
    borderRadius: '50%',
    background: colors.green,
    color: '#F1EEE4',
    fontSize: '11px',
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
  listNameActive: { fontWeight: 700, color: colors.green },
  main: { flex: 1, overflowY: 'auto', padding: '40px 48px' },
  headerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '28px',
    gap: '16px',
  },
  title: { margin: '6px 0 0', fontSize: '30px', fontWeight: 700, color: colors.green, letterSpacing: '-0.02em' },
  deleteButton: {
    background: colors.paper,
    color: colors.closed,
    border: `1px solid ${colors.closed}`,
    padding: '9px 16px',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: 600,
    fontFamily: mono,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '16px',
    marginBottom: '28px',
  },
  card: {
    background: colors.paper,
    border: `1px solid ${colors.border}`,
    borderRadius: '4px',
    padding: '16px 18px',
    boxShadow: '2px 3px 0 rgba(28,43,34,0.06)',
  },
  cardLabel: {
    fontSize: '11px',
    fontWeight: 700,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    color: colors.inkSoft,
  },
  cardValue: { margin: '6px 0 0', fontSize: '15px', color: colors.ink },
  section: { marginTop: '28px', paddingTop: '24px', borderTop: `1px solid ${colors.border}` },
  sectionTitleRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' },
  sectionTitle: { margin: 0, fontSize: '19px', fontWeight: 700, color: colors.green, letterSpacing: '-0.01em' },
  stamp: {
    fontSize: '9px',
    lineHeight: 1.3,
    textAlign: 'center',
    textTransform: 'uppercase',
    color: colors.rust,
    border: `1.5px solid ${colors.rust}`,
    borderRadius: '50%',
    width: '46px',
    height: '46px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transform: 'rotate(-8deg)',
    letterSpacing: '0.02em',
  },
  description: {
    margin: '8px 0 0',
    padding: '16px 18px',
    background: colors.greenSoft,
    borderRadius: '4px',
    fontSize: '14px',
    lineHeight: 1.6,
    color: colors.ink,
  },
  emptyNote: { fontSize: '14px', color: colors.inkSoft },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    background: colors.paper,
    border: `1px solid ${colors.border}`,
    borderRadius: '4px',
  },
  th: {
    textAlign: 'left',
    fontSize: '11px',
    fontWeight: 700,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    color: colors.inkSoft,
    background: colors.greenSoft,
    padding: '12px 16px',
  },
  td: { padding: '12px 16px', fontSize: '14px', borderTop: `1px solid ${colors.border}` },
  day: { fontWeight: 700, color: colors.green },
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
    color: colors.inkSoft,
  },
  emptyMark: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    border: `2px solid ${colors.border}`,
    background: colors.greenSoft,
  },
  loading: {
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '14px',
    background: colors.bg,
    color: colors.inkSoft,
    fontSize: '14px',
    fontFamily: mono,
  },
  spinner: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    border: `3px solid ${colors.border}`,
    borderTopColor: colors.rust,
  },
};