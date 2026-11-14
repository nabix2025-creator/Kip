import { VIEWS } from '@/lib/constants'
import type { ViewMode } from '@/types'
import { Segmented } from '@/components/ui/Segmented'

export function ViewSwitcher({ value, onChange }: { value: ViewMode; onChange: (view: ViewMode) => void }) {
  return <Segmented value={value} onChange={onChange} options={VIEWS.map((view) => ({ value: view.id, label: view.label }))} />
}
