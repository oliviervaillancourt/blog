$dnsNames = "localhost2", "testssl.dev", "*.testssl.dev"

$cert = New-SelfSignedCertificate -DnsName $dnsNames -CertStoreLocation "cert:\LocalMachine\My" -FriendlyName "local cert with subject alternative name demo" -KeySpec Signature -HashAlgorithm SHA256 -KeyExportPolicy Exportable  -NotAfter (Get-Date).AddYears(20)

$thumbprint = $cert.Thumbprint

Export-Certificate -Cert cert:\localmachine\my\$thumbprint -FilePath c:\temp\localWithSANPublicKey.cer -force

Import-Certificate -filePath C:\temp\localWithSANPublicKey.cer -CertStoreLocation "cert:\LocalMachine\Root"