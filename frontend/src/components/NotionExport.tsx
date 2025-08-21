import React, { useState, useImperativeHandle, forwardRef } from 'react';
import { IdeaCard } from './IdeaCard';

interface NotionExportProps {
  ideas: any[];
  onStatusChange: (id: string, status: any) => void;
}

export interface NotionExportRef {
  generateNotionExport: () => void;
}

const NotionExport = forwardRef<NotionExportRef, NotionExportProps>(({ ideas, onStatusChange }, ref) => {
  const [exportFormat, setExportFormat] = useState('notion');
  const [includeMetadata, setIncludeMetadata] = useState(true);
  const [includeAI, setIncludeAI] = useState(true);
  const [exportedContent, setExportedContent] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  const readyIdeas = ideas.filter(idea => idea.status === 'ready');

  const generateNotionExport = () => {
    if (readyIdeas.length === 0) {
      setExportedContent('No ready ideas to export.');
      return;
    }

    let content = '';

    if (exportFormat === 'notion') {
      content = generateNotionFormat();
    } else if (exportFormat === 'markdown') {
      content = generateMarkdownFormat();
    } else if (exportFormat === 'csv') {
      content = generateCSVFormat();
    }

    setExportedContent(content);
    setShowPreview(true);
  };

  const generateNotionFormat = () => {
    let content = '# YouTube Content Pipeline\n\n';
    content += `Generated on: ${new Date().toLocaleDateString()}\n`;
    content += `Total Ideas: ${readyIdeas.length}\n\n`;

    readyIdeas.forEach((idea, index) => {
      content += `## ${index + 1}. ${idea.title}\n\n`;
      
      if (includeMetadata) {
        content += `**Status:** Ready for Production\n`;
        content += `**Lift Level:** ${idea.lift}\n`;
        content += `**Content Type:** ${idea.type}\n`;
        content += `**Created:** ${new Date(idea.createdAt).toLocaleDateString()}\n`;
        
        if (idea.owners && idea.owners.length > 0) {
          content += `**Owners:** ${idea.owners.join(', ')}\n`;
        }
        
        if (idea.tags && idea.tags.length > 0) {
          content += `**Tags:** ${idea.tags.join(', ')}\n\n`;
        }
      }

      if (idea.description) {
        content += `**Description:** ${idea.description}\n\n`;
      }

      if (includeAI && idea.aiScore) {
        content += `**AI Score:** ${idea.aiScore}/100\n`;
        if (idea.aiGenerated) {
          content += `**AI Generated:** Yes\n`;
          if (idea.aiReasoning) {
            content += `**AI Reasoning:** ${idea.aiReasoning}\n`;
          }
        }
        content += '\n';
      }

      if (idea.script) {
        content += `**Script Notes:** ${idea.script}\n\n`;
      }

      content += '---\n\n';
    });

    return content;
  };

  const generateMarkdownFormat = () => {
    let content = '# YouTube Content Ideas\n\n';
    content += `*Exported on ${new Date().toLocaleDateString()}*\n\n`;

    readyIdeas.forEach((idea, index) => {
      content += `## ${index + 1}. ${idea.title}\n\n`;
      
      if (includeMetadata) {
        content += `- **Type:** ${idea.type}\n`;
        content += `- **Lift:** ${idea.lift}\n`;
        content += `- **Created:** ${new Date(idea.createdAt).toLocaleDateString()}\n`;
        
        if (idea.owners && idea.owners.length > 0) {
          content += `- **Owners:** ${idea.owners.join(', ')}\n`;
        }
      }

      if (idea.description) {
        content += `\n${idea.description}\n\n`;
      }

      if (includeAI && idea.aiScore) {
        content += `**AI Score:** ${idea.aiScore}/100\n\n`;
      }

      if (idea.tags && idea.tags.length > 0) {
        content += `**Tags:** ${idea.tags.map((tag: any) => `\`${tag}\``).join(' ')}\n\n`;
      }

      content += '---\n\n';
    });

    return content;
  };

  const generateCSVFormat = () => {
    let content = 'Title,Description,Type,Lift,Owners,Tags,AI Score,Created Date\n';
    
    readyIdeas.forEach(idea => {
      const title = `"${idea.title.replace(/"/g, '""')}"`;
      const description = `"${(idea.description || '').replace(/"/g, '""')}"`;
      const type = `"${idea.type}"`;
      const lift = `"${idea.lift}"`;
      const owners = `"${(idea.owners || []).join('; ')}"`;
      const tags = `"${(idea.tags || []).join('; ')}"`;
      const aiScore = idea.aiScore || '';
      const createdDate = new Date(idea.createdAt).toLocaleDateString();
      
      content += `${title},${description},${type},${lift},${owners},${tags},${aiScore},"${createdDate}"\n`;
    });

    return content;
  };

  // Expose the generateNotionExport function to parent component
  useImperativeHandle(ref, () => ({
    generateNotionExport
  }));

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(exportedContent);
      alert('Content copied to clipboard!');
    } catch (error) {
      console.error('Failed to copy:', error);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = exportedContent;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert('Content copied to clipboard!');
    }
  };

  const downloadFile = () => {
    const blob = new Blob([exportedContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `youtube-ideas-${new Date().toISOString().split('T')[0]}.${exportFormat === 'csv' ? 'csv' : 'md'}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (readyIdeas.length === 0) {
    return null;
  }

  return (
    <div className="notion-export-container">
      <div className="ideas-list">
        {readyIdeas.map((idea) => (
          <IdeaCard
            key={idea.id}
            idea={idea}
            onStatusChange={onStatusChange}
          />
        ))}
      </div>
    </div>
  );
});

NotionExport.displayName = 'NotionExport';

export default NotionExport;
