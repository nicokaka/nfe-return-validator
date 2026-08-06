# Script de criação de atalho na Área de Trabalho do Windows para a Glecia
$WshShell = New-Object -comObject WScript.Shell
$DesktopPath = [System.Environment]::GetFolderPath('Desktop')
$ShortcutPath = Join-Path -Path $DesktopPath -ChildPath "Validador Fiscal de Devoluções.lnk"
$Shortcut = $WshShell.CreateShortcut($ShortcutPath)

$ProjectDir = $PSScriptRoot
$DistHtmlPath = Join-Path -Path $ProjectDir -ChildPath "dist\index.html"

$Shortcut.TargetPath = "msedge.exe"
$Shortcut.Arguments = "--app=`"file:///$DistHtmlPath`""
$Shortcut.WorkingDirectory = $ProjectDir
$Shortcut.Description = "Validador Fiscal de Devoluções (NFO x NFD)"
$Shortcut.Save()

Write-Host "✅ Atalho criado com sucesso na Área de Trabalho: $ShortcutPath"
