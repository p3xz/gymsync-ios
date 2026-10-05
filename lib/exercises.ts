// Bundled exercise library: searchable reference for the routine
// editor. Instructions are short coaching cues, not a textbook.

export interface LibraryExercise {
  name: string;
  muscle: string;
  instructions: string;
  cues: string[];
}

export const MUSCLE_GROUPS = [
  'Chest',
  'Back',
  'Legs',
  'Shoulders',
  'Arms',
  'Core',
] as const;

export const EXERCISE_LIBRARY: LibraryExercise[] = [
  // Chest
  { name: 'Bench Press', muscle: 'Chest', instructions: 'Lie on a flat bench, unrack the bar over your chest, lower to mid-chest, press back up.', cues: ['Feet flat on the floor', 'Squeeze shoulder blades together', 'Bar touches mid-chest'] },
  { name: 'Incline Dumbbell Press', muscle: 'Chest', instructions: 'On a 30-45 degree incline bench, press dumbbells from chest level to full extension.', cues: ['Control the descent', 'Do not bounce at the bottom', 'Keep wrists straight'] },
  { name: 'Push-Ups', muscle: 'Chest', instructions: 'Hands under shoulders, body in a straight line, lower chest to the floor and push up.', cues: ['Brace your core', 'Elbows at 45 degrees', 'Full range of motion'] },
  { name: 'Chest Fly', muscle: 'Chest', instructions: 'With dumbbells or cables, open arms wide in an arc and bring them together over the chest.', cues: ['Slight bend in elbows', 'Feel the stretch, not the shoulder', 'Squeeze at the top'] },
  { name: 'Dips', muscle: 'Chest', instructions: 'On parallel bars, lean slightly forward, lower until shoulders are below elbows, press up.', cues: ['Lean forward for chest', 'Stay upright for triceps', 'Avoid shrugging'] },
  // Back
  { name: 'Deadlift', muscle: 'Back', instructions: 'Bar over mid-foot, hinge at hips, grip the bar, drive through heels and stand tall.', cues: ['Flat back, chest up', 'Bar drags up the shins', 'Lock out hips and knees together'] },
  { name: 'Pull-Ups', muscle: 'Back', instructions: 'Hang from a bar with overhand grip, pull your chest to the bar, lower with control.', cues: ['Full hang at the bottom', 'Chest to bar, not chin over', 'No kipping'] },
  { name: 'Barbell Row', muscle: 'Back', instructions: 'Hinge to near-parallel, pull the bar to your lower ribs, lower with control.', cues: ['Back stays flat', 'Pull elbows behind you', 'Squeeze shoulder blades'] },
  { name: 'Lat Pulldown', muscle: 'Back', instructions: 'Seated with thighs braced, pull the bar to your upper chest, control the return.', cues: ['Lean back slightly', 'Drive elbows down', 'Do not swing'] },
  { name: 'Face Pull', muscle: 'Back', instructions: 'At a cable with rope, pull to your forehead with elbows high, externally rotate.', cues: ['Elbows above shoulders', 'Pause at full contraction', 'Light weight, high reps'] },
  { name: 'Seated Cable Row', muscle: 'Back', instructions: 'Seated with straight back, pull the handle to your navel, squeeze, extend arms fully.', cues: ['No rocking', 'Chest proud', 'Stretch lats at extension'] },
  // Legs
  { name: 'Back Squat', muscle: 'Legs', instructions: 'Bar on upper back, descend by breaking at hips and knees, drive up through mid-foot.', cues: ['Knees track over toes', 'Brace hard before descending', 'Depth to parallel or below'] },
  { name: 'Romanian Deadlift', muscle: 'Legs', instructions: 'Soft knees, hinge at hips pushing glutes back, bar slides down thighs to mid-shin.', cues: ['Feel hamstrings stretch', 'Back flat throughout', 'Squeeze glutes at the top'] },
  { name: 'Leg Press', muscle: 'Legs', instructions: 'Feet shoulder-width on the platform, lower until knees are near 90 degrees, press without locking.', cues: ['Do not let hips lift off', 'Keep knees aligned', 'Control the negative'] },
  { name: 'Leg Curl', muscle: 'Legs', instructions: 'Lying or seated, curl the pad toward your glutes, squeeze hamstrings, lower slowly.', cues: ['Hips stay down', 'Full stretch at the bottom', 'No momentum'] },
  { name: 'Leg Extension', muscle: 'Legs', instructions: 'Seated, extend knees to straighten legs against the pad, squeeze quads at the top.', cues: ['Pad above the ankles', 'Pause at the top', 'Lower over 2-3 seconds'] },
  { name: 'Standing Calf Raise', muscle: 'Legs', instructions: 'On a step or machine, rise onto toes as high as possible, pause, lower to a stretch.', cues: ['Full range both ways', 'Pause at the top', 'No bouncing'] },
  { name: 'Bulgarian Split Squat', muscle: 'Legs', instructions: 'Rear foot elevated on a bench, descend on the front leg until thigh is parallel.', cues: ['Torso upright', 'Knee over ankle', 'Drive through the heel'] },
  { name: 'Hip Thrust', muscle: 'Legs', instructions: 'Upper back on a bench, bar over hips, thrust hips up until knees-hips-shoulders align.', cues: ['Chin tucked', 'Squeeze glutes hard at top', 'Knees stay out'] },
  // Shoulders
  { name: 'Overhead Press', muscle: 'Shoulders', instructions: 'Standing or seated, press the bar from shoulders to overhead, lock out without leaning back.', cues: ['Brace glutes and core', 'Head through at the top', 'Bar path stays vertical'] },
  { name: 'Lateral Raise', muscle: 'Shoulders', instructions: 'Dumbbells at sides, raise arms out to shoulder height with a slight elbow bend.', cues: ['Lead with elbows', 'Stop at shoulder height', 'Light weight, strict form'] },
  { name: 'Front Raise', muscle: 'Shoulders', instructions: 'Raise a dumbbell or plate straight in front to shoulder height, lower with control.', cues: ['No swinging', 'Alternate or together', 'Keep torso still'] },
  { name: 'Rear Delt Fly', muscle: 'Shoulders', instructions: 'Hinged over or on incline bench, raise dumbbells out to the sides, squeeze rear delts.', cues: ['Light weight', 'Elbows slightly bent', 'Think wide, not high'] },
  { name: 'Arnold Press', muscle: 'Shoulders', instructions: 'Start with palms facing you at chin level, rotate out as you press overhead.', cues: ['Smooth rotation', 'Control the descent', 'Moderate weight'] },
  // Arms
  { name: 'Bicep Curl', muscle: 'Arms', instructions: 'Standing with dumbbells or barbell, curl to shoulder height keeping elbows pinned.', cues: ['Elbows stay at sides', 'No swinging', 'Full extension at bottom'] },
  { name: 'Tricep Pushdown', muscle: 'Arms', instructions: 'At a cable, elbows pinned to ribs, push the bar down to full arm extension.', cues: ['Only forearms move', 'Squeeze at the bottom', 'Do not lean over the bar'] },
  { name: 'Hammer Curl', muscle: 'Arms', instructions: 'Dumbbells with neutral grip, curl up keeping palms facing each other.', cues: ['Strict form', 'Control the negative', 'Great for forearms too'] },
  { name: 'Overhead Tricep Extension', muscle: 'Arms', instructions: 'Dumbbell or cable behind head, extend arms overhead to full lockout.', cues: ['Elbows point forward', 'Stretch at the bottom', 'Keep upper arms still'] },
  { name: 'Preacher Curl', muscle: 'Arms', instructions: 'Upper arms on the pad, curl the weight up, lower to full extension.', cues: ['Do not lift elbows off pad', 'Full stretch', 'Strict tempo'] },
  // Core
  { name: 'Plank', muscle: 'Core', instructions: 'On forearms and toes, body straight, brace everything, hold for time.', cues: ['Hips level, not sagging', 'Breathe steadily', 'Squeeze glutes'] },
  { name: 'Hanging Leg Raise', muscle: 'Core', instructions: 'Hang from a bar, raise legs to parallel or higher, lower with control.', cues: ['No swinging', 'Curl pelvis up', 'Control the descent'] },
  { name: 'Cable Crunch', muscle: 'Core', instructions: 'Kneeling at a cable, crunch torso down bringing elbows toward knees.', cues: ['Round the spine', 'Heavy enough to feel it', 'Exhale on the crunch'] },
  { name: 'Russian Twist', muscle: 'Core', instructions: 'Seated leaning back, rotate torso side to side with or without weight.', cues: ['Chest up', 'Rotate the torso, not arms', 'Tap the floor each side'] },
  { name: 'Ab Wheel Rollout', muscle: 'Core', instructions: 'Kneeling with the wheel, roll forward keeping hips tucked, pull back.', cues: ['Do not let hips sag', 'Start with short rolls', 'Brace hard'] },
];

export function searchLibrary(query: string, muscle?: string): LibraryExercise[] {
  const q = query.trim().toLowerCase();
  return EXERCISE_LIBRARY.filter((ex) => {
    const matchesMuscle = !muscle || ex.muscle === muscle;
    const matchesQuery =
      q.length === 0 ||
      ex.name.toLowerCase().includes(q) ||
      ex.muscle.toLowerCase().includes(q);
    return matchesMuscle && matchesQuery;
  });
}
