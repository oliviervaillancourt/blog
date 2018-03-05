---
layout: post
title:  "Using Powershell to create a HTTPS certificate that Chrome will accept when doing local development"
subtitle: "Chrome now requires TLS/SSL certificate to have a Subject Alternative Name and also forces .dev and .foo to only use HTTPS through HSTS"
date:   2018-03-04 12:00:00 -0500
author: 'Olivier Vaillancourt'
categories: HSTS
cover:  "/img/posts/powershell_cert_local_dev_chrome/sslCert_SAN_Powershell.png"
---

## In this blog post, we look at how to deal with Chrome forcing us to use HTTPS when using `.dev` or `.foo` extensions for our local website. 

---

### The idea

I've always liked the idea of being HTTPS everywhere and that starts with your local dev environment.  

Chrome now [forces https on those domains](https://ma.ttias.be/chrome-force-dev-domains-https-via-preloaded-hsts/).  A developer that was using something.**dev** for his/her local dev version is now forced to use HTTPS, HTTP will not work anymore.   Also Chrome requires HTTPS certs to have a `SAN` (subject alternative name).  Let's see how to tackle both issues with a powershell script

### How are we going to do this?

Let's use a `Powershell` script that will:

1. Create a new self-signed certificate with the required swtiches in order to be used for web traffic encryption
2. Add this certificate with both *private* and *public* key to the `LocalMachine\Personal` certificate store.  This is where IIS picks up certificates from.
3. Export the public key of this new certificate from the `LocalMachine\Personal` store
4. Import the public key of this new certificate into the `LocalMachine\Root` store where all of the Root Certificate Authority certifcates (wow... mouthful) are placed.  This step allows Chrome to fully trust the website

Once that certificate is created, we must simply tell `IIS` to use it

### The `Powershell` script

>> _Make sure to run as `Administrator`_

You can find the source file [here](/misc/posts/powershell_cert_local_dev_chrome/SSLCertForChrome.ps1)

```powershell
$dnsNames = "localhost2", "testssl.dev", "*.testssl.dev"
$cert = New-SelfSignedCertificate -DnsName $dnsNames -CertStoreLocation "cert:\LocalMachine\My" -FriendlyName "local cert with subject alternative name demo" -KeySpec Signature -HashAlgorithm SHA256 -KeyExportPolicy Exportable  -NotAfter (Get-Date).AddYears(20)

$thumbprint = $cert.Thumbprint
Export-Certificate -Cert cert:\localmachine\my\$thumbprint -FilePath c:\temp\localWithSANPublicKey.cer -force

Import-Certificate -filePath C:\temp\localWithSANPublicKey.cer -CertStoreLocation "cert:\LocalMachine\Root"
```

### Setting up `IIS` with the new certificate

In the `Bindings` section of your web site, select the certificate called `local cert with subject alternative name demo`

![](/img/posts/powershell_cert_local_dev_chrome/IISBindings.png)

### What would happen without the proper certificate

Without the proper HTTPS certificate, Chrome (v 64 at least) would show this:
![Chrome when no Https cert for .dev domain](/img/posts/powershell_cert_local_dev_chrome/ChromePageForDevDomain.png)

### Conclusion / Lessons learned / What's next

You can always double check your local certificate by using `mmc.exe` and adding the Add-in for `Certificate Manager` (make sure to pick `Local Machine`)

Hope it helps someone