const passport = require('passport')
const express = require('express')
const session = require('express-session')
const app = express()
const open = require('open')
const config = require('./config')
const gpApi = require('./google-photos')
const fs = require('fs');
const logger = require('./logger')
var request = require('sync-request');

let api = new gpApi(config)
// let allFilesProcessed = [] // all files processed in existent folder

app.use(passport.initialize()) // Api call for google authentication
app.use(session({ secret: 'SECRET' })); // session secret

app.get(
  '/',
  passport.authenticate('google', {
    scope: config.scopes,
    failureFlash: true,  // Display errors to the user.
    session: true,
  }),
  (req, res) => {
    console.log("===> Some endpoint here")
  }
);// Api call back function

app.get(
  '/callback',
  passport.authenticate(
    'google', { failureRedirect: '/', failureFlash: true, session: true }),
  (req, res) => {
    console.log("Authenticated!")
    req.session.save(() => {
      // res.redirect('/');
      res.send("Congrats, Now you can get back to terminal.");
      getAlbuns()
    });
  });

async function getAlbuns() {
  let specificAlbums = config.rules.justIncludeAlbums
  let totalSpecificAlbums = config.rules.justIncludeAlbums.length
  let skipAlbums = config.rules.skipAlbums
  let allAlbums = []

  await api.getAlbums().then((data, error) => {
    data.albums.forEach(album => {
      if ((totalSpecificAlbums > 0 && !specificAlbums.includes(album.title.trim())) || skipAlbums.includes(album.title.trim())) {
        // logger.info("Skipped: " + album.title )
      } else {
        logger.info("Added: " + album.title)
        allAlbums.push({
          id: album.id,
          title: album.title,
          url: album.productUrl,
        })
      }
    });

    logger.info("Going to get album's items...")

    async function albumsItemsInSequence(remainingAlbums) {
      if (remainingAlbums && remainingAlbums.length > 0) {
        let ab = remainingAlbums[0]

        logger.info(" Getting item from album " + ab.title)
        await api.albumItems(ab.id).then((photos, parameters, error) => {
          let d = prepareAlbumData(ab, photos.photos)
          writeSummaryToFile(d)
          compareExistent(d)
          logger.info(" Done " + ab.title + "\n")
          remainingAlbums.shift()
          albumsItemsInSequence(remainingAlbums)
        })

        if (remainingAlbums.length == 0) {
          copyMediaNotInAlbums()
        }
      }
    }

    albumsItemsInSequence(allAlbums)
  })
}

function getOutputFolders(source){
  return fs.readdirSync(source, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name)
}


function copyMediaNotInAlbums() {
  let allFilesInExistentSources = []

  config.existentSource.forEach(existentSource => {
    let files = fs.readdirSync(existentSource)
    let sourceFiles = files.map(f=>{
      return {
        file: f,
        sourceFolder: existentSource,
      }
    })

    allFilesInExistentSources = [...sourceFiles, ...allFilesInExistentSources]
  })

  // allFilesProcessed must be based on list of files in all folders of output/albums
  let allFilesInOutput = []
  getOutputFolders(config.outputTo).forEach(ofc => {
    allFilesInOutput = [...fs.readdirSync(config.outputTo + "/" + ofc), ...allFilesInOutput]
  })

  let notCopiedToAlbums = allFilesInExistentSources.filter(
    f => !allFilesInOutput.includes(f.file)
  );

  if (config.mediaNotInAlbumsFolder.length == 0) {
    console.log("Media not copied to any album folder:", notCopiedToAlbums.length)
  } else {
    let folderForNotInAlbums = config.mediaNotInAlbumsFolder
    console.log("Copying", notCopiedToAlbums.length, "media items not in albums to", folderForNotInAlbums)

    if (!fs.existsSync(folderForNotInAlbums)) {
      fs.mkdirSync(folderForNotInAlbums)
    }

    notCopiedToAlbums.forEach(f=>{
      fs.copyFileSync(f.sourceFolder + "/" + f.file, folderForNotInAlbums + "/" + f.file)
      process.stdout.write("\x1b[36mN\x1b[0m")
    })
  }

  console.log("\nDone copying medias not in albums.")
}

function compareExistent(data) {
  let albumFolder = data.album.title.trim().replace(/[^a-z0-9]/gi, '_').toLowerCase();
  let outputFolder = config.outputTo + "/" + albumFolder
  if (!fs.existsSync(outputFolder)) {
    fs.mkdirSync(outputFolder)
  }

  data.items.forEach(mediaItem=>{
    let filename = mediaItem.filename
    let sourceFolder = fileExistInSource(filename)
    let targetFile = outputFolder + "/" + filename

    // allFilesProcessed.push(filename)

    if (!fileExistInTarget(targetFile) || config.forceCopyDownload) {
      if (config.copyExistentToOutput && sourceFolder != undefined) {
        fs.copyFileSync(sourceFolder + "/" + filename, targetFile)
        process.stdout.write("\x1b[33mC\x1b[0m")
      } else if (config.downloadNonExistent) {
        process.stdout.write("\x1b[34mD\x1b[0m")
        downloadGoogleMedia(mediaItem, targetFile)
        // process.exit(0)
      } else {
        process.stdout.write(".")
      }
    } else {
      process.stdout.write(">")
    }
  })

    process.stdout.write("\n")
}

function downloadGoogleMedia(mediaItem, filepath) {
  let downloadType = mediaItem.mimeType.includes("video") ? "=dv" : "=d"
  let url = mediaItem.url + downloadType

  let res = request('GET', url);
  fs.writeFileSync(filepath, res.getBody());
}

function fileExistInTarget(targetFile) {
  return fs.existsSync(targetFile) && fs.statSync(targetFile).size > 0
}

function fileExistInSource(photoFileName) {
  let existsInFolder = undefined

  config.existentSource.forEach(existentSource=>{
    if (fs.existsSync(existentSource + "/" + photoFileName)) {
      existsInFolder = existentSource
      return
    }
  })

  return existsInFolder
}

function prepareAlbumData(album, photos) {
  logger.info("  Preparing data for " + album.title)
  let data = {
    album: album,
    items: [],
  }

  photos.forEach(photo => {
    data.items.push({
      id: photo.id,
      url: photo.baseUrl, //photo.productUrl,
      filename: photo.filename,
      mimeType: photo.mimeType,
      contributor: photo.contributorInfo,
    })
  });

  return data
}

function writeSummaryToFile(data) {
  let filename = data.album.title.trim().replace(/[^a-z0-9]/gi, '_').toLowerCase();
  logger.info("  Saving file: "+filename)

  fs.writeFileSync(config.outputTo + "/" + filename + ".json", JSON.stringify(data));
  logger.info("  Done Saving file: " + filename)
}

app.listen(3000, () => {
  console.log('app listening on port 3000!')

  open('http://localhost:3000')
});
