import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { useAuthStore } from '@/stores/authStore'
import { Wifi, Star, Activity, MapPin, Clock, Trash2, Navigation2, Lock } from 'lucide-react'
import { useToast } from '@/hooks/useToast'

export default function Dashboard() {
  const { user } = useAuthStore()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const { data: favorites } = useQuery({
    queryKey: ['userFavorites'],
    queryFn: async () => {
      const response = await axios.get('/api/user/favorites')
      return response.data
    }
  })

  const { data: recentActivity } = useQuery({
    queryKey: ['recentActivity'],
    queryFn: async () => {
      const response = await axios.get('/api/user/activity')
      return response.data
    }
  })

  const { data: userProfile } = useQuery({
    queryKey: ['userProfile'],
    queryFn: async () => {
      const response = await axios.get('/api/user/profile')
      return response.data
    }
  })

  const removeFavoriteMutation = useMutation({
    mutationFn: async (accessPointId: string) => {
      await axios.delete(`/api/user/favorites/${accessPointId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userFavorites'] })
      toast({
        title: 'Success',
        description: 'Removed from favorites',
      })
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to remove from favorites',
        variant: 'destructive'
      })
    }
  })

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8 text-gray-900 dark:text-white">Dashboard</h1>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center text-gray-900 dark:text-white">
            <Star className="h-5 w-5 mr-2 text-yellow-400" />
            Favorite Access Points
          </h2>
          <div className="space-y-3">
            {favorites?.length > 0 ? (
              favorites.slice(0, 5).map((ap: any) => (
                <div
                  key={ap.id}
                  className="p-3 bg-gray-50 dark:bg-gray-700 rounded-md"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center">
                      <Wifi className="h-4 w-4 mr-2 text-primary-600" />
                      <span className="font-medium text-gray-900 dark:text-white">{ap.ssid}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {!ap.is_open && (
                        <Lock className="h-4 w-4 text-yellow-500" title="Has password" />
                      )}
                      {ap.is_open ? (
                        <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded">
                          Open
                        </span>
                      ) : (
                        <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">
                          Secured
                        </span>
                      )}
                    </div>
                  </div>
                  {ap.venue_name && (
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      <MapPin className="inline h-3 w-3 mr-1" />
                      {ap.venue_name}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Link
                      to={`/access-point/${ap.id}`}
                      className="flex-1 px-3 py-1 bg-primary-600 text-white text-sm rounded hover:bg-primary-700 text-center"
                    >
                      View Details
                    </Link>
                    <Link
                      to={`/map?center=${ap.latitude},${ap.longitude}`}
                      className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                      title="Show on map"
                    >
                      <Navigation2 className="h-4 w-4" />
                    </Link>
                    <button
                      onClick={(e) => {
                        e.preventDefault()
                        removeFavoriteMutation.mutate(ap.id)
                      }}
                      className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                      title="Remove from favorites"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-4">
                <p className="text-gray-500 dark:text-gray-400 mb-2">No favorites yet</p>
                <Link
                  to="/map"
                  className="text-sm text-primary-600 hover:text-primary-700"
                >
                  Browse access points to add favorites
                </Link>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center text-gray-900 dark:text-white">
            <Activity className="h-5 w-5 mr-2 text-blue-600" />
            Recent Activity
          </h2>
          <div className="space-y-3">
            {recentActivity?.length > 0 ? (
              recentActivity.slice(0, 5).map((activity: any, index: number) => (
                <div key={index} className="flex items-start space-x-3">
                  <Clock className="h-4 w-4 text-gray-400 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-gray-900 dark:text-white">{activity.description}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(activity.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 dark:text-gray-400">No recent activity</p>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Quick Stats</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Access Points Added</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {userProfile?.stats?.access_points_added || 0}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Speed Tests Run</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {userProfile?.stats?.speed_tests_run || 0}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Ratings Given</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {userProfile?.stats?.ratings_given || 0}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Favorites</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {userProfile?.stats?.favorites || favorites?.length || 0}
              </span>
            </div>
          </div>
          {favorites?.length > 5 && (
            <Link
              to="/favorites"
              className="block mt-4 text-center text-sm text-primary-600 hover:text-primary-700"
            >
              View all {favorites.length} favorites →
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}