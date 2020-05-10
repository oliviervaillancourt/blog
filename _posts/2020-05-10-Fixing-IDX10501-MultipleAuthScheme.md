---
layout: post
title:  "Removing misleading IDX10501 when multiple authentication scheme in ASP.NET Core 3.1"
subtitle: "Because getting IDX10501: Signature validation failed. Unable to match key when the request actually succeeds is a pain"
date: 2020-05-10 12:00:00 -0500
author: 'Olivier Vaillancourt'
categories: 'aspnet.core' jwt
cover: "/img/posts/IDX10501/IDX10501_Cover2.png"
---

## In this blog post, we will cover the situation where using multiple `ASP.NET Core 3.1` JWT authentication scheme leads to having *information* IDX10501 level log that are totally misleading.  We will also offer a solution.  

----

### The situation

We have to authenticate request from coming from multiple identity providers all using JWT.  In this example we will use `Auth0` and `AzureAD` as the 2 identity providers.  A setup similar to this one:

```c#
    services.AddAuthentication("AzureAD")
        .AddJwtBearer("Auth0", options =>
        {
            options.Audience = "MyApi";
            options.Authority = "https://oliviervaillancourt.auth0.com/";
        })
        .AddJwtBearer("AzureAD", options =>
        {
            options.Audience = "https://localhost:5000/";
            options.Authority = "https://login.microsoftonline.com/common/";
        });
```

and we will assume that we have a policy that accept either of the authentication scheme

```c#
    services.AddAuthorization(options =>
    {
        options.AddPolicy("AnyJwtBearerScheme", policy =>
        {
            policy.AddAuthenticationSchemes("AzureAD", "Auth0")
                .RequireAuthenticatedUser();
        });
    });
```

### The problem

If you send a valid/authenticated request to this API using an `Auth0` issued token, the logs (assuming `Information` level) will look like this:

```
info: Microsoft.AspNetCore.Hosting.Diagnostics[1]
      Request starting HTTP/1.1 GET http://localhost:5000/weatherforecast
info: Microsoft.AspNetCore.Authentication.JwtBearer.JwtBearerHandler[1]
      Failed to validate the token.
Microsoft.IdentityModel.Tokens.SecurityTokenSignatureKeyNotFoundException: IDX10501: Signature validation failed. Unable to match key:
kid: '[PII is hidden. For more details, see https://aka.ms/IdentityModel/PII.]'.
Exceptions caught:
 '[PII is hidden. For more details, see https://aka.ms/IdentityModel/PII.]'.
token: '[PII is hidden. For more details, see https://aka.ms/IdentityModel/PII.]'.
   at System.IdentityModel.Tokens.Jwt.JwtSecurityTokenHandler.ValidateSignature(String token, TokenValidationParameters validationParameters)
   at System.IdentityModel.Tokens.Jwt.JwtSecurityTokenHandler.ValidateToken(String token, TokenValidationParameters validationParameters, SecurityToken& validatedToken)
   at Microsoft.AspNetCore.Authentication.JwtBearer.JwtBearerHandler.HandleAuthenticateAsync()
info: Microsoft.AspNetCore.Authentication.JwtBearer.JwtBearerHandler[7]
      AzureAD was not authenticated. Failure message: IDX10501: Signature validation failed. Unable to match key:
kid: '[PII is hidden. For more details, see https://aka.ms/IdentityModel/PII.]'.
Exceptions caught:
 '[PII is hidden. For more details, see https://aka.ms/IdentityModel/PII.]'.
token: '[PII is hidden. For more details, see https://aka.ms/IdentityModel/PII.]'.
info: Microsoft.AspNetCore.Authentication.JwtBearer.JwtBearerHandler[7]
      AzureAD was not authenticated. Failure message: IDX10501: Signature validation failed. Unable to match key:
kid: '[PII is hidden. For more details, see https://aka.ms/IdentityModel/PII.]'.
Exceptions caught:
 '[PII is hidden. For more details, see https://aka.ms/IdentityModel/PII.]'.
token: '[PII is hidden. For more details, see https://aka.ms/IdentityModel/PII.]'.
info: Microsoft.AspNetCore.Authentication.JwtBearer.JwtBearerHandler[2]
      Successfully validated the token.
info: Microsoft.AspNetCore.Authorization.DefaultAuthorizationService[1]
      Authorization was successful.
info: Microsoft.AspNetCore.Hosting.Diagnostics[2]
      Request finished in 936.5707ms 200 application/json; charset=utf-8
```

We notice here (last line of the output) a log entry stating that the request was successful (return `200 OK`) but still a lot of *noise* in the logs that talk about `IDX10501` and something about keys not being found.  

This is because the ASP.NET Core system for authentication will try to authenticate the request against every registered scheme that applies to the policy (my own understanding and probably a bit oversimplified).  That makes sense if you support a cookie and a JWT scheme.  But not as much sense when 2 JWT since only one can be used on any given request.

So when `AzureAD` scheme is tried, it will try to lookup the AzureAD Jwks document for a public key that, of course, will not exist.

During development, it's annoying for sure, but if you have `information` level turned on for Application Insight and your ops team asks you why do we have so many `IDX10501` in the logs, the answer "Cause .NET does it this way" ins't great.

### The fix

> Working Assumption: *any* given request can only be authenticated by one of the scheme since they proof of idenity comes on the `Authorization` header of the request.

The gist of the fix is to create a context sensitive `JwtBearerHandler` that will ignore tokens issued for different issuer than their authority states.

We do it by first creating a new class called `AzureADJWTAuthenticationHandler` and will derived from `JwtBearerHandler` which is the type ASP.NET Core uses when calling `.AddJwtBearer`. [source]((https://github.com/dotnet/aspnetcore/blob/v3.1.3/src/Security/Authentication/JwtBearer/src/JwtBearerExtensions.cs)

Then we will introduce logic to check the incoming token issuer and match it against that given instance's issuer (as dictated by the Authority)

Like this:

```c#
public class AzureADJWTAuthenticationHandler : JwtBearerHandler
    {
        public AzureADJWTAuthenticationHandler(IOptionsMonitor<JwtBearerOptions> options, ILoggerFactory logger, UrlEncoder encoder, ISystemClock clock) 
            : base(options, logger, encoder, clock)
        {}

        protected override async Task<AuthenticateResult> HandleAuthenticateAsync()
        {
            var authorityConfig = await this.Options.ConfigurationManager.GetConfigurationAsync(this.Context.RequestAborted);
            var authorityIssuer = authorityConfig.Issuer;

            var jwtToken = this.ReadTokenFromHeader();

            var jwtHandler = new JwtSecurityTokenHandler();
            
            if (jwtHandler.CanReadToken(jwtToken))
            {
                var token = jwtHandler.ReadJwtToken(jwtToken);
                if (string.Equals(token.Issuer, authorityIssuer, StringComparison.OrdinalIgnoreCase))
                {
                    // means the token was issued by this authority, we make sure full validation runs as normal
                    return await base.HandleAuthenticateAsync();
                }
                else
                {
                    // Skip validation since the token as issued by a an issuer that this instance doesn't know about
                    // That has zero of success, so we will not issue a "fail" since it crowds the logs with failures of type IDX10501 
                    // which are not really true and certainly not useful.
                    this.Logger.LogDebug($"Skipping jwt token validation because token issuer was {token.Issuer} but the authority issuer is: {authorityIssuer}");
                    return AuthenticateResult.NoResult();
                }
            }

            return await base.HandleAuthenticateAsync();
        }

        private string ReadTokenFromHeader(){
            string token = null;
            
            string authorization = Request.Headers["Authorization"];

            // If no authorization header found, nothing to process further
            if (string.IsNullOrEmpty(authorization))
            {
                return null;
            }

            if (authorization.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
            {
                token = authorization.Substring("Bearer ".Length).Trim();
            }

            return token;
        }
    }
```

> This could be improved in a few places for better performance, etc.  But you get the idea

And then add change the Authentication Scheme addition in the startup.cs to use our new specific handlers :

```c#
services.TryAddEnumerable(ServiceDescriptor.Singleton<IPostConfigureOptions<JwtBearerOptions>, JwtBearerPostConfigureOptions>());
services.AddAuthentication("Auth0")
    .AddScheme<JwtBearerOptions, Auth0JWTAuthenticationHandler>("Auth0", options =>
    {
        options.Audience = "MyApi";
        options.Authority = "https://oliviervaillancourt.auth0.com/";
    })
    .AddScheme<JwtBearerOptions, AzureADJWTAuthenticationHandler>("AzureAD", options =>
    {
        options.Audience = "https://localhost:5000/";
        options.Authority = "https://login.microsoftonline.com/common/";
    });
```

**The first line is very important for the handler derived from JwtBearerHandler to work properly**

### the ouput

Once the fix is applied the same request producing a `200 OK` now has prints this set of logs:

```
info: Microsoft.AspNetCore.Hosting.Diagnostics[1]
      Request starting HTTP/1.1 GET http://localhost:5000/weatherforecast
info: IDX10501Fix.AuthenticationHandlers.Auth0JWTAuthenticationHandler[2]
      Successfully validated the token.
info: Microsoft.AspNetCore.Authorization.DefaultAuthorizationService[1]
      Authorization was successful.
info: Microsoft.AspNetCore.Hosting.Diagnostics[2]
      Request finished in 978.3106ms 200 application/json; charset=utf-8
```

Looks better to me.

By deriving new types we also get a added bonus of the log category being `IDX10501Fix.AuthenticationHandlers.Auth0JWTAuthenticationHandler` instead of the generic `Microsoft.AspNetCore.Authentication.JwtBearer.JwtBearerHandler`.  That also helps figure out what handler is doing what.

### Take away / final thoughts

That technique seems to resolve the issue but I wish this behaviour would be available in the framework itself.  I have googled left to right, top to bottom and I get circling back to no real answer.

Also, looking that [JwtBearerHandler source code (release 3.1.3)](https://github.com/dotnet/aspnetcore/blob/v3.1.3/src/Security/Authentication/JwtBearer/src/JwtBearerHandler.cs), we can see that it's possible for the handler to refresh configuration when it's a "key" problem

```c#
 if (Options.RefreshOnIssuerKeyNotFound && Options.ConfigurationManager != null
    && ex is SecurityTokenSignatureKeyNotFoundException)
{
    Options.ConfigurationManager.RequestRefresh();
}
```

I haven't tried but it does lead me to believe that there might be a performance impact potentially retrieved the jwks too often (would be have to be proven though)

If you think I did something wrong (or that would weaken security) don't hesitate to either submit a PR/Issue (by using the button on top of the post) or hit me on twitter.

Hope it helps someone.
