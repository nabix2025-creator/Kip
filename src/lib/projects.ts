import { uid } from '@/lib/id'
import type { Project, ProjectAddon, ProjectStep } from '@/store/dashboardStore'

export function normalizeProject(raw: Partial<Project> & { id: string; name: string }): Project {
  const steps = Array.isArray(raw.steps)
    ? raw.steps
        .filter((step): step is ProjectStep => !!step && typeof step.id === 'string' && typeof step.label === 'string')
        .map((step) => ({ id: step.id, label: step.label, done: !!step.done }))
    : []
  const addons = Array.isArray(raw.addons)
    ? raw.addons
        .filter((item): item is ProjectAddon => !!item && typeof item.id === 'string' && typeof item.label === 'string')
        .map((item) => ({
          id: item.id,
          label: item.label,
          kind: item.kind === 'tool' || item.kind === 'dep' || item.kind === 'person' || item.kind === 'resource' ? item.kind : 'resource',
          status: item.status === 'done' ? ('done' as const) : ('needed' as const),
        }))
    : []

  const nextFromSteps = steps.find((step) => !step.done)?.label ?? ''
  return {
    id: raw.id,
    name: raw.name,
    priority: raw.priority === 'low' || raw.priority === 'high' || raw.priority === 'medium' ? raw.priority : 'medium',
    done: !!raw.done,
    next: nextFromSteps || (typeof raw.next === 'string' ? raw.next : ''),
    targetDate: typeof raw.targetDate === 'string' ? raw.targetDate : '',
    steps,
    addons,
  }
}

export function projectProgress(project: Project): number {
  if (project.done) return 100
  if (!project.steps.length) return 0
  const done = project.steps.filter((step) => step.done).length
  return Math.round((done / project.steps.length) * 100)
}

export function projectNextLabel(project: Project): string {
  if (project.done) return ''
  const step = project.steps.find((item) => !item.done)
  if (step) return step.label
  return (project.next ?? '').trim()
}

export function projectAddonCounts(project: Project): { needed: number; done: number; total: number } {
  const total = project.addons.length
  const done = project.addons.filter((item) => item.status === 'done').length
  return { needed: total - done, done, total }
}

export function syncProjectNext(project: Project): Project {
  const next = project.steps.find((step) => !step.done)?.label ?? ''
  return { ...project, next }
}

export function makeStep(label: string): ProjectStep {
  return { id: uid(), label: label.trim(), done: false }
}

export function makeAddon(label: string, kind: ProjectAddon['kind']): ProjectAddon {
  return { id: uid(), label: label.trim(), kind, status: 'needed' }
}
