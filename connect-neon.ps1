$secure = Read-Host "Enter your NEW Neon connection string" -AsSecureString

$ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)

try {
    $connection = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)

    if (-not $connection.StartsWith("postgresql://")) {
        Write-Host "Invalid connection string format."
        exit 1
    }

    $env:DATABASE_URL = $connection

    Write-Host "Connection string loaded into this PowerShell session."
}
finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)
    Remove-Variable connection -ErrorAction SilentlyContinue
    Remove-Variable secure -ErrorAction SilentlyContinue
}