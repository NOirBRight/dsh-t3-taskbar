/** Tabler Icons MIT paths T3 mobile maps in AppSymbol.tsx (@tabler/icons-react-native ^3.44.0). */
import type { ReactNode } from 'react'

type IconProps = { size?: number | undefined; className?: string | undefined }

function TablerOutline({ size = 16, className, children }: IconProps & { children: ReactNode }) {
  return (
    <svg width={size} height={size} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  )
}

/** IconFilter — line.3.horizontal.decrease */
export function FilterIcon({ size = 22, className }: IconProps) {
  return (
    <TablerOutline size={size} className={className}>
      <path d="M4 4h16v2.172a2 2 0 0 1 -.586 1.414l-4.414 4.414v7l-6 2v-8.5l-4.48 -4.928a2 2 0 0 1 -.52 -1.345v-2.227" />
    </TablerOutline>
  )
}

/** IconFilterFilled — line.3.horizontal.decrease.circle.fill */
export function FilterFilledIcon({ size = 22, className }: IconProps) {
  return (
    <svg width={size} height={size} className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20 3h-16a1 1 0 0 0 -1 1v2.227l.008 .223a3 3 0 0 0 .772 1.795l4.22 4.641v8.114a1 1 0 0 0 1.316 .949l6 -2l.108 -.043a1 1 0 0 0 .576 -.906v-6.586l4.121 -4.12a3 3 0 0 0 .879 -2.123v-2.171a1 1 0 0 0 -1 -1z" />
    </svg>
  )
}

/** IconSearch — magnifyingglass */
export function T3SearchIcon({ size = 16, className }: IconProps) {
  return (
    <TablerOutline size={size} className={className}>
      <path d="M3 10a7 7 0 1 0 14 0a7 7 0 1 0 -14 0" />
      <path d="M21 21l-6 -6" />
    </TablerOutline>
  )
}

/** IconSettings — gearshape */
export function SettingsIcon({ size = 22, className }: IconProps) {
  return (
    <TablerOutline size={size} className={className}>
      <path d="M10.325 4.317c.426 -1.756 2.924 -1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543 -.94 3.31 .826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756 .426 1.756 2.924 0 3.35a1.724 1.724 0 0 0 -1.066 2.573c.94 1.543 -.826 3.31 -2.37 2.37a1.724 1.724 0 0 0 -2.572 1.065c-.426 1.756 -2.924 1.756 -3.35 0a1.724 1.724 0 0 0 -2.573 -1.066c-1.543 .94 -3.31 -.826 -2.37 -2.37a1.724 1.724 0 0 0 -1.065 -2.572c-1.756 -.426 -1.756 -2.924 0 -3.35a1.724 1.724 0 0 0 1.066 -2.573c-.94 -1.543 .826 -3.31 2.37 -2.37c1 .608 2.296 .07 2.572 -1.065" />
      <path d="M9 12a3 3 0 1 0 6 0a3 3 0 0 0 -6 0" />
    </TablerOutline>
  )
}

/** IconEdit — square.and.pencil */
export function SquarePenIcon({ size = 24, className }: IconProps) {
  return (
    <TablerOutline size={size} className={className}>
      <path d="M7 7h-1a2 2 0 0 0 -2 2v9a2 2 0 0 0 2 2h9a2 2 0 0 0 2 -2v-1" />
      <path d="M20.385 6.585a2.1 2.1 0 0 0 -2.97 -2.97l-8.415 8.385v3h3l8.385 -8.415z" />
      <path d="M16 5l3 3" />
    </TablerOutline>
  )
}

/** IconFolder — folder */
export function FolderIcon({ size = 24, className }: IconProps) {
  return (
    <TablerOutline size={size} className={className}>
      <path d="M5 4h4l3 3h7a2 2 0 0 1 2 2v8a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-11a2 2 0 0 1 2 -2" />
    </TablerOutline>
  )
}

/** IconPlus — plus */
export function PlusIcon({ size = 22, className }: IconProps) {
  return (
    <TablerOutline size={size} className={className}>
      <path d="M12 5l0 14" />
      <path d="M5 12l14 0" />
    </TablerOutline>
  )
}

/** IconPin — pin */
export function PinIcon({ off = false, size = 16, className }: IconProps & { off?: boolean }) {
  if (off) {
    return (
      <TablerOutline size={size} className={className}>
        <path d="M3 3l18 18" />
        <path d="M15 4.5l-3.249 3.249m-2.57 1.433l-2.181 .818l-1.5 1.5l7 7l1.5 -1.5l.82 -2.186m1.43 -2.563l3.25 -3.251" />
        <path d="M9 15l-4.5 4.5" />
        <path d="M14.5 4l5.5 5.5" />
      </TablerOutline>
    )
  }
  return (
    <TablerOutline size={size} className={className}>
      <path d="M15 4.5l-4 4l-4 1.5l-1.5 1.5l7 7l1.5 -1.5l1.5 -4l4 -4" />
      <path d="M9 15l-4.5 4.5" />
      <path d="M14.5 4l5.5 5.5" />
    </TablerOutline>
  )
}

/** IconClock — clock */
export function ClockIcon({ size = 16, className }: IconProps) {
  return (
    <TablerOutline size={size} className={className}>
      <path d="M3 12a9 9 0 1 0 18 0a9 9 0 0 0 -18 0" />
      <path d="M12 7v5l3 3" />
    </TablerOutline>
  )
}

/** IconChevronRight — chevron.right */
export function T3ChevronRightIcon({ size = 16, className }: IconProps) {
  return (
    <TablerOutline size={size} className={className}>
      <path d="M9 6l6 6l-6 6" />
    </TablerOutline>
  )
}

/** IconArrowLeft — arrow.left */
export function ArrowLeftIcon({ size = 22, className }: IconProps) {
  return (
    <TablerOutline size={size} className={className}>
      <path d="M5 12l14 0" />
      <path d="M5 12l6 6" />
      <path d="M5 12l6 -6" />
    </TablerOutline>
  )
}
