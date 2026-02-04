Add-Type -AssemblyName System.Drawing

$sourcePath = "icon.png"
$tempPath = "icon_temp.png"

if (Test-Path $sourcePath) {
    try {
        $img = [System.Drawing.Image]::FromFile($sourcePath)
        $bmp = new-object System.Drawing.Bitmap 128, 128
        $graph = [System.Drawing.Graphics]::FromImage($bmp)
        $graph.InterpolationMode = "HighQualityBicubic"
        $graph.DrawImage($img, 0, 0, 128, 128)
        
        # Save to temp file first to avoid lock
        $bmp.Save($tempPath, [System.Drawing.Imaging.ImageFormat]::Png)
        
        $img.Dispose()
        $bmp.Dispose()
        $graph.Dispose()
        
        # Replace original
        Move-Item -Force $tempPath $sourcePath
        
        Write-Host "Success: Resized $sourcePath to 128x128"
    } catch {
        Write-Error "Error resizing image: $_"
    }
} else {
    Write-Error "Source file not found."
}
