# PowerShell HTTP Server for Presentation Player

$Port = 8000
$Root = $PSScriptRoot

$lastCmd = @{ id = [long]0; action = ''; val = '' }

function Get-LocalIp {
    try {
        $ip = (Get-NetIPAddress -AddressFamily IPv4 |
            Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*' } |
            Select-Object -First 1).IPAddress
        if ($ip) { return $ip }
    } catch {}
    return '127.0.0.1'
}

function Get-MimeType($path) {
    switch ([System.IO.Path]::GetExtension($path).ToLower()) {
        '.html' { return 'text/html; charset=utf-8' }
        '.js'   { return 'application/javascript; charset=utf-8' }
        '.json' { return 'application/json; charset=utf-8' }
        '.css'  { return 'text/css; charset=utf-8' }
        '.png'  { return 'image/png' }
        '.jpg'  { return 'image/jpeg' }
        '.jpeg' { return 'image/jpeg' }
        '.svg'  { return 'image/svg+xml' }
        '.ico'  { return 'image/x-icon' }
        default { return 'application/octet-stream' }
    }
}

$listener = New-Object System.Net.HttpListener
try { $listener.Prefixes.Add("http://localhost:$Port/") } catch {}
try { $listener.Prefixes.Add("http://127.0.0.1:$Port/") } catch {}
try { $listener.Prefixes.Add("http://+:$Port/") } catch {}
try { $listener.Prefixes.Add("http/*:$Port/") } catch {}

try {
    Get-NetIPAddress -AddressFamily IPv4 | ForEach-Object {
        $ip = $_.IPAddress
        try { $listener.Prefixes.Add("http://${ip}:${Port}/") } catch {}
    }
} catch {}

try {
    $listener.Start()
} catch {
    Write-Host "ERROR: Could not start server. Port $Port busy or needs Administrator access." -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit
}

$localIp = Get-LocalIp
Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host " Server running at: http://localhost:$Port" -ForegroundColor Green
Write-Host " Mobile Remote URL: http://${localIp}:$Port/remote.html" -ForegroundColor Yellow
Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop the server." -ForegroundColor Gray

while ($listener.IsListening) {
    try {
        $ctx  = $listener.GetContext()
        $req  = $ctx.Request
        $res  = $ctx.Response

        $res.Headers.Add('Access-Control-Allow-Origin', '*')
        $res.Headers.Add('Cache-Control', 'no-store')

        $urlPath = $req.Url.LocalPath
        $query   = $req.Url.Query.TrimStart('?')

        if ($urlPath -eq '/api/remote-send') {
            $act = ''
            foreach ($param in $query -split '&') {
                if ($param -like 'action=*') {
                    $act = [System.Uri]::UnescapeDataString($param.Substring(7))
                }
            }
            if ($act -ne '') {
                $lastCmd = @{ id = [long][DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds(); action = $act; val = '' }
            }
            $json  = '{"success":true}'
            $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
            $res.ContentType   = 'application/json; charset=utf-8'
            $res.ContentLength64 = $bytes.Length
            $res.OutputStream.Write($bytes, 0, $bytes.Length)
            $res.Close()
            continue
        }

        if ($urlPath -eq '/api/remote-poll') {
            $json  = "{`"command`":{`"id`":$($lastCmd.id),`"action`":`"$($lastCmd.action)`",`"val`":`"`"}}"
            $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
            $res.ContentType   = 'application/json; charset=utf-8'
            $res.ContentLength64 = $bytes.Length
            $res.OutputStream.Write($bytes, 0, $bytes.Length)
            $res.Close()
            continue
        }

        if ($urlPath -eq '/api/ip') {
            $ip   = Get-LocalIp
            $json  = "{`"ip`":`"$ip`",`"port`":$Port,`"remoteUrl`":`"http://${ip}:${Port}/remote.html`"}"
            $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
            $res.ContentType   = 'application/json; charset=utf-8'
            $res.ContentLength64 = $bytes.Length
            $res.OutputStream.Write($bytes, 0, $bytes.Length)
            $res.Close()
            continue
        }

        if ($urlPath -eq '/') { $urlPath = '/presentation-player.html' }

        $filePath = Join-Path $Root $urlPath.TrimStart('/')

        if (Test-Path $filePath -PathType Leaf) {
            $fileBytes = [System.IO.File]::ReadAllBytes($filePath)
            $res.ContentType     = Get-MimeType $filePath
            $res.ContentLength64 = $fileBytes.Length
            $res.OutputStream.Write($fileBytes, 0, $fileBytes.Length)
        } else {
            $notFound = [System.Text.Encoding]::UTF8.GetBytes('404 Not Found')
            $res.StatusCode      = 404
            $res.ContentLength64 = $notFound.Length
            $res.OutputStream.Write($notFound, 0, $notFound.Length)
        }
        $res.Close()

    } catch {
        try { $res.Close() } catch {}
    }
}
