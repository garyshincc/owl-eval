'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useUser } from '@stackframe/stack';
import { useRouter } from 'next/navigation';

type Organization = {
  id: string;
  name: string;
  slug: string;
  description?: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';
};

type OrganizationContextType = {
  currentOrganization: Organization | null;
  organizations: Organization[];
  switchOrganization: (organizationId: string) => void;
  loading: boolean;
  switching: boolean;
  refetchOrganizations: () => Promise<void>;
};

const OrganizationContext = createContext<OrganizationContextType | null>(null);

export function OrganizationProvider({ children }: { children: React.ReactNode }) {
  const user = useUser();
  const router = useRouter();
  const [currentOrganization, setCurrentOrganization] = useState<Organization | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);

  // Fetch user's organizations
  const fetchOrganizations = async () => {
    if (!user?.id) {
      setOrganizations([]);
      setCurrentOrganization(null);
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/organizations/my-organizations');
      
      if (!response.ok) {
        throw new Error('Failed to fetch organizations');
      }
      
      const data = await response.json();
      const userOrgs = data.organizations.map((membership: any) => ({
        id: membership.organization.id,
        name: membership.organization.name,
        slug: membership.organization.slug,
        description: membership.organization.description,
        role: membership.role,
      }));
      
      console.log('🔍 [DEBUG] Context - Fetched organizations:', userOrgs);
      setOrganizations(userOrgs);
      
      // Auto-select organization based on URL slug, stored preference, or first available
      const currentPath = window.location.pathname;
      const urlOrgSlug = currentPath.match(/^\/([^\/]+)\//)?.[1];
      
      console.log('🔍 [DEBUG] Context - Current path:', currentPath);
      console.log('🔍 [DEBUG] Context - URL org slug:', urlOrgSlug);
      console.log('🔍 [DEBUG] Context - Available organization IDs:', userOrgs.map(org => org.id));
      
      let targetOrg: Organization | undefined;
      
      // First try to match URL slug
      if (urlOrgSlug) {
        targetOrg = userOrgs.find((org: Organization) => org.slug === urlOrgSlug);
        console.log('🔍 [DEBUG] Context - Found org by URL slug:', targetOrg?.name);
      }
      
      // Fallback to stored preference
      if (!targetOrg) {
        const storedOrgId = localStorage.getItem('currentOrganizationId');
        console.log('🔍 [DEBUG] Context - Stored org ID:', storedOrgId);
        targetOrg = storedOrgId 
          ? userOrgs.find((org: Organization) => org.id === storedOrgId)
          : userOrgs[0];
      }
      
      console.log('🔍 [DEBUG] Context - Target organization:', targetOrg);
      if (targetOrg) {
        setCurrentOrganization(targetOrg);
        localStorage.setItem('currentOrganizationId', targetOrg.id);
      }
      
      setSwitching(false);
      
    } catch (error) {
      console.error('Failed to fetch organizations:', error);
      setOrganizations([]);
      setCurrentOrganization(null);
    } finally {
      setLoading(false);
    }
  };

  // Switch to different organization
  const switchOrganization = (organizationId: string) => {
    console.log('🔍 [DEBUG] Context - Switching to organization:', organizationId);
    const organization = organizations.find(org => org.id === organizationId);
    console.log('🔍 [DEBUG] Context - Found organization:', organization);
    if (organization) {
      setSwitching(true);
      localStorage.setItem('currentOrganizationId', organizationId);
      console.log('🔍 [DEBUG] Context - Redirecting to:', `/${organization.slug}/dashboard`);
      
      // Use Next.js router for client-side navigation without setting state first
      router.push(`/${organization.slug}/dashboard`);
    }
  };

  // Refetch organizations (for when new ones are created)
  const refetchOrganizations = async () => {
    setLoading(true);
    await fetchOrganizations();
  };

  // Fetch organizations when user changes
  useEffect(() => {
    fetchOrganizations();
  }, [user?.id]); // fetchOrganizations is stable, ok to omit

  return (
    <OrganizationContext.Provider 
      value={{
        currentOrganization,
        organizations,
        switchOrganization,
        loading,
        switching,
        refetchOrganizations,
      }}
    >
      {children}
    </OrganizationContext.Provider>
  );
}

// Custom hook to use organization context
export function useOrganization() {
  const context = useContext(OrganizationContext);
  if (!context) {
    throw new Error('useOrganization must be used within an OrganizationProvider');
  }
  return context;
}

// Hook to get current organization or redirect to onboarding
export function useRequireOrganization() {
  const { currentOrganization, organizations, loading } = useOrganization();
  const user = useUser();

  useEffect(() => {
    if (!loading && user && organizations.length === 0) {
      // User has no organizations, redirect to onboarding
      window.location.href = '/onboarding/create-organization';
    }
  }, [loading, user, organizations.length]);

  return { currentOrganization, loading };
}