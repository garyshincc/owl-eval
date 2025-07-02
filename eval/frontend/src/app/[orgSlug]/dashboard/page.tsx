'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useOrganization } from '@/lib/organization-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Building2, Users, Beaker, BarChart3, Plus, ArrowRight } from 'lucide-react';

export default function OrganizationDashboard() {
  const params = useParams();
  const router = useRouter();
  const orgSlug = params.orgSlug as string;
  const { currentOrganization } = useOrganization();
  const [stats, setStats] = useState({
    experiments: 0,
    activeExperiments: 0,
    videos: 0,
    totalSubmissions: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentOrganization) {
      loadStats();
    }
  }, [currentOrganization]);

  const loadStats = async () => {
    try {
      setLoading(true);
      if (!currentOrganization) return;

      const [experimentsResponse, videosResponse] = await Promise.all([
        fetch(`/api/organizations/${currentOrganization.id}/experiments`),
        fetch(`/api/organizations/${currentOrganization.id}/videos`),
      ]);

      if (experimentsResponse.ok) {
        const experimentsData = await experimentsResponse.json();
        setStats(prev => ({
          ...prev,
          experiments: experimentsData.stats?.total || 0,
          activeExperiments: experimentsData.stats?.byStatus?.ACTIVE || 0,
          totalSubmissions: experimentsData.stats?.totalSubmissions || 0,
        }));
      }

      if (videosResponse.ok) {
        const videosData = await videosResponse.json();
        setStats(prev => ({
          ...prev,
          videos: videosData.videos?.length || 0,
        }));
      }
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Organization Dashboard</h1>
          <div className="text-muted-foreground">
            Welcome to your organization: <Badge variant="outline">{orgSlug}</Badge>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Experiments</CardTitle>
            <Beaker className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '...' : stats.experiments}</div>
            <p className="text-xs text-muted-foreground">
              {stats.experiments === 0 ? 'No experiments yet' : `${stats.activeExperiments} active`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Team Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1</div>
            <p className="text-xs text-muted-foreground">You are the owner</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Videos</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '...' : stats.videos}</div>
            <p className="text-xs text-muted-foreground">
              {stats.videos === 0 ? 'No videos uploaded' : 'videos available'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Evaluations</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '...' : stats.totalSubmissions}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalSubmissions === 0 ? 'No evaluations completed' : 'total submissions'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Getting Started */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Welcome to {orgSlug}!
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Your organization has been successfully created and linked to Stack Auth. 
            You can now start managing experiments, uploading videos, and inviting team members.
          </p>
          
          <div className="space-y-4">
            <h4 className="font-medium">Quick Actions:</h4>
            <div className="grid gap-2 sm:grid-cols-2">
              <Button 
                variant="outline" 
                className="justify-start gap-2"
                onClick={() => router.push(`/${orgSlug}/experiments`)}
              >
                <Beaker className="h-4 w-4" />
                View Experiments
                <ArrowRight className="h-4 w-4 ml-auto" />
              </Button>
              <Button 
                variant="outline" 
                className="justify-start gap-2"
                onClick={() => router.push(`/${orgSlug}/videos`)}
              >
                <BarChart3 className="h-4 w-4" />
                Video Library
                <ArrowRight className="h-4 w-4 ml-auto" />
              </Button>
              <Button 
                variant="outline" 
                className="justify-start gap-2"
                onClick={() => router.push(`/${orgSlug}/settings`)}
              >
                <Users className="h-4 w-4" />
                Team & Settings
                <ArrowRight className="h-4 w-4 ml-auto" />
              </Button>
              <Button 
                className="justify-start gap-2"
                onClick={() => router.push(`/${orgSlug}/experiments`)}
              >
                <Plus className="h-4 w-4" />
                Create Experiment
              </Button>
            </div>
          </div>

          <div className="pt-4 text-xs text-muted-foreground">
            <p><strong>Organization ID:</strong> {orgSlug}</p>
            <p><strong>Status:</strong> <Badge variant="outline" className="text-xs">Active</Badge></p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}