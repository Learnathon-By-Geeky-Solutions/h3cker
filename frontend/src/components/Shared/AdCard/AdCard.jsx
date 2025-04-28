import React from 'react';
import PropTypes from 'prop-types';
import { Card, Badge } from 'flowbite-react';
import { TrendingUp, ThumbsUp, Play, Clock } from 'lucide-react';
import { formatDistanceToNow, parseISO, isValid } from 'date-fns';

const AdCard = ({ ad, onPlayClick }) => {
  const getThumbnail = () => {
    if (ad.imageUrl || ad.thumbnail_url) return ad.imageUrl || ad.thumbnail_url;
    return null;
  };

  const formatDateString = (dateString) => {
    let formattedDate = 'Unknown date';
    if (dateString) {
      try {
        const dateObject = parseISO(dateString);
        if (isValid(dateObject)) {
          formattedDate = formatDistanceToNow(dateObject, { addSuffix: true });
        }
      } catch (error) {
        console.error("Error parsing date:", dateString, error);
      }
    }
    return formattedDate;
  };

  const createdAt = formatDateString(ad.upload_date);
  const isFeatured = ad.featured || ad.popular || false;
  const hasVideo = Boolean(ad.video_url || ad.videoUrl);
  const placeholderSrc = `/api/placeholder/400/225?text=${encodeURIComponent(ad.title || 'Video')}`;

  const handleClick = (e) => {
    e.preventDefault();
    if (onPlayClick && hasVideo) {
      onPlayClick(ad);
    } else if (onPlayClick) {
      console.warn("Play clicked but no video URL found for:", ad.title);
    }
  };

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-all duration-300 bg-gray-800 border-gray-700 card-hover group p-0">
      <div className="relative aspect-video">
        <img
          src={getThumbnail() || placeholderSrc}
          alt={ad.title || 'Video thumbnail'}
          className="w-full h-full object-cover rounded-t-lg"
          loading="lazy"
          onError={(e) => {
            e.target.onerror = null;
            if (e.target.src !== placeholderSrc) {
              e.target.src = placeholderSrc;
            }
          }}
        />
        
        {isFeatured && (
          <div className="absolute top-2 left-2">
            <Badge color="purple" icon={TrendingUp} className="flex items-center text-xs">
              Featured
            </Badge>
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
          {hasVideo && (
            <button
              onClick={handleClick}
              aria-label={`Play ${ad.title}`}
              className="w-10 h-10 bg-blue-600 bg-opacity-90 rounded-full flex items-center justify-center transform scale-90 hover:scale-100 transition-all duration-300 shadow-lg hover:bg-blue-500"
              type="button"
            >
              <Play size={20} className="text-white ml-0.5" />
            </button>
          )}
        </div>
      </div>

      <div className="p-3">
        <h5 className="text-sm font-medium text-white line-clamp-1" title={ad.title || 'Untitled Video'}>
          {ad.title || 'Untitled Video'}
        </h5>

        <div className="flex justify-between items-center mt-2 text-xs text-gray-400 space-x-2">
          <div className="flex items-center overflow-hidden whitespace-nowrap">
            <Play size={12} className="mr-1 flex-shrink-0" />
            <span className="truncate">{ad.views != null ? ad.views.toLocaleString() : '0'} views</span>
          </div>
          <div className="flex items-center overflow-hidden whitespace-nowrap">
            <ThumbsUp size={12} className="mr-1 flex-shrink-0" />
            <span className="truncate">{ad.likes != null ? ad.likes.toLocaleString() : '0'}</span>
          </div>
          <div className="flex items-center overflow-hidden whitespace-nowrap">
            <Clock size={12} className="mr-1 flex-shrink-0" />
            <span className="truncate" title={ad.upload_date ? new Date(parseISO(ad.upload_date)).toLocaleString() : 'Unknown date'}>
              {createdAt}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
};

AdCard.propTypes = {
  ad: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
    title: PropTypes.string,
    imageUrl: PropTypes.string,
    thumbnail_url: PropTypes.string,
    videoUrl: PropTypes.string, 
    video_url: PropTypes.string,
    views: PropTypes.number,
    likes: PropTypes.number,
    upload_date: PropTypes.string,
    brand: PropTypes.string,
    uploader_name: PropTypes.string,
    featured: PropTypes.bool,
    popular: PropTypes.bool,
    description: PropTypes.string
  }).isRequired,
  onPlayClick: PropTypes.func
};

export default AdCard;