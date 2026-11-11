param(
    [string] $CredentialDirectory = (Join-Path $HOME '.codex\google-calendar')
)

$ErrorActionPreference = 'Stop'
$directory = Get-Item -LiteralPath $CredentialDirectory
if (-not $directory.PSIsContainer -or
    ($directory.Attributes -band [System.IO.FileAttributes]::ReparsePoint)) {
    throw 'Use an existing protected credential directory, not a link.'
}
$credentials = Join-Path $directory.FullName 'gcp-oauth.keys.json'
if (-not (Test-Path -LiteralPath $credentials -PathType Leaf)) {
    throw 'OAuth client JSON is missing. Supply it securely before starting authentication.'
}
$allowed = @(
    [System.Security.Principal.WindowsIdentity]::GetCurrent().User.Value,
    'S-1-5-18', 'S-1-5-32-544'
)
$directoryAcl = Get-Acl -LiteralPath $directory.FullName
if (-not $directoryAcl.AreAccessRulesProtected) {
    throw 'Run protect-token-directory.ps1 before authentication.'
}
foreach ($item in @($directory.FullName, $credentials)) {
    foreach ($rule in (Get-Acl -LiteralPath $item).Access) {
        $sid = $rule.IdentityReference.Translate([System.Security.Principal.SecurityIdentifier]).Value
        if ($rule.AccessControlType -eq 'Allow' -and $sid -notin $allowed) {
            throw 'Credential directory or file grants access to another identity; fix the ACL before authentication.'
        }
    }
}

# A standalone auth command must not accidentally revert to full scopes/plaintext.
$names = @(
    'GOOGLE_CALENDAR_MCP_SCOPE_PROFILE', 'GOOGLE_CALENDAR_MCP_TOKEN_PROTECTION',
    'GOOGLE_CALENDAR_MCP_TOKEN_PATH', 'GOOGLE_OAUTH_CREDENTIALS', 'GOOGLE_ACCOUNT_MODE',
    'GOOGLE_SERVICE_ACCOUNT_KEY', 'GOOGLE_APPLICATION_CREDENTIALS', 'GOOGLE_SERVICE_ACCOUNT_SUBJECT'
)
$old = @{}
foreach ($name in $names) { $old[$name] = [Environment]::GetEnvironmentVariable($name, 'Process') }
try {
    $env:GOOGLE_CALENDAR_MCP_SCOPE_PROFILE = 'owned'
    $env:GOOGLE_CALENDAR_MCP_TOKEN_PROTECTION = 'dpapi'
    $env:GOOGLE_CALENDAR_MCP_TOKEN_PATH = Join-Path $directory.FullName 'tokens.json'
    $env:GOOGLE_OAUTH_CREDENTIALS = $credentials
    $env:GOOGLE_ACCOUNT_MODE = 'personal'
    $env:GOOGLE_SERVICE_ACCOUNT_KEY = ''
    $env:GOOGLE_APPLICATION_CREDENTIALS = ''
    $env:GOOGLE_SERVICE_ACCOUNT_SUBJECT = ''
    $entry = Join-Path $PSScriptRoot '..\build\auth-server.js'
    if (-not (Test-Path -LiteralPath $entry -PathType Leaf)) {
        throw 'Run npm run build in this security worktree first.'
    }
    & node $entry personal
    if ($LASTEXITCODE -ne 0) { throw 'Google Calendar authentication did not complete successfully.' }
} finally {
    foreach ($name in $names) { [Environment]::SetEnvironmentVariable($name, $old[$name], 'Process') }
}
