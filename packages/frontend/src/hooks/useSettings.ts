import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/api/client'
import type { SettingsResponse, SettingsUpdate } from '@/types/api'

export function useSettings() {
  return useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const response = await apiClient.get<SettingsResponse>('/api/settings')
      return response.data
    },
  })
}

export function useUpdateSettings() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: SettingsUpdate) => {
      const response = await apiClient.put<SettingsResponse>('/api/settings', data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] })
    },
  })
}

export function useDeleteOpenAIKey() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      await apiClient.delete('/api/settings/openai-key')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] })
    },
  })
}
