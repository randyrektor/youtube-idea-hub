import React, { useState } from 'react';
import { Idea } from '../types';

interface AddIdeaModalProps {
  onClose: () => void;
  onAdd: (idea: Omit<Idea, 'id' | 'createdAt'>) => void;
}

export const AddIdeaModal: React.FC<AddIdeaModalProps> = ({ onClose, onAdd }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    thumbnail: '',
    script: '',
    tags: '',
    status: 'idea' as const
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd({
      ...formData,
      tags: formData.tags.split(',').map(tag => tag.trim()).filter(Boolean)
    });
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h2>Add New YouTube Idea</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="idea-form">
          <div className="form-group">
            <label htmlFor="title">Video Title</label>
            <input
              id="title"
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              placeholder="Enter your video title idea..."
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              placeholder="Describe your video idea..."
              rows={3}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="thumbnail">Thumbnail URL</label>
            <input
              id="thumbnail"
              type="url"
              value={formData.thumbnail}
              onChange={(e) => setFormData({...formData, thumbnail: e.target.value})}
              placeholder="https://example.com/thumbnail.jpg"
            />
          </div>

          <div className="form-group">
            <label htmlFor="script">Script Notes</label>
            <textarea
              id="script"
              value={formData.script}
              onChange={(e) => setFormData({...formData, script: e.target.value})}
              placeholder="Brain dump your script ideas..."
              rows={4}
            />
          </div>

          <div className="form-group">
            <label htmlFor="tags">Tags (comma-separated)</label>
            <input
              id="tags"
              type="text"
              value={formData.tags}
              onChange={(e) => setFormData({...formData, tags: e.target.value})}
              placeholder="gaming, tutorial, review"
            />
          </div>

          <div className="form-actions">
            <button type="button" onClick={onClose} className="cancel-btn">
              Cancel
            </button>
            <button type="submit" className="submit-btn">
              Add Idea
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
