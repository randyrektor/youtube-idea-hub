import React, { useState } from 'react';
import aiService from '../services/aiService';
import { isAIConfigured } from '../config/ai';

interface AIIdeaGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
  onAddIdeas: (ideas: any[]) => void;
  existingIdeas: any[];
}

interface GeneratedIdea {
  title: string;
  description: string;
  type: string;
  lift: string;
  aiScore?: number;
}

const AIIdeaGenerator: React.FC<AIIdeaGeneratorProps> = ({
  isOpen,
  onClose,
  onAddIdeas,
  existingIdeas
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedIdeas, setGeneratedIdeas] = useState<GeneratedIdea[]>([]);
  const [ideaPrompt, setIdeaPrompt] = useState('');
  const [channelFocus, setChannelFocus] = useState('');
  const [ideaCount, setIdeaCount] = useState(3);
  const [error, setError] = useState<string | null>(null);
  const [selectedIdeas, setSelectedIdeas] = useState<Set<number>>(new Set());

  if (!isOpen) return null;

  // Check if AI is configured
  if (!isAIConfigured()) {
    return (
      <div className="modal-overlay">
        <div className="modal">
          <div className="modal-header">
            <h2>🤖 AI Idea Generator</h2>
            <button className="close-btn" onClick={onClose}>×</button>
          </div>
          <div className="ai-setup-required">
            <h3>AI Features Not Configured</h3>
            <p>To use AI idea generation, you need to configure your OpenAI API key.</p>
            <div className="setup-steps">
              <h4>Setup Steps:</h4>
              <ol>
                <li>Get an API key from <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer">OpenAI</a></li>
                <li>Create a <code>.env.local</code> file in your frontend directory</li>
                <li>Add: <code>REACT_APP_OPENAI_API_KEY=your_api_key_here</code></li>
                <li>Restart your development server</li>
              </ol>
            </div>
            <button className="submit-btn" onClick={onClose}>
              Got it
            </button>
          </div>
        </div>
      </div>
    );
  }

  const generateIdeas = async () => {
    if (!ideaPrompt.trim()) {
      setError('Please describe what kind of ideas you want to generate.');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setGeneratedIdeas([]);
    setSelectedIdeas(new Set());

    try {
      console.log(`🚀 Generating ${ideaCount} ideas with prompt: "${ideaPrompt}"`);
      const ideas = await aiService.generateNewIdeas(existingIdeas, ideaPrompt, channelFocus, ideaCount);
      console.log(`✅ Generated ${ideas.length} ideas successfully`);
      setGeneratedIdeas(ideas);
    } catch (error) {
      console.error('❌ Error generating ideas:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setError(`Failed to generate ideas: ${errorMessage}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleIdeaSelection = (index: number) => {
    const newSelected = new Set(selectedIdeas);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedIdeas(newSelected);
  };

  const addSelectedIdeas = () => {
          const ideasToAdd = Array.from(selectedIdeas).map(index => ({
        id: Date.now().toString() + index,
        title: generatedIdeas[index].title,
        description: generatedIdeas[index].description,
        thumbnail: '',
        script: '',
        lift: generatedIdeas[index].lift,
        type: generatedIdeas[index].type,
        owners: [],
        tags: [
          generatedIdeas[index].lift + ' Lift',
          generatedIdeas[index].type,
          'AI Generated'
        ],
        status: 'idea',
        createdAt: new Date(),
        aiGenerated: true,
        aiScore: generatedIdeas[index].aiScore
      }));

    onAddIdeas(ideasToAdd);
    onClose();
  };



  return (
    <div className="modal-overlay">
      <div className="modal ai-idea-generator">
        <div className="modal-header">
          <h2>🤖 AI Idea Generator</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="modal-content">
          {error && (
            <div className="ai-error">
              <span>⚠️ {error}</span>
              <button onClick={() => setError(null)}>×</button>
            </div>
          )}

          {/* Configuration Section */}
          <div className="generator-config">
            <div className="form-group">
              <label htmlFor="ideaPrompt">Video Concept</label>
              <textarea
                id="ideaPrompt"
                value={ideaPrompt}
                onChange={(e) => setIdeaPrompt(e.target.value)}
                placeholder="e.g., I want to create content about building apps with unusual or challenging technologies, like 1-star NPM packages or outdated frameworks"
                rows={3}
              />
              <small>Describe the specific type of ideas you want to generate</small>
            </div>

            <div className="form-group">
              <label htmlFor="channelFocus">Channel Focus (Optional)</label>
              <input
                id="channelFocus"
                type="text"
                value={channelFocus}
                onChange={(e) => setChannelFocus(e.target.value)}
                placeholder="e.g., Programming tutorials, Tech reviews, Gaming content"
              />
              <small>Additional context about your channel's style and audience</small>
            </div>

            <div className="form-group">
              <label htmlFor="ideaCount">Number of Ideas</label>
              <select
                id="ideaCount"
                value={ideaCount}
                onChange={(e) => setIdeaCount(Number(e.target.value))}
              >
                <option value={3}>3 ideas</option>
                <option value={5}>5 ideas</option>
                <option value={7}>7 ideas</option>
                <option value={10}>10 ideas</option>
              </select>
            </div>

            <button
              className="generate-btn"
              onClick={generateIdeas}
              disabled={isGenerating || !ideaPrompt.trim()}
            >
              {isGenerating ? '🤖 Generating...' : '✨ Generate AI Ideas'}
            </button>
          </div>

          {/* Generated Ideas Display */}
          {generatedIdeas.length > 0 && (
            <div className="generated-ideas">
              <div className="ideas-header">
                <h3>🎯 AI-Generated Ideas</h3>
                <div className="selection-info">
                  {selectedIdeas.size} of {generatedIdeas.length} selected
                </div>
              </div>

              <div className="ideas-grid">
                {generatedIdeas.map((idea, index) => {
                  return (
                    <div
                      key={index}
                      className={`idea-card ${selectedIdeas.has(index) ? 'selected' : ''}`}
                      onClick={() => toggleIdeaSelection(index)}
                    >
                    <div className="idea-header">
                      <h4>{idea.title}</h4>
                      <div className="idea-meta">
                        <span className={`tag lift-tag ${idea.lift.toLowerCase()}-lift`}>
                          {idea.lift} Lift
                        </span>
                        <span className="tag type-tag">{idea.type}</span>
                        <div 
                          className="ai-score-badge completed-score"
                          style={{
                            borderColor: (idea.aiScore || 0) >= 80 ? '#4caf50' : 
                                         (idea.aiScore || 0) >= 60 ? '#ff9800' : '#f44336',
                            border: `2px solid ${(idea.aiScore || 0) >= 80 ? '#4caf50' : 
                                                 (idea.aiScore || 0) >= 60 ? '#ff9800' : '#f44336'}`
                          }}
                        >
                          {idea.aiScore || 'N/A'}
                        </div>
                      </div>
                    </div>

                    <p className="idea-description">{idea.description}</p>

                    <div className="selection-indicator">
                      {selectedIdeas.has(index) ? '✓ Selected' : 'Click to select'}
                    </div>
                  </div>
                );
                })}
              </div>

              <div className="ideas-actions">
                <button
                  className="select-all-btn"
                  onClick={() => {
                    if (selectedIdeas.size === generatedIdeas.length) {
                      setSelectedIdeas(new Set());
                    } else {
                      setSelectedIdeas(new Set(generatedIdeas.map((_, index) => index)));
                    }
                  }}
                >
                  {selectedIdeas.size === generatedIdeas.length ? 'Deselect All' : 'Select All'}
                </button>
                
                <button
                  className="add-selected-btn"
                  onClick={addSelectedIdeas}
                  disabled={selectedIdeas.size === 0}
                >
                  ➕ Add Selected Ideas ({selectedIdeas.size})
                </button>
              </div>
            </div>
          )}


        </div>
      </div>
    </div>
  );
};

export default AIIdeaGenerator;
