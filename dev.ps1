Set-Location $PSScriptRoot

$composeFile = Join-Path $PSScriptRoot "anime-backend/anime-backend/compose.yaml"
$backendDir = Join-Path $PSScriptRoot "anime-backend/anime-backend"
$frontendDir = Join-Path $PSScriptRoot "anime-streaming"

$backendJob = $null
$frontendJob = $null
$cleanupDone = $false

function Free-Port {
    param(
        [int]$Port
    )

    $pids = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue |
        Select-Object -ExpandProperty OwningProcess -Unique

    if (-not $pids) {
        return
    }

    foreach ($portPid in $pids) {
        try {
            Stop-Process -Id $portPid -Force -ErrorAction Stop
            Write-Host "▸ Freed port $Port from PID $portPid"
        } catch {
            Write-Host "▸ Unable to free port $Port from PID $portPid; it may already be gone."
        }
    }

    Start-Sleep -Seconds 1
}

function Invoke-DockerCompose {
    param(
        [Parameter(Mandatory = $true)]
        [string[]]$Args
    )

    & docker compose @Args *> $null
    if ($LASTEXITCODE -ne 0) {
        throw "docker compose $($Args -join ' ') failed with exit code $LASTEXITCODE"
    }
}

function Cleanup {
    if ($cleanupDone) {
        return
    }

    $script:cleanupDone = $true
    Write-Host ""
    Write-Host "▸ Shutting down..."

    if ($script:backendJob) {
        Stop-Job -Job $script:backendJob -ErrorAction SilentlyContinue | Out-Null
        Remove-Job -Job $script:backendJob -Force -ErrorAction SilentlyContinue | Out-Null
    }

    if ($script:frontendJob) {
        Stop-Job -Job $script:frontendJob -ErrorAction SilentlyContinue | Out-Null
        Remove-Job -Job $script:frontendJob -Force -ErrorAction SilentlyContinue | Out-Null
    }

    if (Get-Command docker -ErrorAction SilentlyContinue) {
        & docker compose -f $composeFile down *> $null
    }

    Write-Host "▸ Done."
}

try {
    Write-Host "▸ Starting Postgres (docker)..."
    if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
        throw "Docker is required but is not installed or not on PATH."
    }

    Free-Port -Port 8080
    Free-Port -Port 3000
    Invoke-DockerCompose -Args @('-f', $composeFile, 'up', '-d')
    Start-Sleep -Seconds 2

    Write-Host "▸ Starting backend (Spring Boot)..."
    $script:backendJob = Start-Job -Name "anifire-backend" -ScriptBlock {
        param($Dir)
        Set-Location $Dir
        & "$Dir\gradlew.bat" bootRun
    } -ArgumentList $backendDir

    Write-Host "▸ Starting frontend (Next.js)..."
    $script:frontendJob = Start-Job -Name "anifire-frontend" -ScriptBlock {
        param($Dir)
        Set-Location $Dir
        npm run dev
    } -ArgumentList $frontendDir

    Write-Host ""
    Write-Host "══════════════════════════════════════════════"
    Write-Host "  Anifire stack is starting up"
    Write-Host "  Frontend:  http://localhost:3000"
    Write-Host "  Backend:   http://localhost:8080/api/v1/animes"
    Write-Host "  Press Ctrl-C to stop everything."
    Write-Host "══════════════════════════════════════════════"
    Write-Host ""

    while ($true) {
        foreach ($job in @($script:backendJob, $script:frontendJob)) {
            if (-not $job) {
                continue
            }

            $output = Receive-Job -Job $job -Keep -ErrorAction SilentlyContinue
            if ($null -eq $output) {
                continue
            }

            $prefix = if ($job.Name -eq "anifire-backend") { "[backend]" } else { "[frontend]" }
            foreach ($line in ($output -split "`r?`n")) {
                if (-not [string]::IsNullOrWhiteSpace($line)) {
                    Write-Host "$prefix $line"
                }
            }
        }

        $backendRunning = $script:backendJob -and $script:backendJob.State -eq "Running"
        $frontendRunning = $script:frontendJob -and $script:frontendJob.State -eq "Running"

        if (-not $backendRunning -and -not $frontendRunning) {
            break
        }

        Start-Sleep -Milliseconds 500
    }
}
catch {
    Write-Host "▸ Startup failed: $($_.Exception.Message)"
    Cleanup
    exit 1
}
finally {
    Cleanup
}
