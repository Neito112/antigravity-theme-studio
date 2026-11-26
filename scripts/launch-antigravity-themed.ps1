param(
    [string]$AntigravityExe,
    [switch]$NoPrelaunch,
    [int]$MediaPort = 47821,
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$PassThruArgs
)

$ErrorActionPreference = 'Stop'

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = Split-Path -Parent $ScriptDir
$DaemonJs = Join-Path $RepoRoot 'daemon\theme_daemon.js'
$VbsPath = Join-Path $RepoRoot 'silent-start.vbs'
$MediaBase = "http://127.0.0.1:$MediaPort"

function Find-AntigravityExe {
    param([string]$Hint)
    if ($Hint -and (Test-Path $Hint)) { return $Hint }
    $Candidates = @(
        "$env:LOCALAPPDATA\Programs\Antigravity\Antigravity.exe",
        "$env:ProgramFiles\Antigravity\Antigravity.exe",
        "${env:ProgramFiles(x86)}\Antigravity\Antigravity.exe"
    )
    foreach ($P in $Candidates) {
        if ($P -and (Test-Path $P)) { return $P }
    }
    $Cmd = Get-Command 'Antigravity.exe' -ErrorAction SilentlyContinue
    if ($Cmd) { return $Cmd.Source }

    try {
        $Wsh = New-Object -ComObject WScript.Shell
        $Dirs = @(
            [Environment]::GetFolderPath('DesktopDirectory'),
            [Environment]::GetFolderPath('Programs'),
            (Join-Path $env:APPDATA 'Microsoft\Internet Explorer\Quick Launch\User Pinned\TaskBar')
        ) | Where-Object { $_ -and (Test-Path $_) }
        foreach ($D in $Dirs) {
            $Found = Get-ChildItem -Path $D -Recurse -Filter '*.lnk' -ErrorAction SilentlyContinue | ForEach-Object {
                try {
                    $Sc = $Wsh.CreateShortcut($_.FullName)
                    if ($Sc.TargetPath -and ($Sc.TargetPath -imatch '\\Antigravity\.exe$') -and (Test-Path $Sc.TargetPath)) {
                        $Sc.TargetPath
                    }
                } catch {}
            } | Select-Object -First 1
            if ($Found) { return $Found }
        }
    } catch {}
    return $null
}

function Find-ChromiumAppBrowser {
    $Candidates = @(
        "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe",
        "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe",
        "$env:LOCALAPPDATA\Microsoft\Edge\Application\msedge.exe",
        "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
        "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
        "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe"
    )
    foreach ($P in $Candidates) {
        if ($P -and (Test-Path $P)) { return $P }
    }
    foreach ($Name in @('msedge.exe', 'chrome.exe')) {
        $Cmd = Get-Command $Name -ErrorAction SilentlyContinue
        if ($Cmd) { return $Cmd.Source }
    }
    return $null
}

function Get-PrelaunchStatus {
    param([string]$BaseUrl)
    try {
        return Invoke-RestMethod -Uri "$BaseUrl/prelaunch_status" -Method Get -TimeoutSec 2
    } catch {
        return $null
    }
}

function Ensure-ThemeDaemon {
    param([string]$BaseUrl)
    $Status = Get-PrelaunchStatus -BaseUrl $BaseUrl
    if ($Status) { return $Status }

    if (Test-Path $VbsPath) {
        Start-Process -FilePath 'wscript.exe' -ArgumentList """$VbsPath""" -WorkingDirectory $RepoRoot
    } else {
        $NodeCmd = Get-Command node -ErrorAction SilentlyContinue
        if ($NodeCmd -and (Test-Path $DaemonJs)) {
            Start-Process -FilePath $NodeCmd.Source -ArgumentList """$DaemonJs""" -WorkingDirectory $RepoRoot -WindowStyle Hidden
        }
    }

    for ($i = 0; $i -lt 40; $i++) {
        Start-Sleep -Milliseconds 200
        $Status = Get-PrelaunchStatus -BaseUrl $BaseUrl
        if ($Status) { return $Status }
    }
    return $null
}

Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public static class AgyWinFocus {
    [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
    [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern void SwitchToThisWindow(IntPtr hWnd, bool fAltTab);
}
"@ -ErrorAction SilentlyContinue

function Focus-AntigravityWindow {
    for ($i = 0; $i -lt 40; $i++) {
        $Procs = Get-Process -Name 'Antigravity' -ErrorAction SilentlyContinue |
            Where-Object { $_.MainWindowHandle -ne [IntPtr]::Zero }
        if ($Procs) {
            foreach ($Proc in $Procs) {
                $Hwnd = $Proc.MainWindowHandle
                try {
                    if ([AgyWinFocus]::IsIconic($Hwnd)) {
                        [void][AgyWinFocus]::ShowWindow($Hwnd, 9)
                    } else {
                        [void][AgyWinFocus]::ShowWindow($Hwnd, 5)
                    }
                    [void][AgyWinFocus]::SwitchToThisWindow($Hwnd, $true)
                    [void][AgyWinFocus]::SetForegroundWindow($Hwnd)
                } catch {}
            }
            return $true
        }
        Start-Sleep -Milliseconds 150
    }
    return $false
}

$ResolvedExe = Find-AntigravityExe -Hint $AntigravityExe
if (-not $ResolvedExe) {
    Write-Error "Antigravity.exe not found. Pass -AntigravityExe <path>."
    exit 1
}

$Status = Ensure-ThemeDaemon -BaseUrl $MediaBase
$LaunchArgs = @('--remote-debugging-port=0')
if ($PassThruArgs) {
    $FilteredArgs = $PassThruArgs | Where-Object { $_ -and ($_ -notmatch '^--remote-debugging-port(?:=|$)') }
    if ($FilteredArgs) { $LaunchArgs += $FilteredArgs }
}

# Single-task launch: daemon is already running via wscript/OS startup before Antigravity opens,
# and theme_daemon.js overlays the Boot Intro directly on top of Antigravity's own startup layer.
Start-Process -FilePath $ResolvedExe -ArgumentList $LaunchArgs
[void](Focus-AntigravityWindow)
exit 0
