try {
    $ip = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.*' } | Select-Object -First 1).IPAddress
    Write-Host "Local LAN IP is: $ip"
    $L = New-Object System.Net.HttpListener
    $L.Prefixes.Add("http://$ip`:8008/")
    $L.Start()
    Write-Host "SUCCESS bound to http://$ip`:8008/"
    $L.Stop()
} catch {
    Write-Host "ERROR: $($_.Exception.Message)"
}
