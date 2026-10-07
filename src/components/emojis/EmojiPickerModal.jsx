import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Search, X, Sparkles, Clock, Smile, User,
  PawPrint, Utensils, Activity, Car, Lightbulb,
  Heart, Flag
} from 'lucide-react';
import U2UEmoji from './U2UEmoji';
import {
  U2U_ORIGINALS,
  EMOJI_CATEGORIES,
  searchEmojis,
  getEmojiDetails
} from '../../data/u2uEmojis';
import { playTickSound } from '../../utils/audio';

const RECENT_KEY = 'u2u_recent_emojis';
const MAX_RECENT = 16;

// Category metadata with standard icons & labels
const CATEGORY_META = [
  { id: 'u2u-originals', label: 'U2U Originals', icon: Sparkles, badge: '⭐' },
  { id: 'smileys', label: 'Smileys', icon: Smile, badge: '😀' },
  { id: 'people', label: 'People', icon: User, badge: '👋' },
  { id: 'animals', label: 'Animals', icon: PawPrint, badge: '🐾' },
  { id: 'food', label: 'Food', icon: Utensils, badge: '🍔' },
  { id: 'activities', label: 'Activities', icon: Activity, badge: '⚽' },
  { id: 'travel', label: 'Travel', icon: Car, badge: '🚗' },
  { id: 'objects', label: 'Objects', icon: Lightbulb, badge: '💡' },
  { id: 'symbols', label: 'Symbols', icon: Heart, badge: '❤️' },
  { id: 'flags', label: 'Flags', icon: Flag, badge: '🏳️' }
];

export default function EmojiPickerModal({
  isOpen,
  onClose,
  onSelectEmoji,
  title = 'U2U Emojis',
  isReactionPicker = false
}) {
  const [activeCategory, setActiveCategory] = useState('u2u-originals');
  const [searchQuery, setSearchQuery] = useState('');
  const [recentEmojis, setRecentEmojis] = useState([]);
  const [previewEmoji, setPreviewEmoji] = useState(null);

  const pickerRef = useRef(null);
  const searchInputRef = useRef(null);
  const categoryNavRef = useRef(null);
  const scrollBodyRef = useRef(null);

  // Load recently used emojis from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(RECENT_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setRecentEmojis(parsed.slice(0, MAX_RECENT));
        }
      }
    } catch {
      // Ignore storage errors
    }
  }, [isOpen]);

  // Focus search input when opened on desktop
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        if (window.innerWidth > 768 && searchInputRef.current) {
          searchInputRef.current.focus();
        }
      }, 80);
    } else {
      setSearchQuery('');
      setPreviewEmoji(null);
    }
  }, [isOpen]);

  // Close on Escape or click outside
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    }

    function handlePointerDown(e) {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        // Avoid closing if clicking the toggle button
        const isToggleBtn = e.target.closest('.composer-emoji-btn') || e.target.closest('.message-more-btn');
        if (!isToggleBtn) {
          onClose();
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('pointerdown', handlePointerDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [isOpen, onClose]);

  // Handle emoji selection
  const handleSelect = useCallback((emojiValue) => {
    try {
      playTickSound();
    } catch {}

    // Update recent emojis
    try {
      const updated = [emojiValue, ...recentEmojis.filter(e => e !== emojiValue)].slice(0, MAX_RECENT);
      setRecentEmojis(updated);
      localStorage.setItem(RECENT_KEY, JSON.stringify(updated));
    } catch {}

    onSelectEmoji(emojiValue);

    if (isReactionPicker) {
      onClose();
    }
  }, [recentEmojis, onSelectEmoji, isReactionPicker, onClose]);

  // Smart search results
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return null;
    return searchEmojis(searchQuery);
  }, [searchQuery]);

  // Scroll to active category section or switch view
  const handleCategoryClick = (catId) => {
    setActiveCategory(catId);
    if (scrollBodyRef.current) {
      scrollBodyRef.current.scrollTop = 0;
    }
  };

  // Preview details
  const previewDetails = useMemo(() => {
    if (!previewEmoji) return null;
    return getEmojiDetails(previewEmoji);
  }, [previewEmoji]);

  if (!isOpen) return null;

  return (
    <div
      ref={pickerRef}
      className={`u2u-emoji-picker-container ${isReactionPicker ? 'as-reaction-picker' : ''}`}
      role="dialog"
      aria-label="U2U Emoji Picker"
    >
      {/* ── HEADER ── */}
      <div className="emoji-picker-header">
        <div className="emoji-picker-title-row">
          <div className="emoji-picker-brand-badge">
            <span className="brand-dot-pulse" />
            <span className="emoji-picker-title">{title}</span>
          </div>
          <button
            className="emoji-picker-close-btn"
            onClick={onClose}
            aria-label="Close emoji picker"
            type="button"
          >
            <X size={15} />
          </button>
        </div>

        {/* ── SEARCH BAR ── */}
        <div className="emoji-search-box">
          <Search size={14} className="search-icon" />
          <input
            ref={searchInputRef}
            type="text"
            className="emoji-search-input"
            placeholder="Search emojis..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              className="search-clear-btn"
              onClick={() => setSearchQuery('')}
              type="button"
              aria-label="Clear search"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* ── CATEGORY BAR ── */}
      {!searchQuery && (
        <div className="emoji-category-nav" ref={categoryNavRef} role="tablist">
          {recentEmojis.length > 0 && (
            <button
              type="button"
              className={`category-nav-btn ${activeCategory === 'recent' ? 'active' : ''}`}
              onClick={() => handleCategoryClick('recent')}
              title="Recently Used"
              aria-label="Recently Used"
            >
              <Clock size={16} />
            </button>
          )}
          {CATEGORY_META.map(cat => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                className={`category-nav-btn ${isActive ? 'active' : ''} ${cat.id === 'u2u-originals' ? 'originals-tab' : ''}`}
                onClick={() => handleCategoryClick(cat.id)}
                title={cat.label}
                aria-label={cat.label}
              >
                <Icon size={16} />
              </button>
            );
          })}
        </div>
      )}

      {/* ── EMOJI GRID BODY ── */}
      <div className="emoji-picker-body" ref={scrollBodyRef}>
        {searchQuery ? (
          /* SEARCH RESULTS VIEW */
          <div className="emoji-section">
            <div className="emoji-section-header">
              <span className="emoji-section-label">Search Results</span>
            </div>

            {searchResults.originals.length === 0 && searchResults.standard.length === 0 ? (
              <div className="emoji-empty-results">
                <p>No emojis matching "{searchQuery}"</p>
                <span className="emoji-empty-sub">Try searching love, heart, secret, fire, laugh...</span>
              </div>
            ) : (
              <>
                {/* U2U Originals Matches */}
                {searchResults.originals.length > 0 && (
                  <div className="emoji-subsection">
                    <span className="emoji-subsection-label">U2U Originals</span>
                    <div className="u2u-originals-grid">
                      {searchResults.originals.map(item => (
                        <button
                          key={item.id}
                          type="button"
                          className="u2u-original-btn"
                          onClick={() => handleSelect(item.token)}
                          onMouseEnter={() => setPreviewEmoji(item.token)}
                          onFocus={() => setPreviewEmoji(item.token)}
                          title={`${item.name} — ${item.description}`}
                        >
                          <div className="u2u-emoji-card">
                            <U2UEmoji name={item.id} size={28} />
                            <span className="u2u-original-caption">{item.name}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Standard Unicode Matches */}
                {searchResults.standard.length > 0 && (
                  <div className="emoji-subsection">
                    <span className="emoji-subsection-label">Standard Emojis</span>
                    <div className="standard-emojis-grid">
                      {searchResults.standard.map((emoji, idx) => (
                        <button
                          key={idx}
                          type="button"
                          className="standard-emoji-btn"
                          onClick={() => handleSelect(emoji)}
                          onMouseEnter={() => setPreviewEmoji(emoji)}
                          onFocus={() => setPreviewEmoji(emoji)}
                          aria-label={emoji}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          /* CATEGORY BROWSING VIEW */
          <>
            {/* Recently Used Category */}
            {activeCategory === 'recent' && recentEmojis.length > 0 && (
              <div className="emoji-section">
                <div className="emoji-section-header">
                  <span className="emoji-section-label">Recently Used</span>
                </div>
                <div className="standard-emojis-grid">
                  {recentEmojis.map((val, idx) => {
                    const isU2U = val.startsWith(':u2u-') && val.endsWith(':');
                    return (
                      <button
                        key={idx}
                        type="button"
                        className={isU2U ? 'u2u-recent-btn' : 'standard-emoji-btn'}
                        onClick={() => handleSelect(val)}
                        onMouseEnter={() => setPreviewEmoji(val)}
                        onFocus={() => setPreviewEmoji(val)}
                      >
                        {isU2U ? (
                          <U2UEmoji name={val.slice(1, -1)} size={24} />
                        ) : (
                          val
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* U2U Originals Category */}
            {activeCategory === 'u2u-originals' && (
              <div className="emoji-section u2u-originals-section">
                <div className="originals-header-badge">
                  <span className="originals-tag">EXCLUSIVE SET</span>
                  <span className="emoji-section-label">U2U Originals</span>
                </div>
                <div className="u2u-originals-grid">
                  {U2U_ORIGINALS.map(item => (
                    <button
                      key={item.id}
                      type="button"
                      className="u2u-original-btn"
                      onClick={() => handleSelect(item.token)}
                      onMouseEnter={() => setPreviewEmoji(item.token)}
                      onFocus={() => setPreviewEmoji(item.token)}
                      title={`${item.name} — ${item.description}`}
                    >
                      <div className="u2u-emoji-card">
                        <U2UEmoji name={item.id} size={28} />
                        <span className="u2u-original-caption">{item.name}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Standard Unicode Categories */}
            {EMOJI_CATEGORIES.filter(c => !c.isOriginals && activeCategory === c.id).map(cat => (
              <div key={cat.id} className="emoji-section">
                <div className="emoji-section-header">
                  <span className="emoji-section-label">{cat.label}</span>
                  <span className="emoji-section-count">{cat.items.length}</span>
                </div>
                <div className="standard-emojis-grid">
                  {cat.items.map((emoji, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className="standard-emoji-btn"
                      onClick={() => handleSelect(emoji)}
                      onMouseEnter={() => setPreviewEmoji(emoji)}
                      onFocus={() => setPreviewEmoji(emoji)}
                      aria-label={emoji}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {/* ── PREVIEW FOOTER BAR ── */}
      <div className="emoji-preview-bar">
        {previewDetails ? (
          <div className="emoji-preview-content">
            <div className="emoji-preview-icon-wrapper">
              {previewDetails.isOriginal ? (
                <U2UEmoji name={previewDetails.id} size={26} />
              ) : (
                <span className="emoji-preview-unicode">{previewDetails.value}</span>
              )}
            </div>
            <div className="emoji-preview-info">
              <span className="emoji-preview-name">{previewDetails.name}</span>
              {previewDetails.description && (
                <span className="emoji-preview-desc">{previewDetails.description}</span>
              )}
            </div>
          </div>
        ) : (
          <div className="emoji-preview-placeholder">
            <span>Hover or tap an emoji for details</span>
          </div>
        )}
      </div>
    </div>
  );
}
