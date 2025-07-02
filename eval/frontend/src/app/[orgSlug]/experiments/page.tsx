'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useOrganization } from '@/lib/organization-context';
import { ExperimentService } from '@/lib/experiment-service';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Beaker, Clock, Play, Pause, CheckCircle, Archive, Loader2 } from 'lucide-react';
import { Experiment } from '@prisma/client';
import { ExperimentStatus } from '@/lib/utils/status';

type ExperimentWithCounts = Experiment & {
  _count: {
    twoVideoComparisonTasks: number;
    singleVideoEvaluationTasks: number;
    participants: number;
    twoVideoComparisonSubmissions: number;
    singleVideoEvaluationSubmissions: number;
  };
};

const statusConfig = {
  [ExperimentStatus.DRAFT]: { label: 'Draft', color: 'bg-gray-500', icon: Clock },
  [ExperimentStatus.READY]: { label: 'Ready', color: 'bg-blue-500', icon: Play },
  [ExperimentStatus.ACTIVE]: { label: 'Active', color: 'bg-green-500', icon: Play },
  [ExperimentStatus.PAUSED]: { label: 'Paused', color: 'bg-yellow-500', icon: Pause },
  [ExperimentStatus.COMPLETED]: { label: 'Completed', color: 'bg-purple-500', icon: CheckCircle },
};

export default function OrganizationExperimentsPage() {
  const params = useParams();
  const orgSlug = params.orgSlug as string;
  const { currentOrganization } = useOrganization();
  const [experiments, setExperiments] = useState<ExperimentWithCounts[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    if (currentOrganization) {
      loadExperiments();
    }
  }, [currentOrganization]);

  const loadExperiments = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!currentOrganization) {
        throw new Error('No organization selected');
      }

      console.log('🔍 [DEBUG] Experiments page - Current organization:', currentOrganization);
      console.log('🔍 [DEBUG] Experiments page - Making API call to:', `/api/organizations/${currentOrganization.id}/experiments`);
      
      const response = await fetch(`/api/organizations/${currentOrganization.id}/experiments`);
      if (!response.ok) {
        throw new Error('Failed to load experiments');
      }
      
      const data = await response.json();
      setExperiments(data.experiments || []);
    } catch (err) {
      console.error('Error loading experiments:', err);
      setError(err instanceof Error ? err.message : 'Failed to load experiments');
    } finally {
      setLoading(false);
    }
  };

  const filterExperiments = (status?: string) => {
    if (!status) return experiments;
    return experiments.filter(exp => exp.status === status);
  };

  const getFilteredExperiments = () => {
    switch (activeTab) {
      case 'draft':
        return filterExperiments(ExperimentStatus.DRAFT);
      case 'active':
        return filterExperiments(ExperimentStatus.ACTIVE);
      case 'completed':
        return filterExperiments(ExperimentStatus.COMPLETED);
      default:
        return experiments;
    }
  };

  const getTotalSubmissions = (experiment: ExperimentWithCounts) => {
    return experiment._count.twoVideoComparisonSubmissions + experiment._count.singleVideoEvaluationSubmissions;
  };

  const getTotalTasks = (experiment: ExperimentWithCounts) => {
    return experiment._count.twoVideoComparisonTasks + experiment._count.singleVideoEvaluationTasks;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <p className="text-red-800">Error: {error}</p>
        <Button onClick={loadExperiments} variant="outline" size="sm" className="mt-2">
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Experiments</h1>
          <p className="text-muted-foreground">
            Manage your organization&apos;s experiments and evaluations
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Create Experiment
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Experiments</CardTitle>
            <Beaker className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{experiments.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <Play className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filterExperiments(ExperimentStatus.ACTIVE).length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filterExperiments(ExperimentStatus.COMPLETED).length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Submissions</CardTitle>
            <Archive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {experiments.reduce((sum, exp) => sum + getTotalSubmissions(exp), 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Experiments List */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList>
          <TabsTrigger value="all">All ({experiments.length})</TabsTrigger>
          <TabsTrigger value="draft">Draft ({filterExperiments(ExperimentStatus.DRAFT).length})</TabsTrigger>
          <TabsTrigger value="active">Active ({filterExperiments(ExperimentStatus.ACTIVE).length})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({filterExperiments(ExperimentStatus.COMPLETED).length})</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4">
          {getFilteredExperiments().length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8">
                <Beaker className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No experiments found</h3>
                <p className="text-muted-foreground text-center mb-4">
                  {activeTab === 'all' 
                    ? "You haven&apos;t created any experiments yet. Start by creating your first experiment."
                    : `No experiments with status: ${activeTab}`
                  }
                </p>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Create First Experiment
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {getFilteredExperiments().map((experiment) => {
                const statusInfo = statusConfig[experiment.status as ExperimentStatus] || statusConfig[ExperimentStatus.DRAFT];
                const StatusIcon = statusInfo.icon;
                const progress = getTotalTasks(experiment) > 0 
                  ? (getTotalSubmissions(experiment) / getTotalTasks(experiment)) * 100 
                  : 0;

                return (
                  <Card key={experiment.id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <CardTitle className="text-lg">{experiment.name}</CardTitle>
                            <Badge variant="outline" className="gap-1">
                              <StatusIcon className="h-3 w-3" />
                              {statusInfo.label}
                            </Badge>
                          </div>
                          {experiment.description && (
                            <CardDescription>{experiment.description}</CardDescription>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {experiment.evaluationMode === 'COMPARISON' ? 'Comparison' : 'Single Video'}
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold">{getTotalTasks(experiment)}</div>
                          <div className="text-xs text-muted-foreground">Tasks</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold">{getTotalSubmissions(experiment)}</div>
                          <div className="text-xs text-muted-foreground">Submissions</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold">{experiment._count.participants}</div>
                          <div className="text-xs text-muted-foreground">Participants</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold">{Math.round(progress)}%</div>
                          <div className="text-xs text-muted-foreground">Progress</div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="text-sm text-muted-foreground">
                          Created {new Date(experiment.createdAt).toLocaleDateString()}
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm">
                            View Details
                          </Button>
                          <Button variant="outline" size="sm">
                            Edit
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}