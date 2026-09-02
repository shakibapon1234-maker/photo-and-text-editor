$ip = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.*' } | Select-Object -First 1).IPAddress
Write-Host "LAN IP: $ip"

$L = New-Object System.Net.HttpListener
$L.Prefixes.Add("http://localhost:8008/")
$L.Prefixes.Add("http://127.0.0.1:8008/")
$L.Prefixes.Add("http://${ip}:8008/")
$L.Prefixes.Add("http://+:8008/")
$L.Prefixes.Add("http/*:8008/")

try {
    $L.Start()
    Write-Host "SUCCESS: HttpListener started with all prefixes!"
    $L.Stop()
} catch {
    Write-Host "ERROR: $($_.Exception.Message)"
}
