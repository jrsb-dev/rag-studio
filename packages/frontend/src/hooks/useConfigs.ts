import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/api/client'
import type { Config, ConfigCreate, ConfigUpdate } from '@/types/api'

export function useConfigs(projectId: string | undefined) {
  return useQuery({
    queryKey: ['configs', projectId],
    queryFn: async () => {
      const response = await apiClient.get<Config[]>(
        `/api/projects/${projectId}/configs`
      )
      return response.data
    },
    enabled: !!projectId,
  })
}

export function useConfig(projectId: string | undefined, configId: string | undefined) {
  return useQuery({
    queryKey: ['configs', projectId, configId],
    queryFn: async () => {
      const response = await apiClient.get<Config>(
        `/api/projects/${projectId}/configs/${configId}`
      )
      return response.data
    },
    enabled: !!projectId && !!configId,
  })
}

export function useCreateConfig(projectId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: ConfigCreate) => {
      const response = await apiClient.post<Config>(
        `/api/projects/${projectId}/configs`,
        data
      )
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['configs', projectId] })
    },
  })
}

export function useUpdateConfig(projectId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ configId, data }: { configId: string; data: ConfigUpdate }) => {
      const response = await apiClient.patch<Config>(
        `/api/projects/${projectId}/configs/${configId}`,
        data
      )
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['configs', projectId] })
    },
  })
}

export function useDeleteConfig(projectId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (configId: string) => {
      await apiClient.delete(`/api/projects/${projectId}/configs/${configId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['configs', projectId] })
    },
  })
}
