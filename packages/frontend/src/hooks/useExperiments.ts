import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/api/client'
import type { Experiment, ExperimentCreate, ExperimentResults } from '@/types/api'

export function useCreateExperiment(projectId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: ExperimentCreate) => {
      const response = await apiClient.post<Experiment>(
        `/api/projects/${projectId}/experiments`,
        data
      )
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['experiments', projectId] })
    },
  })
}

export function useExperiment(experimentId: string | undefined) {
  return useQuery({
    queryKey: ['experiments', experimentId],
    queryFn: async () => {
      const response = await apiClient.get<Experiment>(
        `/api/experiments/${experimentId}`
      )
      return response.data
    },
    enabled: !!experimentId,
  })
}

export function useExperimentResults(experimentId: string | undefined) {
  return useQuery({
    queryKey: ['experiment-results', experimentId],
    queryFn: async () => {
      const response = await apiClient.get<ExperimentResults>(
        `/api/experiments/${experimentId}/results`
      )
      return response.data
    },
    enabled: !!experimentId,
    refetchInterval: (data) => {
      // Refetch every 3 seconds if experiment is running
      const experiment = data?.state.data
      return experiment && experiment.configs.length === 0 ? 3000 : false
    },
  })
}
