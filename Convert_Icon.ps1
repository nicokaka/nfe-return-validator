Add-Type -AssemblyName System.Drawing

$pngPath = "C:\Users\nicolas\.gemini\antigravity-ide\brain\118c78a5-cb09-465c-98e0-5e2640fc0261\monochrome_robot_icon_1785960057485.png"
$icoPath = "$PSScriptRoot\robot_icon.ico"

# Load generated PNG and scale to 128x128 bitmap
$image = [System.Drawing.Image]::FromFile($pngPath)
$bitmap = New-Object System.Drawing.Bitmap($image, 128, 128)
$hIcon = $bitmap.GetHicon()
$icon = [System.Drawing.Icon]::FromHandle($hIcon)

# Save to .ico stream
$fileStream = [System.IO.File]::Create($icoPath)
$icon.Save($fileStream)
$fileStream.Close()

Write-Host "✅ Arquivo robot_icon.ico gerado com sucesso!"

# Update Desktop Shortcut to use robot_icon.ico
$WshShell = New-Object -ComObject WScript.Shell
$DesktopPath = [System.Environment]::GetFolderPath('Desktop')
$ShortcutPath = Join-Path -Path $DesktopPath -ChildPath "Validador Fiscal de Devoluções.lnk"
$Shortcut = $WshShell.CreateShortcut($ShortcutPath)

$ProjectDir = $PSScriptRoot
$DistHtmlPath = Join-Path -Path $ProjectDir -ChildPath "dist\index.html"

$Shortcut.TargetPath = "msedge.exe"
$Shortcut.Arguments = "--app=`"file:///$DistHtmlPath`""
$Shortcut.WorkingDirectory = $ProjectDir
$Shortcut.IconLocation = "$icoPath, 0"
$Shortcut.Description = "Validador Fiscal de Devoluções (NFO x NFD)"
$Shortcut.Save()

Write-Host "✨ Atalho na Área de Trabalho atualizado com o Ícone do Robô: $ShortcutPath"
