/**
 * Íconos de la interfaz (Phosphor). Un solo punto de cambio: las pantallas importan
 * desde aquí y no conocen la librería.
 * Convención: trazo «regular» por defecto; «fill» solo para el estado activo.
 */
import type { ComponentType, SVGProps } from 'react'
import type { IconWeight } from '@phosphor-icons/react'

export {
  ArchiveIcon,
  ArrowCounterClockwiseIcon as ArchiveRestoreIcon,
  BellIcon,
  BellRingingIcon as BellPlusIcon,
  ChatCenteredTextIcon as BotIcon,
  CalendarDotsIcon as CalendarDaysIcon,
  CalendarPlusIcon,
  CheckCircleIcon as CheckCircle2Icon,
  CheckIcon,
  CaretDownIcon as ChevronDownIcon,
  CaretLeftIcon as ChevronLeftIcon,
  CaretRightIcon as ChevronRightIcon,
  ClipboardTextIcon as ClipboardCopyIcon,
  CopyIcon,
  DownloadSimpleIcon as DownloadIcon,
  DotsThreeIcon as EllipsisIcon,
  ArrowSquareOutIcon as ExternalLinkIcon,
  FileXlsIcon as FileSpreadsheetIcon,
  FolderIcon,
  FolderPlusIcon,
  HourglassIcon,
  TrayIcon as InboxIcon,
  SignOutIcon as LogOutIcon,
  MapTrifoldIcon as MapIcon,
  MapPinIcon,
  PencilLineIcon as PenLineIcon,
  PencilSimpleIcon as PencilIcon,
  PlusIcon,
  ArrowCounterClockwiseIcon as RotateCcwIcon,
  ListMagnifyingGlassIcon as SearchCheckIcon,
  MagnifyingGlassIcon as SearchIcon,
  GearSixIcon as SettingsIcon,
  SunHorizonIcon as SunriseIcon,
  TrashIcon as Trash2Icon,
  WarningIcon as TriangleAlertIcon,
  UserPlusIcon,
} from '@phosphor-icons/react'

export type Icono = ComponentType<SVGProps<SVGSVGElement> & { weight?: IconWeight; className?: string }>

// Usados por los componentes base (src/components/ui)
export {
  CaretUpIcon as ChevronUpIcon,
  CheckCircleIcon as CircleCheckIcon,
  InfoIcon,
  CircleNotchIcon as Loader2Icon,
  XCircleIcon as OctagonXIcon,
  SidebarSimpleIcon as PanelLeftIcon,
  XIcon,
} from '@phosphor-icons/react'

// Acceso
export {
  EnvelopeSimpleIcon as MailIcon,
  LockSimpleIcon as LockIcon,
  EyeIcon,
  EyeSlashIcon as EyeOffIcon,
  ShieldCheckIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
} from '@phosphor-icons/react'

// Documentos (Drive)
export {
  FilePdfIcon,
  FileDocIcon,
  FileImageIcon,
  FileXlsIcon,
  FileIcon,
  FolderOpenIcon,
  ArrowClockwiseIcon as RefreshIcon,
  GoogleDriveLogoIcon as DriveIcon,
  LinkSimpleIcon as LinkIcon,
  ShareNetworkIcon as ShareIcon,
  WhatsappLogoIcon as WhatsappIcon,
  ScalesIcon,
  BooksIcon,
  TextAlignLeftIcon,
  QuestionIcon,
  ListChecksIcon,
  CircleDashedIcon,
  LifebuoyIcon,
  CompassIcon,
  SquaresFourIcon,
  KeyboardIcon,
  MoonIcon,
  SunIcon,
  GavelIcon,
  ChartBarIcon,
} from '@phosphor-icons/react'
