import React, { useState, useEffect } from 'react';
import NewRequestsDashboard from './new_requests';
import PracticeDashboard from './practices';
import RejectedDashboard from './rejected';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('new-requests');
  const [adminName, setAdminName] = useState('Admin');

  useEffect(() => {
    // Retrieves the admin's name or object payload from localstorage
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        setAdminName(typeof parsed === 'object' ? (parsed.name || parsed.username || 'Admin') : storedUser);
      } catch (e) {
        setAdminName(storedUser);
      }
    }
  }, []);

  const handleLogout = () => {
    if (window.confirm("Are you sure you want to sign out of Rihanyo?")) {
      localStorage.removeItem('user');
      // Redirects user back to root domain or login portal view
      window.location.href = '/';
    }
  };

  // Component Router Mapping
  const renderActiveComponent = () => {
    switch (activeTab) {
      case 'new-requests':
        return <NewRequestsDashboard />;
      case 'practice':
        return <PracticeDashboard />;
      case 'rejected':
        return <RejectedDashboard />;
      default:
        return <NewRequestsDashboard />;
    }
  };

  return (
    <div style={styles.masterWrapper}>
      {/* Left Application Control Sidebar */}
      <aside style={styles.sidebar}>
        <div style={styles.brandGroup}>
          <span style={styles.siteName}>Rihanyo</span>
          <span style={styles.panelTitle}>Admin Portal</span>
        </div>

        {/* User Identity Context Card */}
        <div style={styles.profileBox}>
          <span style={styles.avatarCircle}>
            {adminName.charAt(0).toUpperCase()}
          </span>
          <div style={styles.identityTextGroup}>
            <span style={styles.greetingText}>Active Session</span>
            <span style={styles.profileName} title={adminName}>{adminName}</span>
          </div>
        </div>

        <div style={styles.sidebarSpacer} />

        {/* Logout Control Action Button */}
        <button onClick={handleLogout} style={styles.logoutButton}>
          Logout
        </button>
      </aside>

      {/* Main Framework Layout Workspace Container */}
      <div style={styles.contentContainer}>
        {/* Top Tab Switcher Row bar */}
        <header style={styles.topHeader}>
          <nav style={styles.navRow}>
            <button
              onClick={() => setActiveTab('new-requests')}
              style={{
                ...styles.navButton,
                backgroundColor: activeTab === 'new-requests' ? '#e3f2fd' : 'transparent',
                color: activeTab === 'new-requests' ? '#0066cc' : '#445566',
                fontWeight: activeTab === 'new-requests' ? '600' : 'normal',
              }}
            >
              New Requests Inbox
            </button>
            <button
              onClick={() => setActiveTab('practice')}
              style={{
                ...styles.navButton,
                backgroundColor: activeTab === 'practice' ? '#e3f2fd' : 'transparent',
                color: activeTab === 'practice' ? '#0066cc' : '#445566',
                fontWeight: activeTab === 'practice' ? '600' : 'normal',
              }}
            >
              Practice Profiles
            </button>
            <button
              onClick={() => setActiveTab('rejected')}
              style={{
                ...styles.navButton,
                backgroundColor: activeTab === 'rejected' ? '#e3f2fd' : 'transparent',
                color: activeTab === 'rejected' ? '#0066cc' : '#445566',
                fontWeight: activeTab === 'rejected' ? '600' : 'normal',
              }}
            >
              Rejected Archives
            </button>
          </nav>
        </header>

        {/* Embedded Active Subcomponent Layer Layout View Area */}
        <main style={styles.viewWorkspace}>
          {renderActiveComponent()}
        </main>
      </div>
    </div>
  );
}

const styles = {
  masterWrapper: {
    display: 'flex',
    height: '100vh',
    width: '100vw',
    backgroundColor: '#fafbfc',
    overflow: 'hidden',
    fontFamily: 'Segoe UI, Arial, sans-serif',
  },
  sidebar: {
    width: '240px',
    backgroundColor: '#f4f8fc',
    borderRight: '1px solid #d2e3f7',
    display: 'flex',
    flexDirection: 'column',
    padding: '24px 18px',
    flexShrink: 0,
  },
  brandGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    marginBottom: '35px',
    paddingLeft: '6px',
  },
  siteName: {
    fontSize: '24px',
    fontWeight: '800',
    color: '#0066cc',
    letterSpacing: '0.5px',
  },
  panelTitle: {
    fontSize: '11px',
    fontWeight: '700',
    color: '#778899',
    textTransform: 'uppercase',
    letterSpacing: '0.8px',
  },
  profileBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    backgroundColor: '#fff',
    padding: '12px 14px',
    borderRadius: '6px',
    border: '1px solid #e2edf9',
    boxShadow: '0 2px 5px rgba(0, 68, 153, 0.01)',
  },
  avatarCircle: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    backgroundColor: '#0066cc',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
    fontSize: '15px',
    flexShrink: 0,
  },
  identityTextGroup: {
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  greetingText: {
    fontSize: '11px',
    color: '#778899',
  },
  profileName: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#223344',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  sidebarSpacer: {
    flex: 1,
  },
  logoutButton: {
    width: '100%',
    backgroundColor: 'transparent',
    color: '#c23934',
    border: '1px solid #ffcdd2',
    padding: '10px 14px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '13px',
    textAlign: 'center',
    transition: 'all 0.15s ease',
  },
  contentContainer: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  topHeader: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderBottom: '1px solid #d2e3f7',
    padding: '0 30px',
    height: '70px',
    flexShrink: 0,
    boxShadow: '0 2px 8px rgba(0, 68, 153, 0.02)',
  },
  navRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    height: '100%',
  },
  navButton: {
    border: 'none',
    padding: '10px 18px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'all 0.15s ease',
  },
  viewWorkspace: {
    flex: 1,
    width: '100%',
    overflow: 'auto',
    backgroundColor: '#fff',
  },
};