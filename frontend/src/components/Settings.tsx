import React, { useState, useEffect } from 'react';
import './AIComponents.css';


interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

interface AIConfig {
  apiKey: string;
  isConfigured: boolean;
  keySource: 'file' | 'manual' | 'none' | 'backend';
  filePath?: string;
}

const Settings: React.FC<SettingsProps> = ({ isOpen, onClose }) => {
  const [aiConfig, setAiConfig] = useState<AIConfig>({
    apiKey: '',
    isConfigured: true,
    keySource: 'backend'
  });

  useEffect(() => {
    if (isOpen) {
      // Load current AI configuration
      const savedConfig = localStorage.getItem('youtube-idea-hub-ai-config');
      if (savedConfig) {
        try {
          const config = JSON.parse(savedConfig);
          setAiConfig(config);
        } catch (error) {
          // Silently handle parse errors
        }
      }
    }
  }, [isOpen]);

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
          {/* AI Configuration Section */}
          <div className="settings-section">
            <div className="section-header-with-status">
              <h3>AI Configuration</h3>
              {/* Status Overview */}
              <div className="ai-status-overview">
                <div className="status-badge configured">
                  <span className="status-icon">✓</span>
                  <span>AI Configured (Backend)</span>
                </div>
              </div>
            </div>
            
            <div className="ai-setup-interface">
              <p className="setup-description">
                AI features are now configured and managed securely on the backend server.
              </p>
              

              
              <div className="security-notice">
                <h4>🔒 Security Notice</h4>
                <p>Your OpenAI API key is securely stored on the backend server and is not accessible from the frontend. This ensures your API key remains private and secure.</p>
                
                <div className="backend-setup">
                  <h5>Backend Configuration:</h5>
                  <ol>
                    <li>API key is stored in environment variables</li>
                    <li>Rate limiting is enabled per user</li>
                    <li>Usage tracking for cost monitoring</li>
                    <li>Secure authentication required for all AI features</li>
                  </ol>
                </div>
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
                      theme: localStorage.getItem('youtube-idea-hub-theme'),
                      aiConfigured: aiConfig.isConfigured
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
              <p><strong>Version:</strong> 1.0.0</p>
              <p><strong>Features:</strong> Idea Management, AI Analysis, Notion Export</p>
              <p><strong>AI Powered by:</strong> OpenAI GPT-4</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
