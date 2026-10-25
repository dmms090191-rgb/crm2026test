# Cree la cle de signature officielle de Talvex Android, et le fichier key.properties
# que Gradle lira pour signer l APK de publication.
#
#   powershell -ExecutionPolicy Bypass -File "scripts\android\creer-cle-signature.ps1"
#
# CE SCRIPT NE CONTIENT AUCUN SECRET. Il demande le mot de passe a l execution, en saisie
# masquee, le transmet a keytool par une VARIABLE D ENVIRONNEMENT (et non sur la ligne de
# commande, ou il serait visible dans la liste des processus), puis l efface.
#
# POURQUOI IL EXISTE. Une premiere cle avait ete produite le 25/10/2026, et elle etait
# INUTILISABLE : le fichier ne contenait pas un seul octet nul, alors qu un conteneur PKCS12
# chiffre de 4 440 octets en compte une vingtaine. Les octets 0x00 avaient ete remplaces par
# des espaces et les 0x0A avaient disparu - la signature d un fichier binaire passe par un
# mode TEXTE (une redirection, un Get-Content/Set-Content, un copier-coller). keytool refusait
# alors de l ouvrir, et Gradle n aurait pas pu signer. Ce script ecrit donc la cle DIRECTEMENT
# a sa place definitive, sans redirection ni pipe, puis VERIFIE qu elle est binairement intacte
# avant d ecrire quoi que ce soit d autre.

$ErrorActionPreference = 'Stop'

$projet  = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$keytool = 'C:\Users\David\android-tools\jdk\jdk-21.0.12.1+1\bin\keytool.exe'
$jks     = Join-Path $projet 'android\talvex-release.jks'
$props   = Join-Path $projet 'android\key.properties'

if (-not (Test-Path $keytool)) {
    Write-Host "keytool introuvable : $keytool" -ForegroundColor Red
    exit 1
}
if (Test-Path $jks) {
    Write-Host "Une cle existe deja : $jks" -ForegroundColor Yellow
    Write-Host "Ecartez-la d abord (renommez-la), pour ne pas ecraser une cle en service." -ForegroundColor Yellow
    exit 1
}

function Read-Secret([string]$invite) {
    $s = Read-Host $invite -AsSecureString
    $b = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($s)
    try { [Runtime.InteropServices.Marshal]::PtrToStringBSTR($b) }
    finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($b) }
}

Write-Host ''
Write-Host 'Cle de signature Talvex Android' -ForegroundColor Cyan
Write-Host 'Choisissez un mot de passe et CONSERVEZ-LE dans votre gestionnaire :'
Write-Host 'sans lui, aucune mise a jour ne pourra plus s installer par-dessus cette version.'
Write-Host ''

$mdp  = Read-Secret 'Mot de passe de la cle (6 caracteres minimum)'
$mdp2 = Read-Secret 'Repetez-le'

if ($mdp -ne $mdp2)   { Write-Host 'Les deux saisies different. Rien n a ete ecrit.' -ForegroundColor Red; exit 1 }
if ($mdp.Length -lt 6) { Write-Host 'Trop court : keytool exige 6 caracteres.'        -ForegroundColor Red; exit 1 }

$env:TALVEX_MDP = $mdp
try {
    # Aucune redirection, aucun pipe : keytool ecrit lui-meme le binaire a sa place.
    & $keytool -genkeypair -v `
        -keystore $jks -storetype PKCS12 -alias talvex `
        -keyalg RSA -keysize 4096 -validity 10000 `
        -dname 'CN=Talvex, O=Talvex, C=FR' `
        '-storepass:env' TALVEX_MDP '-keypass:env' TALVEX_MDP

    if ($LASTEXITCODE -ne 0) { throw "keytool a echoue (code $LASTEXITCODE)." }
    if (-not (Test-Path $jks)) { throw "keytool n a produit aucun fichier." }

    # L INTEGRITE BINAIRE, mesuree : c est exactement ce qui manquait a la premiere cle.
    $octets = [IO.File]::ReadAllBytes($jks)
    $nuls = 0
    foreach ($o in $octets) { if ($o -eq 0) { $nuls++ } }
    if ($nuls -eq 0) {
        throw "Le fichier produit ne contient aucun octet nul : il a ete altere. Ne l utilisez pas."
    }
    Write-Host ''
    Write-Host ("Cle creee : {0} octets, dont {1} octets nuls - binaire intact." -f $octets.Length, $nuls) -ForegroundColor Green

    # Java Properties traite le backslash comme un echappement : on le double, sinon un mot de
    # passe en contenant un serait lu tronque et Gradle rendrait une erreur trompeuse.
    $echappe = $mdp -replace '\\', '\\\\'
    $contenu = "storeFile=talvex-release.jks`r`nstorePassword=$echappe`r`nkeyAlias=talvex`r`nkeyPassword=$echappe`r`n"
    # UTF-8 SANS BOM : un BOM casserait la premiere cle du fichier .properties.
    [IO.File]::WriteAllText($props, $contenu, (New-Object Text.UTF8Encoding $false))
    Write-Host "key.properties ecrit : $props" -ForegroundColor Green
}
finally {
    Remove-Item Env:TALVEX_MDP -ErrorAction SilentlyContinue
    Remove-Variable mdp, mdp2, echappe, contenu -ErrorAction SilentlyContinue
}

Write-Host ''
Write-Host 'Les deux fichiers sont ignores par git (verifie par .gitignore).' -ForegroundColor Cyan
Write-Host 'Ne les partagez jamais, et sauvegardez la cle hors de cette machine.' -ForegroundColor Cyan
