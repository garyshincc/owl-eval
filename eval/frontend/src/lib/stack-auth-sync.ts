import { prisma } from '@/lib/prisma'
import { stackServerApp } from '@/stack'

export interface StackAuthSyncResult {
  success: boolean
  organization: {
    id: string
    name: string
  }
  stackTeam: {
    id: string
    totalMembers: number
  }
  sync: {
    existingMembers: number
    addedMembers: number
    newMembers: Array<{
      id: string
      email: string
      role: string
      stackUserId: string
    }>
  }
  error?: string
}

export async function syncStackAuthTeamToOrganization(organizationId: string): Promise<StackAuthSyncResult> {
  try {
    console.log(`🔄 Starting Stack Auth sync for organization: ${organizationId}`)

    // Get organization
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId }
    })

    if (!organization) {
      return {
        success: false,
        error: 'Organization not found',
        organization: { id: '', name: '' },
        stackTeam: { id: '', totalMembers: 0 },
        sync: { existingMembers: 0, addedMembers: 0, newMembers: [] }
      }
    }

    console.log(`✅ Found organization: ${organization.name}`)

    if (!organization.stackTeamId) {
      return {
        success: false,
        error: 'No Stack Auth team linked to this organization',
        organization: { id: organization.id, name: organization.name },
        stackTeam: { id: '', totalMembers: 0 },
        sync: { existingMembers: 0, addedMembers: 0, newMembers: [] }
      }
    }

    console.log(`🔍 Fetching Stack Auth team: ${organization.stackTeamId}`)

    // Get team members from Stack Auth
    const team = await stackServerApp.getTeam(organization.stackTeamId)
    if (!team) {
      return {
        success: false,
        error: 'Team not found in Stack Auth',
        organization: { id: organization.id, name: organization.name },
        stackTeam: { id: organization.stackTeamId, totalMembers: 0 },
        sync: { existingMembers: 0, addedMembers: 0, newMembers: [] }
      }
    }

    console.log(`📋 Found ${team.users.length} members in Stack Auth team`)

    // Get current members in our database
    const currentMembers = await prisma.organizationMember.findMany({
      where: { organizationId: organization.id }
    })
    const currentUserIds = new Set(currentMembers.map(m => m.stackUserId))

    console.log(`📊 Current database members: ${currentMembers.length}`)

    const addedMembers = []
    
    // Add new members
    for (const teamUser of team.users) {
      if (!currentUserIds.has(teamUser.id)) {
        // Determine role based on Stack Auth permissions
        const role = teamUser.id === team.createdByUserId ? 'OWNER' : 'ADMIN'
        
        console.log(`➕ Adding new member: ${teamUser.primaryEmail || teamUser.id} as ${role}`)
        
        const member = await prisma.organizationMember.create({
          data: {
            organizationId: organization.id,
            stackUserId: teamUser.id,
            role: role
          }
        })
        
        addedMembers.push({
          id: member.id,
          email: teamUser.primaryEmail || 'unknown',
          role: role,
          stackUserId: teamUser.id
        })
      } else {
        console.log(`➖ User already exists: ${teamUser.primaryEmail || teamUser.id}`)
      }
    }

    console.log(`✅ Sync complete: ${addedMembers.length} new members added`)

    return {
      success: true,
      organization: {
        id: organization.id,
        name: organization.name
      },
      stackTeam: {
        id: team.id,
        totalMembers: team.users.length
      },
      sync: {
        existingMembers: currentMembers.length,
        addedMembers: addedMembers.length,
        newMembers: addedMembers
      }
    }

  } catch (error) {
    console.error('❌ Stack Auth sync error:', error)
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to sync Stack Auth team',
      organization: { id: '', name: '' },
      stackTeam: { id: '', totalMembers: 0 },
      sync: { existingMembers: 0, addedMembers: 0, newMembers: [] }
    }
  }
}