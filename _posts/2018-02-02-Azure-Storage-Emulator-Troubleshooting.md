---
layout: post
title:  "Troubleshooting Azure Storage Emulator Errors"
subtitle: "How to turn on logs and resolve those hard to find Azure storage emulator issues"
author: 'Olivier Vaillancourt'
categories: Azure
cover:  "/img/posts/AzuzeStorageEmulatorTroubleshooting/storageemulatorcover.png"
---

## In this blog post, we will explain how to get more insight into weird azure storage emulator problems.

### Background

Recently, I encountered an issue where doing `GET` requests against Table Storage in the Azure storage emulator was working but `POST` and `PUT` requests were failing with a generic `500` coming back from the emulator.

I've had these kinds of issues in the past with a mismatch between the azure storage dlls and the emulator version but in this case, nothing had changed from "it worked fine last time I did this" to "why is this broken now?"

>**Spoiler alert**: the problem was that the SQL data file (.mdf) backing the emulator was full... yeah, I know, I'm that lucky ;) 

### Enabling Logs

In the exception I was receiving in Visual Studio, I was seeing a request ID in the form of a guid.  That lead me to think about looking into logs.
Ok, I googled first and most of the solutions involved [resetting the db backing azure table storage](https://stackoverflow.com/questions/34662226/creating-table-in-azure-storage-emulator-produces-http-500-error) which I didn't want to do right away... though that would have solved my issue, as you will figure out later.

So, I did find this [great blog post](http://juhap.iki.fi/azure/enable-debug-log-in-azure-storage-emulator/) back from *2013* (or 5 lifetimes ago in software development years) explaining how to turn on logs in azure storage emulator.  Being that 'old', things have changed a little bit.

To enable logs:

- Navigate to `%LOCALAPPDATA%\AzureStorageEmulator`
- Locate the `.config` matching your version of the emulator.  In my case it was `AzureStorageEmulator.5.2.config`
- change `LoggingEnabled` to `true`
- **Restart Storage Emulator** (very important)
- At the same time, you can see where the logs will be written under the `LogPath` node

it should look something like this:
```xml
<?xml version="1.0"?>
<StorageEmulator xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <SQLInstance>(localdb)\MSSQLLocalDB</SQLInstance>
  <PageBlobRoot>C:\Users\olivierv\AppData\Local\AzureStorageEmulator\PageBlobRoot</PageBlobRoot>
  <BlockBlobRoot>C:\Users\olivierv\AppData\Local\AzureStorageEmulator\BlockBlobRoot</BlockBlobRoot>
  <LogPath>C:\Users\olivierv\AppData\Local\AzureStorageEmulator\Logs</LogPath>
  <LoggingEnabled>true</LoggingEnabled>
</StorageEmulator>
```

### Now on to my specific issue

 Navigating to the logs folder, I found a set of files.  I then just opened the first one and right there in the first paragraph was:

 > The fatal unexpected exception 'The fatal unexpected exception 'Could not allocate space for object 'dbo.TableRow'.'PK_dbo.TableRow' in database 'AzureStorageEmulatorDb52' because the 'PRIMARY' filegroup is full. Create disk space by deleting unneeded files, dropping objects in the filegroup, adding additional files to the filegroup, or setting autogrowth on for existing files in the filegroup.'

Oh, isn't that interesting.

I knew that Azure Storage Emulator was using `SQL LocalDb` has its storage engine.

So, I went and had a look at `%userprofile%` and to my surprise the file `AzureStorageEmulatorDb52.mdf` was 10 Gb big.

### Digging even deeper: why is the .mdf file 10 Gb big?

So, I connected to the SQL `LocalDb` instance using Visual Studio Sql Explorer view and issued [this query](https://stackoverflow.com/questions/7892334/get-size-of-all-tables-in-database) to find where all these bytes were having a party.

The `TableRow` table (which holds records for table storage) was using almost all of the 10 Gb.

|TableName | TotalSpaceMB |
| -------- | ------------ |
|TableRow  | 10173.98     |

I then found out that 99%+ of those records where from an azure table storage table named `waddiagnosticinfrastructurelogstable`. 

It turns out I had an old cloud service running on my box set up to collect machine level metrics (cpu, memory, etc), which was dumping into the emulator and filled it up.

I deleted those rows and everything started to work normally :D

Hope it helps someone.