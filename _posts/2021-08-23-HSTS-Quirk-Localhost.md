---
layout: post
title: "How HSTS can screw up your login to SaaS applications like the Azure CLI"
subtitle: "Very (even very very) specific issue where HSTS interfers with login that open a web browser"
date: 2021-08-23 12:00:00 -0500
author: 'Olivier Vaillancourt'
categories: HSTS development
cover: ""
---

## In this blog post, we will explain why it's possible for to break logins to SaaS provider that launch a web browser to authenticate to their service when you have HSTS enable on a `localhost` development server.  We will also show how to fix the issue.

----

### The situation

Often command-line (and some time UI) apps that require you to sign in to a cloud-based solution will use a technique where you invoke the login command and then the default web browser is launched at the url of that service login page.  Once you completed the login in the browser, and can go back to the application and you are signed in.  

Sometines, I run into the issue where that "popup" browser fails to complete.  For example if I'm trying to use the Azure CLI and login with `az login`.  From time to time I get my browser to show me a `ERR_SSL_PROTOCOL_ERROR`.  Like this:

![](/img/posts/HstsBreakCliLogin/failedtoConnectToLocalhost.png)

### The problem

The problem is that `az` cli in-process web-server listening on port `8400` (OIDC Authorization Code with PKCE flow) is not configured to accept encrypted traffic, but the browser is trying to use _https_ instead of _http_ as this shown here:
![](/img/posts/HstsBreakCliLogin/HSTSRedirect.png)

*Why is it doing that?*

In my case it's because I've been running a development project on `localhost:45576` that sets the [http strict transport security (HSTS)](https://en.wikipedia.org/wiki/HTTP_Strict_Transport_Security) header to 1 year.  This HSTS directive applies to the entire host (no matter what port) causing the upgrade from http to https on the url that `az` cli is returning to.

### The fix

Browser allow you to remove that restriction on the `localhost` domain using `chrome://net-internals/#hsts` (or `edge://net-internals/#hsts`) and then remove the HSTS policy.  You then enter `localhost` in the `Delete domain security policies` box.  Note that this removal is temporary until you visit a page that emits back that HSTS header.

Once that is done you can either:
- start your authentication process again
- Reload the page in error making sure to switch from https to http.

This is a demo of the latter option

![](/img/posts/HstsBreakCliLogin/Fix.gif)

### Take away / final thoughts

If you think I did something wrong (or there is a better way) don't hesitate to either submit a PR/Issue (by using the button on top of the post) or reach out to me on twitter.

Hope it helps someone.
