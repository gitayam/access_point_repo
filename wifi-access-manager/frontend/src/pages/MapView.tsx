import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import L from 'leaflet'
import { Lock, Unlock, Search, Plus, MapPin } from 'lucide-react'
import axios from 'axios'
import { useAuthStore } from '@/stores/authStore'
import AddAccessPointModal from '@/components/AddAccessPointModal'
import AddPasswordModal from '@/components/AddPasswordModal'
import { useToast } from '@/hooks/useToast'

const wifiIcon = L.divIcon({
  html: `
    <div class="relative">
      <div class="absolute inset-0 bg-blue-600 rounded-full animate-pulse opacity-25" style="width: 48px; height: 48px; margin: -12px 0 0 -12px;"></div>
      <div class="absolute inset-0 bg-white rounded-full shadow-lg border-2 border-blue-600" style="width: 40px; height: 40px; margin: -8px 0 0 -8px;">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="text-blue-600" style="margin: 8px;">
          <path d="M5 12.55a11 11 0 0 1 14.08 0"></path>
          <path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path>
          <line x1="12" y1="20" x2="12.01" y2="20"></line>
        </svg>
      </div>
    </div>
  `,
  className: 'custom-wifi-icon',
  iconSize: [48, 48],
  iconAnchor: [24, 48],
})

const openWifiIcon = L.divIcon({
  html: `
    <div class="relative">
      <div class="absolute inset-0 bg-green-600 rounded-full animate-pulse opacity-25" style="width: 48px; height: 48px; margin: -12px 0 0 -12px;"></div>
      <div class="absolute inset-0 bg-white rounded-full shadow-lg border-2 border-green-600" style="width: 40px; height: 40px; margin: -8px 0 0 -8px;">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="text-green-600" style="margin: 8px;">
          <path d="M5 12.55a11 11 0 0 1 14.08 0"></path>
          <path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path>
          <line x1="12" y1="20" x2="12.01" y2="20"></line>
        </svg>
      </div>
    </div>
  `,
  className: 'custom-wifi-icon',
  iconSize: [48, 48],
  iconAnchor: [24, 48],
})

interface AccessPoint {
  id: string
  ssid: string
  bssid?: string
  is_open: boolean
  requires_login: boolean
  latitude: number
  longitude: number
  address?: string
  venue_name?: string
  venue_type?: string
  avg_rating: number
  has_password: boolean
  distance: number
}

function MapUpdater({ center }: { center: [number, number] }) {
  const map = useMap()

  useEffect(() => {
    map.flyTo(center, map.getZoom())
  }, [center, map])

  return null
}

function LocationMarker({ onMapClick, onMapMove }: { onMapClick?: (e: any) => void, onMapMove?: (center: [number, number]) => void }) {
  const [position, setPosition] = useState<[number, number] | null>(null)

  const userLocationIcon = L.divIcon({
    html: `
      <div class="relative">
        <div class="absolute inset-0 bg-blue-500 rounded-full animate-ping opacity-75" style="width: 24px; height: 24px; margin: -6px 0 0 -6px;"></div>
        <div class="absolute inset-0 bg-blue-500 rounded-full shadow-lg" style="width: 16px; height: 16px; margin: -2px 0 0 -2px;"></div>
        <div class="absolute inset-0 bg-white rounded-full" style="width: 8px; height: 8px; margin: 2px 0 0 2px;"></div>
      </div>
    `,
    className: 'user-location-icon',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  })

  const map = useMapEvents({
    locationfound(e) {
      setPosition([e.latlng.lat, e.latlng.lng])
      map.flyTo(e.latlng, map.getZoom())
    },
    click(e) {
      if (onMapClick) {
        onMapClick(e)
      }
    },
    moveend() {
      const center = map.getCenter()
      if (onMapMove) {
        onMapMove([center.lat, center.lng])
      }
    }
  })

  useEffect(() => {
    map.locate()
  }, [map])

  return position === null ? null : (
    <Marker position={position} icon={userLocationIcon}>
      <Popup>You are here</Popup>
    </Marker>
  )
}

export default function MapView() {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuthStore()
  const { toast } = useToast()
  const [center, setCenter] = useState<[number, number]>([37.7749, -122.4194])
  const [showAddModal, setShowAddModal] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [selectedAccessPoint, setSelectedAccessPoint] = useState<any>(null)
  const [searchSSID, setSearchSSID] = useState('')
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [addressSearch, setAddressSearch] = useState('')
  const [isSearchingAddress, setIsSearchingAddress] = useState(false)
  const [showOnlyWithPasswords, setShowOnlyWithPasswords] = useState(false)

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCenter([position.coords.latitude, position.coords.longitude])
        },
        (error) => {
          console.error('Error getting location:', error)
          toast({
            title: 'Location Error',
            description: 'Could not get your location. Using default location.',
            variant: 'destructive',
          })
        }
      )
    }
  }, [])

  const { data: accessPoints, refetch } = useQuery({
    queryKey: ['nearbyAccessPoints', center],
    queryFn: async () => {
      const response = await axios.get('/api/access-points/nearby', {
        params: {
          lat: center[0],
          lng: center[1],
          radius: 10,
        },
      })
      return response.data as AccessPoint[]
    },
  })

  const handleMapMove = (newCenter: [number, number]) => {
    setCenter(newCenter)
  }

  const searchWigleMutation = useMutation({
    mutationFn: async (params: { latitude: number; longitude: number; ssid?: string }) => {
      const response = await axios.post('/api/wigle/search', params)
      return response.data
    },
    onSuccess: (data) => {
      refetch()
      if (data.networks && data.networks.length > 0) {
        toast({
          title: 'Success',
          description: `Found ${data.networks.length} access points from WiGLE database`,
        })
      } else {
        toast({
          title: 'No Results',
          description: 'No access points found in WiGLE database for this search',
        })
      }
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to search WiGLE database',
        variant: 'destructive',
      })
    },
  })

  const handleSearchWigle = () => {
    searchWigleMutation.mutate({
      latitude: center[0],
      longitude: center[1],
      ssid: searchSSID || undefined,
    })
  }

  const handleMapClick = (e: any) => {
    if (isAuthenticated) {
      const location = { lat: e.latlng.lat, lng: e.latlng.lng }
      console.log('Map clicked at:', location)
      setSelectedLocation(location)
      setShowAddModal(true)
    }
  }

  const searchAddress = async () => {
    if (!addressSearch.trim()) return

    setIsSearchingAddress(true)
    try {
      // Using Nominatim OpenStreetMap geocoding API
      const response = await axios.get('https://nominatim.openstreetmap.org/search', {
        params: {
          q: addressSearch,
          format: 'json',
          limit: 1
        }
      })

      if (response.data && response.data.length > 0) {
        const result = response.data[0]
        const lat = parseFloat(result.lat)
        const lng = parseFloat(result.lon)
        setCenter([lat, lng])
        toast({
          title: 'Location Found',
          description: `Navigated to ${result.display_name}`,
        })
      } else {
        toast({
          title: 'Not Found',
          description: 'Could not find that address',
          variant: 'destructive'
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to search address',
        variant: 'destructive'
      })
    } finally {
      setIsSearchingAddress(false)
    }
  }

  // Filter access points based on search and password filter
  const filteredAccessPoints = accessPoints?.filter(ap => {
    // Filter by SSID if search term exists
    if (searchSSID && !ap.ssid.toLowerCase().includes(searchSSID.toLowerCase())) {
      return false
    }
    // Filter by password if checkbox is checked
    if (showOnlyWithPasswords && !ap.has_password) {
      return false
    }
    return true
  })

  return (
    <div className="h-[calc(100vh-4rem)] relative">
      <div className="absolute top-4 left-4 z-[1000] bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 max-w-sm">
        <h2 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">Search & Navigation</h2>

        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-600 dark:text-gray-400 block mb-1">Search Address</label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Enter address or location"
                value={addressSearch}
                onChange={(e) => setAddressSearch(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && searchAddress()}
                className="flex-1 px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 placeholder-gray-400 dark:placeholder-gray-500"
              />
              <button
                onClick={searchAddress}
                disabled={isSearchingAddress}
                className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                title="Search address"
              >
                <MapPin className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-600 dark:text-gray-400 block mb-1">Filter Visible Access Points</label>
            <input
              type="text"
              placeholder="Type SSID to filter..."
              value={searchSSID}
              onChange={(e) => setSearchSSID(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 placeholder-gray-400 dark:placeholder-gray-500"
            />
            <label className="flex items-center mt-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showOnlyWithPasswords}
                onChange={(e) => setShowOnlyWithPasswords(e.target.checked)}
                className="mr-2 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Show only with passwords</span>
            </label>
            {(searchSSID || showOnlyWithPasswords) && (
              <>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Showing {filteredAccessPoints?.length || 0} of {accessPoints?.length || 0} access points
                </p>
                {filteredAccessPoints && filteredAccessPoints.length > 0 && !accessPoints?.find(ap => ap.ssid.toLowerCase().includes(searchSSID.toLowerCase())) && (
                  <div className="mt-2">
                    <p className="text-xs text-yellow-600 dark:text-yellow-400 mb-1">
                      These access points might be in a different location
                    </p>
                    <button
                      onClick={async () => {
                        // Search WiGLE for this SSID and navigate to first result
                        searchWigleMutation.mutate({
                          latitude: center[0],
                          longitude: center[1],
                          ssid: searchSSID
                        }, {
                          onSuccess: (data) => {
                            if (data.networks && data.networks.length > 0) {
                              const firstNetwork = data.networks[0]
                              setCenter([firstNetwork.latitude, firstNetwork.longitude])
                            }
                          }
                        })
                      }}
                      className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      Search WiGLE & Go to Location
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="border-t dark:border-gray-700 pt-3">
            <label className="text-xs text-gray-600 dark:text-gray-400 block mb-1">Search WiGLE Database</label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="SSID (optional)"
                value={searchSSID}
                onChange={(e) => setSearchSSID(e.target.value)}
                className="flex-1 px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 placeholder-gray-400 dark:placeholder-gray-500"
              />
              <button
                onClick={handleSearchWigle}
                disabled={searchWigleMutation.isPending}
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
                title="Search WiGLE.net for more access points"
              >
                <Search className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {isAuthenticated && (
          <button
            onClick={() => {
              setSelectedLocation({ lat: center[0], lng: center[1] })
              setShowAddModal(true)
            }}
            className="mt-3 w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 flex items-center justify-center"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Access Point
          </button>
        )}

        <div className="mt-4 space-y-2 text-gray-900 dark:text-white">
          <div className="flex items-center text-sm">
            <div className="w-4 h-4 bg-blue-600 rounded-full mr-2"></div>
            <span className="text-gray-900 dark:text-white">Protected WiFi</span>
          </div>
          <div className="flex items-center text-sm">
            <div className="w-4 h-4 bg-green-600 rounded-full mr-2"></div>
            <span className="text-gray-900 dark:text-white">Open WiFi</span>
          </div>
          <div className="flex items-center text-sm">
            <Lock className="h-4 w-4 text-yellow-600 mr-2" />
            <span className="text-gray-900 dark:text-white">Has Password</span>
          </div>
        </div>
      </div>

      <MapContainer
        center={center}
        zoom={13}
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapUpdater center={center} />
        <LocationMarker onMapClick={handleMapClick} onMapMove={handleMapMove} />

        {filteredAccessPoints?.map((ap) => (
          <Marker
            key={ap.id}
            position={[ap.latitude, ap.longitude]}
            icon={ap.is_open ? openWifiIcon : wifiIcon}
            zIndexOffset={1000}
          >
            <Popup className="wifi-popup">
              <div className="p-2">
                <h3 className="font-semibold flex items-center">
                  {ap.ssid}
                  {ap.is_open ? (
                    <Unlock className="h-4 w-4 ml-2 text-green-600" />
                  ) : (
                    <Lock className="h-4 w-4 ml-2 text-blue-600" />
                  )}
                </h3>
                {ap.venue_name && (
                  <p className="text-sm text-gray-600">{ap.venue_name}</p>
                )}
                {ap.avg_rating > 0 && (
                  <div className="flex items-center mt-1">
                    <span className="text-sm">Rating: {ap.avg_rating.toFixed(1)}/5</span>
                  </div>
                )}
                <div className="mt-2 flex flex-col gap-2">
                  <div className="flex gap-2">
                    <button
                      onClick={() => navigate(`/access-point/${ap.id}`)}
                      className="px-3 py-1 bg-primary-600 text-white text-sm rounded hover:bg-primary-700"
                    >
                      View Details
                    </button>
                    {!ap.is_open && !ap.has_password && isAuthenticated && (
                      <button
                        onClick={() => {
                          setSelectedAccessPoint(ap)
                          setShowPasswordModal(true)
                        }}
                        className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                      >
                        Add Password
                      </button>
                    )}
                  </div>
                  {ap.has_password && isAuthenticated && (
                    <span className="px-3 py-1 bg-green-100 text-green-800 text-sm rounded text-center">
                      ✓ Password Available
                    </span>
                  )}
                  {!ap.has_password && !ap.is_open && (
                    <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-sm rounded text-center">
                      ⚠️ No Password Yet
                    </span>
                  )}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {showAddModal && (
        <AddAccessPointModal
          defaultLocation={selectedLocation}
          onClose={() => {
            setShowAddModal(false)
            setSelectedLocation(null)
          }}
          onSuccess={() => {
            setShowAddModal(false)
            setSelectedLocation(null)
            refetch()
          }}
        />
      )}

      {showPasswordModal && selectedAccessPoint && (
        <AddPasswordModal
          accessPoint={selectedAccessPoint}
          onClose={() => {
            setShowPasswordModal(false)
            setSelectedAccessPoint(null)
          }}
          onSuccess={() => {
            setShowPasswordModal(false)
            setSelectedAccessPoint(null)
            refetch()
          }}
        />
      )}
    </div>
  )
}