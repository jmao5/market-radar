import { create } from 'zustand'

type SortOrder = 'latest' | 'oldest' | 'popular'

interface FilterState {
  query: string
  sortOrder: SortOrder
  selectedTags: string[]

  setQuery: (q: string) => void
  setSortOrder: (order: SortOrder) => void
  toggleTag: (tag: string) => void
  resetFilters: () => void
}

const initialState = {
  query: '',
  sortOrder: 'latest' as SortOrder,
  selectedTags: [],
}

export const useFilterStore = create<FilterState>((set) => ({
  ...initialState,

  setQuery: (query) => set({ query }),

  setSortOrder: (sortOrder) => set({ sortOrder }),

  toggleTag: (tag) =>
    set((state) => ({
      selectedTags: state.selectedTags.includes(tag)
        ? state.selectedTags.filter((t) => t !== tag)
        : [...state.selectedTags, tag],
    })),

  resetFilters: () => set(initialState),
}))
