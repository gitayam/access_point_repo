import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { X, Wifi, Lock, Key, MapPin } from 'lucide-react'
import { useToast } from '@/hooks/useToast'
import { useAuthStore } from '@/stores/authStore'

interface AddPasswordModalProps {
  accessPoint: {
    id: string
    ssid: string
    bssid?: string
    venue_name?: string
    address?: string
    latitude: number
    longitude: number
    is_open: boolean
    has_password?: boolean
  }
  onClose: () => void
  onSuccess: () => void
}

export default function AddPasswordModal({
  accessPoint,
  onClose,
  onSuccess
}: AddPasswordModalProps) {
  const { toast } = useToast()
  const { isAuthenticated } = useAuthStore()
  const queryClient = useQueryClient()
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const addPasswordMutation = useMutation({
    mutationFn: async (password: string) => {
      const response = await axios.post(`/api/access-points/${accessPoint.id}/password`, {
        password
      })
      // Auto-favorite the access point after adding password
      try {
        await axios.post(`/api/user/favorites/${accessPoint.id}`)
      } catch (error) {
        // Silently handle if already favorited
      }
      return response.data
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Password added and access point favorited!'
      })
      queryClient.invalidateQueries({ queryKey: ['userFavorites'] })
      onSuccess()
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to add password',
        variant: 'destructive'
      })
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!password.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a password',
        variant: 'destructive'
      })
      return
    }
    addPasswordMutation.mutate(password)
  }

  if (!isAuthenticated) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[2000]">
        <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Login Required</h3>
          <p className="text-gray-600 dark:text-gray-400">Please login to add passwords to access points.</p>
          <button
            onClick={onClose}
            className="mt-4 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
          >
            Close
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[2000]">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold flex items-center text-gray-900 dark:text-white">
              <Key className="h-5 w-5 mr-2 text-primary-600" />
              Add Password
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-400"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-4">
            <div className="flex items-start space-x-3">
              <Wifi className="h-5 w-5 text-primary-600 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-lg text-gray-900 dark:text-white">{accessPoint.ssid}</h3>
                {accessPoint.bssid && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 font-mono">{accessPoint.bssid}</p>
                )}
                {(accessPoint.venue_name || accessPoint.address) && (
                  <div className="mt-2 flex items-start">
                    <MapPin className="h-4 w-4 text-gray-500 mr-1 mt-0.5" />
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {accessPoint.venue_name || accessPoint.address}
                    </p>
                  </div>
                )}
                <div className="mt-2">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    accessPoint.is_open
                      ? 'bg-green-100 text-green-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {accessPoint.is_open ? 'Open Network' : 'Secured Network'}
                  </span>
                  {accessPoint.has_password && (
                    <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      Password Already Exists
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                <Lock className="inline h-4 w-4 mr-1" />
                WiFi Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter the WiFi password"
                  className="w-full px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 pr-10"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                >
                  {showPassword ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                This password will be shared with your organization members
              </p>
            </div>

            <div className="flex justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={addPasswordMutation.isPending || !password.trim()}
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {addPasswordMutation.isPending ? 'Adding...' : 'Add Password'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}