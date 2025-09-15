import React from 'react';
import './AIComponents.css';


interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

const Settings: React.FC<SettingsProps> = ({ isOpen, onClose }) => {



  const handleClearAllData = () => {
    if (window.confirm('⚠️ WARNING: This will clear ALL your data including ideas, settings, and preferences. This action cannot be undone. Are you absolutely sure?')) {
      localStorage.clear();
      alert('All data has been cleared. The page will refresh.');
      window.location.reload();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <h2>Settings</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="settings-content">
          {/* Profile Section */}
          <div className="settings-section">
            <h3>Profile</h3>
            <div className="profile-settings">
              <div className="avatar-section">
                <div className="current-avatar">
                  <img 
                    src={localStorage.getItem('youtube-idea-hub-avatar') || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iODAiIHZpZXdCb3g9IjAgMCA4MCA4MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjgwIiBoZWlnaHQ9IjgwIiByeD0iNDAiIGZpbGw9IiNEN0Q3RDciLz4KPHBhdGggZD0iTTQwIDQyQzQ0LjQxODMgNDIgNDggMzguNDE4MyA0OCAzNEM0OCAyOS41ODE3IDQ0LjQxODMgMjYgNDAgMjZDMzUuNTgxNyAyNiAzMiAyOS41ODE3IDMyIDM0QzMyIDM4LjQxODMgMzUuNTgxNyA0MiA0MCA0MlpNNDAgNDZDMzQuNDc3MiA0NiAzMCA0MS41MjI4IDMwIDM2QzMwIDMwLjQ3NzIgMzQuNDc3MiAyNiA0MCAyNkM0NS41MjI4IDI2IDUwIDMwLjQ3NzIgNTAgMzZDNTAgNDEuNTIyOCA0NS41MjI4IDQ2IDQwIDQ2Wk00MCA1MEMzMi4yNjgxIDUwIDI2IDQzLjczMTkgMjYgMzZDMjYgMjguMjY4MSAzMi4yNjgxIDIzIDQwIDIzQzQ3LjczMTkgMjMgNTQgMjguMjY4MSA1NCAzNkM1NCA0My43MzE5IDQ3LjczMTkgNTAgNDAgNTBaIiBmaWxsPSIjOTk5OTk5Ii8+Cjwvc3ZnPgo='} 
                    alt="Profile Avatar" 
                    className="avatar-preview"
                  />
                </div>
                <div className="avatar-upload">
                  <input
                    type="file"
                    id="avatar-upload"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          const result = event.target?.result as string;
                          localStorage.setItem('youtube-idea-hub-avatar', result);
                          // Force re-render by updating state
                          const img = document.querySelector('.avatar-preview') as HTMLImageElement;
                          if (img) {
                            img.src = result;
                          }
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    style={{ display: 'none' }}
                  />
                  <label htmlFor="avatar-upload" className="upload-button">
                    📷 Upload Photo
                  </label>
                </div>
              </div>
              
              <div className="display-name-section">
                <label htmlFor="display-name">Display Name</label>
                <input
                  type="text"
                  id="display-name"
                  placeholder="Enter your display name"
                  defaultValue={localStorage.getItem('youtube-idea-hub-user-full-name') || localStorage.getItem('youtube-idea-hub-display-name') || ''}
                  onChange={(e) => {
                    const displayName = e.target.value;
                    localStorage.setItem('youtube-idea-hub-display-name', displayName);
                    // Also save to user metadata for the avatar dropdown
                    localStorage.setItem('youtube-idea-hub-user-full-name', displayName);
                  }}
                />
              </div>
            </div>
          </div>

          {/* Data Management Section */}
          <div className="settings-section">
            <h3>Data Management</h3>
            <p className="settings-description">
              Export your data or clear all stored information.
            </p>
            
            <div className="data-actions">
              <button 
                className="secondary-button"
                onClick={() => {
                  const data = {
                    ideas: JSON.parse(localStorage.getItem('youtube-idea-hub-ideas') || '[]'),
                    settings: {
                      theme: localStorage.getItem('youtube-idea-hub-theme')
                    }
                  };
                  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `youtube-idea-hub-backup-${new Date().toISOString().split('T')[0]}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
              >
                Export All Data
              </button>
              
              <button 
                className="danger-button"
                onClick={handleClearAllData}
              >
                Clear All Data
              </button>
            </div>
          </div>

          {/* About Section */}
          <div className="settings-section">
            <h3>About</h3>
            <div className="about-info">
              <p><strong>Version:</strong> 2.0.1</p>
              <p><strong>Features:</strong> Idea Management, AI Analysis</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
