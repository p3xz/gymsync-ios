// Paid program catalog. Programs are one-time purchases once checkout
// lands (see lib/pro.ts for the payments hook point). The training plans
// themselves are real and usable as previews today.

export interface ProgramExercise {
  name: string;
  sets: number;
  reps: string;
}

export interface ProgramDay {
  day: string;
  focus: string;
  exercises: ProgramExercise[];
}

export interface Program {
  id: string;
  name: string;
  tagline: string;
  level: 'Beginner' | 'Intermediate' | 'All levels';
  weeks: number;
  daysPerWeek: number;
  /** Display price only — no charges happen in the app yet. */
  price: string;
  description: string;
  schedule: ProgramDay[];
}

export const PROGRAMS: Program[] = [
  {
    id: 'ppl-6day',
    name: 'Push Pull Legs',
    tagline: 'The classic 6-day hypertrophy split',
    level: 'Intermediate',
    weeks: 8,
    daysPerWeek: 6,
    price: '₹199',
    description:
      'Six training days a week rotating push, pull, and legs. Each muscle gets hit twice weekly with a mix of heavy compounds and accessories.',
    schedule: [
      {
        day: 'Day 1',
        focus: 'Push (Chest, Shoulders, Triceps)',
        exercises: [
          { name: 'Bench Press', sets: 4, reps: '6-8' },
          { name: 'Overhead Press', sets: 3, reps: '8-10' },
          { name: 'Incline Dumbbell Press', sets: 3, reps: '8-12' },
          { name: 'Lateral Raise', sets: 3, reps: '12-15' },
          { name: 'Tricep Pushdown', sets: 3, reps: '10-12' },
        ],
      },
      {
        day: 'Day 2',
        focus: 'Pull (Back, Biceps)',
        exercises: [
          { name: 'Deadlift', sets: 3, reps: '5-6' },
          { name: 'Pull-Ups', sets: 3, reps: '6-10' },
          { name: 'Barbell Row', sets: 3, reps: '8-10' },
          { name: 'Face Pull', sets: 3, reps: '12-15' },
          { name: 'Bicep Curl', sets: 3, reps: '10-12' },
        ],
      },
      {
        day: 'Day 3',
        focus: 'Legs (Quads, Hamstrings, Calves)',
        exercises: [
          { name: 'Back Squat', sets: 4, reps: '6-8' },
          { name: 'Romanian Deadlift', sets: 3, reps: '8-10' },
          { name: 'Leg Press', sets: 3, reps: '10-12' },
          { name: 'Leg Curl', sets: 3, reps: '10-12' },
          { name: 'Standing Calf Raise', sets: 4, reps: '12-15' },
        ],
      },
      {
        day: 'Day 4',
        focus: 'Push (repeat Day 1)',
        exercises: [
          { name: 'Bench Press', sets: 4, reps: '6-8' },
          { name: 'Overhead Press', sets: 3, reps: '8-10' },
          { name: 'Incline Dumbbell Press', sets: 3, reps: '8-12' },
          { name: 'Lateral Raise', sets: 3, reps: '12-15' },
          { name: 'Tricep Pushdown', sets: 3, reps: '10-12' },
        ],
      },
      {
        day: 'Day 5',
        focus: 'Pull (repeat Day 2)',
        exercises: [
          { name: 'Deadlift', sets: 3, reps: '5-6' },
          { name: 'Pull-Ups', sets: 3, reps: '6-10' },
          { name: 'Barbell Row', sets: 3, reps: '8-10' },
          { name: 'Face Pull', sets: 3, reps: '12-15' },
          { name: 'Bicep Curl', sets: 3, reps: '10-12' },
        ],
      },
      {
        day: 'Day 6',
        focus: 'Legs (repeat Day 3)',
        exercises: [
          { name: 'Back Squat', sets: 4, reps: '6-8' },
          { name: 'Romanian Deadlift', sets: 3, reps: '8-10' },
          { name: 'Leg Press', sets: 3, reps: '10-12' },
          { name: 'Leg Curl', sets: 3, reps: '10-12' },
          { name: 'Standing Calf Raise', sets: 4, reps: '12-15' },
        ],
      },
    ],
  },
  {
    id: 'strong-5x5',
    name: 'Strong 5×5',
    tagline: 'Simple strength: five lifts, three days',
    level: 'Beginner',
    weeks: 12,
    daysPerWeek: 3,
    price: '₹149',
    description:
      'The classic beginner strength program. Two alternating full-body workouts, adding a little weight every session. Nothing fancy — it just works.',
    schedule: [
      {
        day: 'Workout A',
        focus: 'Squat, Bench, Row',
        exercises: [
          { name: 'Back Squat', sets: 5, reps: '5' },
          { name: 'Bench Press', sets: 5, reps: '5' },
          { name: 'Barbell Row', sets: 5, reps: '5' },
        ],
      },
      {
        day: 'Workout B',
        focus: 'Squat, Press, Deadlift',
        exercises: [
          { name: 'Back Squat', sets: 5, reps: '5' },
          { name: 'Overhead Press', sets: 5, reps: '5' },
          { name: 'Deadlift', sets: 1, reps: '5' },
        ],
      },
    ],
  },
  {
    id: 'fat-loss-4day',
    name: 'Beginner Fat-Loss',
    tagline: 'Full-body circuits, 4 days a week',
    level: 'All levels',
    weeks: 6,
    daysPerWeek: 4,
    price: '₹149',
    description:
      'Full-body sessions built around compound lifts and short rests to keep the heart rate up. Pair with a sensible calorie deficit for best results.',
    schedule: [
      {
        day: 'Day 1',
        focus: 'Full Body A',
        exercises: [
          { name: 'Back Squat', sets: 3, reps: '10-12' },
          { name: 'Bench Press', sets: 3, reps: '10-12' },
          { name: 'Barbell Row', sets: 3, reps: '10-12' },
          { name: 'Plank', sets: 3, reps: '60s' },
        ],
      },
      {
        day: 'Day 2',
        focus: 'Full Body B',
        exercises: [
          { name: 'Romanian Deadlift', sets: 3, reps: '10-12' },
          { name: 'Overhead Press', sets: 3, reps: '10-12' },
          { name: 'Lat Pulldown', sets: 3, reps: '10-12' },
          { name: 'Russian Twist', sets: 3, reps: '20' },
        ],
      },
      {
        day: 'Day 3',
        focus: 'Full Body A',
        exercises: [
          { name: 'Back Squat', sets: 3, reps: '10-12' },
          { name: 'Bench Press', sets: 3, reps: '10-12' },
          { name: 'Barbell Row', sets: 3, reps: '10-12' },
          { name: 'Plank', sets: 3, reps: '60s' },
        ],
      },
      {
        day: 'Day 4',
        focus: 'Full Body B',
        exercises: [
          { name: 'Romanian Deadlift', sets: 3, reps: '10-12' },
          { name: 'Overhead Press', sets: 3, reps: '10-12' },
          { name: 'Lat Pulldown', sets: 3, reps: '10-12' },
          { name: 'Russian Twist', sets: 3, reps: '20' },
        ],
      },
    ],
  },
];
