import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Loader2, Sparkles, User, Tag, ArrowRight } from 'lucide-react';
import { api } from '../../lib/api';
import { Profile } from '../../lib/types';

interface SearchBarProps {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  onSelectUser: (username: string) => void;
  onSearchSubmit?: (q: string) => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  searchQuery,
  setSearchQuery,
  onSelectUser,
  onSearchSubmit,
}) => {
  const [inputValue, setInputValue] = useState(searchQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(searchQuery);
  const [matchingUsers, setMatchingUsers] = useState<Profile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync internal input value if parent searchQuery changes externally
  useEffect(() => {
    setInputValue(searchQuery);
  }, [searchQuery]);

  // 300ms Debounce utility
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(inputValue.trim());
    }, 300);

    return () => clearTimeout(handler);
  }, [inputValue]);

  // Fetch matching user profiles on debounced query change
  useEffect(() => {
    let isCancelled = false;

    if (!debouncedQuery) {
      setMatchingUsers([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    api
      .searchProfiles(debouncedQuery)
      .then((results) => {
        if (!isCancelled) {
          setMatchingUsers(results);
          setIsSearching(false);
          setIsOpen(true);
        }
      })
      .catch((err) => {
        if (!isCancelled) {
          console.error('User search error:', err);
          setIsSearching(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [debouncedQuery]);

  // Handle outside click to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard navigation (ArrowDown, ArrowUp, Enter, Escape)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      inputRef.current?.blur();
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen && inputValue.trim()) {
        setIsOpen(true);
        return;
      }
      setSelectedIndex((prev) => (prev < matchingUsers.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && matchingUsers[selectedIndex]) {
        handleUserClick(matchingUsers[selectedIndex].username);
      } else {
        // Trigger post feed search
        setSearchQuery(inputValue);
        onSearchSubmit?.(inputValue);
        setIsOpen(false);
      }
    }
  };

  const handleUserClick = (username: string) => {
    setIsOpen(false);
    onSelectUser(username);
  };

  const handleClear = () => {
    setInputValue('');
    setSearchQuery('');
    setMatchingUsers([]);
    setIsOpen(false);
    inputRef.current?.focus();
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-xl">
      {/* Search Input Box */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-600">
          {isSearching ? (
            <Loader2 className="w-4 h-4 text-[#0284c7] animate-spin" />
          ) : (
            <Search className="w-4 h-4 text-slate-600" />
          )}
        </div>

        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => {
            if (inputValue.trim()) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Search professionals, skills, or topics..."
          className="w-full pl-10 pr-20 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-[#7BD1FA]/30 focus:border-[#7BD1FA] focus:bg-white transition-all"
        />

        <div className="absolute inset-y-0 right-0 pr-2 flex items-center gap-1.5">
          {inputValue && (
            <button
              onClick={handleClear}
              className="p-1 text-slate-600 hover:text-slate-800 rounded-md hover:bg-slate-200/60 cursor-pointer transition-colors"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <span className="text-[11px] font-mono text-slate-600 bg-white border border-slate-200 rounded px-1.5 py-0.5 shadow-2xs">
            ⌘K
          </span>
        </div>
      </div>

      {/* Live Floating Dropdown for Matching User Results */}
      {isOpen && inputValue.trim().length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-100">
          {/* Section Header */}
          <div className="px-3.5 py-2 bg-slate-50/90 border-b border-slate-100 flex items-center justify-between text-[11px] font-semibold text-slate-600">
            <span className="flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-[#0284c7]" />
              <span>Matching Professionals</span>
            </span>
            <span>
              {isSearching ? (
                'Searching...'
              ) : (
                `${matchingUsers.length} found`
              )}
            </span>
          </div>

          {/* Results List */}
          <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
            {isSearching && matchingUsers.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-600 flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-[#0284c7]" />
                <span>Searching user directory...</span>
              </div>
            ) : matchingUsers.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-600">
                No matching profiles found for <strong className="text-slate-800">"{inputValue}"</strong>.
              </div>
            ) : (
              matchingUsers.map((user, idx) => {
                const isSelected = selectedIndex === idx;
                const initials = user.full_name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase();

                return (
                  <button
                    key={user.id || user.username}
                    onClick={() => handleUserClick(user.username)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`w-full p-3 flex items-center gap-3 text-left transition-colors cursor-pointer ${
                      isSelected ? 'bg-sky-50/70' : 'hover:bg-slate-50'
                    }`}
                  >
                    {/* User Avatar */}
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#7BD1FA] to-sky-700 flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-2xs overflow-hidden aspect-square">
                      {user.avatar_url ? (
                        <img
                          src={user.avatar_url}
                          alt={user.full_name}
                          className="w-full h-full object-cover aspect-square"
                          onError={(e) => {
                            (e.currentTarget as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <span>{initials}</span>
                      )}
                    </div>

                    {/* User Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 truncate">
                          {user.full_name}
                        </span>
                        <span className="text-[11px] text-slate-600 font-mono">
                          @{user.username}
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-600 truncate mt-0.5">
                        {user.headline || 'AI Systems Engineer & Architecture Lead'}
                      </p>

                      {/* Matching Industry or Interest Badge */}
                      {user.industry && (
                        <div className="flex items-center gap-1 mt-1 text-[10px] text-[#0369a1]">
                          <Tag className="w-3 h-3 text-[#0284c7]" />
                          <span className="font-medium bg-sky-50 px-1.5 py-0.2 rounded border border-sky-100">
                            {user.industry}
                          </span>
                          {user.interests && user.interests.length > 0 && (
                            <span className="text-slate-600">• {user.interests[0]}</span>
                          )}
                        </div>
                      )}
                    </div>

                    <ArrowRight className="w-4 h-4 text-slate-600 shrink-0 opacity-0 group-hover:opacity-100" />
                  </button>
                );
              })
            )}
          </div>

          {/* Bottom Action: Search Feed for query */}
          <div className="p-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs">
            <button
              onClick={() => {
                setSearchQuery(inputValue);
                onSearchSubmit?.(inputValue);
                setIsOpen(false);
              }}
              className="w-full text-left font-semibold text-[#0284c7] hover:text-[#0369a1] flex items-center gap-1.5 cursor-pointer py-1 px-1.5 rounded-lg hover:bg-sky-50"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Search all posts & discussions for <strong>"{inputValue}"</strong></span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
