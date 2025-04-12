import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import PropTypes from 'prop-types';
import { 
  HiSearch, 
  HiX, 
  HiOutlineClock, 
  HiTrendingUp, 
  HiMicrophone, 
  HiOutlineArrowUp
} from "react-icons/hi";
import VideoService from "../../../utils/VideoService";

const MAX_HISTORY = 5;
const MAX_SUGGESTIONS = 6;

const SearchBar = ({ 
  className = "", 
  placeholder = "Search...", 
  onSearch,
  initialValue = "",
  showTrending = true,
  showMic = true,
  autoFocus = false
}) => {
  // States
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [searchQuery, setSearchQuery] = useState(initialValue);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchHistory, setSearchHistory] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [trendingSearches, setTrendingSearches] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Refs
  const searchRef = useRef(null);
  const suggestionBoxRef = useRef(null);
  const navigate = useNavigate();
  
  // Load search history from localStorage on component mount
  useEffect(() => {
    const savedHistory = localStorage.getItem('searchHistory');
    if (savedHistory) {
      try {
        setSearchHistory(JSON.parse(savedHistory).slice(0, MAX_HISTORY));
      } catch (e) {
        console.error("Error loading search history:", e);
        setSearchHistory([]);
      }
    }
    
    // Simulate trending searches
    setTrendingSearches([
      "popular videos", 
      "latest uploads",
      "tutorial",
      "gaming",
      "music videos"
    ]);
  }, []);
  
  // Handle clicks outside the search bar to close suggestions
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        suggestionBoxRef.current && 
        !suggestionBoxRef.current.contains(event.target) &&
        searchRef.current &&
        !searchRef.current.contains(event.target)
      ) {
        setShowSuggestions(false);
      }
    };
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);
  
  // Generate suggestions based on input 
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSuggestions([]);
      return;
    }
    
    const fetchSuggestions = async () => {
      setIsLoading(true);
      
      try {
        // This is a simulated version using local search
        const allVideos = await VideoService.getVideoFeed();
        
        if (Array.isArray(allVideos)) {
          // Process the videos and generate suggestions
          const processedSuggestions = generateSuggestions(allVideos, searchQuery);
          setSuggestions(processedSuggestions);
        }
      } catch (e) {
        console.error("Error fetching suggestions:", e);
      } finally {
        setIsLoading(false);
      }
    };
    
    const debounceTimer = setTimeout(() => {
      fetchSuggestions();
    }, 300);
    
    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);
  
  // Extract terms from videos to use for suggestions
  const extractSearchTerms = (videos) => {
    const terms = {
      titles: [],
      categories: [],
      uploaders: []
    };
    
    videos.forEach(video => {
      if (video.title) terms.titles.push(video.title.toLowerCase());
      if (video.category) terms.categories.push(video.category.toLowerCase());
      if (video.uploader_name) terms.uploaders.push(video.uploader_name.toLowerCase());
    });
    
    return terms;
  };

  // Creating ranked suggestions based on different match types
  const createRankedSuggestions = (query, queryTerms, terms) => {
    const suggestions = [];
    
    terms.titles.forEach(title => {
      if (title.includes(query) && title !== query) {
        suggestions.push({ text: title, score: 100 });
      }
    });
    
    if (queryTerms.length > 0) {
      processPartialMatches(terms.titles, queryTerms, suggestions);
    }
    
    terms.categories.forEach(category => {
      if (category.includes(query)) {
        suggestions.push({ text: category, score: 60 });
      }
    });
    
    terms.uploaders.forEach(uploader => {
      if (uploader.includes(query)) {
        suggestions.push({ text: uploader, score: 50 });
      }
    });
    
    return suggestions;
  };

  const checkSingleWordMatch = (word, queryTerm, term) => {
    if (word.startsWith(queryTerm)) {
      return { text: term, score: 90 };
    }

    if (word.includes(queryTerm) && word !== queryTerm) {
      return { text: term, score: 80 };
    }
    if (queryTerm.length > 3 && word.includes(queryTerm.substring(0, queryTerm.length - 1))) {
      return { text: term, score: 70 };
    }

    return null; 
  };
  
  // Process partial word matches 
  const processPartialMatches = (terms, queryTerms, results) => {
    terms.forEach(term => {
      const words = term.split(/\s+/);
      checkWordMatches(words, queryTerms, term, results);
    });
  };
  
  // Helper function to check for different types of word matches
  const checkWordMatches = (words, queryTerms, term, results) => {
    for (const queryTerm of queryTerms) {
      if (queryTerm.length < 3) continue; 

      for (const word of words) {
        const match = checkSingleWordMatch(word, queryTerm, term);
        if (match) {
          results.push(match);
        
          break; 
        }
      }
    }
  };
  

  const generateSuggestions = (videos, query) => {
 
    const queryLower = query.toLowerCase();
    const queryTerms = queryLower.split(/\s+/).filter(t => t.length > 0);
    
    const terms = extractSearchTerms(videos);

    const rankedSuggestions = createRankedSuggestions(queryLower, queryTerms, terms);

    const uniqueSuggestions = deduplicateSuggestions(rankedSuggestions);

    return [...uniqueSuggestions]
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_SUGGESTIONS)
      .map(item => item.text);
  };
  
  // Remove duplicate suggestions, keeping highest scored version
  const deduplicateSuggestions = (suggestions) => {
    const uniqueSuggestions = [];
    const seen = new Set();
    
    suggestions.forEach(item => {
      if (!seen.has(item.text)) {
        seen.add(item.text);
        uniqueSuggestions.push(item);
      }
    });
    
    return uniqueSuggestions;
  };
  
  useEffect(() => {
    if (searchHistory.length > 0) {
      localStorage.setItem('searchHistory', JSON.stringify(searchHistory));
    }
  }, [searchHistory]);
  
  const handleSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      performSearch(searchQuery);
    }
  };
  
  // Handle voice search
  const handleVoiceSearch = () => {
    if (!('webkitSpeechRecognition' in window)) {
      alert("Speech recognition is not available in your browser.");
      return;
    }
    
    try {
   
      const SpeechRecognitionConstructor = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognitionConstructor();
      
      recognition.lang = 'en-US';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      
      recognition.onresult = (event) => {
        const speechResult = event.results[0][0].transcript;
        setSearchQuery(speechResult);
        performSearch(speechResult);
      };
      
      recognition.start();
    } catch (e) {
      console.error("Speech recognition error:", e);
      alert("Could not start voice search. Please try again.");
    }
  };
  
  // Main search function
  const performSearch = (query) => {
  
    if (searchHistory[0] !== query) {
      setSearchHistory(prev => [
        query, 
        ...prev.filter(item => item !== query)
      ].slice(0, MAX_HISTORY));
    }
    
    setShowSuggestions(false);
    
    if (onSearch) {
      onSearch(query);
    } else {
 
      navigate(`/videos?q=${encodeURIComponent(query)}`);
    }
  };
  

  const clearSearch = () => {
    setSearchQuery('');
    searchRef.current?.focus();
  };
  

  const handleSuggestionClick = (suggestion) => {
    setSearchQuery(suggestion);
    performSearch(suggestion);
  };
  

  const renderHistoryItem = (item, index) => {
    const itemId = `history-item-${item.replace(/\s+/g, '-')}-${index}`;
    
    return (
      <button
        key={itemId}
        className="w-full px-4 py-2 hover:bg-gray-700 cursor-pointer flex items-center justify-between text-gray-300 hover:text-white transition-colors text-left"
        onClick={() => handleSuggestionClick(item)}
      >
        <div className="flex items-center">
          <HiOutlineClock className="mr-3 w-4 h-4 text-gray-500" />
          <span>{item}</span>
        </div>
        <button 
          onClick={(e) => {
            e.stopPropagation();
            setSearchQuery(item);
            searchRef.current?.focus();
          }}
          className="text-blue-500 hover:text-blue-400"
          aria-label="Use this search term"
        >
          <HiOutlineArrowUp className="w-4 h-4 transform rotate-45" />
        </button>
      </button>
    );
  };
  

  const renderSuggestionItem = (suggestion, index) => {
    const suggestionId = `suggestion-item-${suggestion.replace(/\s+/g, '-')}-${index}`;
    
    return (
      <button
        key={suggestionId}
        className="w-full px-4 py-2 hover:bg-gray-700 cursor-pointer flex items-center text-gray-300 hover:text-white transition-colors text-left"
        onClick={() => handleSuggestionClick(suggestion)}
      >
        <HiSearch className="mr-3 w-4 h-4 text-gray-500" />
        <span>{suggestion}</span>
      </button>
    );
  };
  
  const renderTrendingItem = (trend, index) => {
    const trendId = `trend-item-${trend.replace(/\s+/g, '-')}-${index}`;
    
    return (
      <button
        key={trendId}
        className="w-full px-4 py-2 hover:bg-gray-700 cursor-pointer flex items-center text-gray-300 hover:text-white transition-colors text-left"
        onClick={() => handleSuggestionClick(trend)}
      >
        <HiTrendingUp className="mr-3 w-4 h-4 text-gray-500" />
        <span>{trend}</span>
      </button>
    );
  };
  
  return (
    <div className="relative">
      <form 
        onSubmit={handleSubmit} 
        className={`relative transition-all duration-300 ${isSearchFocused ? 'scale-[1.02]' : ''} ${className}`}
        ref={searchRef}
      >
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={placeholder}
          className="w-full py-2 pl-10 pr-10 bg-gray-800/70 border border-gray-700 focus:border-blue-500 rounded-full text-white placeholder-gray-400 outline-none transition-all duration-300 focus:ring-2 focus:ring-blue-500/50 shadow-lg"
          onFocus={() => {
            setIsSearchFocused(true);
            setShowSuggestions(true);
          }}
          autoFocus={autoFocus}
          ref={searchRef}
        />
        <div className="absolute inset-y-0 left-0 flex items-center pl-3">
          <HiSearch className="w-5 h-5 text-gray-400" />
        </div>
        
        {searchQuery && (
          <button
            type="button"
            onClick={clearSearch}
            className="absolute inset-y-0 right-10 flex items-center pr-1"
            aria-label="Clear search"
          >
            <HiX className="w-5 h-5 text-gray-400 hover:text-white transition-colors" />
          </button>
        )}
        
        {showMic && (
          <button
            type="button"
            onClick={handleVoiceSearch}
            className="absolute inset-y-0 right-0 flex items-center pr-3"
            aria-label="Voice search"
          >
            <HiMicrophone className="w-5 h-5 text-gray-400 hover:text-blue-500 transition-colors" />
          </button>
        )}
      </form>

      {showSuggestions && (
        <div 
          className="absolute z-50 mt-2 w-full bg-gray-800 rounded-lg shadow-xl border border-gray-700 py-2 max-h-96 overflow-y-auto"
          ref={suggestionBoxRef}
        >
          {isLoading && (
            <div className="px-4 py-2 text-gray-400 text-center">
              Loading suggestions...
            </div>
          )}
   
          {!isLoading && searchHistory.length > 0 && !searchQuery && (
            <div className="mb-2">
              <div className="px-4 py-1 text-xs text-gray-500">Recent searches</div>
              {searchHistory.map(renderHistoryItem)}
              <div className="border-t border-gray-700 my-1"></div>
            </div>
          )}

          {!isLoading && suggestions.length > 0 && (
            <div className="mb-2">
              {suggestions.map(renderSuggestionItem)}
            </div>
          )}

          {!isLoading && showTrending && !searchQuery && trendingSearches.length > 0 && (
            <div>
              <div className="px-4 py-1 text-xs text-gray-500">Trending</div>
              {trendingSearches.map(renderTrendingItem)}
            </div>
          )}
          
          {!isLoading && searchQuery && suggestions.length === 0 && (
            <div className="px-4 py-3 text-gray-400 text-center">
              No matching suggestions
            </div>
          )}
        </div>
      )}
    </div>
  );
};

SearchBar.propTypes = {
  className: PropTypes.string,
  placeholder: PropTypes.string,
  onSearch: PropTypes.func,
  initialValue: PropTypes.string,
  showTrending: PropTypes.bool,
  showMic: PropTypes.bool,
  autoFocus: PropTypes.bool
};

export default SearchBar;