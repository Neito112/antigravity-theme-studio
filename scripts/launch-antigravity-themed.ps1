param(
    [string]$AntigravityExe,
    [switch]$NoPrelaunch,
    [int]$MediaPort = 47821
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
$BrowserExe = if (-not $NoPrelaunch) { Find-ChromiumAppBrowser } else { $null }
$ShouldPrelaunch = (-not $NoPrelaunch) -and $Status -and $BrowserExe -and ($Status.bootIntro -ne $false) -and ($Status.themeMode -ne 'static')

if (-not $ShouldPrelaunch) {
    Start-Process -FilePath $ResolvedExe -ArgumentList '--remote-debugging-port=0'
    [void](Focus-AntigravityWindow)
    exit 0
}

$BaselineDoneAt = [int64]($Status.prelaunchDoneAt)
$PrelaunchUrl = "$MediaBase/prelaunch_boot.html"
$ProfileDir = Join-Path $env:LOCALAPPDATA 'AntigravityCustomTheme\prelaunch-profile'
New-Item -ItemType Directory -Path $ProfileDir -Force | Out-Null

$BrowserArgs = @(
    "--app=$PrelaunchUrl",
    '--start-fullscreen',
    '--new-window',
    '--no-first-run',
    '--no-default-browser-check',
    '--autoplay-policy=no-user-gesture-required',
    "--user-data-dir=$ProfileDir"
)
$BrowserProc = Start-Process -FilePath $BrowserExe -ArgumentList $BrowserArgs -PassThru

$ExistingAgy = Get-Process -Name 'Antigravity' -ErrorAction SilentlyContinue
if (-not $ExistingAgy) {
    Start-Process -FilePath $ResolvedExe -ArgumentList '--remote-debugging-port=0' -WindowStyle Minimized
}

$Deadline = [DateTime]::UtcNow.AddSeconds(120)
while ([DateTime]::UtcNow -lt $Deadline) {
    Start-Sleep -Milliseconds 150
    $CurStatus = Get-PrelaunchStatus -BaseUrl $MediaBase
    if ($CurStatus -and ([int64]$CurStatus.prelaunchDoneAt -gt $BaselineDoneAt)) {
        break
    }
    if ($BrowserProc -and $BrowserProc.HasExited) {
        try {
            Invoke-RestMethod -Uri "$MediaBase/prelaunch_done" -Method Post -ContentType 'application/json' -Body '{}' -TimeoutSec 2 | Out-Null
        } catch {}
        break
    }
}

[void](Focus-AntigravityWindow)

if ($BrowserProc -and (-not $BrowserProc.HasExited)) {
    try {
        [void]$BrowserProc.CloseMainWindow()
        Start-Sleep -Milliseconds 250
        if (-not $BrowserProc.HasExited) {
            Stop-Process -Id $BrowserProc.Id -Force -ErrorAction SilentlyContinue
        }
    } catch {}
}

exit 0
