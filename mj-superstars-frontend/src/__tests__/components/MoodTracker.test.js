// ============================================================
// MJ's Superstars - Mood Tracker Component Tests
// ============================================================

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mockApiResponse, mockMoodEntry } from '../setup';

// Mock Mood Tracker Components
const MOODS = [
  { value: 1, emoji: '😢', label: 'Very Bad' },
  { value: 2, emoji: '😔', label: 'Bad' },
  { value: 3, emoji: '😐', label: 'Okay' },
  { value: 4, emoji: '🙂', label: 'Good' },
  { value: 5, emoji: '😊', label: 'Great' }
];

const FACTORS = [
  { id: 'sleep', label: 'Sleep', icon: '😴' },
  { id: 'exercise', label: 'Exercise', icon: '🏃' },
  { id: 'social', label: 'Social', icon: '👥' },
  { id: 'work', label: 'Work', icon: '💼' },
  { id: 'weather', label: 'Weather', icon: '☀️' },
  { id: 'health', label: 'Health', icon: '❤️' }
];

const MoodPicker = ({ value, onChange }) => (
  <div data-testid="mood-picker">
    {MOODS.map(mood => (
      <button
        key={mood.value}
        onClick={() => onChange(mood.value)}
        data-testid={`mood-${mood.value}`}
        className={value === mood.value ? 'selected' : ''}
        aria-pressed={value === mood.value}
      >
        <span>{mood.emoji}</span>
        <span>{mood.label}</span>
      </button>
    ))}
  </div>
);

const FactorSelector = ({ selected = [], onChange }) => {
  const toggleFactor = (factorId) => {
    if (selected.includes(factorId)) {
      onChange(selected.filter(f => f !== factorId));
    } else {
      onChange([...selected, factorId]);
    }
  };

  return (
    <div data-testid="factor-selector">
      {FACTORS.map(factor => (
        <button
          key={factor.id}
          onClick={() => toggleFactor(factor.id)}
          data-testid={`factor-${factor.id}`}
          className={selected.includes(factor.id) ? 'selected' : ''}
          aria-pressed={selected.includes(factor.id)}
        >
          <span>{factor.icon}</span>
          <span>{factor.label}</span>
        </button>
      ))}
    </div>
  );
};

const MoodForm = ({ onSubmit }) => {
  const [mood, setMood] = React.useState(null);
  const [factors, setFactors] = React.useState([]);
  const [note, setNote] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [success, setSuccess] = React.useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!mood) {
      setError('Please select a mood');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/moods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: mood, factors, note })
      });

      if (!response.ok) {
        throw new Error('Failed to log mood');
      }

      const data = await response.json();
      setSuccess(true);
      onSubmit?.(data);

      // Reset form
      setMood(null);
      setFactors([]);
      setNote('');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} data-testid="mood-form">
      <h2>How are you feeling?</h2>

      <MoodPicker value={mood} onChange={setMood} />

      <h3>What's influencing your mood?</h3>
      <FactorSelector selected={factors} onChange={setFactors} />

      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Add a note (optional)"
        data-testid="mood-note"
        maxLength={500}
      />

      <button
        type="submit"
        disabled={isSubmitting || !mood}
        data-testid="submit-mood"
      >
        {isSubmitting ? 'Logging...' : 'Log Mood'}
      </button>

      {error && <div data-testid="error-message">{error}</div>}
      {success && <div data-testid="success-message">Mood logged! 🎉</div>}
    </form>
  );
};

describe('Mood Tracker', () => {
  beforeEach(() => {
    global.fetch.mockClear();
  });

  // ============================================================
  // MOOD PICKER TESTS
  // ============================================================

  describe('MoodPicker', () => {
    test('renders all 5 mood options', () => {
      render(<MoodPicker value={null} onChange={jest.fn()} />);

      MOODS.forEach(mood => {
        expect(screen.getByTestId(`mood-${mood.value}`)).toBeInTheDocument();
      });
    });

    test('displays emoji and label for each mood', () => {
      render(<MoodPicker value={null} onChange={jest.fn()} />);

      expect(screen.getByText('😢')).toBeInTheDocument();
      expect(screen.getByText('Very Bad')).toBeInTheDocument();
      expect(screen.getByText('😊')).toBeInTheDocument();
      expect(screen.getByText('Great')).toBeInTheDocument();
    });

    test('calls onChange when mood is selected', async () => {
      const onChange = jest.fn();
      render(<MoodPicker value={null} onChange={onChange} />);

      await userEvent.click(screen.getByTestId('mood-4'));

      expect(onChange).toHaveBeenCalledWith(4);
    });

    test('shows selected state for current value', () => {
      render(<MoodPicker value={3} onChange={jest.fn()} />);

      expect(screen.getByTestId('mood-3')).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByTestId('mood-1')).toHaveAttribute('aria-pressed', 'false');
    });
  });

  // ============================================================
  // FACTOR SELECTOR TESTS
  // ============================================================

  describe('FactorSelector', () => {
    test('renders all factor options', () => {
      render(<FactorSelector selected={[]} onChange={jest.fn()} />);

      FACTORS.forEach(factor => {
        expect(screen.getByTestId(`factor-${factor.id}`)).toBeInTheDocument();
      });
    });

    test('toggles factor selection on click', async () => {
      const onChange = jest.fn();
      render(<FactorSelector selected={[]} onChange={onChange} />);

      await userEvent.click(screen.getByTestId('factor-sleep'));

      expect(onChange).toHaveBeenCalledWith(['sleep']);
    });

    test('removes factor when clicked again', async () => {
      const onChange = jest.fn();
      render(<FactorSelector selected={['sleep', 'exercise']} onChange={onChange} />);

      await userEvent.click(screen.getByTestId('factor-sleep'));

      expect(onChange).toHaveBeenCalledWith(['exercise']);
    });

    test('shows selected state for active factors', () => {
      render(<FactorSelector selected={['sleep', 'work']} onChange={jest.fn()} />);

      expect(screen.getByTestId('factor-sleep')).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByTestId('factor-work')).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByTestId('factor-exercise')).toHaveAttribute('aria-pressed', 'false');
    });

    test('allows multiple factor selection', async () => {
      let selected = [];
      const onChange = jest.fn((newSelected) => {
        selected = newSelected;
      });

      const { rerender } = render(<FactorSelector selected={selected} onChange={onChange} />);

      await userEvent.click(screen.getByTestId('factor-sleep'));
      rerender(<FactorSelector selected={selected} onChange={onChange} />);

      await userEvent.click(screen.getByTestId('factor-exercise'));

      expect(onChange).toHaveBeenLastCalledWith(['sleep', 'exercise']);
    });
  });

  // ============================================================
  // MOOD FORM TESTS
  // ============================================================

  describe('MoodForm', () => {
    test('renders form with all elements', () => {
      render(<MoodForm />);

      expect(screen.getByText('How are you feeling?')).toBeInTheDocument();
      expect(screen.getByTestId('mood-picker')).toBeInTheDocument();
      expect(screen.getByTestId('factor-selector')).toBeInTheDocument();
      expect(screen.getByTestId('mood-note')).toBeInTheDocument();
      expect(screen.getByTestId('submit-mood')).toBeInTheDocument();
    });

    test('submit button disabled without mood selection', () => {
      render(<MoodForm />);

      expect(screen.getByTestId('submit-mood')).toBeDisabled();
    });

    test('submit button enabled after mood selection', async () => {
      render(<MoodForm />);

      await userEvent.click(screen.getByTestId('mood-4'));

      expect(screen.getByTestId('submit-mood')).not.toBeDisabled();
    });

    test('shows error when submitting without mood', async () => {
      render(<MoodForm />);

      // Try to submit form without selecting mood
      const form = screen.getByTestId('mood-form');
      fireEvent.submit(form);

      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toHaveTextContent('Please select a mood');
      });
    });

    test('successful mood submission', async () => {
      const onSubmit = jest.fn();

      global.fetch.mockResolvedValueOnce(mockApiResponse(mockMoodEntry));

      render(<MoodForm onSubmit={onSubmit} />);

      // Select mood
      await userEvent.click(screen.getByTestId('mood-4'));

      // Select factors
      await userEvent.click(screen.getByTestId('factor-sleep'));
      await userEvent.click(screen.getByTestId('factor-exercise'));

      // Add note
      await userEvent.type(screen.getByTestId('mood-note'), 'Feeling good today!');

      // Submit
      await userEvent.click(screen.getByTestId('submit-mood'));

      await waitFor(() => {
        expect(screen.getByTestId('success-message')).toHaveTextContent('Mood logged!');
      });

      expect(global.fetch).toHaveBeenCalledWith('/api/moods', expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          value: 4,
          factors: ['sleep', 'exercise'],
          note: 'Feeling good today!'
        })
      }));

      expect(onSubmit).toHaveBeenCalled();
    });

    test('resets form after successful submission', async () => {
      global.fetch.mockResolvedValueOnce(mockApiResponse(mockMoodEntry));

      render(<MoodForm />);

      // Fill form
      await userEvent.click(screen.getByTestId('mood-4'));
      await userEvent.click(screen.getByTestId('factor-sleep'));
      await userEvent.type(screen.getByTestId('mood-note'), 'Test note');

      // Submit
      await userEvent.click(screen.getByTestId('submit-mood'));

      await waitFor(() => {
        expect(screen.getByTestId('success-message')).toBeInTheDocument();
      });

      // Form should be reset
      expect(screen.getByTestId('mood-note')).toHaveValue('');
      expect(screen.getByTestId('factor-sleep')).toHaveAttribute('aria-pressed', 'false');
    });

    test('handles API error', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Failed to log mood'));

      render(<MoodForm />);

      await userEvent.click(screen.getByTestId('mood-3'));
      await userEvent.click(screen.getByTestId('submit-mood'));

      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toHaveTextContent('Failed to log mood');
      });
    });

    test('shows loading state during submission', async () => {
      global.fetch.mockImplementationOnce(() =>
        new Promise(resolve =>
          setTimeout(() => resolve(mockApiResponse(mockMoodEntry)), 100)
        )
      );

      render(<MoodForm />);

      await userEvent.click(screen.getByTestId('mood-4'));
      await userEvent.click(screen.getByTestId('submit-mood'));

      expect(screen.getByTestId('submit-mood')).toHaveTextContent('Logging...');
      expect(screen.getByTestId('submit-mood')).toBeDisabled();

      await waitFor(() => {
        expect(screen.getByTestId('submit-mood')).toHaveTextContent('Log Mood');
      });
    });

    test('note field has character limit', () => {
      render(<MoodForm />);

      const noteInput = screen.getByTestId('mood-note');
      expect(noteInput).toHaveAttribute('maxLength', '500');
    });
  });

  // ============================================================
  // ACCESSIBILITY TESTS
  // ============================================================

  describe('Accessibility', () => {
    test('mood buttons have accessible labels', () => {
      render(<MoodPicker value={null} onChange={jest.fn()} />);

      MOODS.forEach(mood => {
        const button = screen.getByTestId(`mood-${mood.value}`);
        expect(button).toHaveTextContent(mood.label);
      });
    });

    test('factor buttons have accessible labels', () => {
      render(<FactorSelector selected={[]} onChange={jest.fn()} />);

      FACTORS.forEach(factor => {
        const button = screen.getByTestId(`factor-${factor.id}`);
        expect(button).toHaveTextContent(factor.label);
      });
    });

    test('aria-pressed reflects selection state', async () => {
      render(<MoodPicker value={null} onChange={jest.fn()} />);

      MOODS.forEach(mood => {
        expect(screen.getByTestId(`mood-${mood.value}`))
          .toHaveAttribute('aria-pressed', 'false');
      });
    });
  });
});
