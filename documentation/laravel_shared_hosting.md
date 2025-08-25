# Deploy Laravel apps on shared hosting using cPanel

These are the steps to deploy Laravel apps on shared hosting with cpanel.

## Table Of Contents
- [Upload Project Files](#upload-project-files)
- [Move Public Folder](#move-public-folder)
- [Change Laravel Path](#change-laravel-path)
- [Update .htaccess](#update-htaccess)
- [Create Database](#create-database)
- [Run Migrations](#run-migrations)
- [Bypass SSL Verification for Emails](#bypass-ssl-verification-for-emails)

## Upload Project Files
Upload your Laravel project files (including composer packages) anywhere outside of your domain's public directory. Let's say if the public directory is `public_html` then place project files anywhere outside of `public_html`.

You can upload files either directly via cPanel or by using any FTP client like FileZilla.

[Go to top :arrow_up:](#table-of-contents)

## Move Public Folder
After uploading files, move the content of public directory in laravel project to your domain's public directory, in our case `public_html`.

[Go to top :arrow_up:](#table-of-contents)

## Change Laravel Path
Now change the path to your laravel project in `index.php` file placed in public directory `public_html`.

Change the path on these two lines in `index.php`.
``` php
require __DIR__.'/../vendor/autoload.php';

$app = require_once __DIR__.'/../bootstrap/app.php';
```
The `__DIR__` gives the complete directory path to the file. In our case `index.php` is placed in `public_html` and we will get the complete path to `public_html`.

Now we would need to go one level up and go in project folder and then point the `autoload.php` and `app.php` relatively.

After changing path, code will look like this.
``` php
require __DIR__.'/../{path_to_project_folder}/vendor/autoload.php';

$app = require_once __DIR__.'/../{path_to_project_folder}/bootstrap/app.php';
```

[Go to top :arrow_up:](#table-of-contents)

## Update .htaccess
Now paste the following code in `.htaccess` file in `public_html` folder. If the file is not there then you may need to show hidden files.

> **Note:** *Backup your old `.htaccess` file*. I don't know what this code means but it just works for cases when public directory is changed. If your project does not work please revert back to old `.htaccess`

```
<IfModule mod_rewrite.c>

    RewriteEngine On
    RewriteCond %{REQUEST\_URI} !^/public
    RewriteRule ^(.\*)$ /public/$1 [L]

    # Handle Authorization Header
    RewriteCond %{HTTP:Authorization} .
    RewriteRule .* - [E=HTTP_AUTHORIZATION:%{HTTP:Authorization}]

    # Redirect Trailing Slashes If Not A Folder...
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteCond %{REQUEST_URI} (.+)/$
    RewriteRule ^ %1 [L,R=301]

    # Handle Front Controller...
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteRule ^ index.php [L]
     
</ifModule>
```

[Go to top :arrow_up:](#table-of-contents)

## Create Database
Create database for your project and place the required information in `.env` file in your project folder.

[Go to top :arrow_up:](#table-of-contents)

## Run Migrations
To run any artisan command like `php artisan migrate` on shared hosting you will need to create a route and hit that route.

To run migration command you can use this code in `web.php`
``` php
Route::get('/migrate', function (){
    \Artisan::call('migrate');
    return 'migrate command called';
});
```

[Go to top :arrow_up:](#table-of-contents)

## Bypass SSL Verification for Emails
If you are sending emails in your project and ssl is not installed on your domain, then you may need to bypass the ssl varification to send emails. 

Paste the following code in `config/mail.php` file to send emails without ssl verification.
``` php
'stream' => [
    'ssl' => [
        'allow_self_signed' => true,
        'verify_peer' => false,
        'verify_peer_name' => false,
    ],
],
```

[Go to top :arrow_up:](#table-of-contents)