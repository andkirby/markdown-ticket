/**
 * Protected root paths for the host platform, before canonicalization.
 * Keep foreign mount points out of filesystem probes (for example macOS /home).
 */
export function getProtectedRootPaths(platform: string): string[] {
  if (platform === 'darwin') {
    return [
      '/',
      '/Applications',
      '/Library',
      '/System',
      '/Users',
      '/Volumes',
      '/bin',
      '/dev',
      '/etc',
      '/opt',
      '/private',
      '/sbin',
      '/tmp',
      '/usr',
      '/usr/local',
      '/var',
    ]
  }

  if (platform === 'win32') {
    return [
      'C:\\',
      'C:\\Windows',
      'C:\\Program Files',
      'C:\\Program Files (x86)',
      'C:\\ProgramData',
      'C:\\Users',
      'C:\\System Volume Information',
    ]
  }

  return [
    '/',
    '/bin',
    '/boot',
    '/dev',
    '/etc',
    '/home',
    '/lib',
    '/lib64',
    '/media',
    '/mnt',
    '/opt',
    '/proc',
    '/root',
    '/run',
    '/sbin',
    '/srv',
    '/sys',
    '/tmp',
    '/usr',
    '/usr/local',
    '/var',
  ]
}
