import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/api/client'
import type { Query, QueryCreate, QueryUpdate } from '@/types/api'

export function useQueries(projectId: string | undefined) {
  return useQuery({
    queryKey: ['queries', projectId],
    queryFn: async () => {
      const response = await apiClient.get<Query[]>(
        `/api/projects/${projectId}/queries`
      )
      return response.data
    },
    enabled: !!projectId,
  })
}

export function useQueryById(projectId: string | undefined, queryId: string | undefined) {
  return useQuery({
    queryKey: ['queries', projectId, queryId],
    queryFn: async () => {
      const response = await apiClient.get<Query>(
        `/api/projects/${projectId}/queries/${queryId}`
      )
      return response.data
    },
    enabled: !!projectId && !!queryId,
  })
}

export function useCreateQuery(projectId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: QueryCreate) => {
      const response = await apiClient.post<Query>(
        `/api/projects/${projectId}/queries`,
        data
      )
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['queries', projectId] })
    },
  })
}

export function useUpdateQuery(projectId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ queryId, data }: { queryId: string; data: QueryUpdate }) => {
      const response = await apiClient.patch<Query>(
        `/api/projects/${projectId}/queries/${queryId}`,
        data
      )
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['queries', projectId] })
    },
  })
}

export function useDeleteQuery(projectId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (queryId: string) => {
      await apiClient.delete(`/api/projects/${projectId}/queries/${queryId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['queries', projectId] })
    },
  })
}
