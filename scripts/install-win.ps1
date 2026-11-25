param(
    [switch]$NoStartup,
    [switch]$Foreground
)

$ErrorActionPreference = 'Stop'

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = Split-Path -Parent $ScriptDir
$DaemonJs = Join-Path $RepoRoot 'daemon\theme_daemon.js'
$PayloadJs = Join-Path $RepoRoot 'dist\theme_payload.js'
$BuildJs = Join-Path $ScriptDir 'build_payload.js'
$PidFile = Join-Path $RepoRoot 'daemon.pid'
$VbsPath = Join-Path $RepoRoot 'silent-start.vbs'

$NodeCmd = Get-Command node -ErrorAction SilentlyContinue
if (-not $NodeCmd) {
    Write-Error "Node.js not found in PATH. Install Node.js >= 22 first."
}
$NodeExe = $NodeCmd.Source
$NodeMajor = [int]((& $NodeExe -p "process.versions.node.split('.')[0]").Trim())
if ($NodeMajor -lt 22) {
    Write-Error "Node.js >= 22 is required (found v$NodeMajor at $NodeExe)."
}

Write-Host "[install-win] Building dist/theme_payload.js..."
& $NodeExe $BuildJs
if ($LASTEXITCODE -ne 0) {
    Write-Error "build_payload.js failed with exit code $LASTEXITCODE."
}

$ExistingDaemons = Get-CimInstance Win32_Process -Filter "Name='node.exe'" -ErrorAction SilentlyContinue |
    Where-Object { $_.CommandLine -and $_.CommandLine -match 'theme_daemon\.js' }
foreach ($Proc in $ExistingDaemons) {
    Write-Host "[install-win] Stopping existing theme daemon (PID $($Proc.ProcessId))..."
    Stop-Process -Id $Proc.ProcessId -Force -ErrorAction SilentlyContinue
}
$PortFile = @("$env:APPDATA\antigravity\DevToolsActivePort", "$env:APPDATA\Antigravity\DevToolsActivePort") | Where-Object { Test-Path $_ } | Select-Object -First 1
if ($PortFile) {
    $CdpPort = 0
    $FirstLine = (Get-Content $PortFile -ErrorAction SilentlyContinue | Select-Object -First 1)
    if ([int]::TryParse(($FirstLine -as [string]), [ref]$CdpPort) -and $CdpPort -gt 0) {
        $CdpNodes = Get-NetTCPConnection -RemotePort $CdpPort -State Established -ErrorAction SilentlyContinue |
            ForEach-Object { Get-Process -Id $_.OwningProcess -ErrorAction SilentlyContinue } |
            Where-Object { $_ -and $_.ProcessName -eq 'node' } |
            Select-Object -Unique
        foreach ($Proc in $CdpNodes) {
            Write-Host "[install-win] Stopping detached CDP node daemon (PID $($Proc.Id))..."
            Stop-Process -Id $Proc.Id -Force -ErrorAction SilentlyContinue
        }
    }
}
if ($ExistingDaemons -or $CdpNodes) {
    Start-Sleep -Milliseconds 350
}

if (Test-Path $PidFile) {
    $OldPidText = (Get-Content $PidFile -ErrorAction SilentlyContinue | Select-Object -First 1)
    $OldPid = 0
    if ([int]::TryParse(($OldPidText -as [string]), [ref]$OldPid) -and $OldPid -gt 0) {
        $ExistingProc = Get-Process -Id $OldPid -ErrorAction SilentlyContinue
        if ($ExistingProc -and $ExistingProc.ProcessName -eq 'node') {
            Write-Host "[install-win] Stopping existing daemon (PID $OldPid)..."
            Stop-Process -Id $OldPid -Force -ErrorAction SilentlyContinue
            Start-Sleep -Milliseconds 350
        }
    }
    Remove-Item $PidFile -Force -ErrorAction SilentlyContinue
}

# Generate silent-start.vbs dynamically without hardcoding user or Node paths.
$EscapedNode = $NodeExe.Replace('"', '""')
$EscapedDaemon = $DaemonJs.Replace('"', '""')
$VbsContent = @"
Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = "$($RepoRoot.Replace('"', '""'))"
WshShell.Run """$EscapedNode"" ""$EscapedDaemon""", 0, False
"@
Set-Content -Path $VbsPath -Value $VbsContent -Encoding ASCII

if (-not $NoStartup) {
    $StartupDir = [Environment]::GetFolderPath('Startup')
    $ShortcutPath = Join-Path $StartupDir 'AntigravityCustomTheme.lnk'
    $WshShell = New-Object -ComObject WScript.Shell
    $Shortcut = $WshShell.CreateShortcut($ShortcutPath)
    $Shortcut.TargetPath = 'wscript.exe'
    $Shortcut.Arguments = """$VbsPath"""
    $Shortcut.WorkingDirectory = $RepoRoot
    $Shortcut.WindowStyle = 7
    $Shortcut.Description = 'Antigravity Custom Theme Daemon'
    $Shortcut.Save()
    Write-Host "[install-win] Startup shortcut created: $ShortcutPath"
}

if ($Foreground) {
    Write-Host "[install-win] Running daemon in foreground..."
    & $NodeExe $DaemonJs
    exit $LASTEXITCODE
}

Write-Host "[install-win] Launching daemon via wscript.exe..."
Start-Process -FilePath 'wscript.exe' -ArgumentList """$VbsPath""" -WorkingDirectory $RepoRoot

for ($i = 0; $i -lt 15; $i++) {
    Start-Sleep -Milliseconds 250
    if (Test-Path $PidFile) {
        $NewPidText = (Get-Content $PidFile -ErrorAction SilentlyContinue | Select-Object -First 1)
        $NewPid = 0
        if ([int]::TryParse(($NewPidText -as [string]), [ref]$NewPid) -and $NewPid -gt 0) {
            if (Get-Process -Id $NewPid -ErrorAction SilentlyContinue) {
                Write-Host "[install-win] Daemon running silently (PID $NewPid)."
                exit 0
            }
        }
    }
}

Write-Warning "[install-win] Daemon did not write daemon.pid in time. Check $RepoRoot\daemon.log."
exit 1
