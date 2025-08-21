import React, { useEffect, useState } from 'react';
import { IdeaCard } from './IdeaCard';
import { Idea } from '../types';
import { scoreAllIdeasEnhancedV2, ComputedScore } from '../services/aiScoringService';

interface IdeaBoardProps {
  ideas: Idea[];
  onStatusChange: (id: string, status: Idea['status']) => void;
  onUpdateIdea?: (id: string, updates: Partial<Idea>) => void;
  onAddIdea?: (idea: Idea) => void;
  onGenerateTitleSuggestions?: (idea: Idea, event: React.MouseEvent) => Promise<void>;
  showTitleSuggestionsModal?: boolean;
  selectedIdeaId?: string | null;
}

export const IdeaBoard: React.FC<IdeaBoardProps> = ({ 
  ideas, 
  onStatusChange, 
  onUpdateIdea,
  onAddIdea,
  onGenerateTitleSuggestions,
  showTitleSuggestionsModal,
  selectedIdeaId
}) => {

  
  const [aiScores, setAiScores] = useState<Map<string, ComputedScore>>(new Map());
  const [isLoadingScores, setIsLoadingScores] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickAddTitle, setQuickAddTitle] = useState('');
  const [quickAddDescription, setQuickAddDescription] = useState('');

  // Calculate AI scores for all ideas on page load - FAST SYNC VERSION
  useEffect(() => {
    if (ideas.length > 0) {
      setIsLoadingScores(true);
      // Use NEW enhanced scoring function to avoid caching issues
      const scores = scoreAllIdeasEnhancedV2(ideas);
      
      // Update the ideas with the new scores
      ideas.forEach(idea => {
        const score = scores.get(idea.id);
        if (score) {
          idea.aiScore = score.totalScore;
        }
      });
      
      setAiScores(scores);
      setIsLoadingScores(false);
    } else {
      // No ideas, so no loading needed
      setIsLoadingScores(false);
      setAiScores(new Map());
    }
  }, [ideas]);

  const handleQuickAddSubmit = () => {
    if (quickAddTitle.trim()) {
      // Create new idea with 'idea' status
      const newIdea: Idea = {
        id: Date.now().toString(),
        title: quickAddTitle.trim(),
        description: quickAddDescription.trim(),
        thumbnail: '',
        script: '',
        tags: [],
        status: 'idea' as const,
        createdAt: new Date(),
        liftLevel: undefined,
        contentType: undefined,
        aiScore: undefined
      };
      
      // Add the new idea through the parent component
      if (onAddIdea) {
        onAddIdea(newIdea);
        setQuickAddTitle('');
        setQuickAddDescription('');
        setShowQuickAdd(false);
      }
    }
  };

  const columns = [
    { key: 'idea', title: ' New Ideas', className: 'new-ideas' },
    { key: 'in-progress', title: '🚧 In Progress', className: 'in-progress' },
    { key: 'ready', title: '✅ Ready for Notion', className: 'ready' }
  ];

  return (
    <div className="idea-board">

      {columns.map(column => (
        <div 
          key={column.key} 
          className={`board-column ${showTitleSuggestionsModal ? 'column-slide-right' : ''}`}
        >
          <h3 className={`column-title ${column.className}`}>
            {column.title}
          </h3>
          <div className="column-content">
            {/* Lofi card for quick add - only show in New Ideas column */}
            {column.key === 'idea' && (
              <>
                {!showQuickAdd ? (
                  <div className="lofi-add-card" onClick={() => setShowQuickAdd(true)}>
                    <div className="lofi-add-icon">+</div>
                    <div className="lofi-add-text">Add new idea...</div>
                  </div>
                ) : (
                  <div className="lofi-add-form">
                    <input
                      type="text"
                      placeholder="Enter idea title..."
                      value={quickAddTitle}
                      onChange={(e) => setQuickAddTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && quickAddTitle.trim()) {
                          handleQuickAddSubmit();
                        } else if (e.key === 'Escape') {
                          setShowQuickAdd(false);
                          setQuickAddTitle('');
                          setQuickAddDescription('');
                        }
                      }}
                      className="lofi-title-input"
                      autoFocus
                    />
                    <textarea
                      placeholder="Description (optional)"
                      value={quickAddDescription}
                      onChange={(e) => setQuickAddDescription(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                          setShowQuickAdd(false);
                          setQuickAddTitle('');
                          setQuickAddDescription('');
                        }
                      }}
                      className="lofi-description-input"
                      rows={2}
                    />
                    <div className="lofi-form-actions">
                      <button 
                        className="lofi-submit-btn"
                        onClick={handleQuickAddSubmit}
                        disabled={!quickAddTitle.trim()}
                      >
                        Add Idea
                      </button>
                      <button 
                        className="lofi-cancel-btn"
                        onClick={() => {
                          setShowQuickAdd(false);
                          setQuickAddTitle('');
                          setQuickAddDescription('');
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
            
            {ideas
              .filter(idea => idea.status === column.key)
              .map(idea => (
                <IdeaCard
                  key={idea.id}
                  idea={idea}
                  onStatusChange={onStatusChange}
                  onUpdateIdea={onUpdateIdea}
                  aiScore={aiScores.get(idea.id)}
                  isLoadingScore={isLoadingScores}
                  onGenerateTitleSuggestions={onGenerateTitleSuggestions}
                  showTitleSuggestions={selectedIdeaId === idea.id}
                />
              ))}
          </div>
        </div>
      ))}
    </div>
  );
};