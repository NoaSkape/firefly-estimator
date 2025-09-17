import { 
  CheckCircleIcon,
  ClockIcon,
  PlayCircleIcon,
  ExclamationCircleIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline'

/**
 * Pack Progress Indicator Component
 * Shows real-time progress and status for contract packs
 */
export default function PackProgressIndicator({ 
  packId, 
  status, 
  progress = null,
  templateName = '',
  startedAt = null,
  completedAt = null 
}) {
  
  const getStatusConfig = (status) => {
    switch (status) {
      case 'not_started':
        return {
          icon: DocumentTextIcon,
          color: 'text-gray-400',
          bgColor: 'bg-gray-100',
          borderColor: 'border-gray-300',
          label: 'Not Started',
          description: 'Ready to begin signing'
        }
      case 'in_progress':
        return {
          icon: PlayCircleIcon,
          color: 'text-yellow-500',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-300',
          label: 'In Progress',
          description: 'Signing in progress'
        }
      case 'completed':
        return {
          icon: CheckCircleIcon,
          color: 'text-green-500',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-300',
          label: 'Completed',
          description: 'Successfully signed'
        }
      case 'failed':
      case 'voided':
        return {
          icon: ExclamationCircleIcon,
          color: 'text-red-500',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-300',
          label: 'Failed',
          description: 'Signing was cancelled or failed'
        }
      default:
        return {
          icon: ClockIcon,
          color: 'text-gray-400',
          bgColor: 'bg-gray-100',
          borderColor: 'border-gray-300',
          label: 'Pending',
          description: 'Waiting to start'
        }
    }
  }

  const formatTimeElapsed = (startTime) => {
    if (!startTime) return null
    
    const elapsed = Date.now() - new Date(startTime).getTime()
    const minutes = Math.floor(elapsed / (1000 * 60))
    const hours = Math.floor(minutes / 60)
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`
    } else if (minutes > 0) {
      return `${minutes}m`
    } else {
      return 'Just started'
    }
  }

  const formatCompletionTime = (completionTime) => {
    if (!completionTime) return null
    
    return new Date(completionTime).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const config = getStatusConfig(status)
  const StatusIcon = config.icon
  const timeElapsed = formatTimeElapsed(startedAt)
  const completionTime = formatCompletionTime(completedAt)

  return (
    <div className={`
      border-2 rounded-lg p-4 transition-all duration-200
      ${config.borderColor} ${config.bgColor}
    `}>
      <div className="flex items-start space-x-3">
        {/* Status Icon */}
        <div className={`
          p-2 rounded-full
          ${status === 'in_progress' ? 'animate-pulse' : ''}
        `}>
          <StatusIcon className={`w-6 h-6 ${config.color}`} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h4 className="text-sm font-semibold text-gray-900">
              {config.label}
            </h4>
            {status === 'in_progress' && timeElapsed && (
              <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded-full">
                {timeElapsed}
              </span>
            )}
            {status === 'completed' && completionTime && (
              <span className="text-xs text-green-700 bg-green-100 px-2 py-1 rounded-full">
                {completionTime}
              </span>
            )}
          </div>

          <p className="text-sm text-gray-600 mb-2">
            {config.description}
          </p>

          {/* Template Name */}
          {templateName && (
            <p className="text-xs text-gray-500 mb-2">
              {templateName}
            </p>
          )}

          {/* Progress Bar (if available) */}
          {status === 'in_progress' && progress && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-gray-600">
                <span>Progress</span>
                <span>
                  {progress.fieldsCompleted || 0} of {progress.totalFields || 1} fields
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-yellow-500 h-2 rounded-full transition-all duration-300"
                  style={{ 
                    width: `${((progress.fieldsCompleted || 0) / (progress.totalFields || 1)) * 100}%` 
                  }}
                />
              </div>
              {progress.currentPage && progress.totalPages && (
                <div className="text-xs text-gray-500 text-center">
                  Page {progress.currentPage} of {progress.totalPages}
                </div>
              )}
            </div>
          )}

          {/* Completion Summary */}
          {status === 'completed' && (
            <div className="flex items-center space-x-4 text-xs text-gray-600 mt-2">
              <span className="flex items-center space-x-1">
                <CheckCircleIcon className="w-3 h-3 text-green-500" />
                <span>Document signed</span>
              </span>
              <span className="flex items-center space-x-1">
                <DocumentTextIcon className="w-3 h-3 text-blue-500" />
                <span>PDF generated</span>
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
