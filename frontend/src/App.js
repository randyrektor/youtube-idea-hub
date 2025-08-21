import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import './components/AIComponents.css';
import './aiScoreStyles.css';
import AIInsights from './components/AIInsights';
import AIIdeaGenerator from './components/AIIdeaGenerator';
import Settings from './components/Settings';
import Auth from './components/Auth';
import { generateFallbackTitles } from './services/titleGenerationService';
import { prefetchTitlesForIdeas, getAlternates } from './services/titleCacheService';
import { supabase, getIdeas, createIdea, updateIdea, deleteIdea } from './config/supabase';

function App() {
  const [ideas, setIdeas] = useState([]);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickAddTitle, setQuickAddTitle] = useState('');
  const [quickAddDescription, setQuickAddDescription] = useState('');
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [viewMode, setViewMode] = useState('board');
  const [theme, setTheme] = useState('light');

  // Score color: red (0-60), red-green gradient (61-100)
  const getScoreColor = (score, opacity = 1) => {
    let r, g, b;
    if (score <= 60) {
      r = 255;
      g = 0;
      b = 0;
    } else {
      const gradientProgress = (score - 60) / 40;
      r = Math.round(255 * (1 - gradientProgress));
      g = Math.round(255 * gradientProgress);
      b = 0;
    }
    const color = `rgba(${r}, ${g}, ${b}, ${opacity})`;
    return color;
  };

  const [showAIIdeaGenerator, setShowAIIdeaGenerator] = useState(false);
  const [ideasWithAI, setIdeasWithAI] = useState([]);
  const [showSettings, setShowSettings] = useState(false);

  // Authentication state
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  // Title suggestions state
  const [showTitleSuggestionsModal, setShowTitleSuggestionsModal] = useState(false);
  const [titleSuggestions, setTitleSuggestions] = useState([]);
  const [suggestionsFlyoutPos, setSuggestionsFlyoutPos] = useState(null);
  const [selectedIdeaId, setSelectedIdeaId] = useState(null);
  const [hasShownTitleSuggestions, setHasShownTitleSuggestions] = useState(false);
  const [isClosingModal, setIsClosingModal] = useState(false);

  // Close suggestions flyout
  const closeSuggestionsFlyout = () => {
    setIsClosingModal(true);
    setShowTitleSuggestionsModal(false);
    setSuggestionsFlyoutPos(null);
    setHasShownTitleSuggestions(false);
    if (window.flyoutScrollHandler) {
      window.removeEventListener('scroll', window.flyoutScrollHandler);
      window.flyoutScrollHandler = null;
    }
    if (window.flyoutResizeHandler) {
      window.removeEventListener('resize', window.flyoutResizeHandler);
      window.flyoutResizeHandler = null;
    }
    const boardEl = document.querySelector('.idea-board');
    if (boardEl) {
      const columns = boardEl.querySelectorAll('.board-column');
      columns.forEach(column => column.classList.remove('column-slide-right'));
    }
    const activeCard = document.querySelector('.idea-card.suggestions-active-card');
    if (activeCard) activeCard.classList.remove('suggestions-active-card');
    setTimeout(() => {
      setIsClosingModal(false);
    }, 200);
  };

  // Close on click outside
  useEffect(() => {
    if (!showTitleSuggestionsModal) return;
    const handleClickOutside = (event) => {
      const flyout = document.querySelector('.title-suggestions-flyout');
      if (flyout && !flyout.contains(event.target)) {
        closeSuggestionsFlyout();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showTitleSuggestionsModal]);

  // Filter and sort states
  const [selectedLift, setSelectedLift] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('created'); // 'created', 'lift', 'type'

  // Drag and drop state
  const [dragState, setDragState] = useState({
    isDragging: false,
    draggedIdea: null,
    dragOverColumn: null,
    dropIndex: null
  });

  // Load theme and initialize ideas
  useEffect(() => {
    const savedTheme = localStorage.getItem('youtube-idea-hub-theme') || 'light';
    setTheme(savedTheme);
    document.body.className = `theme-${savedTheme}`;
  }, []);

  // Load ideas from database when user is authenticated
  useEffect(() => {
    console.log('🔄 useEffect triggered - isAuthenticated:', isAuthenticated, 'user:', user ? `ID: ${user.id}` : 'null');
    if (isAuthenticated && user) {
      console.log('✅ Conditions met, loading ideas...');
      loadIdeasFromDatabase();
    } else {
      console.log('❌ Conditions not met for loading ideas');
    }
  }, [isAuthenticated, user]);

  // Load ideas from database
  const loadIdeasFromDatabase = async () => {
    try {
      console.log('🔄 Loading ideas from database for user:', user.id);
      const { data: ideas, error } = await getIdeas(user.id);
      
      if (error) {
        console.error('❌ Error loading ideas:', error);
        return;
      }
      
      console.log('📊 Raw ideas from database:', ideas);
      
      // Transform database format to app format
      const transformedIdeas = ideas.map(idea => ({
        id: idea.id,
        title: idea.title,
        description: idea.description || '',
        thumbnail: idea.thumbnail || '',
        script: idea.script || '',
        tags: idea.tags || [],
        status: idea.status || 'idea',
        aiScore: idea.ai_score || 0,
        createdAt: new Date(idea.created_at),
        updatedAt: new Date(idea.updated_at),
        liftLevel: idea.lift_level || 'Medium Lift',
        contentType: idea.content_type || 'Video'
      }));
      
      console.log('✨ Transformed ideas:', transformedIdeas);
      setIdeas(transformedIdeas);
    } catch (error) {
      console.error('💥 Exception loading ideas:', error);
    }
  };

  // Save idea to database
  const saveIdeaToDatabase = async (idea) => {
    try {
      const ideaData = {
        user_id: user.id,
        title: idea.title,
        description: idea.description || '',
        thumbnail: idea.thumbnail || '',
        script: idea.script || '',
        tags: idea.tags || [],
        status: idea.status || 'idea',
        ai_score: idea.aiScore || 0,
        lift_level: idea.liftLevel || 'Medium Lift',
        content_type: idea.contentType || 'Video'
      };

      if (idea.id && idea.id.length > 20) { // Database UUID
        // Update existing idea
        const { error } = await updateIdea(idea.id, ideaData);
        if (error) throw error;
      } else {
        // Create new idea
        const { data, error } = await createIdea(ideaData);
        if (error) throw error;
        return data[0];
      }
    } catch (error) {
      console.error('Error saving idea:', error);
    }
  };

  // Delete idea from database and local state
  const deleteIdeaFromDatabase = async (ideaId) => {
    try {
      const { error } = await deleteIdea(ideaId);
      if (error) throw error;
      
      // Remove from local state
      setIdeas(prevIdeas => prevIdeas.filter(idea => idea.id !== ideaId));
    } catch (error) {
      console.error('Error deleting idea:', error);
    }
  };

  // Handle authentication changes
  const handleAuthChange = (user) => {
    console.log('🔐 Auth change detected:', user ? `User ID: ${user.id}` : 'No user');
    setUser(user);
    setIsAuthenticated(!!user);
  };

  // Prefetch titles for visible ideas
  useEffect(() => {
    if (ideas.length > 0) {
      prefetchTitlesForIdeas(ideas);
    }
  }, [ideas]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showDropdown && !event.target.closest('.dropdown-container')) {
        setShowDropdown(false);
      }
      if (showUserDropdown && !event.target.closest('.user-avatar-container')) {
        setShowUserDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDropdown, showUserDropdown]);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('youtube-idea-hub-theme', newTheme);
    
    document.body.classList.remove(`theme-${theme}`);
    document.body.classList.add(`theme-${newTheme}`);
  };

  const addIdea = async (ideaData) => {
    const ideasToAdd = Array.isArray(ideaData) ? ideaData : [ideaData];
    const newIdeas = ideasToAdd.map(idea => ({
      ...idea,
      createdAt: new Date(),
      status: 'idea',
      liftLevel: idea.lift + ' Lift',
      contentType: idea.type,
      tags: idea.tags || []
    }));
    
    // Add to local state first for immediate UI feedback
    setIdeas(prevIdeas => [...prevIdeas, ...newIdeas]);
    
    // Save new ideas to database
    for (const idea of newIdeas) {
      try {
        const savedIdea = await saveIdeaToDatabase(idea);
        if (savedIdea) {
          // Update local state with database ID
          setIdeas(prevIdeas =>
            prevIdeas.map(existingIdea =>
              existingIdea.title === idea.title && !existingIdea.id?.startsWith('db_')
                ? { ...existingIdea, id: savedIdea.id }
                : existingIdea
            )
          );
        }
      } catch (error) {
        console.error('Error saving bulk imported idea:', error);
      }
    }
    
    try {
      // AI scoring
      const { isAIConfigured } = await import('./config/ai');
      if (isAIConfigured()) {
        const { default: aiService } = await import('./services/aiService');
        
        setIdeas(prevIdeas =>
          prevIdeas.map(idea =>
            newIdeas.some(newIdea => newIdea.title === idea.title)
              ? { ...idea, isScoring: true }
              : idea
          )
        );

        if (newIdeas.length > 1) {
          const scoredIdeas = await aiService.fastBatchScore(newIdeas);
          setIdeas(prevIdeas =>
            prevIdeas.map(idea => {
              const scoredIdea = scoredIdeas.find(scored => scored.title === idea.title);
              if (scoredIdea) {
                const updatedIdea = {
                  ...idea,
                  aiScore: scoredIdea.aiScore,
                  isScoring: false,
                  analyzedAt: scoredIdea.analyzedAt
                };
                // Save updated score to database
                saveIdeaToDatabase(updatedIdea);
                return updatedIdea;
              }
              return idea;
            })
          );
        } else {
          const analysis = await aiService.analyzeIdea(newIdeas[0], ideas);
          setIdeas(prevIdeas =>
            prevIdeas.map(idea =>
              idea.title === newIdeas[0].title
                ? {
                    ...idea,
                    aiScore: analysis.overallScore,
                    isScoring: false,
                    analyzedAt: new Date().toISOString()
                  }
                : idea
            )
          );
          
          // Save updated score to database
          const updatedIdea = ideas.find(idea => idea.title === newIdeas[0].title);
          if (updatedIdea) {
            saveIdeaToDatabase(updatedIdea);
          }
        }
      }
    } catch (error) {
      setIdeas(prevIdeas =>
        prevIdeas.map(idea =>
          newIdeas.some(newIdea => newIdea.title === idea.title)
            ? { ...idea, isScoring: false }
            : idea
        )
      );
      console.error('Error adding idea:', error);
    }
  };

  const updateIdeaStatus = async (id, status) => {
    // Update local state immediately for UI responsiveness
    setIdeas(ideas.map(idea =>
      idea.id === id ? { ...idea, status } : idea
    ));
    
    // Save to database
    const idea = ideas.find(i => i.id === id);
    if (idea) {
      await saveIdeaToDatabase({ ...idea, status });
    }
  };

  const updateIdea = async (id, updates) => {
    // Update local state immediately for UI responsiveness
    setIdeas(ideas.map(idea =>
      idea.id === id ? { ...idea, ...updates } : idea
    ));
    
    // Save to database
    const idea = ideas.find(i => i.id === id);
    if (idea) {
      await saveIdeaToDatabase({ ...idea, ...updates });
    }
  };

  // Quick add idea handler
  const handleQuickAddSubmit = async () => {
    if (quickAddTitle.trim()) {
      const newIdea = {
        title: quickAddTitle.trim(),
        description: quickAddDescription.trim(),
        thumbnail: '',
        script: '',
        tags: [],
        status: 'idea',
        createdAt: new Date(),
        liftLevel: 'Medium Lift',
        contentType: 'Video',
        aiScore: 0
      };
      
      // Add to local state first for immediate UI feedback
      setIdeas(prevIdeas => [...prevIdeas, newIdea]);
      
      // Save to database
      try {
        const savedIdea = await saveIdeaToDatabase(newIdea);
        if (savedIdea) {
          // Update local state with database ID
          setIdeas(prevIdeas =>
            prevIdeas.map(idea =>
              idea.title === newIdea.title && !idea.id?.startsWith('db_')
                ? { ...idea, id: savedIdea.id }
                : idea
            )
          );
        }
      } catch (error) {
        console.error('Error saving idea:', error);
      }
      
      setQuickAddTitle('');
      setQuickAddDescription('');
      setShowQuickAdd(false);
    }
  };

  // Score single idea with AI
  const scoreSingleIdeaWithAI = async (ideaId) => {
    try {
      const idea = ideas.find(i => i.id === ideaId);
      if (!idea) return;

      const { aiService } = await import('./services/aiService');
      if (aiService) {
        const result = await aiService.analyzeIdea(idea);
        if (result && result.aiScore !== undefined) {
          updateIdea(ideaId, {
            aiScore: result.aiScore,
            isScoring: false,
            analyzedAt: new Date().toISOString()
          });
        } else {
          throw new Error('Invalid scoring result');
        }
      } else {
        throw new Error('AI service not available');
      }
    } catch (error) {
      updateIdea(ideaId, { isScoring: false });
    }
  };

  // Drag and drop handlers
  const handleDragStart = (e, idea) => {
    if (!e.dataTransfer) {
      console.warn('DataTransfer not available, drag and drop may not work properly');
      return;
    }
    
    e.dataTransfer.setData('text/plain', idea.id);
    e.dataTransfer.effectAllowed = 'move';
    
    setDragState({
      isDragging: true,
      draggedIdea: idea,
      dragOverColumn: null
    });
    
    e.target.classList.add('dragging');
  };

  const handleDragEnd = (e) => {
    e.target.classList.remove('dragging');
    setDragState({
      isDragging: false,
      draggedIdea: null,
      dragOverColumn: null,
      dropIndex: null
    });
  };

  const handleDragOver = (e, targetStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    const columnElement = e.currentTarget;
    const columnRect = columnElement.getBoundingClientRect();
    const mouseY = e.clientY;
    const columnTop = columnRect.top;
    const cards = columnElement.querySelectorAll('.idea-card');
    
    let dropIndex = 0;
    if (cards.length === 0) {
      dropIndex = 0;
    } else {
      const relativeY = mouseY - columnTop;
      for (let i = 0; i < cards.length; i++) {
        const card = cards[i];
        const rect = card.getBoundingClientRect();
        const cardTop = rect.top - columnTop;
        const cardMiddle = cardTop + rect.height / 2;
        
        if (relativeY < cardMiddle) {
          dropIndex = i;
          break;
        }
        
        if (i === cards.length - 1 && relativeY > cardTop + rect.height) {
          dropIndex = i + 1;
        }
      }
    }
    
    setDragState(prev => ({
      ...prev,
      dragOverColumn: targetStatus,
      dropIndex: dropIndex
    }));
  };

  const handleDragEnter = (e, targetStatus) => {
    e.preventDefault();
    e.currentTarget.classList.add('drag-over');
  };

  const handleDragLeave = (e, targetStatus) => {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');
    
    setDragState(prev => ({
      ...prev,
      dragOverColumn: null,
      dropIndex: null
    }));
  };

  const handleDrop = async (e, targetStatus) => {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');
    
    if (!e.dataTransfer) {
      console.warn('DataTransfer not available, drop operation cancelled');
      return;
    }
    
    const ideaId = e.dataTransfer.getData('text/plain');
    const draggedIdea = ideas.find(idea => idea.id === ideaId);
    
    if (draggedIdea && dragState.dropIndex !== null) {
      const newIdeas = [...ideas];
      const draggedIdeaIndex = newIdeas.findIndex(idea => idea.id === ideaId);
      
      if (draggedIdeaIndex !== -1) {
        const [removedIdea] = newIdeas.splice(draggedIdeaIndex, 1);
        
        if (removedIdea.status !== targetStatus) {
          removedIdea.status = targetStatus;
        }
        
        const targetColumnIdeas = newIdeas.filter(idea => idea.status === targetStatus);
        const otherIdeas = newIdeas.filter(idea => idea.status !== targetStatus);
        
        const insertIndex = Math.min(dragState.dropIndex, targetColumnIdeas.length);
        targetColumnIdeas.splice(insertIndex, 0, removedIdea);
        
        const finalIdeas = [];
        const statusOrder = ['idea', 'in-progress', 'ready'];
        
        statusOrder.forEach(status => {
          if (status === targetStatus) {
            finalIdeas.push(...targetColumnIdeas);
          } else {
            finalIdeas.push(...otherIdeas.filter(idea => idea.status === status));
          }
        });
        
        setIdeas(finalIdeas);
        
        // Save status changes to database
        if (removedIdea.status !== targetStatus) {
          try {
            await saveIdeaToDatabase(removedIdea);
          } catch (error) {
            console.error('Error saving status change:', error);
          }
        }
      }
    }
    
    setDragState({
      isDragging: false,
      draggedIdea: null,
      dragOverColumn: null,
      dropIndex: null
    });
  };

  // Keyboard drag and drop
  const handleKeyDown = (e, idea, action) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (action === 'drag') {
        const dragEvent = new Event('dragstart', { bubbles: true });
        e.target.dispatchEvent(dragEvent);
      }
    }
  };

  const updateIdeaTitle = async (id, title, newScore = null) => {
    // Update local state immediately for UI responsiveness
    setIdeas(ideas.map(idea =>
      idea.id === id ? {
        ...idea,
        title,
        ...(newScore && { aiScore: newScore.totalScore })
      } : idea
    ));
    
    // Save to database
    const idea = ideas.find(i => i.id === id);
    if (idea) {
      await saveIdeaToDatabase({ ...idea, title, ...(newScore && { aiScore: newScore.totalScore }) });
    }
  };

  const updateIdeaTags = async (id, tags) => {
    // Update local state immediately for UI responsiveness
    setIdeas(ideas.map(idea =>
      idea.id === id ? { ...idea, tags } : idea
    ));
    
    // Save to database
    const idea = ideas.find(i => i.id === id);
    if (idea) {
      await saveIdeaToDatabase({ ...idea, tags });
    }
  };

  const bulkImportIdeas = async (text) => {
    const lines = text.split('\n').filter(line => line.trim());
    const newIdeas = lines.map((line, index) => {
      const originalTitle = line.trim();
      const isTooLong = originalTitle.length > 100;
      const truncatedTitle = isTooLong ? originalTitle.substring(0, 100) + '...' : originalTitle;
      
      return {
        id: (Date.now() + index).toString(),
        title: truncatedTitle,
        description: isTooLong ? `Original title was too long: ${originalTitle}` : '',
        thumbnail: '',
        script: '',
        liftLevel: 'Mid Lift',
        contentType: 'Other',
        tags: [],
        status: 'idea',
        createdAt: new Date()
      };
    });
    
    const tooLongCount = newIdeas.filter(idea => idea.description.includes('Original title was too long')).length;
    if (tooLongCount > 0) {
      alert(`${tooLongCount} title(s) were too long and have been truncated to 100 characters. Check the description field for the original titles.`);
    }
    
    setIdeas(prevIdeas => [...prevIdeas, ...newIdeas]);
    
    try {
      const { isAIConfigured } = await import('./config/ai');
      if (isAIConfigured()) {
        const { default: aiService } = await import('./services/aiService');
        
        setIdeas(prevIdeas =>
          prevIdeas.map(idea =>
            newIdeas.some(newIdea => newIdea.id === idea.id)
              ? { ...idea, isScoring: true }
              : idea
          )
        );
        
        for (const idea of newIdeas) {
          try {
            const analysis = await aiService.analyzeIdea(idea, ideas);
            
            setIdeas(prevIdeas =>
              prevIdeas.map(existingIdea =>
                existingIdea.id === idea.id
                  ? { ...existingIdea, aiScore: analysis.overallScore, isScoring: false }
                  : existingIdea
              )
            );
          } catch (error) {
            setIdeas(prevIdeas =>
              prevIdeas.map(existingIdea =>
                existingIdea.id === idea.id
                  ? { ...existingIdea, isScoring: false }
                  : existingIdea
              )
            );
          }
        }
      }
    } catch (error) {
      setIdeas(prevIdeas => 
        prevIdeas.map(idea => 
          newIdeas.some(newIdea => newIdea.id === idea.id) 
            ? { ...idea, isScoring: false } 
            : idea
        )
      );
    }
  };

  const getIdeasByStatus = (status) => {
    const filteredIdeas = getFilteredAndSortedIdeas();
    return filteredIdeas.filter(idea => idea.status === status);
  };

  // Generate AI title suggestions
  const generateTitleSuggestions = async (currentTitle, description, type, lift) => {
    try {
      const { default: aiService } = await import('./services/aiService');
      const { isAIConfigured } = await import('./config/ai');
      
      if (!isAIConfigured()) {
        const { generateFallbackTitles } = await import('./services/titleGenerationService');
        return generateFallbackTitles(currentTitle, description, type, lift);
      }
      
      const idea = { title: currentTitle, description, type, lift };
      const suggestions = await aiService.generateTitleVariations(idea, 5);
      return suggestions;
    } catch (error) {
      console.error('Error generating AI titles:', error);
      const { generateFallbackTitles } = await import('./services/titleGenerationService');
      return generateFallbackTitles(currentTitle, description, type, lift);
    }
  };

  // Generate scored title suggestions
  const generateScoredTitleSuggestions = async (originalIdea) => {
    try {
      try {
        const context = `Web development, JavaScript, modern programming - ${originalIdea.contentType || 'friendly and educational'}`;
        let aiTitles = await getAlternates(originalIdea.title, context);
        
        if (aiTitles.length === 0) {
          const { default: aiService } = await import('./services/aiService');
          aiTitles = await aiService.generateTitleVariations(originalIdea, 5);
        }
        
        const { default: aiService } = await import('./services/aiService');
        
        const scoredSuggestions = [];
        for (const title of aiTitles) {
          try {
            const tempIdea = {
              ...originalIdea,
              title: title,
              type: originalIdea.contentType || 'Other',
              lift: originalIdea.liftLevel || 'Mid'
            };
            
            const analysis = await aiService.analyzeIdea(tempIdea, ideas);
            
            scoredSuggestions.push({
              title: title,
              score: {
                totalScore: analysis.overallScore,
                breakdown: analysis.breakdown,
                color: analysis.overallScore >= 80 ? '#4caf50' : 
                       analysis.overallScore >= 60 ? '#ff9800' : '#f44336',
                isOptimistic: false
              }
            });
          } catch (error) {
            console.error('Error scoring title suggestion:', error);
            scoredSuggestions.push({ title, score: null });
          }
        }
        
        scoredSuggestions.sort((a, b) => (b.score?.totalScore || 0) - (a.score?.totalScore || 0));
        
        setTitleSuggestions(scoredSuggestions);
        
        return scoredSuggestions;
      } catch (error) {
        console.error('Error generating AI titles:', error);
        setTitleSuggestions([]);
        return [];
      }
    } catch (error) {
      console.error('Error generating scored titles:', error);
      setTitleSuggestions([]);
      return [];
    }
  };



  const getIdeasByCategory = () => {
    const categories = {
      'Makeovers / Transformations': [],
      'Challenges / Competitions': [],
      'Reaction / Commentary': [],
      'Games / Quizzes': [],
      'Tier Lists / Debates': [],
      'Repeatable Segments': [],
      'Nostalgia / Culture / Trends': [],
      'Build / Tutorial': [],
      'Reviews / Comparisons': [],
      'Other': []
    };

    ideas.forEach(idea => {
      const type = idea.contentType || 'Other';
      let category = 'Other';
      
      if (type.includes('Makeover') || type.includes('Transform')) {
        category = 'Makeovers / Transformations';
      } else if (type.includes('Challenge') || type.includes('Competition')) {
        category = 'Challenges / Competitions';
      } else if (type.includes('Reaction') || type.includes('Commentary')) {
        category = 'Reaction / Commentary';
      } else if (type.includes('Game') || type.includes('Quiz')) {
        category = 'Games / Quizzes';
      } else if (type.includes('Tier') || type.includes('Debate')) {
        category = 'Tier Lists / Debates';
      } else if (type.includes('Repeatable') || type.includes('Segment')) {
        category = 'Repeatable Segments';
      } else if (type.includes('Nostalgia') || type.includes('Culture') || type.includes('Trend')) {
        category = 'Nostalgia / Culture / Trends';
      } else if (type.includes('Build') || type.includes('Tutorial')) {
        category = 'Build / Tutorial';
      } else if (type.includes('Review') || type.includes('Comparison')) {
        category = 'Reviews / Comparisons';
      }
      categories[category].push(idea);
    });

    return categories;
  };

  const getLiftStats = () => {
    const stats = { Huge: 0, Mid: 0, Low: 0 };
    ideas.forEach(idea => {
      const lift = idea.lift || 'Mid';
      stats[lift]++;
    });
    return stats;
  };

  // Filter and sort ideas
  const getFilteredAndSortedIdeas = () => {
    let filtered = ideas.filter(idea => {
      const matchesLift = selectedLift === 'all' || idea.liftLevel === selectedLift;
      const matchesCategory = selectedCategory === 'all' || idea.contentType === selectedCategory;
      const matchesSearch = searchQuery === '' || 
        idea.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        idea.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (idea.liftLevel && idea.liftLevel.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (idea.contentType && idea.contentType.toLowerCase().includes(searchQuery.toLowerCase()));
      
      return matchesLift && matchesCategory && matchesSearch;
    });

    // Sort ideas
    switch (sortBy) {
      case 'lift':
        const liftOrder = { 'Huge Lift': 3, 'Mid Lift': 2, 'Low Lift': 1 };
        filtered.sort((a, b) => (liftOrder[b.liftLevel] || 0) - (liftOrder[a.liftLevel] || 0));
        break;
      case 'type':
        filtered.sort((a, b) => (a.contentType || '').localeCompare(b.contentType || ''));
        break;
      case 'ai-score':
        filtered.sort((a, b) => (b.aiScore || 0) - (a.aiScore || 0));
        break;
      case 'created':
      default:
        filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        break;
    }

    return filtered;
  };

  const getContentInsights = () => {
    if (!ideas || !Array.isArray(ideas)) {
      return {
        total: 0,
        byStatus: [],
        byTag: []
      };
    }
    
    const totalIdeas = ideas.length;
    const byStatus = {};
    const byTag = {};
    
    ideas.forEach(idea => {
      byStatus[idea.status] = (byStatus[idea.status] || 0) + 1;
      
      if (idea.tags && Array.isArray(idea.tags)) {
        idea.tags.forEach(tag => {
          byTag[tag] = (byTag[tag] || 0) + 1;
        });
      }
    });

    return {
      total: totalIdeas,
      byStatus: Object.entries(byStatus).sort(([,a], [,b]) => b - a),
      byTag: Object.entries(byTag).sort(([,a], [,b]) => b - a).slice(0, 10)
    };
  };

  // Score all unscored ideas with AI
  const scoreAllIdeasWithAI = async () => {
    try {
      const { isAIConfigured } = await import('./config/ai');
      const aiConfigured = isAIConfigured();
      
      if (!aiConfigured) {
        alert('AI is not configured. Please configure your OpenAI API key in Settings first.');
        return;
      }
      
      const { default: aiService } = await import('./services/aiService');
      
      // Get all ideas without AI scores
      const unscoredIdeas = ideas.filter(idea => !idea.aiScore);
      
      if (unscoredIdeas.length === 0) {
        alert('All ideas already have AI scores!');
        return;
      }

      setIdeas(prevIdeas => 
        prevIdeas.map(idea => 
          !idea.aiScore ? { ...idea, isScoring: true } : idea
        )
      );

      const progressDiv = document.createElement('div');
      progressDiv.className = 'scoring-progress';
      progressDiv.innerHTML = `
        <div class="spinner"></div>
        <span>AI Scoring ${unscoredIdeas.length} ideas...</span>
      `;
      document.body.appendChild(progressDiv);

      const scoredIdeas = await aiService.fastBatchScore(unscoredIdeas);
      
      document.body.removeChild(progressDiv);
      
      setIdeas(prevIdeas => 
        prevIdeas.map(idea => {
          const scoredIdea = scoredIdeas.find(scored => scored.id === idea.id);
          if (scoredIdea) {
            return { 
              ...idea, 
              aiScore: scoredIdea.aiScore,
              isScoring: false,
              analyzedAt: scoredIdea.analyzedAt
            };
          }
          return idea;
        })
      );
      
      alert(`AI scoring completed! ${scoredIdeas.length} ideas have been scored.`);
    } catch (error) {
      alert('Failed to score ideas with AI. Please check the console for details.');
      
      setIdeas(prevIdeas => 
        prevIdeas.map(idea => ({ ...idea, isScoring: false }))
      );
      
      const progressDiv = document.querySelector('.scoring-progress');
      if (progressDiv) {
        document.body.removeChild(progressDiv);
      }
    }
  };

  const clearFilters = () => {
    setSelectedLift('all');
    setSelectedCategory('all');
    setSearchQuery('');
    setSortBy('created');
  };

  const filteredCount = getFilteredAndSortedIdeas().length;
  const totalCount = ideas.length;

  // Show authentication screen if not authenticated
  if (!isAuthenticated) {
    return <Auth onAuthChange={handleAuthChange} />;
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-left">
          <h1> YouTube Idea Hub</h1>
        </div>
        <div className="header-right">
          <div className="header-actions">
            <div className={`dropdown-container ${showDropdown ? 'open' : ''}`}>
              <button 
                className="add-idea-dropdown-btn"
                onClick={() => setShowDropdown(!showDropdown)}
              >
                + Add Ideas
                <span className="dropdown-arrow">▼</span>
              </button>
              {showDropdown && (
                <div className="dropdown-menu">
                  <button 
                    className="dropdown-item"
                    onClick={() => {
                      setShowQuickAdd(true);
                      setShowDropdown(false);
                    }}
                  >
                    Quick Add Idea
                  </button>
                  <button 
                    className="dropdown-item"
                    onClick={() => {
                      setShowBulkImport(true);
                      setShowDropdown(false);
                    }}
                  >
                    Bulk Import
                  </button>
                  <button 
                    className="dropdown-item"
                    onClick={() => {
                      setShowAIIdeaGenerator(true);
                      setShowDropdown(false);
                    }}
                  >
                    ✦ AI Idea Generator
                  </button>
                </div>
              )}
            </div>
            <button 
              className="theme-toggle"
              onClick={toggleTheme}
              aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
              title={`Current: ${theme} mode. Click to switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            >
              {theme === 'light' ? '☀' : '☾'}
            </button>
            <button 
              className="settings-button"
              onClick={() => setShowSettings(true)}
              aria-label="Open Settings"
              title="Settings"
            >
              ⚙
            </button>
            <div className="user-avatar-container">
              <div 
                className="user-avatar"
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                title="User menu"
              >
                {user?.user_metadata?.avatar_url ? (
                  <img 
                    src={user.user_metadata.avatar_url} 
                    alt={user.user_metadata?.full_name || 'User'} 
                    className="avatar-image"
                  />
                ) : (
                  <div className="avatar-initials">
                    {user?.user_metadata?.full_name?.[0] || user?.email?.[0] || 'U'}
                  </div>
                )}
              </div>
              
              {showUserDropdown && (
                <div className="user-dropdown">
                  <div className="dropdown-header">
                    <div className="dropdown-user-info">
                      <div className="dropdown-avatar">
                        {user?.user_metadata?.avatar_url ? (
                          <img 
                            src={user.user_metadata.avatar_url} 
                            alt={user.user_metadata?.full_name || 'User'} 
                            className="dropdown-avatar-image"
                          />
                        ) : (
                          <div className="dropdown-avatar-initials">
                            {user?.user_metadata?.full_name?.[0] || user?.email?.[0] || 'U'}
                          </div>
                        )}
                      </div>
                      <div className="dropdown-user-details">
                        <div className="dropdown-user-name">
                          {user?.user_metadata?.full_name || 'User'}
                        </div>
                        <div className="dropdown-user-email">
                          {user?.email}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="dropdown-divider"></div>
                  
                  <div className="dropdown-actions">
                    <button 
                      className="dropdown-action-item"
                      onClick={() => {
                        handleAuthChange(null);
                        setShowUserDropdown(false);
                      }}
                    >
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Filters and Controls */}
      <div className="smart-controls">
        <div className="search-bar">
          <input
            type="text"
            placeholder="Search ideas by title, description, or tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />


        </div>
        
        <div className="filter-controls">
          <select 
            value={selectedLift} 
            onChange={(e) => setSelectedLift(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Lift Levels</option>
            <option value="Low Lift">Low Lift</option>
            <option value="Mid Lift">Mid Lift</option>
            <option value="Huge Lift">Huge Lift</option>
          </select>
          
          <select 
            value={selectedCategory} 
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Categories</option>
            <option value="Makeover/Transform">Makeover/Transform</option>
            <option value="Challenge/Competition">Challenge/Competition</option>
            <option value="Reaction/Commentary">Reaction/Commentary</option>
            <option value="Game/Quiz">Game/Quiz</option>
            <option value="Tier List/Debate">Tier List/Debate</option>
            <option value="Repeatable Segment">Repeatable Segment</option>
            <option value="Nostalgia/Culture/Trend">Nostalgia/Culture/Trend</option>
            <option value="Build/Tutorial">Build/Tutorial</option>
            <option value="Review/Comparison">Review/Comparison</option>
            <option value="Other">Other</option>
          </select>
          
          <select 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value)}
            className="filter-select"
          >
            <option value="created">Sort by Date</option>
            <option value="lift">Sort by Lift</option>
            <option value="type">Sort by Type</option>
            <option value="ai-score">Sort by AI Score</option>
          </select>
          
          <button 
            className="clear-filters-btn"
            onClick={clearFilters}
            title="Clear all filters"
          >
            Clear
          </button>
        </div>
      </div>

      <div className="view-toggle">
        <button 
          className={`toggle-btn ${viewMode === 'board' ? 'active' : ''}`}
          onClick={() => setViewMode('board')}
        >
          Board View
        </button>
        <button 
          className={`toggle-btn ${viewMode === 'categories' ? 'active' : ''}`}
          onClick={() => setViewMode('categories')}
        >
          Category View
        </button>
        <button 
          className={`toggle-btn ${viewMode === 'insights' ? 'active' : ''}`}
          onClick={() => setViewMode('insights')}
        >
          Insights
        </button>
        <button 
          className={`toggle-btn ${viewMode === 'ai' ? 'active' : ''}`}
          onClick={() => setViewMode('ai')}
        >
          AI Analysis
        </button>
      </div>

      <main className="app-main">
        {ideas.length === 0 ? (
          <div className="empty-state">
            <h2>Welcome to YouTube Idea Hub!</h2>
            <p>Start by adding your first video idea or bulk importing a list.</p>
            <div className="empty-state-actions">
              <button 
                className="primary-btn"
                onClick={() => setShowQuickAdd(true)}
              >
                + Add Your First Idea
              </button>
              <button 
                className="secondary-btn"
                onClick={() => setShowBulkImport(true)}
              >
                Import Ideas List
              </button>
            </div>
          </div>
        ) : (
          <>
            {viewMode === 'board' ? (
              <div className="idea-board">
                <div 
                  className="board-column"
                  onDragOver={(e) => handleDragOver(e, 'idea')}
                  onDragEnter={(e) => handleDragEnter(e, 'idea')}
                  onDragLeave={(e) => handleDragLeave(e, 'idea')}
                  onDrop={(e) => handleDrop(e, 'idea')}
                >
                  <h3 className="column-title new-ideas">
                    New Ideas ({getIdeasByStatus('idea').length})
                  </h3>
                  <div className="column-content">
                    {/* Quick add card */}
                    {!showQuickAdd ? (
                      <div className="lofi-add-card" onClick={() => setShowQuickAdd(true)}>
                        <div className="lofi-add-icon"></div>
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

                    {getIdeasByStatus('idea').map((idea, index) => (
                      <React.Fragment key={idea.id}>
                        {/* Drop indicator */}
                        {dragState.isDragging && 
                         dragState.dragOverColumn === 'idea' && 
                         dragState.dropIndex === index && (
                          <div className="drop-indicator" />
                        )}
                        <IdeaCard 
                          idea={idea} 
                          onStatusChange={updateIdeaStatus}
                          onUpdateIdea={updateIdea}
                          onScoreSingleIdea={scoreSingleIdeaWithAI}
                          onGenerateTitles={generateScoredTitleSuggestions}
                          onUpdateTitle={updateIdeaTitle}
                          onUpdateTags={updateIdeaTags}
                          onDragStart={handleDragStart}
                          onDragEnd={handleDragEnd}
                          onKeyDown={handleKeyDown}
                          showTitleSuggestionsModal={showTitleSuggestionsModal}
                          setShowTitleSuggestionsModal={setShowTitleSuggestionsModal}
                          titleSuggestions={titleSuggestions}
                          setTitleSuggestions={setTitleSuggestions}
                          setSuggestionsFlyoutPos={setSuggestionsFlyoutPos}
                          setSelectedIdeaId={setSelectedIdeaId}
                          hasShownTitleSuggestions={hasShownTitleSuggestions}
                          setHasShownTitleSuggestions={setHasShownTitleSuggestions}
                          closeSuggestionsFlyout={closeSuggestionsFlyout}
                          selectedIdeaId={selectedIdeaId}
                          isClosingModal={isClosingModal}
                          getScoreColor={getScoreColor}
                          onDeleteIdea={deleteIdeaFromDatabase}
                        />
                      </React.Fragment>
                    ))}
                    
                    {/* Drop indicator */}
                    {dragState.isDragging && 
                     dragState.dragOverColumn === 'idea' && 
                     dragState.dropIndex === getIdeasByStatus('idea').length && (
                      <div className="drop-indicator" />
                    )}
                    
                  </div>
                </div>

                <div 
                  className="board-column"
                  onDragOver={(e) => handleDragOver(e, 'in-progress')}
                  onDragEnter={(e) => handleDragEnter(e, 'in-progress')}
                  onDragLeave={(e) => handleDragLeave(e, 'in-progress')}
                  onDrop={(e) => handleDrop(e, 'in-progress')}
                >
                  <h3 className="column-title in-progress">
                    In Progress ({getIdeasByStatus('in-progress').length})
                  </h3>
                  <div className="column-content">
                    {getIdeasByStatus('in-progress').map((idea, index) => (
                      <React.Fragment key={idea.id}>
                        {/* Drop indicator */}
                        {dragState.isDragging && 
                         dragState.dragOverColumn === 'in-progress' && 
                         dragState.dropIndex === index && (
                          <div className="drop-indicator" />
                        )}
                        <IdeaCard 
                          idea={idea} 
                          onStatusChange={updateIdeaStatus}
                          onUpdateIdea={updateIdea}
                          onScoreSingleIdea={scoreSingleIdeaWithAI}
                          onGenerateTitles={generateScoredTitleSuggestions}
                          onUpdateTitle={updateIdeaTitle}
                          onUpdateTags={updateIdeaTags}
                          onDragStart={handleDragStart}
                          onDragEnd={handleDragEnd}
                          onKeyDown={handleKeyDown}
                          showTitleSuggestionsModal={showTitleSuggestionsModal}
                          setShowTitleSuggestionsModal={setShowTitleSuggestionsModal}
                          titleSuggestions={titleSuggestions}
                          setTitleSuggestions={setTitleSuggestions}
                          setSuggestionsFlyoutPos={setSuggestionsFlyoutPos}
                          setSelectedIdeaId={setSelectedIdeaId}
                          hasShownTitleSuggestions={hasShownTitleSuggestions}
                          setHasShownTitleSuggestions={setHasShownTitleSuggestions}
                          closeSuggestionsFlyout={closeSuggestionsFlyout}
                          selectedIdeaId={selectedIdeaId}
                          isClosingModal={isClosingModal}
                          getScoreColor={getScoreColor}
                          onDeleteIdea={deleteIdeaFromDatabase}
                        />
                      </React.Fragment>
                    ))}
                    
                    {/* Drop indicator */}
                    {dragState.isDragging && 
                     dragState.dragOverColumn === 'in-progress' && 
                     dragState.dropIndex === getIdeasByStatus('in-progress').length && (
                      <div className="drop-indicator" />
                    )}
                    
                  </div>
                </div>

                <div 
                  className="board-column"
                  onDragOver={(e) => handleDragOver(e, 'ready')}
                  onDragEnter={(e) => handleDragEnter(e, 'ready')}
                  onDragLeave={(e) => handleDragLeave(e, 'ready')}
                  onDrop={(e) => handleDrop(e, 'ready')}
                >
                  <h3 className="column-title ready">
                    Ready for Notion ({getIdeasByStatus('ready').length})
                  </h3>
                  <div className="column-content">
                    {getIdeasByStatus('ready').map((idea, index) => (
                      <React.Fragment key={idea.id}>
                        {/* Drop indicator */}
                        {dragState.isDragging && 
                         dragState.dragOverColumn === 'ready' && 
                         dragState.dropIndex === index && (
                          <div className="drop-indicator" />
                        )}
                        <IdeaCard 
                          idea={idea} 
                          onStatusChange={updateIdeaStatus}
                          onUpdateIdea={updateIdea}
                          onScoreSingleIdea={scoreSingleIdeaWithAI}
                          onGenerateTitles={generateScoredTitleSuggestions}
                          onUpdateTitle={updateIdeaTitle}
                          onUpdateTags={updateIdeaTags}
                          onDragStart={handleDragStart}
                          onDragEnd={handleDragEnd}
                          onKeyDown={handleKeyDown}
                          showTitleSuggestionsModal={showTitleSuggestionsModal}
                          setShowTitleSuggestionsModal={setShowTitleSuggestionsModal}
                          titleSuggestions={titleSuggestions}
                          setTitleSuggestions={setTitleSuggestions}
                          setSuggestionsFlyoutPos={setSuggestionsFlyoutPos}
                          setSelectedIdeaId={setSelectedIdeaId}
                          hasShownTitleSuggestions={hasShownTitleSuggestions}
                          setHasShownTitleSuggestions={setHasShownTitleSuggestions}
                          closeSuggestionsFlyout={closeSuggestionsFlyout}
                          selectedIdeaId={selectedIdeaId}
                          isClosingModal={isClosingModal}
                          getScoreColor={getScoreColor}
                          onDeleteIdea={deleteIdeaFromDatabase}
                        />
                      </React.Fragment>
                    ))}
                    
                    {/* Drop indicator */}
                    {dragState.isDragging && 
                     dragState.dragOverColumn === 'ready' && 
                     dragState.dropIndex === getIdeasByStatus('ready').length && (
                      <div className="drop-indicator" />
                    )}
                    
                  </div>
                </div>
              </div>
            ) : viewMode === 'categories' ? (
              <div className="category-view">
                {Object.entries(getIdeasByCategory()).map(([category, categoryIdeas]) => (
                  categoryIdeas.length > 0 && (
                    <div key={category} className="category-section">
                      <h3 className="category-title">{category}</h3>
                      <div className="category-ideas">
                        {categoryIdeas.map((idea) => (
                          <IdeaCard 
                            key={idea.id} 
                            idea={idea} 
                            onStatusChange={updateIdeaStatus}
                            onUpdateIdea={updateIdea}
                            onScoreSingleIdea={scoreSingleIdeaWithAI}
                            onGenerateTitles={generateScoredTitleSuggestions}
                            onUpdateTitle={updateIdeaTitle}
                            onUpdateTags={updateIdeaTags}
                            onDragStart={handleDragStart}
                            onDragEnd={handleDragEnd}
                            onKeyDown={handleKeyDown}
                            compact={true}
                            showTitleSuggestionsModal={showTitleSuggestionsModal}
                            setShowTitleSuggestionsModal={setShowTitleSuggestionsModal}
                            titleSuggestions={titleSuggestions}
                            setTitleSuggestions={setTitleSuggestions}
                            hasShownTitleSuggestions={hasShownTitleSuggestions}
                            setHasShownTitleSuggestions={setHasShownTitleSuggestions}
                            closeSuggestionsFlyout={closeSuggestionsFlyout}
                            selectedIdeaId={selectedIdeaId}
                            isClosingModal={isClosingModal}
                            getScoreColor={getScoreColor}
                            onDeleteIdea={deleteIdeaFromDatabase}
                          />
                        ))}
                      </div>
                    </div>
                  )
                ))}
              </div>
            ) : viewMode === 'ai' ? (
              <div className="ai-view">
                <div className="ai-controls">
                  <button 
                    className="score-all-btn"
                    onClick={scoreAllIdeasWithAI}
                    title="Score all unscored ideas with AI"
                  >
                    🤖 Score All Ideas with AI
                  </button>

                  <p className="ai-status">
                    {ideas.filter(idea => idea.aiScore).length} of {ideas.length} ideas have AI scores
                  </p>
                </div>
                <AIInsights 
                  ideas={ideas} 
                  onUpdateIdeas={(updatedIdeas) => {
                    setIdeas(updatedIdeas);
                    setIdeasWithAI(updatedIdeas);
                  }}
                />
              </div>
            ) : (
              <div className="insights-view">
                <div className="insights-grid">
                  <div className="insight-card">
                    <h4>📈 Content Distribution</h4>
                    <div className="insight-content">
                      <div className="lift-distribution">
                        {getContentInsights().byStatus.map(([status, count]) => (
                          <div key={status} className="lift-bar">
                            <span className="lift-label">{status === 'idea' ? 'New Ideas' : status === 'in-progress' ? 'In Progress' : 'Ready'}</span>
                            <div className="lift-progress">
                              <div 
                                className="lift-fill" 
                                style={{ 
                                  width: `${(count / getContentInsights().total) * 100}%`,
                                  backgroundColor: status === 'idea' ? '#2196f3' : status === 'in-progress' ? '#ff9800' : '#4caf50'
                                }}
                              ></div>
                            </div>
                            <span className="lift-count">{count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="insight-card">
                    <h4>Top Content Types</h4>
                    <div className="insight-content">
                      {getContentInsights().byTag.map(([tag, count]) => (
                        <div key={tag} className="type-stat">
                          <span className="type-name">{tag}</span>
                          <span className="type-count">{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="insight-card">
                    <h4>👥 Team Workload</h4>
                    <div className="insight-content">
                      <div className="type-stat">
                        <span className="type-name">Total Ideas</span>
                        <span className="type-count">{getContentInsights().total}</span>
                      </div>
                      <div className="type-stat">
                        <span className="type-name">With Scripts</span>
                        <span className="type-count">{ideas.filter(idea => idea.script && idea.script.length > 0).length}</span>
                      </div>
                      <div className="type-stat">
                        <span className="type-name">With Thumbnails</span>
                        <span className="type-count">{ideas.filter(idea => idea.thumbnail && idea.thumbnail.length > 0).length}</span>
                      </div>
                    </div>
                  </div>

                  <div className="insight-card">
                    <h4>Quick Actions</h4>
                    <div className="insight-content">
                      <button 
                        className="quick-action-btn"
                        onClick={() => setSelectedLift('Low Lift')}
                      >
                        Show Low Lift Ideas
                      </button>
                      <button 
                        className="quick-action-btn"
                        onClick={() => setSelectedLift('Huge Lift')}
                      >
                        Show Huge Lift Ideas
                      </button>
                      <button 
                        className="quick-action-btn"
                        onClick={() => setViewMode('categories')}
                      >
                        View by Category
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {showQuickAdd && (
        <QuickAddModal
          onClose={() => setShowQuickAdd(false)}
          onAdd={addIdea}
        />
      )}

      {showBulkImport && (
        <BulkImportModal
          onClose={() => setShowBulkImport(false)}
          onImport={bulkImportIdeas}
        />
      )}

      {showAIIdeaGenerator && (
        <AIIdeaGenerator
          isOpen={showAIIdeaGenerator}
          onClose={() => setShowAIIdeaGenerator(false)}
          onAddIdeas={addIdea}
          existingIdeas={ideas}
        />
      )}

      {/* Global suggestions flyout */}
      {showTitleSuggestionsModal && suggestionsFlyoutPos && (
        <div 
          className={`title-suggestions-flyout ${hasShownTitleSuggestions ? '' : 'animate-in'}`}
          style={{ left: suggestionsFlyoutPos.left, top: suggestionsFlyoutPos.top }}
        >
          <div className={`flyout-header ${titleSuggestions.length === 0 ? 'loading' : ''}`}>
            <span>Suggestions</span>
          </div>
          <div className="flyout-list">
            {titleSuggestions.length === 0 ? (
              <>
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flyout-card loading-card">
                    <div className="loading-sparkle"></div>
                    <div className="loading-title"></div>
                    <div className="loading-score"></div>
                  </div>
                ))}
              </>
            ) : (
              titleSuggestions.slice(0,5).map((suggestion, i) => {
                const title = typeof suggestion === 'string' ? suggestion : suggestion.title;
                const score = typeof suggestion === 'object' ? suggestion.score : null;
                const isOptimistic = score?.isOptimistic;
                
                return (
                  <button
                    key={i}
                    className={`flyout-card ${isOptimistic ? 'optimistic-suggestion' : ''}`}
                    onClick={() => {
                      if (selectedIdeaId) {
                        updateIdeaTitle(selectedIdeaId, title, score);
                      }
                      closeSuggestionsFlyout();
                    }}
                  >
                    <span className="sparkle">✦</span>
                    <span className="flyout-text">
                      {title}
                      {isOptimistic && <span className="optimistic-badge">⚡</span>}
                    </span>
                    {score && (
                      <span 
                        className={`suggestion-score ${isOptimistic ? 'optimistic-score' : ''}`}
                        style={{
                          color: score.totalScore >= 80 ? '#4caf50' : score.totalScore >= 60 ? '#ff9800' : '#f44336'
                        }}
                        title={isOptimistic ? 'Instant suggestion - AI scoring in progress...' : `AI Score: ${score.totalScore}/100`}
                      >
                        {score.totalScore}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      <Settings 
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />
    </div>
  );
}

// Quick Add Modal
function QuickAddModal({ onClose, onAdd }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    lift: 'Mid',
    type: 'Other',
    owners: '',
    tags: ''
  });

  const MAX_TITLE_LENGTH = 100;
  const titleLength = formData.title.length;
  const isTitleTooLong = titleLength > MAX_TITLE_LENGTH;
  const isNearLimit = titleLength > MAX_TITLE_LENGTH * 0.8; // Warning at 80%

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (isTitleTooLong) {
      alert('Title is too long. Please keep it under 100 characters.');
      return;
    }
    
    onAdd({
      ...formData,
      owners: formData.owners.split(',').map(owner => owner.trim()).filter(Boolean),
      tags: formData.tags.split(',').map(tag => tag.trim()).filter(Boolean),
      thumbnail: '',
      script: ''
    });
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h2>Quick Add Video Idea</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit} className="idea-form">
          <div className="form-group">
            <label htmlFor="title">Video Title *</label>
            <input
              id="title"
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              placeholder="Enter your video title idea..."
              maxLength={MAX_TITLE_LENGTH}
              required
              className={isTitleTooLong ? 'error' : ''}
            />
            <div className={`character-count ${isNearLimit ? 'near-limit' : ''} ${isTitleTooLong ? 'over-limit' : ''}`}>
              {titleLength}/{MAX_TITLE_LENGTH} characters
            </div>
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="lift">Lift Level *</label>
              <select
                id="lift"
                value={formData.lift}
                onChange={(e) => setFormData({...formData, lift: e.target.value})}
                required
              >
                <option value="Low">Low Lift</option>
                <option value="Mid">Mid Lift</option>
                <option value="Huge">Huge Lift</option>
              </select>
            </div>
            
            <div className="form-group">
              <label htmlFor="type">Content Type *</label>
              <select
                id="type"
                value={formData.type}
                onChange={(e) => setFormData({...formData, type: e.target.value})}
                required
              >
                <option value="Other">Other</option>
                <option value="Makeover/Transform">Makeover/Transform</option>
                <option value="Challenge/Competition">Challenge/Competition</option>
                <option value="Reaction/Commentary">Reaction/Commentary</option>
                <option value="Game/Quiz">Game/Quiz</option>
                <option value="Tier List/Debate">Tier List/Debate</option>
                <option value="Repeatable Segment">Repeatable Segment</option>
                <option value="Nostalgia/Culture/Trend">Nostalgia/Culture/Trend</option>
                <option value="Build/Tutorial">Build/Tutorial</option>
                <option value="Review/Comparison">Review/Comparison</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="owners">Owners (comma-separated)</label>
            <input
              id="owners"
              type="text"
              value={formData.owners}
              onChange={(e) => setFormData({...formData, owners: e.target.value})}
              placeholder="Scott, Wes, CJ"
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              placeholder="Brief description of your idea..."
              rows={3}
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
}

// Bulk Import Modal
function BulkImportModal({ onClose, onImport }) {
  const [ideasText, setIdeasText] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (ideasText.trim()) {
      onImport(ideasText);
      onClose();
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h2>Bulk Import Ideas</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit} className="idea-form">
          <div className="form-group">
            <label htmlFor="ideas">Paste Your Ideas (one per line)</label>
            <textarea
              id="ideas"
              value={ideasText}
              onChange={(e) => setIdeasText(e.target.value)}
              placeholder="How to build a React app in 10 minutes
My journey from beginner to developer
Top 5 programming tips for beginners
Why I switched from Python to JavaScript"
              rows={10}
              required
            />
            <small className="form-help">
              Each line will become a separate video idea. You can add metadata later.
            </small>
          </div>
          <div className="form-actions">
            <button type="button" onClick={onClose} className="cancel-btn">
              Cancel
            </button>
            <button type="submit" className="submit-btn">
              Import Ideas
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Idea Card
function IdeaCard({ idea, onStatusChange, onUpdateIdea, onScoreSingleIdea, onGenerateTitles, onUpdateTitle, onUpdateTags, onDragStart, onDragEnd, onKeyDown, compact, showTitleSuggestionsModal, setShowTitleSuggestionsModal, titleSuggestions, setTitleSuggestions, setSuggestionsFlyoutPos, setSelectedIdeaId, hasShownTitleSuggestions, setHasShownTitleSuggestions, closeSuggestionsFlyout, selectedIdeaId, isClosingModal, getScoreColor, onDeleteIdea }) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editingTitle, setEditingTitle] = useState(idea.title);
  const [isEditingLift, setIsEditingLift] = useState(false);
  const [isEditingType, setIsEditingType] = useState(false);
  const [isEditingTags, setIsEditingTags] = useState(false);
  const [showDeleteOption, setShowDeleteOption] = useState(false);
  const [longPressTimer, setLongPressTimer] = useState(null);

  // Long press handler for delete
  const handleLongPress = () => {
    setShowDeleteOption(true);
    // Auto-hide after 3 seconds
    setTimeout(() => setShowDeleteOption(false), 3000);
  };

  const handleMouseDown = () => {
    const timer = setTimeout(handleLongPress, 800); // 800ms long press
    setLongPressTimer(timer);
  };

  const handleMouseUp = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  const handleMouseLeave = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  // Touch event handlers for mobile
  const handleTouchStart = () => {
    const timer = setTimeout(handleLongPress, 800); // 800ms long press
    setLongPressTimer(timer);
  };

  const handleTouchEnd = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
      }
    };
  }, [longPressTimer]);

  const MAX_TITLE_LENGTH = 100;
  const titleLength = editingTitle.length;
  const isTitleTooLong = titleLength > MAX_TITLE_LENGTH;
  const isNearLimit = titleLength > MAX_TITLE_LENGTH * 0.8;

  const getStatusColor = (status) => {
    switch (status) {
      case 'idea': return '#2196f3';
      case 'in-progress': return '#ff9800';
      case 'ready': return '#4caf50';
      default: return '#9e9e9e';
    }
  };

  const getLiftTagClass = (liftLevel) => {
    if (liftLevel === 'Low Lift') return 'low-lift';
    if (liftLevel === 'Mid Lift') return 'mid-lift';
    if (liftLevel === 'Huge Lift') return 'huge-lift';
    return '';
  };

  const handleGenerateTitles = async (e) => {
    // Safety check for event target
    if (!e || !e.currentTarget) {
      return;
    }
    
    // Check if we're currently closing to prevent immediate reopening
    if (isClosingModal) {
      return;
    }
    
    if (typeof onGenerateTitles === 'function') {
      // If modal is already open, check if it's the same card
      if (showTitleSuggestionsModal && selectedIdeaId === idea.id) {
        // Same card clicked while modal is open - close it
        closeSuggestionsFlyout();
        // Prevent any further execution by returning immediately
        return;
      } else if (showTitleSuggestionsModal && selectedIdeaId !== idea.id) {
        // Different card clicked while modal is open - update it
        // Update the selected idea
        setSelectedIdeaId(idea.id);
        
        // Get the card element for positioning
        const cardEl = e.currentTarget?.closest('.idea-card');
        if (cardEl) {
          // Update flyout position for the new card
          const updateFlyoutPosition = () => {
            const rect = cardEl.getBoundingClientRect();
            const flyoutLeft = Math.min(rect.right + 16, window.innerWidth - 360);
            setSuggestionsFlyoutPos({ left: flyoutLeft, top: rect.top });
          };
          
          updateFlyoutPosition();
          
          // Remove old active card highlight and add new one
          const oldActiveCard = document.querySelector('.idea-card.suggestions-active-card');
          if (oldActiveCard) oldActiveCard.classList.remove('suggestions-active-card');
          cardEl.classList.add('suggestions-active-card');
          
          // Update column positioning for the new card
          const boardEl = cardEl.closest('.idea-board');
          if (boardEl) {
            const columns = boardEl.querySelectorAll('.board-column');
            const cardColumn = cardEl.closest('.board-column');
            let shouldMove = false;
            
            columns.forEach(column => {
              if (shouldMove) {
                column.classList.add('column-slide-right');
              }
              if (column === cardColumn) {
                shouldMove = true;
              }
            });
          }
          
          // Clear suggestions and show loading state
          setTitleSuggestions([]);
          
          // Generate new title suggestions for the different card
          try {
            const scoredSuggestions = await onGenerateTitles(idea);
            setTitleSuggestions(scoredSuggestions);
          } catch (error) {
            console.error('Error generating titles for different card:', error);
          }
        }
        return;
      }

      // Get the card element BEFORE the async call to avoid losing the reference
      const cardEl = e.currentTarget?.closest('.idea-card');
      if (!cardEl) {
        console.error('Could not find idea card element');
        return;
      }
      
      // SHOW UI IMMEDIATELY with skeleton loading
      setSelectedIdeaId(idea.id);
      setTitleSuggestions([]); // Empty array triggers skeleton loading
      
      // Compute flyout position to the right of the clicked card
      const updateFlyoutPosition = () => {
        const rect = cardEl.getBoundingClientRect();
        const flyoutLeft = Math.min(rect.right + 16, window.innerWidth - 360);
        // Allow the flyout to slide under the sticky header (no clamping)
        setSuggestionsFlyoutPos({ left: flyoutLeft, top: rect.top });
      };
      
      // Set initial position
      updateFlyoutPosition();
      
      // Add scroll listener to keep flyout positioned
      const handleScroll = () => updateFlyoutPosition();
      const handleResize = () => updateFlyoutPosition();
      window.addEventListener('scroll', handleScroll, { passive: true });
      window.addEventListener('resize', handleResize, { passive: true });
      
      // Store the scroll handler for cleanup
      window.flyoutScrollHandler = handleScroll;
      window.flyoutResizeHandler = handleResize;
      
      // Add class to columns that need to move (only those to the right)
      const boardEl = cardEl.closest('.idea-board');
      if (boardEl) {
        const columns = boardEl.querySelectorAll('.board-column');
        const cardColumn = cardEl.closest('.board-column');
        let shouldMove = false;
        
        columns.forEach(column => {
          if (shouldMove) {
            column.classList.add('column-slide-right');
          }
          if (column === cardColumn) {
            shouldMove = true;
          }
        });
      }
      
      // Highlight the active card
      cardEl.classList.add('suggestions-active-card');
      setShowTitleSuggestionsModal(true);
      // Mark that we've shown the modal to prevent re-animation
      if (!hasShownTitleSuggestions) {
        setHasShownTitleSuggestions(true);
      }
      
      // NOW generate the suggestions asynchronously
      try {
        const scoredSuggestions = await onGenerateTitles(idea);
        setTitleSuggestions(scoredSuggestions);
      } catch (error) {
        console.error('Error generating titles:', error);
        // Keep empty suggestions to show skeleton state
      }
    }
  };

  const applyTitleSuggestion = (suggestion) => {
    // In a real app, this would update the idea
    setShowTitleSuggestionsModal(false);
  };

  const handleTitleEdit = () => {
    setIsEditingTitle(true);
    setEditingTitle(idea.title);
  };

  // Auto-resize textarea
  useEffect(() => {
    if (isEditingTitle) {
      const textarea = document.querySelector('.title-input.editing');
      if (textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = textarea.scrollHeight + 'px';
      }
    }
  }, [isEditingTitle]);



  const handleTitleChange = (e) => {
    const newTitle = e.target.value;
    setEditingTitle(newTitle);
    
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
  };

  const handleTitleSave = () => {
    if (editingTitle.trim() && editingTitle !== idea.title) {
      if (editingTitle.length > MAX_TITLE_LENGTH) {
        alert('Title is too long. Please keep it under 100 characters.');
        return;
      }
      onUpdateTitle(idea.id, editingTitle.trim());
    }
    setIsEditingTitle(false);
  };

  const handleTitleCancel = () => {
    setEditingTitle(idea.title);
    setIsEditingTitle(false);
  };

  const handleTitleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleTitleSave();
    } else if (e.key === 'Escape') {
      handleTitleCancel();
    }
  };

  return (
    <div 
      className={`idea-card ${idea.isScoring ? 'is-scoring' : ''}`}
      draggable={true}
      onDragStart={(e) => onDragStart(e, idea)}
      onDragEnd={onDragEnd}
      data-idea-id={idea.id}
      tabIndex={0}
      role="button"
      aria-label={`Drag ${idea.title} to change status`}
      onKeyDown={(e) => onKeyDown(e, idea, 'drag')}
      style={{ position: 'relative' }}
      data-scoring={idea.isScoring ? 'true' : 'false'}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="card-header">
        <div className="title-container">
          {isEditingTitle ? (
            <div className="title-edit-container">
              <textarea
                value={editingTitle}
                onChange={handleTitleChange}
                onKeyDown={handleTitleKeyDown}
                onBlur={handleTitleSave}
                className={`title-input editing ${isTitleTooLong ? 'error' : ''}`}
                autoFocus
                rows={1}
                maxLength={MAX_TITLE_LENGTH}
              />
              <div className={`character-count ${isNearLimit ? 'near-limit' : ''} ${isTitleTooLong ? 'over-limit' : ''}`}>
                {titleLength}/{MAX_TITLE_LENGTH} characters
              </div>
            </div>
          ) : (
            <h4 
              className={`card-title editable ${idea.title.length > 100 ? 'too-long' : ''}`}
              onClick={handleTitleEdit}
              title="Click to edit title"
            >
              {idea.title}
            </h4>
          )}
          <button 
            className="ai-icon-btn"
            onClick={handleGenerateTitles}
            title="Generate title suggestions"
          >
            ✦
          </button>

        </div>
      </div>

      <div className="card-tags-section">
        <div className="tags-list">
          {/* Lift Level Tag */}
          <div className="tag-container">
            {isEditingLift ? (
              <div className="tag-options">
                {['Low Lift', 'Mid Lift', 'Huge Lift'].map(option => (
                  <button
                    key={option}
                    className={`tag-option ${idea.liftLevel === option ? 'selected' : ''} ${getLiftTagClass(option)}`}
                    data-lift-level={option}
                    onClick={() => {
                      onUpdateIdea && onUpdateIdea(idea.id, { liftLevel: option });
                      setIsEditingLift(false);
                    }}
                  >
                    {option}
                  </button>
                ))}
              </div>
            ) : (
              <span 
                className={`tag lift-tag ${idea.liftLevel ? getLiftTagClass(idea.liftLevel) : 'empty-tag'}`}
                onClick={() => setIsEditingLift(true)}
                title="Click to change lift level"
              >
                {idea.liftLevel || 'Set Lift Level'}
              </span>
            )}
          </div>
          
          {/* Content Type */}
          <div className="tag-container">
            {isEditingType ? (
              <div className="tag-options">
                {[
                  'Other', 'Makeover/Transform', 'Challenge/Competition', 
                  'Reaction/Commentary', 'Game/Quiz', 'Tier List/Debate', 
                  'Repeatable Segment', 'Nostalgia/Culture/Trend', 
                  'Build/Tutorial', 'Review/Comparison'
                ].map(option => (
                  <button
                    key={option}
                    className={`tag-option type-tag ${idea.contentType === option ? 'selected' : ''}`}
                    data-content-type={option}
                    onClick={() => {
                      onUpdateIdea && onUpdateIdea(idea.id, { contentType: option });
                      setIsEditingType(false);
                    }}
                  >
                    {option}
                  </button>
                ))}
              </div>
            ) : (
              <span 
                className={`tag type-tag ${idea.contentType ? '' : 'empty-tag'}`}
                onClick={() => setIsEditingType(true)}
                title="Click to change content type"
              >
                {idea.contentType || 'Set Content Type'}
              </span>
            )}
          </div>
        </div>
      </div>
      
      {/* AI Score Badge */}
      {idea.isScoring ? (
        <div 
          className="ai-score-badge loading-score"
          title="AI is analyzing this idea..."
        >
          <div className="loading-ring"></div>
        </div>
      ) : idea.aiScore ? (
        <div 
          className="ai-score-badge completed-score"
          style={{
            borderColor: getScoreColor(idea.aiScore),
            border: `2px solid ${getScoreColor(idea.aiScore)}`
          }}
          title={`AI Score: ${idea.aiScore}/100 - ${idea.aiScore >= 80 ? 'High' : idea.aiScore >= 60 ? 'Medium' : 'Low'} potential`}
        >
          {idea.aiScore}
        </div>
      ) : (
        <div 
          className="ai-score-badge placeholder"
          title="Click to score with AI"
          onClick={() => {
            onUpdateIdea(idea.id, { isScoring: true });
            setTimeout(() => {
              onScoreSingleIdea(idea.id);
            }, 100);
          }}
        >
          
        </div>
      )}

      {/* Delete Option Overlay */}
      {showDeleteOption && (
        <div className="delete-overlay">
          <button 
            className="delete-action-btn"
            onClick={(e) => {
              e.stopPropagation();
              setShowDeleteOption(false);
              if (window.confirm(`Are you sure you want to delete "${idea.title}"?`)) {
                onDeleteIdea(idea.id);
              }
            }}
            title="Delete idea"
          >
            🗑️ Delete
          </button>
        </div>
      )}

    </div>
  );
}

export default App;