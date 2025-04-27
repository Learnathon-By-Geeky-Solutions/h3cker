import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Button, 
  TextInput, 
  Textarea, 
  Select, 
  Alert, 
  Badge, 
  Spinner,
  Label
} from 'flowbite-react';
import { 
  PlusCircle, 
  GripVertical, 
  Trash2, 
  Edit2, 
  Save, 
  X, 
  ArrowLeft, 
  ArrowRight,
  Info
} from 'lucide-react';
import PropTypes from 'prop-types';

const QUESTION_TYPES = [
  { value: 'rating', label: 'Rating Scale (1-5)' },
  { value: 'text', label: 'Open Text Response' },
  { value: 'multiple_choice', label: 'Multiple Choice' }
];

const DEFAULT_QUESTIONS = [
  {
    question_text: 'How would you rate the effectiveness of this ad?',
    question_type: 'rating',
    required: true,
    order: 0
  },
  {
    question_text: 'What aspects of the ad did you find most appealing?',
    question_type: 'text',
    required: true,
    order: 1
  },
  {
    question_text: 'Which message from the ad resonated with you most?',
    question_type: 'multiple_choice',
    options: ['Product features', 'Emotional appeal', 'Brand messaging', 'Visual elements', 'Other'],
    required: true,
    order: 2
  },
  {
    question_text: 'Would this ad make you more likely to purchase the product?',
    question_type: 'rating',
    required: true,
    order: 3
  }
];

const QuestionItem = ({ 
  question, 
  index, 
  onEdit, 
  onDelete, 
  isEditing,
  onSave,
  onCancel,
  editForm,
  setEditForm,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast
}) => {
  const getTypeLabel = () => {
    const type = QUESTION_TYPES.find(t => t.value === question.question_type);
    return type ? type.label : question.question_type;
  };

  const renderOptions = () => {
    if (question.question_type !== 'multiple_choice' || !question.options) return null;
    
    return (
      <div className="mt-2">
        <p className="text-sm text-gray-300 font-medium mb-1">Options:</p>
        <div className="flex flex-wrap gap-2">
          {question.options.map((option, idx) => (
            <Badge key={idx} color="gray" className="bg-gray-700">
              {option}
            </Badge>
          ))}
        </div>
      </div>
    );
  };

  const renderOptionEditForm = () => {
    if (editForm.question_type !== 'multiple_choice') return null;
    
    return (
      <div className="mt-3">
        <Label htmlFor="options" value="Options (one per line)" className="text-white" />
        <Textarea
          id="options"
          value={(editForm.options || []).join('\n')}
          onChange={(e) => {
            const options = e.target.value.split('\n')
              .map(o => o.trim())
              .filter(o => o.length > 0);
            setEditForm({...editForm, options});
          }}
          rows={3}
          placeholder="Enter one option per line"
        />
      </div>
    );
  };

  if (isEditing) {
    return (
      <div className="bg-gray-700 rounded-lg p-4 mb-3 border border-gray-600">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center">
            <GripVertical size={18} className="text-gray-400 mr-2" />
            <h3 className="text-white font-medium">Edit Question {index + 1}</h3>
          </div>
        </div>
        
        <div className="space-y-3">
          <div>
            <Label htmlFor="question_text" value="Question Text" className="text-white" />
            <TextInput
              id="question_text"
              value={editForm.question_text}
              onChange={(e) => setEditForm({...editForm, question_text: e.target.value})}
              placeholder="Enter your question text"
              required
            />
          </div>
          
          <div>
            <Label htmlFor="question_type" value="Question Type" className="text-white" />
            <Select
              id="question_type"
              value={editForm.question_type}
              onChange={(e) => setEditForm({...editForm, question_type: e.target.value})}
            >
              {QUESTION_TYPES.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </Select>
          </div>
          
          {renderOptionEditForm()}
          
          <div className="flex items-center">
            <Label htmlFor="required" className="text-white mr-2">Required:</Label>
            <input
              type="checkbox"
              id="required"
              checked={editForm.required}
              onChange={(e) => setEditForm({...editForm, required: e.target.checked})}
              className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-600"
            />
          </div>
          
          <div className="flex justify-end space-x-2 pt-2">
            <Button color="gray" size="sm" onClick={onCancel}>
              <X size={16} className="mr-1" /> Cancel
            </Button>
            <Button color="blue" size="sm" onClick={() => onSave(index)}>
              <Save size={16} className="mr-1" /> Save
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-700 rounded-lg p-4 mb-3 border border-gray-600">
      <div className="flex items-start justify-between">
        <div className="flex items-center">
          <div className="flex flex-col mr-2">
            <Button 
              size="xs" 
              color="gray" 
              pill 
              disabled={isFirst} 
              onClick={() => onMoveUp(index)}
              className="mb-1"
            >
              <ArrowLeft size={14} className="rotate-90" />
            </Button>
            <Button 
              size="xs" 
              color="gray" 
              pill 
              disabled={isLast} 
              onClick={() => onMoveDown(index)}
            >
              <ArrowRight size={14} className="rotate-90" />
            </Button>
          </div>
          <div>
            <div className="flex items-center">
              <h3 className="text-white font-medium mr-2">{index + 1}. {question.question_text}</h3>
              {question.required && (
                <Badge color="red" className="text-xs">Required</Badge>
              )}
            </div>
            <div className="mt-1 text-sm text-gray-400">
              Type: {getTypeLabel()}
            </div>
            {renderOptions()}
          </div>
        </div>
        
        <div className="flex space-x-2">
          <Button color="gray" size="xs" pill onClick={() => onEdit(index)}>
            <Edit2 size={14} />
          </Button>
          <Button color="failure" size="xs" pill onClick={() => onDelete(index)}>
            <Trash2 size={14} />
          </Button>
        </div>
      </div>
    </div>
  );
};

const EvaluationFormEditor = ({ 
  onSubmit,
  onBack,
  videoTitle,
  existingForm = null,
  loading = false
}) => {
  const [questions, setQuestions] = useState([]);
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [editingIndex, setEditingIndex] = useState(-1);
  const [editForm, setEditForm] = useState({});
  const [error, setError] = useState(null);
  const [rewardValue] = useState(10);

  useEffect(() => {
    if (existingForm) {
      setFormTitle(existingForm.title || '');
      setFormDescription(existingForm.description || '');
      setQuestions(existingForm.questions || []);
    } else {
      const defaultTitle = videoTitle ? `Evaluation for "${videoTitle}"` : 'Video Evaluation Form';
      setFormTitle(defaultTitle);
      setFormDescription('Please provide your feedback on this video advertisement.');
      setQuestions(DEFAULT_QUESTIONS.map((q, i) => ({...q, id: `new-${i}`})));
    }
  }, [existingForm, videoTitle]);

  const handleMoveUp = (index) => {
    if (index === 0) return;
    
    const newQuestions = [...questions];
    [newQuestions[index - 1], newQuestions[index]] = [newQuestions[index], newQuestions[index - 1]];
    
    const updatedQuestions = newQuestions.map((q, i) => ({...q, order: i}));
    setQuestions(updatedQuestions);
  };

  const handleMoveDown = (index) => {
    if (index === questions.length - 1) return;
    
    const newQuestions = [...questions];
    [newQuestions[index], newQuestions[index + 1]] = [newQuestions[index + 1], newQuestions[index]];
    
    const updatedQuestions = newQuestions.map((q, i) => ({...q, order: i}));
    setQuestions(updatedQuestions);
  };

  const handleAddQuestion = () => {
    const newQuestion = {
      id: `new-${Date.now()}`,
      question_text: '',
      question_type: 'rating',
      required: true,
      order: questions.length
    };
    
    setQuestions([...questions, newQuestion]);
    setEditingIndex(questions.length);
    setEditForm(newQuestion);
  };

  const handleEditQuestion = (index) => {
    setEditingIndex(index);
    setEditForm({...questions[index]});
  };

  const handleSaveQuestion = (index) => {
    if (!editForm.question_text.trim()) {
      setError('Question text cannot be empty');
      return;
    }
    
    const updatedQuestions = [...questions];
    updatedQuestions[index] = {
      ...updatedQuestions[index],
      ...editForm
    };
    
    setQuestions(updatedQuestions);
    setEditingIndex(-1);
    setEditForm({});
    setError(null);
  };

  const handleCancelEdit = () => {
    setEditingIndex(-1);
    setEditForm({});
    setError(null);
  };

  const handleDeleteQuestion = (index) => {
    const updatedQuestions = questions.filter((_, i) => i !== index);
    const reorderedQuestions = updatedQuestions.map((q, i) => ({...q, order: i}));
    setQuestions(reorderedQuestions);
  };

  const handleSubmit = () => {
    if (!formTitle.trim()) {
      setError('Form title is required');
      return;
    }
    
    if (questions.length === 0) {
      setError('At least one question is required');
      return;
    }
    
    const formData = {
      title: formTitle,
      description: formDescription,
      questions: questions.map((q, index) => ({...q, order: index}))
    };
    
    onSubmit(formData);
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-xl font-semibold text-white">Create Evaluation Form</h3>
        <p className="text-gray-300 mt-1">
          Design the questions viewers will answer after watching your video
        </p>
      </div>

      {error && (
        <Alert color="failure" onDismiss={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Card className="bg-gray-800 border-gray-700">
        <div className="space-y-4">
          <div>
            <Label htmlFor="formTitle" value="Form Title" className="text-white" />
            <TextInput
              id="formTitle"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder="Enter a title for this evaluation form"
              required
            />
          </div>
          
          <div>
            <Label htmlFor="formDescription" value="Description (Optional)" className="text-white" />
            <Textarea
              id="formDescription"
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              placeholder="Add instructions for respondents"
              rows={2}
            />
          </div>
        </div>
      </Card>
      
      <div className="bg-blue-900/30 border border-blue-800 rounded-lg p-4 mb-2">
        <div className="flex items-start">
          <Info size={20} className="text-blue-400 mr-2 flex-shrink-0 mt-1" />
          <div>
            <h4 className="text-white font-medium">Viewer Rewards</h4>
            <p className="text-sm text-gray-300">
              Viewers will receive <span className="font-medium text-white">{rewardValue} points</span> for 
              completing this evaluation form, worth <span className="font-medium text-white">{rewardValue * 10} BDT</span>.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-gray-800 border-gray-700 rounded-lg p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-white">Form Questions</h3>
          <Button color="blue" size="sm" onClick={handleAddQuestion}>
            <PlusCircle size={16} className="mr-1" /> Add Question
          </Button>
        </div>
        
        <div className="space-y-2">
          {questions.map((question, index) => (
            <QuestionItem
              key={question.id || index}
              question={question}
              index={index}
              onEdit={handleEditQuestion}
              onDelete={handleDeleteQuestion}
              isEditing={editingIndex === index}
              onSave={handleSaveQuestion}
              onCancel={handleCancelEdit}
              editForm={editForm}
              setEditForm={setEditForm}
              onMoveUp={handleMoveUp}
              onMoveDown={handleMoveDown}
              isFirst={index === 0}
              isLast={index === questions.length - 1}
            />
          ))}
          
          {questions.length === 0 && (
            <div className="text-center py-6 bg-gray-700/50 rounded-lg border border-dashed border-gray-600">
              <p className="text-gray-400">No questions added yet. Click "Add Question" to get started.</p>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-between items-center pt-5 border-t border-gray-600 mt-8">
        <Button
          type="button"
          onClick={onBack}
          color="gray"
          outline
          disabled={loading}
        >
          <ArrowLeft className="mr-2 h-5 w-5" />
          Back
        </Button>
        <Button
          type="button"
          onClick={handleSubmit}
          color="blue"
          disabled={loading || questions.length === 0}
          isProcessing={loading}
          processingSpinner={<Spinner size="sm" />}
        >
          {loading ? 'Saving...' : (
            <>
              Continue <ArrowRight className="ml-2 h-5 w-5" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

QuestionItem.propTypes = {
  question: PropTypes.object.isRequired,
  index: PropTypes.number.isRequired,
  onEdit: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  isEditing: PropTypes.bool.isRequired,
  onSave: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  editForm: PropTypes.object.isRequired,
  setEditForm: PropTypes.func.isRequired,
  onMoveUp: PropTypes.func.isRequired,
  onMoveDown: PropTypes.func.isRequired,
  isFirst: PropTypes.bool.isRequired,
  isLast: PropTypes.bool.isRequired
};

EvaluationFormEditor.propTypes = {
  onSubmit: PropTypes.func.isRequired,
  onBack: PropTypes.func.isRequired,
  videoTitle: PropTypes.string,
  existingForm: PropTypes.object,
  loading: PropTypes.bool
};

export default EvaluationFormEditor;