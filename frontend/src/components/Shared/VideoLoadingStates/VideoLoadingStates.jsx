import React from 'react';
import PropTypes from 'prop-types';
import { AlertCircle } from 'lucide-react';
import { Spinner, Alert, Button } from 'flowbite-react';
import { Link } from 'react-router-dom';

export const LoadingState = ({ message = 'Loading videos...' }) => (
  <div className="flex items-center justify-center h-96 w-full">
    <div className="flex flex-col items-center">
      <Spinner size="xl" color="info" />
      <p className="mt-4 text-gray-300">{message}</p>
    </div>
  </div>
);

LoadingState.propTypes = {
  message: PropTypes.string
};

export const ErrorState = ({ error, onDismiss, onBack }) => (
  <Alert
    color="failure"
    icon={AlertCircle}
    className="mb-4 w-full"
    onDismiss={onDismiss}
  >
    <span className="font-medium">Error:</span> {error}
    {onBack && (
      <Button color="failure" onClick={onBack} className="mt-2">
        Go Back
      </Button>
    )}
  </Alert>
);

ErrorState.propTypes = {
  error: PropTypes.string.isRequired,
  onDismiss: PropTypes.func,
  onBack: PropTypes.func
};

export const EmptyState = ({ 
  title = 'No Videos Available', 
  message = 'There are no public videos available at this time.',
  action,
  actionLink,
  actionText
}) => (
  <div className="flex flex-col items-center justify-center h-96 w-full">
    <div className="text-center">
      <h2 className="text-2xl font-bold text-white mb-4">{title}</h2>
      <p className="text-gray-400 mb-8">{message}</p>
      {(action || actionLink) && (
        actionLink ? (
          <Link to={actionLink}>
            <Button color="blue" className="glossy-button">
              {actionText || 'Upload Video'}
            </Button>
          </Link>
        ) : (
          <Button color="blue" onClick={action} className="glossy-button">
            {actionText || 'Clear Search'}
          </Button>
        )
      )}
    </div>
  </div>
);

EmptyState.propTypes = {
  title: PropTypes.string,
  message: PropTypes.string,
  action: PropTypes.func,
  actionLink: PropTypes.string,
  actionText: PropTypes.string
};