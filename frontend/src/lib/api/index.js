// Export all API modules
export { authAPI } from './auth'
export { usersAPI } from './users'
export { votersAPI } from './voters'
export { electionsAPI } from './elections'
export { degreesAPI } from './degrees'
export { auditLogsAPI } from './auditLogs'
export { chatSupportAPI } from './chatSupport'
export { dashboardAPI } from './dashboard'
export { candidatesAPI } from './candidate'
export { positionsAPI } from './positions'
export { partylistsAPI } from './partylists'
export { votingAPI } from './voting'
export { healthAPI } from './health'

// Re-export the main api instance
export { default as api } from '../api'