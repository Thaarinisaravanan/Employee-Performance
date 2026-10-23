// Final Score = Goal Achievement x 50% + Manager Rating x 30% + Self Rating x 20%
const CRITERIA = ['Quality of Work', 'Productivity', 'Teamwork', 'Communication', 'Punctuality'];
const WEIGHTS = { goals: 0.5, manager: 0.3, self: 0.2 };

// Ratings are 1-5, converted to a 0-100 scale
const ratingToScore = (ratings = []) =>
  ratings.length ? (ratings.reduce((s, r) => s + r.score, 0) / ratings.length) * 20 : null;

// Weighted average of goal progress (progress capped at 100)
const goalAchievement = (goals = []) => {
  const totalWeight = goals.reduce((s, g) => s + g.weight, 0);
  if (!totalWeight) return null;
  return goals.reduce((s, g) => s + Math.min(g.progress, 100) * g.weight, 0) / totalWeight;
};

const gradeFor = (score) => {
  if (score >= 90) return 'Outstanding';
  if (score >= 75) return 'Exceeds Expectations';
  if (score >= 60) return 'Meets Expectations';
  return 'Needs Improvement';
};

// If a component is missing (e.g. no goals), the remaining weights are re-normalised
const computeFinal = ({ goals, managerRatings, selfRatings }) => {
  const parts = {
    goals: goalAchievement(goals),
    manager: ratingToScore(managerRatings),
    self: ratingToScore(selfRatings),
  };
  let total = 0;
  let weightUsed = 0;
  Object.keys(parts).forEach((k) => {
    if (parts[k] !== null) {
      total += parts[k] * WEIGHTS[k];
      weightUsed += WEIGHTS[k];
    }
  });
  const finalScore = weightUsed ? Math.round((total / weightUsed) * 10) / 10 : 0;
  return {
    goalScore: parts.goals === null ? 0 : Math.round(parts.goals * 10) / 10,
    finalScore,
    grade: gradeFor(finalScore),
  };
};

module.exports = { CRITERIA, WEIGHTS, ratingToScore, goalAchievement, gradeFor, computeFinal };
