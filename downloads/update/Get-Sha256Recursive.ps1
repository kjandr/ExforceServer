param(
    [Parameter(Mandatory = $true)]
    [string]$Path,

    [string]$Algorithm = "SHA256",

    # Optional: Ausgabe als CSV-Datei
    [string]$OutputCsv
)

# Alle Dateien rekursiv holen
$files = Get-ChildItem -Path $Path -File -Recurse -ErrorAction SilentlyContinue

$result = foreach ($file in $files) {
    try {
        $hash = Get-FileHash -Path $file.FullName -Algorithm $Algorithm
        [PSCustomObject]@{
            Hash = $hash.Hash
            Algorithm = $hash.Algorithm
            Path = $hash.Path
        }
    }
    catch {
        Write-Warning "Fehler bei Datei: $($file.FullName) - $($_.Exception.Message)"
    }
}

if ($OutputCsv) {
    $result | Export-Csv -Path $OutputCsv -NoTypeInformation -Encoding UTF8
    Write-Host "Fertig. CSV gespeichert unter: $OutputCsv"
} else {
    $result | Format-Table -AutoSize
}
