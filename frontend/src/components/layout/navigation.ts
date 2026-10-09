import { ClipboardText, FolderOpen, Gauge, Pulse, type Icon } from '@phosphor-icons/react'

export interface NavItem {
  to: string
  label: string
  shortLabel: string
  icon: Icon
  end: boolean
}

// Same destinations and labels as the original app.
export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Dashboard', shortLabel: 'Dashboard', icon: Gauge, end: true },
  { to: '/records', label: 'Patient Records', shortLabel: 'Records', icon: FolderOpen, end: false },
  { to: '/analysis', label: 'AI Analysis', shortLabel: 'Analysis', icon: Pulse, end: false },
  { to: '/doctor-summary', label: 'Doctor Summary', shortLabel: 'Summary', icon: ClipboardText, end: false },
]
