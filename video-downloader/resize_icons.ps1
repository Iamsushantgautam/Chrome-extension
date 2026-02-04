param (
    [string]$SourceFile = "icons/icon.png"
)

Add-Type -AssemblyName System.Drawing

function Resize-Image {
    param (
        [string]$SourcePath,
        [string]$DestinationPath,
        [int]$Width,
        [int]$Height
    )
    $img = [System.Drawing.Image]::FromFile($SourcePath)
    $bmp = New-Object System.Drawing.Bitmap($Width, $Height)
    $graph = [System.Drawing.Graphics]::FromImage($bmp)
    $graph.DrawImage($img, 0, 0, $Width, $Height)
    $bmp.Save($DestinationPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $img.Dispose()
    $bmp.Dispose()
    $graph.Dispose()
}

$currentDir = Get-Location
Resize-Image "$currentDir/icons/icon128.png" "$currentDir/icons/icon.png" 48 48
Resize-Image "$currentDir/icons/icon128.png" "$currentDir/icons/icon.png" 16 16

Write-Host "Icons resized successfully!"
