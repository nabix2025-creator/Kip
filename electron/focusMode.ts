import { execFile } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import { app, BrowserWindow, dialog } from 'electron'
import { notifyOs } from './notifier'
import { storeGet, storeSet } from './store'

const execFileAsync = promisify(execFile)

const HOSTS_MARKER_BEGIN = '# >>> KIP-FOCUS-BEGIN'
const HOSTS_MARKER_END = '# <<< KIP-FOCUS-END'
const STORE_KEY = 'focusMode.enabled'
const STORE_ENDS_AT = 'focusMode.endsAt'
const STORE_TARGETS = 'focusMode.targets'

/** Exact user-requested copy — do not paraphrase. */
export const FOCUS_DISCIPLINE_MESSAGE = "DON'T TURN OFF FOCUS MODE IF YOU ARE NOT GAY."

export type FocusTargetId = 'youtube' | 'instagram' | 'tiktok' | 'netflix' | 'discord'

type FocusTargetDef = {
  id: FocusTargetId
  label: string
  domains: string[]
  processes: string[]
}

/** Selectable distractions — deselect to allow during Focus Mode. */
export const FOCUS_TARGETS: FocusTargetDef[] = [
  {
    id: 'youtube',
    label: 'YouTube',
    domains: ['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be'],
    processes: [],
  },
  {
    id: 'instagram',
    label: 'Instagram',
    domains: ['instagram.com', 'www.instagram.com', 'm.instagram.com'],
    processes: ['Instagram.exe'],
  },
  {
    id: 'tiktok',
    label: 'TikTok',
    domains: ['tiktok.com', 'www.tiktok.com', 'm.tiktok.com', 'vm.tiktok.com'],
    processes: [],
  },
  {
    id: 'netflix',
    label: 'Netflix',
    domains: ['netflix.com', 'www.netflix.com', 'm.netflix.com'],
    processes: [],
  },
  {
    id: 'discord',
    label: 'Discord',
    domains: ['discord.com', 'www.discord.com', 'discordapp.com', 'www.discordapp.com', 'discord.gg', 'www.discord.gg'],
    processes: ['Discord.exe', 'DiscordPTB.exe', 'DiscordCanary.exe', 'DiscordDevelopment.exe'],
  },
]

const ALL_TARGET_IDS: FocusTargetId[] = FOCUS_TARGETS.map((item) => item.id)

const PROCESS_POLL_MS = 1500
const INTEGRITY_POLL_MS = 4000
const NAG_COOLDOWN_MS = 2500

export type FocusModeEnableOptions = {
  /** Session length in minutes (preferred). */
  minutes?: number
  /** Absolute end time (ISO). Used when set; otherwise derived from minutes. */
  endsAt?: string
  /** Which distractions to block; defaults to saved preference / all. */
  targets?: FocusTargetId[]
}

export type FocusModeStatus = {
  enabled: boolean
  hostsActive: boolean
  processGuard: boolean
  needsElevation: boolean
  message: string
  blockedDomains: string[]
  blockedApps: string[]
  /** Currently blocked target ids (checked = blocked). */
  targets: FocusTargetId[]
  /** All selectable targets for the UI. */
  availableTargets: { id: FocusTargetId; label: string }[]
  /** ISO end time while a timed session is active; null when off. */
  endsAt: string | null
  /** Milliseconds remaining; 0 when expired/off. */
  remainingMs: number
}

let processTimer: ReturnType<typeof setInterval> | null = null
let integrityTimer: ReturnType<typeof setInterval> | null = null
let expiryTimer: ReturnType<typeof setTimeout> | null = null
let hostsApplied = false
let lastMessage = ''
let nagOpen = false
let lastNagAt = 0
let getNagParent: (() => BrowserWindow | null) | null = null
let endingSession = false

export function setFocusNagParent(getter: () => BrowserWindow | null): void {
  getNagParent = getter
}

function hostsPath(): string {
  return process.platform === 'win32' ? join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'drivers', 'etc', 'hosts') : '/etc/hosts'
}

function backupPath(): string {
  const dir = join(app.getPath('userData'), 'focus-mode')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return join(dir, 'hosts.backup')
}

function stripKipBlock(content: string): string {
  const begin = content.indexOf(HOSTS_MARKER_BEGIN)
  if (begin === -1) return content.replace(/\r?\n+$/, '') + '\n'
  const end = content.indexOf(HOSTS_MARKER_END, begin)
  if (end === -1) return content.slice(0, begin).replace(/\r?\n+$/, '') + '\n'
  const before = content.slice(0, begin)
  const after = content.slice(end + HOSTS_MARKER_END.length)
  return (before + after).replace(/\r?\n+$/, '') + '\n'
}

function isFocusTargetId(value: unknown): value is FocusTargetId {
  return typeof value === 'string' && (ALL_TARGET_IDS as string[]).includes(value)
}

function parseTargets(raw: unknown): FocusTargetId[] | null {
  if (!Array.isArray(raw)) return null
  return Array.from(new Set(raw.filter(isFocusTargetId)))
}

function readTargets(): FocusTargetId[] {
  return parseTargets(storeGet(STORE_TARGETS)) ?? [...ALL_TARGET_IDS]
}

function writeTargets(targets: FocusTargetId[]): FocusTargetId[] {
  const next = Array.from(new Set(targets.filter(isFocusTargetId)))
  storeSet(STORE_TARGETS, next)
  return next
}

function activeTargetDefs(): FocusTargetDef[] {
  const selected = new Set(readTargets())
  return FOCUS_TARGETS.filter((item) => selected.has(item.id))
}

function activeDomains(): string[] {
  return activeTargetDefs().flatMap((item) => item.domains)
}

function activeProcesses(): string[] {
  return activeTargetDefs().flatMap((item) => item.processes)
}

function activeAppLabels(): string[] {
  return activeTargetDefs()
    .filter((item) => item.processes.length > 0)
    .map((item) => item.label)
}

function buildHostsBlock(): string {
  const domains = activeDomains()
  if (domains.length === 0) {
    return `${HOSTS_MARKER_BEGIN}\n${HOSTS_MARKER_END}\n`
  }
  const lines = domains.flatMap((domain) => [`127.0.0.1 ${domain}`, `::1 ${domain}`])
  return `${HOSTS_MARKER_BEGIN}\n${lines.join('\n')}\n${HOSTS_MARKER_END}\n`
}

function extractKipBlock(content: string): string | null {
  const begin = content.indexOf(HOSTS_MARKER_BEGIN)
  if (begin === -1) return null
  const end = content.indexOf(HOSTS_MARKER_END, begin)
  if (end === -1) return null
  return content.slice(begin, end + HOSTS_MARKER_END.length)
}

/** True when markers exist and every currently selected domain is listed inside the Kip block. */
function hostsIntact(): boolean {
  try {
    const content = readFileSync(hostsPath(), 'utf8')
    const block = extractKipBlock(content)
    if (!block) {
      hostsApplied = false
      return false
    }
    const domains = activeDomains()
    // Empty selection: markers alone are enough (nothing to redirect).
    const ok = domains.length === 0 || domains.every((domain) => block.includes(domain))
    // Also ensure deselected domains are not still redirected.
    const selected = new Set(domains)
    const leaked = FOCUS_TARGETS.flatMap((item) => item.domains).some(
      (domain) => !selected.has(domain) && block.includes(` ${domain}`),
    )
    const intact = ok && !leaked
    hostsApplied = intact
    return intact
  } catch {
    return false
  }
}

function writeHostsElevated(nextContent: string): Promise<{ ok: boolean; message: string }> {
  if (process.platform !== 'win32') {
    return Promise.resolve({ ok: false, message: 'Focus Mode site blocking is only supported on Windows.' })
  }
  const scriptPath = join(tmpdir(), `kip-focus-hosts-${Date.now()}.ps1`)
  const encoded = Buffer.from(nextContent, 'utf8').toString('base64')
  const script = [
    `$ErrorActionPreference = 'Stop'`,
    `$path = '${hostsPath().replace(/'/g, "''")}'`,
    `$bytes = [Convert]::FromBase64String('${encoded}')`,
    `$text = [System.Text.Encoding]::UTF8.GetString($bytes)`,
    `[System.IO.File]::WriteAllText($path, $text)`,
  ].join('\n')
  writeFileSync(scriptPath, script, 'utf8')

  return new Promise((resolve) => {
    const ps = [
      '-NoProfile',
      '-ExecutionPolicy',
      'Bypass',
      '-Command',
      `Start-Process -FilePath powershell -Verb RunAs -Wait -ArgumentList '-NoProfile','-ExecutionPolicy','Bypass','-File','${scriptPath.replace(/'/g, "''")}'`,
    ]
    execFile('powershell.exe', ps, { windowsHide: true }, (error) => {
      try {
        if (existsSync(scriptPath)) writeFileSync(scriptPath, '', 'utf8')
      } catch {
        /* ignore */
      }
      if (error) {
        resolve({
          ok: false,
          message: 'Admin approval needed to update the hosts file. Approve the UAC prompt, or Focus Mode will only close apps.',
        })
        return
      }
      try {
        const check = readFileSync(hostsPath(), 'utf8')
        const wantBlock = nextContent.includes(HOSTS_MARKER_BEGIN)
        const hasBlock = check.includes(HOSTS_MARKER_BEGIN)
        if (wantBlock === hasBlock) {
          resolve({ ok: true, message: 'Hosts file updated.' })
          return
        }
      } catch {
        /* fall through */
      }
      resolve({
        ok: false,
        message: 'Could not update hosts file. Site blocking needs admin rights once.',
      })
    })
  })
}

async function applyHosts(): Promise<{ ok: boolean; message: string }> {
  const path = hostsPath()
  try {
    const current = readFileSync(path, 'utf8')
    const backup = backupPath()
    if (!existsSync(backup)) {
      copyFileSync(path, backup)
    }
    const cleaned = stripKipBlock(current)
    const next = cleaned.endsWith('\n') ? cleaned + buildHostsBlock() : `${cleaned}\n${buildHostsBlock()}`
    try {
      writeFileSync(path, next, 'utf8')
      hostsApplied = true
      return { ok: true, message: 'Distracting sites redirected via hosts file.' }
    } catch {
      const elevated = await writeHostsElevated(next)
      hostsApplied = elevated.ok
      return elevated
    }
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : 'Could not read hosts file.',
    }
  }
}

async function restoreHosts(): Promise<{ ok: boolean; message: string }> {
  const path = hostsPath()
  try {
    const current = readFileSync(path, 'utf8')
    if (!current.includes(HOSTS_MARKER_BEGIN)) {
      hostsApplied = false
      return { ok: true, message: 'Hosts file already clean.' }
    }
    const next = stripKipBlock(current)
    try {
      writeFileSync(path, next, 'utf8')
      hostsApplied = false
      return { ok: true, message: 'Hosts file restored.' }
    } catch {
      const elevated = await writeHostsElevated(next)
      if (elevated.ok) hostsApplied = false
      return elevated
    }
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : 'Could not restore hosts file.',
    }
  }
}

function closeBlockedProcesses(): void {
  if (process.platform !== 'win32') return
  for (const name of activeProcesses()) {
    void execFileAsync('taskkill', ['/F', '/IM', name, '/T'], { windowsHide: true }).catch(() => undefined)
  }
}

export async function showFocusDisciplineNag(): Promise<void> {
  const now = Date.now()
  if (nagOpen || now - lastNagAt < NAG_COOLDOWN_MS) return
  nagOpen = true
  lastNagAt = now
  lastMessage = FOCUS_DISCIPLINE_MESSAGE
  try {
    const parent = getNagParent?.() ?? undefined
    const options = {
      type: 'warning' as const,
      buttons: ['OK'],
      defaultId: 0,
      noLink: true,
      title: 'Focus Mode',
      message: FOCUS_DISCIPLINE_MESSAGE,
    }
    if (parent && !parent.isDestroyed()) {
      await dialog.showMessageBox(parent, options)
    } else {
      await dialog.showMessageBox(options)
    }
  } catch {
    /* ignore dialog failures */
  } finally {
    nagOpen = false
  }
}

async function enforceHostsOrNag(): Promise<void> {
  if (!readEnabled()) return
  if (hostsIntact()) return
  const hosts = await applyHosts()
  lastMessage = hosts.ok
    ? FOCUS_DISCIPLINE_MESSAGE
    : `${FOCUS_DISCIPLINE_MESSAGE} (${hosts.message})`
  void showFocusDisciplineNag()
}

function startProcessGuard(): void {
  if (!processTimer) {
    closeBlockedProcesses()
    processTimer = setInterval(() => closeBlockedProcesses(), PROCESS_POLL_MS)
  }
  if (!integrityTimer) {
    integrityTimer = setInterval(() => {
      void enforceHostsOrNag()
    }, INTEGRITY_POLL_MS)
  }
}

function stopProcessGuard(): void {
  if (processTimer) {
    clearInterval(processTimer)
    processTimer = null
  }
  if (integrityTimer) {
    clearInterval(integrityTimer)
    integrityTimer = null
  }
}

function readEnabled(): boolean {
  return Boolean(storeGet(STORE_KEY))
}

function writeEnabled(enabled: boolean): void {
  storeSet(STORE_KEY, enabled)
}

function readEndsAt(): Date | null {
  const raw = storeGet(STORE_ENDS_AT)
  if (typeof raw !== 'string' || !raw) return null
  const date = new Date(raw)
  return Number.isNaN(date.getTime()) ? null : date
}

function writeEndsAt(endsAt: string | null): void {
  storeSet(STORE_ENDS_AT, endsAt)
}

function clearExpiryTimer(): void {
  if (expiryTimer) {
    clearTimeout(expiryTimer)
    expiryTimer = null
  }
}

function broadcastFocusStatus(): void {
  const status = getFocusModeStatus()
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) win.webContents.send('focusMode:updated', status)
  }
}

function scheduleExpiry(endsAt: Date): void {
  clearExpiryTimer()
  const delay = Math.max(0, endsAt.getTime() - Date.now())
  expiryTimer = setTimeout(() => {
    void endFocusSession('expired')
  }, delay)
}

function resolveEndsAt(options?: FocusModeEnableOptions): Date | null {
  if (options?.endsAt) {
    const date = new Date(options.endsAt)
    if (!Number.isNaN(date.getTime()) && date.getTime() > Date.now() + 1000) return date
  }
  const minutes = options?.minutes
  if (typeof minutes === 'number' && Number.isFinite(minutes) && minutes > 0) {
    return new Date(Date.now() + Math.round(minutes) * 60_000)
  }
  return null
}

function formatEndLabel(endsAt: Date): string {
  try {
    return endsAt.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  } catch {
    return endsAt.toISOString()
  }
}

/**
 * Fully end a focus session: restore hosts, stop killer, clear persistence.
 * Used on timer expiry, orphaned sessions, and explicit Force off.
 */
async function endFocusSession(reason: 'expired' | 'orphan' | 'force'): Promise<FocusModeStatus> {
  if (endingSession) return getFocusModeStatus()
  endingSession = true
  try {
    clearExpiryTimer()
    writeEnabled(false)
    writeEndsAt(null)
    stopProcessGuard()
    const hosts = await restoreHosts()
    if (reason === 'expired') {
      lastMessage = hosts.ok
        ? 'Focus session ended — sites and apps unblocked.'
        : `Focus session ended. ${hosts.message}`
      try {
        notifyOs('Focus Mode', 'Session ended. Distractions are unblocked.')
      } catch {
        /* ignore */
      }
    } else if (reason === 'force') {
      lastMessage = hosts.ok
        ? 'Focus Mode force-off — distractions unlocked.'
        : `Force-off applied. ${hosts.message}`
    } else {
      lastMessage = hosts.ok ? 'Focus Mode off.' : `Focus Mode off. ${hosts.message}`
    }
    broadcastFocusStatus()
    return getFocusModeStatus()
  } finally {
    endingSession = false
  }
}

/** If enabled but endsAt is missing or past, tear down so users are not stuck forever. */
async function expireIfNeeded(): Promise<boolean> {
  if (!readEnabled()) return false
  const endsAt = readEndsAt()
  if (endsAt && endsAt.getTime() > Date.now()) return false
  await endFocusSession(endsAt ? 'expired' : 'orphan')
  return true
}

export function getFocusModeStatus(): FocusModeStatus {
  const hostsActive = hostsIntact()
  const enabled = readEnabled()
  const endsAt = readEndsAt()
  const remainingMs = enabled && endsAt ? Math.max(0, endsAt.getTime() - Date.now()) : 0
  const targets = readTargets()
  return {
    enabled,
    hostsActive,
    processGuard: Boolean(processTimer),
    needsElevation: enabled && !hostsActive && activeDomains().length > 0,
    message: lastMessage,
    blockedDomains: activeDomains(),
    blockedApps: activeAppLabels(),
    targets,
    availableTargets: FOCUS_TARGETS.map((item) => ({ id: item.id, label: item.label })),
    endsAt: enabled && endsAt ? endsAt.toISOString() : null,
    remainingMs,
  }
}

/**
 * Update which distractions are blocked. Works while idle or mid-session
 * (re-applies hosts / process list). At least one target is required.
 */
export async function setFocusModeTargets(targets: FocusTargetId[]): Promise<FocusModeStatus> {
  const parsed = parseTargets(targets) ?? []
  if (parsed.length === 0) {
    lastMessage = 'Keep at least one distraction selected to block.'
    broadcastFocusStatus()
    return getFocusModeStatus()
  }
  const next = writeTargets(parsed)
  const allowed = FOCUS_TARGETS.filter((item) => !next.includes(item.id)).map((item) => item.label)
  if (!readEnabled()) {
    lastMessage =
      allowed.length > 0
        ? `Will block selected apps. Allowed: ${allowed.join(', ')}.`
        : `Will block: ${FOCUS_TARGETS.map((item) => item.label).join(', ')}.`
    broadcastFocusStatus()
    return getFocusModeStatus()
  }
  // Mid-session: refresh hosts + process guard for the new selection.
  startProcessGuard()
  const hosts = await applyHosts()
  lastMessage = hosts.ok
    ? allowed.length > 0
      ? `Updated blocks — allowed: ${allowed.join(', ')}.`
      : 'Updated blocks — all listed distractions blocked.'
    : `Updated app blocks. ${hosts.message}`
  broadcastFocusStatus()
  return getFocusModeStatus()
}

export async function enableFocusMode(options?: FocusModeEnableOptions): Promise<FocusModeStatus> {
  const endsAt = resolveEndsAt(options)
  if (!endsAt) {
    lastMessage = 'Pick how long Focus Mode should stay on (e.g. 25 minutes).'
    return getFocusModeStatus()
  }

  if (options?.targets) {
    const parsed = parseTargets(options.targets) ?? []
    if (parsed.length === 0) {
      lastMessage = 'Select at least one app/site to block.'
      return getFocusModeStatus()
    }
    writeTargets(parsed)
  }

  writeEnabled(true)
  writeEndsAt(endsAt.toISOString())
  scheduleExpiry(endsAt)
  startProcessGuard()
  const hosts = await applyHosts()
  const until = formatEndLabel(endsAt)
  const labels = FOCUS_TARGETS.filter((item) => readTargets().includes(item.id)).map((item) => item.label)
  lastMessage = hosts.ok
    ? `Focus Mode on until ${until} — blocking ${labels.join(', ')}.`
    : `Focus Mode on until ${until} (apps only). ${hosts.message}`
  broadcastFocusStatus()
  return getFocusModeStatus()
}

/**
 * Casual disable is refused while a timed session is still running:
 * show the discipline popup and keep Focus Mode on.
 * Use forceDisableFocusMode for the emergency unlock escape.
 */
export async function disableFocusMode(): Promise<FocusModeStatus> {
  if (await expireIfNeeded()) return getFocusModeStatus()

  if (!readEnabled()) {
    // Still clean hosts if markers were left behind (e.g. partial failure).
    if (hostsIntact() || hostsApplied) {
      return endFocusSession('force')
    }
    lastMessage = 'Focus Mode is already off.'
    return getFocusModeStatus()
  }

  writeEnabled(true)
  const endsAt = readEndsAt()
  if (endsAt) scheduleExpiry(endsAt)
  startProcessGuard()
  if (!hostsIntact()) {
    await applyHosts()
  }
  lastMessage = FOCUS_DISCIPLINE_MESSAGE
  void showFocusDisciplineNag()
  broadcastFocusStatus()
  return getFocusModeStatus()
}

/**
 * Emergency unlock: always turns Focus Mode off, clears the timer, restores hosts,
 * stops the process killer, and persists off so relaunch does not re-block.
 * Bypasses the discipline popup / timed lock. Does not show the refusal message.
 */
export async function forceDisableFocusMode(): Promise<FocusModeStatus> {
  return endFocusSession('force')
}

/** Resume process guard (and hosts if still marked) after app relaunch. */
export async function resumeFocusModeIfNeeded(): Promise<void> {
  if (!readEnabled()) return
  if (await expireIfNeeded()) return

  const endsAt = readEndsAt()
  if (!endsAt) {
    await endFocusSession('orphan')
    return
  }

  scheduleExpiry(endsAt)
  startProcessGuard()
  try {
    if (!hostsIntact()) {
      const hosts = await applyHosts()
      lastMessage = hosts.ok
        ? `Focus Mode resumed until ${formatEndLabel(endsAt)} — hosts restored.`
        : hosts.message
      if (!hosts.ok || !hostsIntact()) {
        void showFocusDisciplineNag()
      }
    } else {
      lastMessage = `Focus Mode resumed until ${formatEndLabel(endsAt)}.`
    }
  } catch {
    lastMessage = 'Focus Mode resumed (app guard only).'
  }
  broadcastFocusStatus()
}

/**
 * On quit: stop process watch. Leave hosts blocked while Focus Mode stays enabled
 * so quitting Kip is not an easy site-block bypass.
 */
export async function teardownFocusModeOnQuit(): Promise<void> {
  clearExpiryTimer()
  stopProcessGuard()
  if (readEnabled()) return
  await restoreHosts()
}

export function focusModeUserDataHint(): string {
  return join(homedir(), 'AppData', 'Roaming', 'kip', 'focus-mode')
}
