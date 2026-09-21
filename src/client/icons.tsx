import {
  FishLogo,
  IconArchiveOutline20,
  IconBranchOutline16,
  IconCheckOutline16,
  IconChevronDownOutline14,
  IconCloseOutline16,
  IconChevronRightOutline14,
  IconPluginPinwheelOutline16,
  IconEditOutline16,
  IconEllipsisOutline16,
  IconFolderOpenOutline16,
  IconLinkOutline16,
  IconLoadingOutline16,
  IconNewChatOutline16,
  IconProjectAddOutline16,
  IconQuestionOutline14,
  IconRefreshOutline16,
  IconSearchOutline16,
} from './official-icons.tsx'

export {
  IconArchiveOutline20 as ArchiveIcon,
  IconBranchOutline16 as BranchIcon,
  IconCheckOutline16 as CheckIcon,
  IconChevronDownOutline14 as ChevronDownIcon,
  IconCloseOutline16 as CloseIcon,
  IconChevronRightOutline14 as ChevronRightIcon,
  IconPluginPinwheelOutline16 as PluginIcon,
  IconEditOutline16 as PenIcon,
  IconEllipsisOutline16 as MoreIcon,
  IconFolderOpenOutline16 as WorkspaceFilterIcon,
  IconLinkOutline16 as WorktreeIcon,
  IconLoadingOutline16 as LoadingIcon,
  IconNewChatOutline16 as NewSessionIcon,
  IconProjectAddOutline16 as AddWorkspaceIcon,
  IconQuestionOutline14 as WaitingIcon,
  IconRefreshOutline16 as RestoreIcon,
  IconSearchOutline16 as SearchIcon,
}

/** Lucide Pin, ISC; same glyph T3 uses for pinned threads. */
export function SettingsIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
      <path d="m19.4 15 .1.1a2 2 0 1 1-2.8 2.8l-.1-.1a2 2 0 0 0-3.4 1.4v.3a2 2 0 1 1-4 0v-.3A2 2 0 0 0 5.8 17.8l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A2 2 0 0 0 1.6 11.6h-.3a2 2 0 1 1 0-4h.3A2 2 0 0 0 3 4.2l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A2 2 0 0 0 9.2 0h.3a2 2 0 1 1 4 0v.3a2 2 0 0 0 3.4 1.4l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a2 2 0 0 0 1.4 3.4h.3a2 2 0 1 1 0 4h-.3a2 2 0 0 0-1.7 3.1Z" transform="translate(1.5 1.5) scale(.875)" />
    </svg>
  )
}

export function PinIcon({ off = false }: { off?: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 17v5" />
      {off ? (
        <>
          <path d="M15 9.34V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H7.89" />
          <path d="m2 2 20 20" />
          <path d="M9 9v1.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h11" />
        </>
      ) : (
        <path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z" />
      )}
    </svg>
  )
}

/** Lucide Clock, ISC; sourced from Workstation/CodexHub. */
export function ClockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  )
}

export function DshRuntimeIcon() {
  return <FishLogo size={12} />
}

// Exact currentColor marks used by Provider Usage, normalized into the same 12px SVG seat.
const CURSOR_BRAND_PATH = 'M11.503.131 1.891 5.678a.84.84 0 0 0-.42.726v11.188c0 .3.162.575.42.724l9.609 5.55a1 1 0 0 0 .998 0l9.61-5.55a.84.84 0 0 0 .42-.724V6.404a.84.84 0 0 0-.42-.726L12.497.131a1.01 1.01 0 0 0-.996 0M2.657 6.338h18.55c.263 0 .43.287.297.515L12.23 22.918c-.062.107-.229.064-.229-.06V12.335a.59.59 0 0 0-.295-.51l-9.11-5.257c-.109-.063-.064-.23.061-.23'
const AGY_BRAND_PATH = 'M84.5 16C64 16 57 39 49 67C42 93 36 111 24 122C18 128 22 132 28 132C42 132 50 116 59 99C66 85 72 78 84.5 78C97 78 103 85 110 99C119 116 127 132 141 132C147 132 151 128 145 122C133 111 127 93 120 67C112 39 105 16 84.5 16Z'

function RuntimeMark({ viewBox, path }: { viewBox: string; path: string }) {
  return <svg className="dsht3-runtime-glyph" width="12" height="12" viewBox={viewBox} preserveAspectRatio="xMidYMid meet" aria-hidden="true"><path fill="currentColor" d={path} /></svg>
}

export function CursorRuntimeIcon() {
  return <RuntimeMark viewBox="0.24 -1.44 23.6 26.88" path={CURSOR_BRAND_PATH} />
}

export function AgyRuntimeIcon() {
  return <RuntimeMark viewBox="13.4 8.4 142.1 129.9" path={AGY_BRAND_PATH} />
}
