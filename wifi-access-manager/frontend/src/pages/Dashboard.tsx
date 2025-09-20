import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { useAuthStore } from '@/stores/authStore'
import { Wifi, Star, Activity, MapPin, Clock } from 'lucide-react'

export default function Dashboard() {
  const { } = useAuthStore()

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
                <Link
                  key={ap.id}
                  to={`/access-point/${ap.id}`}
                  className="block p-3 bg-gray-50 dark:bg-gray-700 rounded-md hover:bg-gray-100 dark:hover:bg-gray-600"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Wifi className="h-4 w-4 mr-2 text-primary-600" />
                      <span className="font-medium text-gray-900 dark:text-white">{ap.ssid}</span>
                    </div>
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
                  {ap.venue_name && (
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      <MapPin className="inline h-3 w-3 mr-1" />
                      {ap.venue_name}
                    </div>
                  )}
                </Link>
              ))
            ) : (
              <p className="text-gray-500 dark:text-gray-400">No favorites yet</p>
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
              <span className="font-semibold text-gray-900 dark:text-white">0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Speed Tests Run</span>
              <span className="font-semibold text-gray-900 dark:text-white">0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Ratings Given</span>
              <span className="font-semibold text-gray-900 dark:text-white">0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Passwords Shared</span>
              <span className="font-semibold text-gray-900 dark:text-white">0</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}