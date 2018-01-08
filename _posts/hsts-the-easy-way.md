---
layout: post
title:  "HTTP Strict Transport Security (HSTS) --> the easy way"
subtitle: "How to easily setup HSTS to make sure all traffic to your website in encrypted using HTTPS"
date:   2017-12-12 12:00:00 -0500
author: 'Olivier Vaillancourt'
categories: hsts
cover:  "/img/posts/easy_hsts/hsts-MainImage.jpg"
---

## In this blog post, we will cover a very easy way to get HTTP strict transport security (HSTS) setup for a website.

### What is HSTS and why should I care? 
In a nutshell, it's an HTTP response header that let the browser know that from it should only talk with the server using an encrypted connection (HTTPS)
For a more detailed explanation, check out [Troy Hunt's great post on the subject](https://www.troyhunt.com/understanding-http-strict-transport/).

### How to get this HTTP response header for your website

for my blog, I use [Cloudflare](https://www.cloudflare.com) to enhance security for "on the cheap" (since I use the free plan).

So, using Cloudflare makes it dead simple to turn on HSTS.

1. In your Cloudflare dashboard, go to the *Crypto* section ![Cloudflare Crypto section](/img/posts/easy_hsts/cf-dash-crypto.png)
2. Scroll down to the *Always Use HTTPS* section and make it's turned on ![](/img/posts/easy_hsts/cf-dash-always-use-https.png)
This is important because the *http-strict-transport* response header must be served over HTTPS to be applied the browser
3. Then you can tweak HSTS settings ![](/img/posts/easy_hsts/cf-dash-hsts-config.png)
**Note: Cloudflare recommends 6 months "max-age" but I've used 1 year to comply with Chromium's requirement... more on that just below**

So let's review where we stand now.  If someone typed in *oliviervaillancourt.com* in their browser's address bar, that first request is sent over http (not https) to Cloudflare which answer that request with a redirect to **https**://oliviervaillancout.com because of step #2 above.

From then on, Cloudflare adds the *http-strict-transport* header to each response automatically...sweet.

### Wait, didn't you just say that the first request was over http???