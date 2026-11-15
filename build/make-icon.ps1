# Build a multi-size Windows .ico from build/icon.png (sizes: 256,128,64,48,32,16)
Add-Type -AssemblyName System.Drawing

$sizes = @(256, 128, 64, 48, 32, 16)
$srcPath = Join-Path $PSScriptRoot 'icon.png'
$icoPath = Join-Path $PSScriptRoot 'icon.ico'
$iconsDir = Join-Path $PSScriptRoot 'icons'
New-Item -ItemType Directory -Force -Path $iconsDir | Out-Null

$src = [System.Drawing.Image]::FromFile($srcPath)
$pngBuffers = @()

foreach ($size in $sizes) {
  $bmp = New-Object System.Drawing.Bitmap $size, $size, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.Clear([System.Drawing.Color]::Transparent)
  $g.DrawImage($src, 0, 0, $size, $size)
  $g.Dispose()

  $pngPath = Join-Path $iconsDir "icon-$size.png"
  $bmp.Save($pngPath, [System.Drawing.Imaging.ImageFormat]::Png)

  $ms = New-Object System.IO.MemoryStream
  $bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
  $pngBuffers += , $ms.ToArray()
  $ms.Dispose()
  $bmp.Dispose()
}
$src.Dispose()

# ICO with PNG-compressed images (Windows Vista+)
$stream = New-Object System.IO.MemoryStream
$bw = New-Object System.IO.BinaryWriter $stream

$bw.Write([UInt16]0)      # reserved
$bw.Write([UInt16]1)      # type = icon
$bw.Write([UInt16]$sizes.Count)

$offset = 6 + (16 * $sizes.Count)
$entries = @()
for ($i = 0; $i -lt $sizes.Count; $i++) {
  $size = $sizes[$i]
  $data = $pngBuffers[$i]
  $w = if ($size -ge 256) { 0 } else { [byte]$size }
  $h = $w
  $entries += [pscustomobject]@{ Width = $w; Height = $h; Bytes = $data.Length; Offset = $offset; Data = $data }
  $offset += $data.Length
}

foreach ($e in $entries) {
  $bw.Write([byte]$e.Width)
  $bw.Write([byte]$e.Height)
  $bw.Write([byte]0)      # color palette
  $bw.Write([byte]0)      # reserved
  $bw.Write([UInt16]1)    # color planes
  $bw.Write([UInt16]32)   # bits per pixel
  $bw.Write([UInt32]$e.Bytes)
  $bw.Write([UInt32]$e.Offset)
}

foreach ($e in $entries) {
  $bw.Write($e.Data)
}

$bw.Flush()
[System.IO.File]::WriteAllBytes($icoPath, $stream.ToArray())
$bw.Dispose()
$stream.Dispose()

Write-Output "Wrote $icoPath ($((Get-Item $icoPath).Length) bytes)"
Get-ChildItem $iconsDir | ForEach-Object { Write-Output "$($_.Name) $($_.Length)" }
