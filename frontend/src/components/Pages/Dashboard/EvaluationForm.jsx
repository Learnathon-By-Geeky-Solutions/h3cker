import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Button, Textarea, Radio, Spinner, Alert } from 'flowbite-react';
import { Award, ThumbsUp, Check, ArrowLeft } from 'lucide-react';
import VideoService from '../../../utils/VideoService';

const RatingQuestion = ({ question, value, onChange, readonly }) => {
  const ratings = [1, 2, 3, 4, 5];
  
  return (
    <div className="space-y-3">
      <div className="flex justify-between items-start">
        <p className="text-white font-medium mb-2">{question.question_text}</p>
        {question.required && !readonly && (
          <span className="text-xs text-red-500 font-medium">Required</span>
        )}
      </div>
      
      <div className="flex items-center justify-between gap-1">
        {ratings.map((rating) => (
          <div key={rating} className="flex flex-col items-center">
            <Radio
              id={`${question.id}-${rating}`}
              name={`rating-${question.id}`}
              value={rating}
              checked={parseInt(value) === rating}
              onChange={() => onChange(question.id, rating.toString())}
              disabled={readonly}
              className="mb-1"
            />
            <label 
              htmlFor={`${question.id}-${rating}`}
              className={`text-sm ${parseInt(value) === rating ? 'text-blue-400' : 'text-gray-400'}`}
            >
              {rating}
            </label>
          </div>
        ))}
      </div>
      <div className="flex justify-between text-xs text-gray-400 px-1">
        <span>Not at all</span>
        <span>Very much</span>
      </div>
    </div>
  );
};

const TextQuestion = ({ question, value, onChange, readonly }) => {
  return (
    <div className="space-y-3">
      <div className="flex justify-between items-start">
        <p className="text-white font-medium mb-2">{question.question_text}</p>
        {question.required && !readonly && (
          <span className="text-xs text-red-500 font-medium">Required</span>
        )}
      </div>
      
      <Textarea
        id={`text-${question.id}`}
        value={value || ''}
        onChange={(e) => onChange(question.id, e.target.value)}
        placeholder="Your answer here..."
        rows={3}
        disabled={readonly}
      />
    </div>
  );
};

const MultipleChoiceQuestion = ({ question, value, onChange, readonly }) => {
  const options = question.options || [];
  
  return (
    <div className="space-y-3">
      <div className="flex justify-between items-start">
        <p className="text-white font-medium mb-2">{question.question_text}</p>
        {question.required && !readonly && (
          <span className="text-xs text-red-500 font-medium">Required</span>
        )}
      </div>
      
      <div className="space-y-2">
        {options.map((option) => (
          <div key={`${question.id}-${option}`} className="flex items-center">
            <Radio
              id={`${question.id}-${option}`}
              name={`choice-${question.id}`}
              value={option}
              checked={value === option}
              onChange={() => onChange(question.id, option)}
              disabled={readonly}
              className="mr-2"
            />
            <label 
              htmlFor={`${question.id}-${option}`}
              className={`text-sm ${value === option ? 'text-white' : 'text-gray-300'}`}
            >
              {option}
            </label>
          </div>
        ))}
      </div>
    </div>
  );
};

const EvaluationForm = ({ videoId, onComplete, onBack }) => {
  const [form, setForm] = useState(null);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [pointsAwarded, setPointsAwarded] = useState(0);
  const [userAlreadySubmitted, setUserAlreadySubmitted] = useState(false);

  useEffect(() => {
    const fetchForm = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await VideoService.getEvaluationForm(videoId);
        
        if (response) {
          setForm(response);
          setUserAlreadySubmitted(response.user_submitted);
          
          // Initialize answers object
          const initialAnswers = {};
          if (response.questions) {
            response.questions.forEach(q => {
              initialAnswers[q.id] = '';
            });
          }
          setAnswers(initialAnswers);
        } else {
          setError('No evaluation form found for this video.');
        }
      } catch (err) {
        console.error('Error fetching evaluation form:', err);
        setError('Failed to load evaluation form. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    if (videoId) {
      fetchForm();
    }
  }, [videoId]);

  const handleAnswerChange = (questionId, value) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: value
    }));
  };

  const validateAnswers = () => {
    if (!form?.questions) return true;
    
    const requiredQuestions = form.questions.filter(q => q.required);
    for (const question of requiredQuestions) {
      if (!answers[question.id] || answers[question.id].trim() === '') {
        setError(`Please answer the question: ${question.question_text}`);
        return false;
      }
    }
    
    return true;
  };

  const handleSubmit = async () => {
    if (!validateAnswers()) return;
    
    try {
      setSubmitting(true);
      setError(null);
      
      const response = await VideoService.submitEvaluationResponse(form.id, answers);
      
      setSuccess('Thank you for your feedback!');
      setSubmitted(true);
      setPointsAwarded(response.points_awarded || 10);
      
      if (onComplete) {
        setTimeout(() => {
          onComplete(response);
        }, 2000);
      }
    } catch (err) {
      console.error('Error submitting evaluation:', err);
      setError('Failed to submit your evaluation. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderQuestion = (question) => {
    const value = answers[question.id] || '';
    const isReadOnly = submitted || userAlreadySubmitted;
    
    switch (question.question_type) {
      case 'rating':
        return (
          <RatingQuestion
            key={question.id}
            question={question}
            value={value}
            onChange={handleAnswerChange}
            readonly={isReadOnly}
          />
        );
      case 'text':
        return (
          <TextQuestion
            key={question.id}
            question={question}
            value={value}
            onChange={handleAnswerChange}
            readonly={isReadOnly}
          />
        );
      case 'multiple_choice':
        return (
          <MultipleChoiceQuestion
            key={question.id}
            question={question}
            value={value}
            onChange={handleAnswerChange}
            readonly={isReadOnly}
          />
        );
      default:
        return null;
    }
  };

  const renderSuccessMessage = () => (
    <div className="text-center py-6">
      <div className="w-16 h-16 rounded-full bg-green-500 text-white mx-auto flex items-center justify-center mb-5 ring-4 ring-green-500/30">
        <Check size={32} strokeWidth={3} />
      </div>
      <h3 className="text-xl font-bold text-white mb-2">
        Evaluation Submitted!
      </h3>
      <p className="text-gray-300 mb-3">
        Thank you for sharing your feedback.
      </p>
      <div className="bg-indigo-900/30 border border-indigo-700/50 rounded-lg p-4 max-w-sm mx-auto mb-5">
        <p className="text-white flex items-center justify-center font-medium">
          <Award className="text-yellow-400 mr-2" size={20} />
          You earned {pointsAwarded} points!
        </p>
      </div>
      {onBack && (
        <Button color="blue" onClick={onBack}>
          Return to Video
        </Button>
      )}
    </div>
  );

  const renderAlreadySubmitted = () => (
    <div className="text-center py-6">
      <div className="w-16 h-16 rounded-full bg-blue-500 text-white mx-auto flex items-center justify-center mb-5 ring-4 ring-blue-500/30">
        <Check size={32} strokeWidth={3} />
      </div>
      <h3 className="text-xl font-bold text-white mb-2">
        Already Submitted
      </h3>
      <p className="text-gray-300 mb-5">
        You have already submitted feedback for this video. Thank you for your participation!
      </p>
      {onBack && (
        <Button color="blue" onClick={onBack}>
          Return to Video
        </Button>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Spinner size="xl" />
      </div>
    );
  }

  if (error && !form) {
    return (
      <Alert color="failure" onDismiss={() => setError(null)}>
        {error}
        {onBack && (
          <div className="mt-4">
            <Button color="gray" onClick={onBack}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Video
            </Button>
          </div>
        )}
      </Alert>
    );
  }

  if (userAlreadySubmitted) {
    return renderAlreadySubmitted();
  }

  if (submitted) {
    return renderSuccessMessage();
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white mb-2">{form?.title || 'Video Evaluation'}</h2>
        {form?.description && (
          <p className="text-gray-300">{form.description}</p>
        )}
        {!form?.description && (
          <p className="text-gray-300">Please take a moment to evaluate this video. Your feedback is valuable to content creators.</p>
        )}
      </div>

      {error && (
        <Alert color="failure" onDismiss={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert color="success" onDismiss={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-4 mb-4">
        <div className="flex items-start">
          <Award className="text-yellow-400 mr-3 flex-shrink-0 mt-0.5" size={22} />
          <p className="text-gray-300">
            Complete this evaluation to earn <span className="text-white font-medium">10 points</span> (worth <span className="text-white font-medium">100 BDT</span>).
          </p>
        </div>
      </div>

      {form?.questions?.length > 0 ? (
        <div className="space-y-8">
          {form.questions
            .sort((a, b) => a.order - b.order)
            .map((question) => (
              <div key={question.id} className="bg-gray-800/60 border border-gray-700 rounded-lg p-4">
                {renderQuestion(question)}
              </div>
            ))}
        </div>
      ) : (
        <div className="bg-gray-800/60 border border-gray-700 rounded-lg p-6 text-center">
          <p className="text-gray-400">No evaluation questions available.</p>
        </div>
      )}

      <div className="flex justify-between pt-4 border-t border-gray-700">
        {onBack && (
          <Button color="gray" outline onClick={onBack}>
            <ArrowLeft className="mr-2 h-5 w-5" />
            Back to Video
          </Button>
        )}
        <Button
          color="success"
          onClick={handleSubmit}
          disabled={submitting || !form?.questions?.length}
          isProcessing={submitting}
        >
          {submitting ? 'Submitting...' : (
            <>
              <ThumbsUp className="mr-2 h-5 w-5" />
              Submit Feedback
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

RatingQuestion.propTypes = {
  question: PropTypes.object.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onChange: PropTypes.func.isRequired,
  readonly: PropTypes.bool
};

TextQuestion.propTypes = {
  question: PropTypes.object.isRequired,
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  readonly: PropTypes.bool
};

MultipleChoiceQuestion.propTypes = {
  question: PropTypes.object.isRequired,
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  readonly: PropTypes.bool
};

EvaluationForm.propTypes = {
  videoId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  onComplete: PropTypes.func,
  onBack: PropTypes.func
};

export default EvaluationForm;