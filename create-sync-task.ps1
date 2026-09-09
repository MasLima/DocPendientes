# create-sync-task.ps1
# Ejecutar en el SERVIDOR por RDP para crear la tarea programada de sync diario

$taskName = "Cobranza Sync"
$taskAction = "cmd /c cd /d C:\OpenCode\DocPendientes\api && node src/sync.js >> sync.log 2>&1"

# Verificar si ya existe
$existing = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
if ($existing) {
    Write-Host "La tarea '$taskName' ya existe. Eliminando..."
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
}

# Crear tarea programada: diario a las 1:00 AM
$action = New-ScheduledTaskAction -Execute "cmd.exe" -Argument "/c $taskAction"
$trigger = New-ScheduledTaskTrigger -Daily -At "01:00"
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable

Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -User "SYSTEM" -RunLevel Highest -Description "Sincronización diaria de datos desde el ERP (1:00 AM)"

Write-Host ""
Write-Host "Tarea programada creada exitosamente:"
Write-Host "  Nombre: $taskName"
Write-Host "  Horario: Diario a las 1:00 AM"
Write-Host "  Accion: sync.js en C:\OpenCode\DocPendientes\api"
Write-Host "  Usuario: SYSTEM"
Write-Host ""
Write-Host "Para verificar: Get-ScheduledTask -TaskName '$taskName'"
Write-Host "Para ejecutar ahora: Start-ScheduledTask -TaskName '$taskName'"
