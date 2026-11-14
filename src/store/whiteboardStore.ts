import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { uid } from '@/lib/id'
import { cloneItems, sameItems, type BoardItem, type ShapeKind, type Tool } from '@/components/whiteboard/model'

export interface Board {
  id: string
  title: string
  items: BoardItem[]
  updatedAt: number
}

interface WhiteboardState {
  boards: Board[]
  activeId: string
  tool: Tool
  shape: ShapeKind
  stickyColor: string
  ink: string
  snap: boolean
  past: Record<string, BoardItem[][]>
  future: Record<string, BoardItem[][]>
  setTool: (tool: Tool) => void
  setShape: (shape: ShapeKind) => void
  setStickyColor: (stickyColor: string) => void
  setInk: (ink: string) => void
  toggleSnap: () => void
  setActive: (id: string) => void
  createBoard: () => string
  renameBoard: (id: string, title: string) => void
  deleteBoard: (id: string) => void
  duplicateBoard: (id: string) => void
  commit: (boardId: string, before: BoardItem[], after: BoardItem[]) => void
  undo: () => void
  redo: () => void
}

function blankBoard(title = 'Untitled'): Board {
  return { id: uid(), title, items: [], updatedAt: Date.now() }
}

const first = blankBoard()

export const useWhiteboardStore = create<WhiteboardState>()(
  persist(
    (set, get) => ({
      boards: [first],
      activeId: first.id,
      tool: 'select',
      shape: 'round',
      stickyColor: '#FFF6A3',
      ink: '#1C1C1E',
      snap: true,
      past: {},
      future: {},
      setTool: (tool) => set({ tool }),
      setShape: (shape) => set({ shape, tool: 'shape' }),
      setStickyColor: (stickyColor) => set({ stickyColor }),
      setInk: (ink) => set({ ink }),
      toggleSnap: () => set((state) => ({ snap: !state.snap })),
      setActive: (activeId) => set({ activeId }),
      createBoard: () => {
        const board = blankBoard(get().boards.some((entry) => entry.title === 'Untitled') ? `Untitled ${get().boards.length + 1}` : 'Untitled')
        set((state) => ({ boards: [board, ...state.boards], activeId: board.id }))
        return board.id
      },
      renameBoard: (id, title) =>
        set((state) => ({
          boards: state.boards.map((board) => (board.id === id ? { ...board, title } : board)),
        })),
      deleteBoard: (id) =>
        set((state) => {
          let boards = state.boards.filter((board) => board.id !== id)
          if (!boards.length) boards = [blankBoard()]
          const past = { ...state.past }
          const future = { ...state.future }
          delete past[id]
          delete future[id]
          return { boards, activeId: state.activeId === id ? boards[0].id : state.activeId, past, future }
        }),
      duplicateBoard: (id) => {
        const source = get().boards.find((board) => board.id === id)
        if (!source) return
        const copy: Board = {
          id: uid(),
          title: `${source.title} copy`,
          items: cloneItems(source.items, 0, 0),
          updatedAt: Date.now(),
        }
        set((state) => ({ boards: [copy, ...state.boards], activeId: copy.id }))
      },
      commit: (boardId, before, after) => {
        if (sameItems(before, after)) return
        set((state) => ({
          past: { ...state.past, [boardId]: [...(state.past[boardId] ?? []), before].slice(-80) },
          future: { ...state.future, [boardId]: [] },
          boards: state.boards.map((board) => (board.id === boardId ? { ...board, items: after, updatedAt: Date.now() } : board)),
        }))
      },
      undo: () => {
        const state = get()
        const stack = state.past[state.activeId]
        if (!stack?.length) return
        const before = stack[stack.length - 1]
        const current = state.boards.find((board) => board.id === state.activeId)?.items ?? []
        set({
          past: { ...state.past, [state.activeId]: stack.slice(0, -1) },
          future: { ...state.future, [state.activeId]: [...(state.future[state.activeId] ?? []), current].slice(-80) },
          boards: state.boards.map((board) => (board.id === state.activeId ? { ...board, items: before, updatedAt: Date.now() } : board)),
        })
      },
      redo: () => {
        const state = get()
        const stack = state.future[state.activeId]
        if (!stack?.length) return
        const next = stack[stack.length - 1]
        const current = state.boards.find((board) => board.id === state.activeId)?.items ?? []
        set({
          future: { ...state.future, [state.activeId]: stack.slice(0, -1) },
          past: { ...state.past, [state.activeId]: [...(state.past[state.activeId] ?? []), current].slice(-80) },
          boards: state.boards.map((board) => (board.id === state.activeId ? { ...board, items: next, updatedAt: Date.now() } : board)),
        })
      },
    }),
    {
      name: 'kip-whiteboard',
      partialize: (state) => ({
        boards: state.boards,
        activeId: state.activeId,
        shape: state.shape,
        stickyColor: state.stickyColor,
        ink: state.ink,
        snap: state.snap,
      }),
    },
  ),
)
