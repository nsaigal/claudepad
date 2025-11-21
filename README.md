# ✍️ ClaudePad

**A freewriting tool powered by Claude AI**

ClaudePad is a prototype demonstrating how AI can enhance the writing experience through intuitive, collaborative interfaces.

<div align="center">
  <video src="https://qsjzljuspcgucfkhflnj.supabase.co/storage/v1/object/public/public_videos/claude%20pad%20demo%20final.mp4" width="70%" controls>
    Your browser does not support the video tag.
  </video>
  <p><em>Watch a quick demo of ClaudePad</em></p>
</div>

## Project Goals

This project showcases:

- **Frontier AI Capabilities**: Real-time AI-powered editing with Claude's latest models
- **Innovative UX**: Google Docs-style collaborative cursor animations that make AI feel like a writing partner
- **Rapid Prototyping**: Built with modern full-stack tools for quick iteration and deployment
- **User-Centric Design**: Inline accept/decline controls, custom instructions, and context-aware suggestions

## Key Features

### Intelligent Editing
- **Document-wide analysis**: Press ⌘+Enter to get AI-powered typo corrections and style improvements
- **Selective editing**: Highlight any text and provide custom prompts (e.g., "make it more concise")
- **Learning system**: Declined edits are tracked so the AI won't suggest the same changes again

### Delightful Interactions
- **Collaborative cursor animation**: Watch as AI edits appear character-by-character with a cursor, creating the feeling of pair programming
- **Inline controls**: Accept or decline individual edits with visual buttons, or batch operations with keyboard shortcuts
- **Real-time feedback**: Typing sparkles, smooth animations, and clear visual states

### Customizable Experience
- **Custom instructions**: Tailor Claude's editing style (e.g., "prefer British English", "be more casual")
- **Personal API keys**: Secure storage via HTTP-only cookies
- **Full history**: Undo changes and export your work anytime

## Technical Implementation

### Frontend Architecture
- **Framework**: Next.js (Pages Router) with React 19
- **Styling**: Tailwind CSS v4 for rapid, responsive design
- **State Management**: React hooks with local storage persistence
- **Animations**: Custom CSS animations for collaborative cursor effects

### Backend & AI Integration
- **API Layer**: Next.js API routes for secure server-side Claude API calls
- **AI Model**: Claude Haiku (fast, efficient for real-time suggestions)
- **Security**: API keys stored in HTTP-only cookies (not accessible to client JavaScript)
- **Parsing**: Custom XML-based response format for reliable edit extraction

### Novel UX Patterns
- **Collaborative cursor simulation**: Multi-step animation sequence that mimics human editing:
  1. Cursor appears at edit location
  2. Original text strikes through
  3. New text types out character-by-character
  4. Accept/decline buttons appear
- **Smart text matching**: Complex HTML-to-text position mapping for accurate in-place edits
- **Scroll-aware animations**: Auto-scrolls to edits in long documents with visual pulses

## 🚀 Getting Started

```bash
# Install dependencies
npm install

# Add your API key
# Get one at https://console.anthropic.com/settings/keys
cp .env.example .env.local
# Add ANTHROPIC_API_KEY=sk-ant-... to .env.local

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and start writing!

## Design Philosophy

This prototype embodies principles critical to frontier AI applications:

1. **AI as Collaborator**: The animated cursor creates a sense of partnership rather than automated replacement
2. **User Control**: Every suggestion can be accepted, rejected, or customized—the user always has final say
3. **Progressive Disclosure**: Advanced features (custom instructions, selective editing) are available but don't clutter the default experience
4. **Fail Gracefully**: Clear error messages, loading states, and fallbacks ensure reliability
5. **Rapid Iteration**: Built for fast experimentation—easy to test new model capabilities or interaction patterns

## What Makes This Different

Unlike traditional grammar checkers, ClaudePad demonstrates:

- **Contextual intelligence**: Claude understands document-wide context for better suggestions
- **Style improvements**: Beyond typos—rewrites unclear sentences with explanations
- **Conversational prompting**: Users can highlight text and ask for specific changes in natural language
- **Learning interface**: Tracks user preferences to avoid repetitive suggestions
- **Real-time collaboration feel**: Animations create emotional connection with the AI

## Potential Extensions

This prototype platform could be extended to explore:

- **Multi-modal editing**: Integrate vision models for image-based writing prompts
- **Real-time collaboration**: Multiple users editing with AI as a third collaborator
- **Domain-specific modes**: Scientific writing, creative fiction, technical documentation
- **Advanced prompt engineering**: A/B test different system prompts to optimize suggestion quality
- **Usage analytics**: Gather insights on which AI suggestions users find most valuable

## Security & Privacy

- API keys never exposed to client-side JavaScript (HTTP-only cookies)
- All content stored locally in browser (localStorage)
- No server-side data persistence beyond session
- Users can provide their own API keys for full control

## About This Project

Built as a portfolio demonstration of:
- Full-stack engineering capabilities (Next.js, React, API design)
- LLM integration expertise (Claude API, prompt engineering)
- UX innovation for AI-powered applications
- Rapid prototyping skills for frontier AI capabilities

Perfect for exploring how cutting-edge language models can be transformed into intuitive, human-centered interfaces that unlock new ways of working with AI.

---

**Tech Stack**: Next.js 16 • React 19 • Tailwind CSS v4 • Claude API • Vercel AI SDK

