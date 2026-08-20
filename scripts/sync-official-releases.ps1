$ErrorActionPreference = "Stop"
$env:GIT_TERMINAL_PROMPT = "0"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$nodePath = Join-Path $env:USERPROFILE ".cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
$gitPath = Join-Path $env:USERPROFILE ".cache\codex-runtimes\codex-primary-runtime\dependencies\native\git\cmd\git.exe"

if (-not (Test-Path -LiteralPath $nodePath)) {
  $nodePath = (Get-Command node -ErrorAction Stop).Source
}
if (-not (Test-Path -LiteralPath $gitPath)) {
  $gitPath = (Get-Command git -ErrorAction Stop).Source
}

& $gitPath -C $repoRoot pull --ff-only origin main
if ($LASTEXITCODE -ne 0) { throw "Git pull failed." }

& $nodePath (Join-Path $repoRoot "scripts\sync-official-releases.cjs")
if ($LASTEXITCODE -ne 0) { throw "Official release collection failed." }

& $gitPath -C $repoRoot diff --quiet -- data/official-releases.json
if ($LASTEXITCODE -eq 0) { exit 0 }

& $gitPath -C $repoRoot add -- data/official-releases.json
& $gitPath -C $repoRoot commit -m "Sync official releases"
if ($LASTEXITCODE -ne 0) { throw "Git commit failed." }

& $gitPath -C $repoRoot push origin HEAD:main
if ($LASTEXITCODE -ne 0) { throw "Git push failed." }
