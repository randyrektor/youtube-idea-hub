import React, { useState } from 'react';
import { Idea, LiftLevel, ContentType } from '../types';
import { ComputedScore } from '../services/aiScoringService';

interface IdeaCardProps {
  idea: Idea;
  onStatusChange: (id: string, status: Idea['status']) => void;
  onUpdateIdea?: (id: string, updates: Partial<Idea>) => void;
  aiScore?: ComputedScore;
  isLoadingScore?: boolean;
  onGenerateTitleSuggestions?: (idea: Idea, event: React.MouseEvent) => Promise<void>;
  showTitleSuggestions?: boolean;
}

export const IdeaCard: React.FC<IdeaCardProps> = ({ 
  idea, 
  onStatusChange, 
  onUpdateIdea, 
  aiScore,
  isLoadingScore = false,
  onGenerateTitleSuggestions,
  showTitleSuggestions
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditingTags, setIsEditingTags] = useState(false);

  const getStatusColor = (status: Idea['status']) => {
    switch (status) {
      case 'idea': return '#2196f3';
      case 'in-progress': return '#ff9800';
      case 'ready': return '#4caf50';
    }
  };

  const liftLevelOptions: LiftLevel[] = ['Low Lift', 'Mid Lift', 'Huge Lift'];
  const contentTypeOptions: ContentType[] = ['Other', 'Makeover/Transform', 'Challenge/Competition', 'Reaction/Commentary', 'Game/Quiz', 'Tier List/Debate', 'Repeatable Segment', 'Nostalgia/Culture/Trend', 'Build/Tutorial', 'Review/Comparison'];

  const handleLiftLevelChange = (liftLevel: LiftLevel) => {
    if (onUpdateIdea) {
      onUpdateIdea(idea.id, { liftLevel });
    }
  };

  const handleContentTypeChange = (contentType: ContentType) => {
    if (onUpdateIdea) {
      onUpdateIdea(idea.id, { contentType });
    }
  };

  const handleGenerateTitleSuggestions = async (event: React.MouseEvent) => {
    if (onGenerateTitleSuggestions) {
      await onGenerateTitleSuggestions(idea, event);
    }
  };

  const renderTagEditor = () => {
    return (
      <div className="tag-editor">
        <div className="tag-category">
          <label className="tag-label">Lift Level:</label>
          <select 
            value={idea.liftLevel || ''} 
            onChange={(e) => handleLiftLevelChange(e.target.value as LiftLevel)}
            className="tag-select"
          >
            <option value="">Select Lift Level</option>
            {liftLevelOptions.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </div>
        
        <div className="tag-category">
          <label className="tag-label">Content Type:</label>
          <select 
            value={idea.contentType || ''} 
            onChange={(e) => handleContentTypeChange(e.target.value as ContentType)}
            className="tag-select"
          >
            <option value="">Select Content Type</option>
            {contentTypeOptions.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </div>
        
        <button 
          className="tag-editor-close"
          onClick={() => setIsEditingTags(false)}
        >
          ✓ Done
        </button>
      </div>
    );
  };

  const renderTags = () => {
    const displayTags = [];
    if (idea.liftLevel) displayTags.push(idea.liftLevel);
    if (idea.contentType) displayTags.push(idea.contentType);
    
    const getLiftTagClass = (liftLevel: string) => {
      if (liftLevel === 'Low Lift') return 'lift-tag low-lift';
      if (liftLevel === 'Mid Lift') return 'lift-tag mid-lift';
      if (liftLevel === 'Huge Lift') return 'lift-tag huge-lift';
      return 'lift-tag';
    };
    

    
    return (
      <div className="card-tags" onClick={() => setIsEditingTags(true)}>
        {displayTags.length > 0 ? (
          displayTags.map(tag => (
            <span 
              key={tag} 
              className={tag.includes('Lift') ? getLiftTagClass(tag) : 'type-tag'}
            >
              {tag}
            </span>
          ))
        ) : (
          <span className="tag-placeholder">Click to add tags</span>
        )}
      </div>
    );
  };

  return (
    <div className={`idea-card ${showTitleSuggestions ? 'suggestions-active-card' : ''}`} style={{ position: 'relative' }}>
      <div className="card-header">
        <div className="title-container">
          <h4 className="card-title">{idea.title}</h4>
          {/* Title Suggestions Button */}
          <button 
            className="title-suggestion-btn"
            onClick={handleGenerateTitleSuggestions}
            title="Generate title suggestions"
          >
            ✦
          </button>
        </div>
        <div className="card-actions">
          <button 
            className="expand-btn"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? '−' : '+'}
          </button>
        </div>
      </div>

      {/* AI Score Display - positioned relative to the idea card */}
      {isLoadingScore ? (
        <div 
          className="ai-score-loading-spinner"
          title="Calculating AI score..."
        />
      ) : aiScore ? (
        <div 
          className="ai-score-badge completed-score"
          style={{ 
            position: 'absolute',
            bottom: '8px',
            right: '8px',
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            background: 'transparent',
            border: `2px solid ${aiScore.color}`,
            color: aiScore.color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 'bold',
            fontSize: '12px',
            zIndex: 1000
          }}
          title={`AI Score: ${aiScore.totalScore}/100\n\nBreakdown:\nTopic Momentum: ${aiScore.breakdown.topicMomentum}\nChannel Fit: ${aiScore.breakdown.channelFit}\nCTR Potential: ${aiScore.breakdown.ctrPotential}\nClarity/Scope: ${aiScore.breakdown.clarityScope}\nNovelty/Angle: ${aiScore.breakdown.noveltyAngle}\nFeasibility: ${aiScore.breakdown.feasibility}\n\nNotes: ${aiScore.breakdown.notes}`}
        >
          {aiScore.totalScore}
        </div>
      ) : null}

      {isExpanded && (
        <div className="card-content">
          <p className="card-description">{idea.description}</p>
          
          {idea.thumbnail && (
            <div className="thumbnail-preview">
              <img src={idea.thumbnail} alt="Thumbnail idea" />
            </div>
          )}

          {idea.script && (
            <div className="script-preview">
              <h5>Script Notes:</h5>
              <p>{idea.script}</p>
            </div>
          )}

          {isEditingTags ? renderTagEditor() : renderTags()}

          <div className="status-controls">
            <select
              value={idea.status}
              onChange={(e) => onStatusChange(idea.id, e.target.value as Idea['status'])}
            >
              <option value="idea">New Idea</option>
              <option value="in-progress">In Progress</option>
              <option value="ready">Ready for Notion</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
};
