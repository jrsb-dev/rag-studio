import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/api/client'
import type { Document, DocumentListResponse } from '@/types/api'

export function useDocuments(projectId: string | undefined) {
  return useQuery({
    queryKey: ['documents', projectId],
    queryFn: async () => {
      const response = await apiClient.get<Document[]>(
        `/api/projects/${projectId}/documents`
      )
      return response.data
    },
    enabled: !!projectId,
  })
}

export function useUploadDocuments(projectId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (files: File[]) => {
      const formData = new FormData()
      files.forEach((file) => {
        formData.append('files', file)
      })

      const response = await apiClient.post<DocumentListResponse>(
        `/api/projects/${projectId}/documents`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      )
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents', projectId] })
    },
  })
}

export function useDeleteDocument(projectId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (documentId: string) => {
      await apiClient.delete(`/api/projects/${projectId}/documents/${documentId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents', projectId] })
    },
  })
}
