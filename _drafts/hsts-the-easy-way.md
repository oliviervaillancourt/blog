---
layout: post
title:  "HTTP Strict Transport Security (HSTS) --> the easy way"
subtitle: "How to easily setup HSTS with Cloudflare to make sure all traffic to your website in encrypted using HTTPS"
date:   2017-12-12 12:00:00 -0500
author: 'Olivier Vaillancourt'
categories: hsts
cover:  "/img/posts/easy_hsts/hsts-MainImage.jpg"
---

## In this blog post, we will cover a very easy way to get HTTP strict transport security (HSTS) setup for a website.

### What is HSTS and why should I care? 
In a nutshell, it's an HTTP response header that let the browser know that it should only talk with your website using an encrypted connection (HTTPS)
For a more detailed explanation, check out either [Troy Hunt's great post](https://www.troyhunt.com/understanding-http-strict-transport/) or [Scott Helme's excellent piece](https://scotthelme.co.uk/hsts-preloading/) on the subject.

### How to get this HTTP response header for your website

for my blog, I use [Cloudflare](https://www.cloudflare.com) to enhance security "on the cheap" (since I use the free plan).

So, using Cloudflare makes it dead simple to turn on HSTS.

1. In your Cloudflare dashboard, go to the *Crypto* section ![Cloudflare Crypto section](/img/posts/easy_hsts/cf-dash-crypto.png)
2. Scroll down to the *Always Use HTTPS* section and make it's turned on ![](/img/posts/easy_hsts/cf-dash-always-use-https.png)
This is important because the *http-strict-transport* response header must be served over HTTPS to be applied by the browser
3. Then you can tweak HSTS settings ![](/img/posts/easy_hsts/cf-dash-hsts-config.png)
**Note: Cloudflare recommends 6 months "max-age" but I've used 1 year to comply with Chromium's requirement... more on that a little bit later**

So let's review where we stand now.  If someone typed in *oliviervaillancourt.com* in their browser's address bar, the first request made by the browser is sent over http (not https) to Cloudflare which answer that request with a redirect to **https**://oliviervaillancout.com because of step #2 above.

From then on, Cloudflare adds the *http-strict-transport* header to each response automatically...sweet.

### Wait, didn't you just say that the first request was over http (not https)???

Yes, in HSTS the first request made to a website from a browser (wether that is the first request ever or the first after the *mag-age* has expired) is vulnerable to [Man-in-the-middle attacks](https://en.wikipedia.org/wiki/Man-in-the-middle_attack)

But there's a way solve this.

The Chromium project (guys behind Google Chrome) have a mechanism for your domain to have its HSTS policy built-in to Chrome's binary. Other browser like Firefox also support that. 

It takes time between submission and approval (not sure how much to be honest) but I did [submit oliviervaillancourt.com for HSTS preload](https://hstspreload.org/?domain=oliviervaillancourt.com) and will update this post once it's done.  Remember I set *max-age* to 12 months instead of the recommended 6 in step 3 above.  This is because the Chromium submission process requires.

In the mean time, there's even an API to check your submission progress: <https://hstspreload.appspot.com/api/v2/status?domain=oliviervaillancourt.com>

### In Conclusion

- Using HTTPS is important, very important for a various set of reasons and it's the gold standard now.
- Using Cloudflare make it very very easy to have almost all requests go over HTTPS (exception made of this *first* request)
  - I love that it's just switches and clicking
  - I like that there's explanation in the CloudFlare UI to explain the consequences

Happy HTTPSing :)