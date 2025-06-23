// Utility functions for calculating experiment progress

export interface ExperimentWithCounts {
  id: string;
  config?: {
    evaluationsPerComparison?: number;
  };
  _count: {
    comparisons: number;
    evaluations: number;
  };
}

export function getProgressPercentage(experiment: ExperimentWithCounts): number {
  if (experiment._count.comparisons === 0) return 0;

  const evaluationsPerComparison = experiment.config?.evaluationsPerComparison || -1;
  const targetEvaluations = experiment._count.comparisons * evaluationsPerComparison;
  
  return Math.min((experiment._count.evaluations / targetEvaluations) * 100, 100);
}

export function getTargetEvaluations(experiment: ExperimentWithCounts): number {
  const evaluationsPerComparison = experiment.config?.evaluationsPerComparison || -1;
  return experiment._count.comparisons * evaluationsPerComparison;
}

export function getOverallProgress(experiments: ExperimentWithCounts[]): {
  totalEvaluations: number;
  totalTargetEvaluations: number;
  progressPercentage: number;
} {
  const totalEvaluations = experiments.reduce((sum, exp) => sum + exp._count.evaluations, 0);
  const totalTargetEvaluations = experiments.reduce((sum, exp) => sum + getTargetEvaluations(exp), 0);
  
  const progressPercentage = totalTargetEvaluations > 0 
    ? Math.min((totalEvaluations / totalTargetEvaluations) * 100, 100)
    : 0;
  
  return {
    totalEvaluations,
    totalTargetEvaluations,
    progressPercentage
  };
}