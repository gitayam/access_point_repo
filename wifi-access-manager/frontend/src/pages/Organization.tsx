import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import axios from 'axios'
import { useAuthStore } from '@/stores/authStore'
import { useToast } from '@/hooks/useToast'
import { Building2, Users, Wifi, Plus, LogOut } from 'lucide-react'

export default function Organization() {
  const { user } = useAuthStore()
  const { toast } = useToast()
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [showJoinForm, setShowJoinForm] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    slug: ''
  })

  const { data: organization, refetch } = useQuery({
    queryKey: ['organization'],
    queryFn: async () => {
      const response = await axios.get('/api/organizations/mine')
      return response.data
    }
  })

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await axios.post('/api/organizations', data)
      return response.data
    },
    onSuccess: () => {
      toast({ title: 'Success', description: 'Organization created successfully' })
      setShowCreateForm(false)
      refetch()
    }
  })

  const joinMutation = useMutation({
    mutationFn: async (slug: string) => {
      const response = await axios.post('/api/organizations/join', { slug })
      return response.data
    },
    onSuccess: () => {
      toast({ title: 'Success', description: 'Joined organization successfully' })
      setShowJoinForm(false)
      refetch()
    }
  })

  const leaveMutation = useMutation({
    mutationFn: async () => {
      const response = await axios.post('/api/organizations/leave')
      return response.data
    },
    onSuccess: () => {
      toast({ title: 'Success', description: 'Left organization successfully' })
      refetch()
    }
  })

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p>Please login to manage organizations</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8 flex items-center">
        <Building2 className="h-8 w-8 mr-3 text-primary-600" />
        Organization Management
      </h1>

      {organization ? (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-2xl font-semibold">{organization.name}</h2>
              <p className="text-gray-600">Code: <span className="font-mono bg-gray-100 px-2 py-1 rounded">{organization.slug}</span></p>
            </div>
            <button
              onClick={() => leaveMutation.mutate()}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
            >
              <LogOut className="inline h-4 w-4 mr-1" />
              Leave Organization
            </button>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center mb-2">
                <Users className="h-5 w-5 mr-2 text-blue-600" />
                <span className="font-semibold">Members</span>
              </div>
              <p className="text-2xl font-bold">{organization.memberCount || 0}</p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center mb-2">
                <Wifi className="h-5 w-5 mr-2 text-green-600" />
                <span className="font-semibold">Access Points</span>
              </div>
              <p className="text-2xl font-bold">{organization.accessPointCount || 0}</p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center mb-2">
                <Building2 className="h-5 w-5 mr-2 text-purple-600" />
                <span className="font-semibold">Created</span>
              </div>
              <p className="text-sm">{new Date(organization.created_at).toLocaleDateString()}</p>
            </div>
          </div>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              Share the organization code <span className="font-mono font-semibold">{organization.slug}</span> with
              team members so they can join and share access point information.
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <p className="text-gray-600 mb-6">You are not currently part of any organization.</p>

          <div className="flex flex-wrap gap-4">
            <button
              onClick={() => setShowCreateForm(true)}
              className="px-6 py-3 bg-primary-600 text-white rounded-md hover:bg-primary-700"
            >
              <Plus className="inline h-5 w-5 mr-2" />
              Create Organization
            </button>

            <button
              onClick={() => setShowJoinForm(true)}
              className="px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              <Users className="inline h-5 w-5 mr-2" />
              Join Organization
            </button>
          </div>
        </div>
      )}

      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Create Organization</h3>
            <form onSubmit={(e) => {
              e.preventDefault()
              createMutation.mutate(formData)
            }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Organization Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Organization Code
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.slug}
                    onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))}
                    placeholder="my-org-code"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Lowercase letters, numbers, and hyphens only
                  </p>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
                >
                  {createMutation.isPending ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showJoinForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Join Organization</h3>
            <form onSubmit={(e) => {
              e.preventDefault()
              const formData = new FormData(e.currentTarget)
              joinMutation.mutate(formData.get('slug') as string)
            }}>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Organization Code
                </label>
                <input
                  type="text"
                  name="slug"
                  required
                  placeholder="Enter organization code"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowJoinForm(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={joinMutation.isPending}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                >
                  {joinMutation.isPending ? 'Joining...' : 'Join'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}