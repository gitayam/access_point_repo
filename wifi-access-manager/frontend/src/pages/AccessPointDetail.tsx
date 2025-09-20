import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import axios from 'axios'
import { useAuthStore } from '@/stores/authStore'
import { useToast } from '@/hooks/useToast'
import {
  Wifi, Lock, Star, Copy, QrCode, Activity, AlertCircle,
  MapPin, Building, Shield
} from 'lucide-react'

export default function AccessPointDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { isAuthenticated } = useAuthStore()
  const { toast } = useToast()
  const [showQR, setShowQR] = useState(false)
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')

  const { data: accessPoint, isLoading, refetch } = useQuery({
    queryKey: ['accessPoint', id],
    queryFn: async () => {
      const response = await axios.get(`/api/access-points/${id}`)
      return response.data
    }
  })

  const { data: qrCode } = useQuery({
    queryKey: ['qrCode', id],
    queryFn: async () => {
      const response = await axios.get(`/api/access-points/${id}/qr-code`)
      return response.data
    },
    enabled: showQR
  })

  const ratingMutation = useMutation({
    mutationFn: async (data: { overallRating: number; comment?: string }) => {
      const response = await axios.post(`/api/access-points/${id}/rating`, data)
      return response.data
    },
    onSuccess: () => {
      toast({ title: 'Success', description: 'Rating submitted successfully' })
      refetch()
      setRating(0)
      setComment('')
    }
  })

  const speedTestMutation = useMutation({
    mutationFn: async () => {
      const response = await axios.post('/api/speed-test/run', { accessPointId: id })
      return response.data
    },
    onSuccess: () => {
      toast({ title: 'Success', description: 'Speed test completed' })
      refetch()
    }
  })

  const copyPassword = () => {
    if (accessPoint?.password) {
      navigator.clipboard.writeText(accessPoint.password)
      toast({ title: 'Copied', description: 'Password copied to clipboard' })
    }
  }

  const handleRatingSubmit = () => {
    if (rating > 0) {
      ratingMutation.mutate({
        overallRating: rating,
        comment: comment || undefined
      })
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!accessPoint) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h2 className="text-2xl font-semibold">Access point not found</h2>
          <button
            onClick={() => navigate('/')}
            className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
          >
            Back to Map
          </button>
        </div>
      </div>
    )
  }

  const avgRating = accessPoint.ratings?.reduce((acc: number, r: any) => acc + r.overall_rating, 0) /
                    (accessPoint.ratings?.length || 1) || 0

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold flex items-center text-gray-900 dark:text-white">
            <Wifi className="h-6 w-6 mr-2 text-primary-600" />
            {accessPoint.ssid}
          </h1>
          <div className="flex items-center space-x-2">
            {accessPoint.is_open ? (
              <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                Open
              </span>
            ) : (
              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                <Lock className="inline h-3 w-3 mr-1" />
                Secured
              </span>
            )}
            {accessPoint.is_verified && (
              <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm">
                <Shield className="inline h-3 w-3 mr-1" />
                Verified
              </span>
            )}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2 text-gray-900 dark:text-white">Network Details</h3>
              <div className="space-y-2 text-sm">
                {accessPoint.bssid && (
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">BSSID:</span>
                    <span className="font-mono text-gray-900 dark:text-white">{accessPoint.bssid}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Security:</span>
                  <span className="text-gray-900 dark:text-white">{accessPoint.security_type || 'Unknown'}</span>
                </div>
                {accessPoint.requires_login && (
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Login Required:</span>
                    <span className="text-gray-900 dark:text-white">Yes</span>
                  </div>
                )}
              </div>
            </div>

            {accessPoint.venue_name && (
              <div>
                <h3 className="font-semibold mb-2 text-gray-900 dark:text-white">Location</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center">
                    <Building className="h-4 w-4 mr-2 text-gray-600 dark:text-gray-400" />
                    <span className="text-gray-900 dark:text-white">{accessPoint.venue_name}</span>
                  </div>
                  {accessPoint.address && (
                    <div className="flex items-start">
                      <MapPin className="h-4 w-4 mr-2 text-gray-600 dark:text-gray-400 mt-0.5" />
                      <span className="text-gray-900 dark:text-white">{accessPoint.address}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {isAuthenticated && accessPoint.password && (
              <div>
                <h3 className="font-semibold mb-2 text-gray-900 dark:text-white">Password</h3>
                <div className="flex items-center space-x-2">
                  <input
                    type="password"
                    value={accessPoint.password}
                    readOnly
                    className="flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-md font-mono text-sm"
                  />
                  <button
                    onClick={copyPassword}
                    className="px-3 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setShowQR(true)}
                    className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                  >
                    <QrCode className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2 text-gray-900 dark:text-white">Rating</h3>
              <div className="flex items-center space-x-2">
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`h-5 w-5 ${
                        star <= avgRating
                          ? 'text-yellow-400 fill-current'
                          : 'text-gray-300'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {avgRating.toFixed(1)} ({accessPoint.ratings?.length || 0} reviews)
                </span>
              </div>
            </div>

            {accessPoint.speedTests && accessPoint.speedTests.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2 text-gray-900 dark:text-white">Latest Speed Test</h3>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-md p-3 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Download:</span>
                    <span className="text-gray-900 dark:text-white">{accessPoint.speedTests[0].download_speed.toFixed(1)} Mbps</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Upload:</span>
                    <span className="text-gray-900 dark:text-white">{accessPoint.speedTests[0].upload_speed.toFixed(1)} Mbps</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Ping:</span>
                    <span className="text-gray-900 dark:text-white">{accessPoint.speedTests[0].ping.toFixed(0)} ms</span>
                  </div>
                </div>
              </div>
            )}

            {accessPoint.serviceBlocks && accessPoint.serviceBlocks.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2 text-gray-900 dark:text-white">Service Restrictions</h3>
                <div className="space-y-1">
                  {accessPoint.serviceBlocks.map((block: any) => (
                    <div
                      key={block.id}
                      className={`text-sm px-2 py-1 rounded ${
                        block.is_blocked
                          ? 'bg-red-100 text-red-800'
                          : 'bg-green-100 text-green-800'
                      }`}
                    >
                      <AlertCircle className="inline h-3 w-3 mr-1" />
                      {block.service_name} {block.is_blocked ? 'Blocked' : 'Available'}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {isAuthenticated && (
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold mb-4 text-gray-900 dark:text-white">Actions</h3>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => speedTestMutation.mutate()}
                disabled={speedTestMutation.isPending}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                <Activity className="inline h-4 w-4 mr-1" />
                {speedTestMutation.isPending ? 'Testing...' : 'Run Speed Test'}
              </button>
            </div>

            <div className="mt-6">
              <h3 className="font-semibold mb-2 text-gray-900 dark:text-white">Rate this Access Point</h3>
              <div className="flex items-center space-x-2 mb-3">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRating(star)}
                    className="focus:outline-none"
                  >
                    <Star
                      className={`h-6 w-6 ${
                        star <= rating
                          ? 'text-yellow-400 fill-current'
                          : 'text-gray-300'
                      } hover:text-yellow-400 hover:fill-current`}
                    />
                  </button>
                ))}
              </div>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Add a comment (optional)"
                className="w-full px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 placeholder-gray-400 dark:placeholder-gray-500"
                rows={3}
              />
              <button
                onClick={handleRatingSubmit}
                disabled={rating === 0 || ratingMutation.isPending}
                className="mt-2 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
              >
                {ratingMutation.isPending ? 'Submitting...' : 'Submit Rating'}
              </button>
            </div>
          </div>
        )}
      </div>

      {showQR && qrCode && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-sm w-full">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">WiFi QR Code</h3>
            <img src={qrCode.qrCode} alt="WiFi QR Code" className="w-full" />
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-4 text-center">
              Scan this code to connect to {accessPoint.ssid}
            </p>
            <button
              onClick={() => setShowQR(false)}
              className="mt-4 w-full px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}