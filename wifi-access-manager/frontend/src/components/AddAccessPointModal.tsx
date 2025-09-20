import { useState, useEffect } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { X, Wifi, Lock, MapPin, Search } from 'lucide-react'
import { useToast } from '@/hooks/useToast'

interface AddAccessPointModalProps {
  onClose: () => void
  onSuccess: () => void
  defaultLocation?: { lat: number; lng: number } | null
}

export default function AddAccessPointModal({
  onClose,
  onSuccess,
  defaultLocation
}: AddAccessPointModalProps) {
  const { toast } = useToast()
  const [searchSSID, setSearchSSID] = useState('')
  const [showWigleResults, setShowWigleResults] = useState(false)
  const [nearbyNetworks, setNearbyNetworks] = useState<any[]>([])
  const [isLoadingNearby, setIsLoadingNearby] = useState(false)
  const [selectedNetworkId, setSelectedNetworkId] = useState('')
  const [formData, setFormData] = useState({
    ssid: '',
    bssid: '',
    password: '',
    isOpen: false,
    requiresLogin: false,
    latitude: defaultLocation?.lat || 37.7749,
    longitude: defaultLocation?.lng || -122.4194,
    address: '',
    venueName: '',
    venueType: 'other',
    securityType: 'WPA2'
  })

  useEffect(() => {
    if (defaultLocation) {
      setFormData(prev => ({
        ...prev,
        latitude: defaultLocation.lat,
        longitude: defaultLocation.lng
      }))
      // Automatically search for nearby networks when location is provided
      searchNearbyNetworks(defaultLocation.lat, defaultLocation.lng)
    }
  }, [defaultLocation])

  const searchNearbyNetworks = async (lat: number, lng: number) => {
    setIsLoadingNearby(true)
    try {
      const response = await axios.post('/api/wigle/search', {
        latitude: lat,
        longitude: lng,
        radius: 0.5 // 500m radius for nearby networks
      })
      if (response.data.networks) {
        setNearbyNetworks(response.data.networks)
      }
    } catch (error) {
      console.error('Failed to search nearby networks:', error)
    } finally {
      setIsLoadingNearby(false)
    }
  }

  // Search for nearby access points from WiGLE
  const { data: wigleResults, refetch: searchWigle, isLoading: isSearching } = useQuery({
    queryKey: ['wigleSearch', formData.latitude, formData.longitude, searchSSID],
    queryFn: async () => {
      const response = await axios.post('/api/wigle/search', {
        latitude: formData.latitude,
        longitude: formData.longitude,
        ssid: searchSSID || undefined
      })
      return response.data.networks || []
    },
    enabled: false
  })

  const addMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      // Ensure SSID is not empty
      if (!data.ssid || data.ssid.trim() === '') {
        throw new Error('SSID is required')
      }
      const response = await axios.post('/api/access-points', data)
      return response.data
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Access point added successfully'
      })
      onSuccess()
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to add access point',
        variant: 'destructive'
      })
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.ssid || formData.ssid.trim() === '') {
      toast({
        title: 'Error',
        description: 'SSID is required',
        variant: 'destructive'
      })
      return
    }
    addMutation.mutate(formData)
  }

  const handleSearchNearby = () => {
    searchWigle()
    setShowWigleResults(true)
  }

  const selectWigleNetwork = (network: any) => {
    setFormData(prev => ({
      ...prev,
      ssid: network.ssid || '',
      bssid: network.netid || '',
      latitude: network.trilat,
      longitude: network.trilong,
      securityType: network.encryption || 'unknown',
      isOpen: network.encryption === 'Open'
    }))
    setShowWigleResults(false)
  }

  const handleGetLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData(prev => ({
            ...prev,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          }))
        },
        () => {
          toast({
            title: 'Error',
            description: 'Could not get your location',
            variant: 'destructive'
          })
        }
      )
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[2000]">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold flex items-center text-gray-900 dark:text-white">
              <Wifi className="h-5 w-5 mr-2" />
              Add Access Point
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-400"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Search Nearby Networks (WiGLE)
              </label>
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={searchSSID}
                  onChange={(e) => setSearchSSID(e.target.value)}
                  placeholder="Filter by SSID (optional)"
                  className="flex-1 px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 placeholder-gray-400 dark:placeholder-gray-500"
                />
                <button
                  type="button"
                  onClick={handleSearchNearby}
                  disabled={isSearching}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  <Search className="h-4 w-4" />
                </button>
              </div>

              {showWigleResults && wigleResults && wigleResults.length > 0 && (
                <div className="mb-3 max-h-40 overflow-y-auto border dark:border-gray-600 rounded-md">
                  {wigleResults.map((network: any, index: number) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => selectWigleNetwork(network)}
                      className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 border-b dark:border-gray-600 last:border-0"
                    >
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{network.ssid || 'Unknown'}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {network.netid} • {network.encryption || 'Unknown'}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                SSID (Network Name) *
              </label>
              {nearbyNetworks.length > 0 && (
                <div className="mb-2">
                  <select
                    value={selectedNetworkId}
                    onChange={(e) => {
                      const networkId = e.target.value
                      setSelectedNetworkId(networkId)
                      if (networkId) {
                        const network = nearbyNetworks.find((_, idx) => `${idx}` === networkId)
                        if (network) {
                          selectWigleNetwork(network)
                        }
                      } else {
                        // Clear form when "Enter manually" is selected
                        setFormData(prev => ({
                          ...prev,
                          ssid: '',
                          bssid: '',
                          securityType: 'WPA2'
                        }))
                      }
                    }}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-blue-400 dark:border-blue-500 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 mb-2"
                  >
                    <option value="">-- Enter manually --</option>
                    {nearbyNetworks.map((network, idx) => (
                      <option key={idx} value={`${idx}`}>
                        {network.ssid || 'Hidden Network'} • {network.securityType} • {Math.round(network.accuracy || 0)}m away
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {isLoadingNearby ? 'Searching for nearby networks...' : `${nearbyNetworks.length} networks found nearby`}
                  </p>
                </div>
              )}
              <input
                type="text"
                required
                value={formData.ssid}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, ssid: e.target.value }))
                  setSelectedNetworkId('') // Clear dropdown when manually entering
                }}
                placeholder={nearbyNetworks.length > 0 ? "Or enter network name manually" : "Enter network name"}
                className="w-full px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 placeholder-gray-400 dark:placeholder-gray-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                BSSID (MAC Address)
              </label>
              <input
                type="text"
                value={formData.bssid}
                onChange={(e) => setFormData(prev => ({ ...prev, bssid: e.target.value }))}
                placeholder="00:00:00:00:00:00"
                className="w-full px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 placeholder-gray-400 dark:placeholder-gray-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Security Type
              </label>
              <select
                value={formData.securityType}
                onChange={(e) => setFormData(prev => ({ ...prev, securityType: e.target.value }))}
                className="w-full px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 placeholder-gray-400 dark:placeholder-gray-500"
              >
                <option value="Open">Open</option>
                <option value="WEP">WEP</option>
                <option value="WPA">WPA</option>
                <option value="WPA2">WPA2</option>
                <option value="WPA3">WPA3</option>
              </select>
            </div>

            {formData.securityType !== 'Open' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  <Lock className="inline h-4 w-4 mr-1" />
                  Password
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 placeholder-gray-400 dark:placeholder-gray-500"
                />
              </div>
            )}

            <div className="flex items-center space-x-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.isOpen}
                  onChange={(e) => setFormData(prev => ({ ...prev, isOpen: e.target.checked }))}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Open Network</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.requiresLogin}
                  onChange={(e) => setFormData(prev => ({ ...prev, requiresLogin: e.target.checked }))}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Requires Login Page</span>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                <MapPin className="inline h-4 w-4 mr-1" />
                Location
              </label>
              <div className="flex space-x-2">
                <input
                  type="number"
                  step="any"
                  required
                  value={formData.latitude}
                  onChange={(e) => {
                    const lat = parseFloat(e.target.value)
                    setFormData(prev => ({ ...prev, latitude: lat }))
                    // Search for networks when location changes
                    if (!isNaN(lat) && !isNaN(formData.longitude)) {
                      searchNearbyNetworks(lat, formData.longitude)
                    }
                  }}
                  placeholder="Latitude"
                  className="flex-1 px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 placeholder-gray-400 dark:placeholder-gray-500"
                />
                <input
                  type="number"
                  step="any"
                  required
                  value={formData.longitude}
                  onChange={(e) => {
                    const lng = parseFloat(e.target.value)
                    setFormData(prev => ({ ...prev, longitude: lng }))
                    // Search for networks when location changes
                    if (!isNaN(formData.latitude) && !isNaN(lng)) {
                      searchNearbyNetworks(formData.latitude, lng)
                    }
                  }}
                  placeholder="Longitude"
                  className="flex-1 px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 placeholder-gray-400 dark:placeholder-gray-500"
                />
                <button
                  type="button"
                  onClick={handleGetLocation}
                  className="px-3 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                >
                  Current
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Address
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                className="w-full px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 placeholder-gray-400 dark:placeholder-gray-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Venue Name
              </label>
              <input
                type="text"
                value={formData.venueName}
                onChange={(e) => setFormData(prev => ({ ...prev, venueName: e.target.value }))}
                placeholder="e.g., Starbucks, Airport"
                className="w-full px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 placeholder-gray-400 dark:placeholder-gray-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Venue Type
              </label>
              <select
                value={formData.venueType}
                onChange={(e) => setFormData(prev => ({ ...prev, venueType: e.target.value }))}
                className="w-full px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 placeholder-gray-400 dark:placeholder-gray-500"
              >
                <option value="cafe">Cafe</option>
                <option value="restaurant">Restaurant</option>
                <option value="library">Library</option>
                <option value="airport">Airport</option>
                <option value="hotel">Hotel</option>
                <option value="office">Office</option>
                <option value="public">Public Space</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={addMutation.isPending}
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
              >
                {addMutation.isPending ? 'Adding...' : 'Add Access Point'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}