---
layout: post
title: "Slow Startup for ASP.NET Core application using Azure Keyvault configuration provider"
subtitle: "Application startup time correlates with number of secrets in KeyVault"
date: 2020-12-23 12:00:00 -0500
author: 'Olivier Vaillancourt'
categories: aspnet.core azure keyvault
cover: "/img/posts/akv/10245-icon-service-Key-Vaults.svg"
---

## In this blog post, we will see how using Azure KeyVault for configuration secret storage impacts the startup time of an asp.net core service.  We will also offer a solution.  

----

### The situation

Using Azure Keyvault as a place to keep configuration secrets (connection strings, client secrets, etc) that a web application needs to run is a great idea and well documented ([like here](https://docs.microsoft.com/en-us/aspnet/core/security/key-vault-configuration?view=aspnetcore-5.0)).

I highly recommend it ;)

However, I've ran into a situation recently that can make it dificult to use.  Basically, there was a keyvault with both configuration secrets (about 5) and what I will call customer secrets in the same Keyvault.  Think of customer secret here as a piece of information that a customer in a multi-tenant cloud system generated.  The more customer the system has, the more secrets of these customer secrets will be generated.

### The problem

Because the Azure KeyVault configuration provider for Asp.Net doesn't know what secrets you will want, the implementation currently
1. Makes a request to the AKV to list all secrets existing in the value
1. Fetches each secret (one request / secret)

Once it's done retrieving all the secrets, then it continues.  That is tough part here.  It means that you app startup time is directly linked with the number of secrets in the vault wether you need them or not.

The image below is a case where there is 100 secrets in the vault but only 2-3 of those are true configuration secrets.

Although a bit difficult to see in the picture, this is a fiddler trace of the startup of an ASP.NET app.  You can clearly see the calls to `/secrets/secretXXXX` being made for every secret found in the value

![](/img/posts/akv/AkvStartupFiddlerTrace.png)

> A quick test got me a ~7 seconds delay in startup for 100 secrets in the vault.  However, that vault was in Azure (a few hundred km away from my local machine).  But I'm sure the problem will be worst if you have 1000 secrets, etc

### The fix

The easiest thing I can think of is to use 2 key vaults.  One just for the config, one for the customer secrets.  

Alternatively, I'm sure you can build your own configuration provider that would only fetch the secrets on demand, hence only fetching the required one.

There might another alternarive... not sure.

### Take away / final thoughts

If you think I did something wrong (or there is a better way) don't hesitate to either submit a PR/Issue (by using the button on top of the post) or hit me on twitter.

Hope it helps someone.
