[![Maintenance](https://img.shields.io/badge/Maintained%3F-no-red.svg)](https://bitbucket.org/lbesson/ansi-colors)
[![Generic badge](https://img.shields.io/badge/Status-Alpha-red.svg)](https://shields.io/)
[![GPLv3 license](https://img.shields.io/badge/License-Apache-purple.svg)](http://perso.crans.org/besson/LICENSE.html)
[![Ask Me Anything !](https://img.shields.io/badge/Ask%20me-anything-1abc9c.svg)](https://GitHub.com/Naereen/ama)

# Google Photos Album Sync Local
Sync google photos album with local files.

The situation: You have your photos/videos being managed by google photos, all separated by albums, very nice, very cute. But inside your phone there is just a folder called something like *Camera* and inside there are all your hundreds of thousands of files of pictures all messed-up, no albums no separation, nothing, just a big mess.

- Then, how do you backup these files properly on an external device/computer, separating them by albums as folders?
*Here is where this script comes in hand*

- Why would I want to do that?
*Moving pictures/videos out from a device can have many reasons, but my motivations to create this script was:*
*- Too much space being used on my device*
*- Many albums were very old, from ~5y ago, I don't want them in my phone/google photos anymore*
*- Make sure that I don't rely only on google to hold my pictures/videos*
*- Avoid paying additional and unnecessary space on google for photos that I don't care anymore*

## How this script works
In a nutshell, it connects to your google account, read your albums, compare the picture/video names from google with your local file names and if it matches the picture/video names it copies the file to a folder with the name of the album.

Optionally the script can:
- Download pictures/videos that you don't have locally (in case of shared albums or pictures/videos that you don't have anymore in your device). Note that resolution of downloaded content can be lower than the original one due to google settings.
- Create a folder with pictures/videos that didn't match any of your albums.
- Specify specific albums to parse, or, specific albums to not parse.

## How to define settings
This script works based on a config file (`config.js`) which guides the rules of copying pictures/videos.
The options are:
- `clientId`, `secret`: these are credentials and setting given by google dev account. Please follow the `how-to-api-token-google-photos.pdf` instructions to create and activate an account.
- `callback`, `albumPageSize`, `apiEndpoint`, `scopes`, `itemsPageSize`: Fields related to how the api is called. If everything goes fine none of these fields need to be changed.
- `existentSource`: list of folders that the script must search for album pictures/videos
- `outputTo`: folder name where the album's folders and files will be copied
- `downloadNonExistent`: If pictures/videos are not found in any `existentSource` folders, it downloads it from google.
- `copyExistentToOutput`: If pictures/videos are found in the `existentSource`, copy them to the respective output album's folder.
- `forceCopyDownload`: Copy/Download even if the target file already exists
- `mediaNotInAlbumsFolder`: Folder name to copy files that were not part of any album
- `rules/justIncludeAlbums`: List of album titles which should be considered in the parsing.
- `rules/skipAlbums`: List of album titles to be skipped when parsing.

## How to run
- clone this repository
- make sure that nodeJS is installed in your machine
- `npm install`
- `node server.js`

## Other notes
This is a weekend project so don't expect too much quality in the code.
Also, use it by your own risk. Although the script is not made to exclude any kind of file, it still may have some glitches and may fail on copying/downloading files.
