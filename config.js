module.exports={
  clientId: "a-lot-of-numbers-here.apps.googleusercontent.com",
  secret: "your-secret-here",
  // leave like this if the script is running locally
  callback: "http://localhost:3000/callback",
  // The page size to use for the listing albums request. 50 is recommended.
  albumPageSize: 50,
  // The API end point to use. Don't need change.
  apiEndpoint: 'https://photoslibrary.googleapis.com',
  scopes: [
    'https://www.googleapis.com/auth/photoslibrary.readonly',
    'profile',
  ],
  // The page size to use for search requests. 100 is recommended.
  itemsPageSize: 100,

  existentSource: ["/home/Downloads/pics/folder1", "/home/Downloads/another/folder"],
  outputTo: "./output",
  downloadNonExistent: true,
  copyExistentToOutput: true,
  forceCopyDownload: false, //force to copy or download even if the file already exists in target folder
  mediaNotInAlbumsFolder: "./output/no-albums", //if not empty, files not added to any album will be copied to here
  rules: {
    justIncludeAlbums: [], // leave empty to include all albums. Add album names to process only them
    skipAlbums: [], // albums to be skipped
  }
}
