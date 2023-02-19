const passport = require('passport')
const GoogleStrategy = require('passport-google-oauth20');
const logger = require('./logger')

class Api {
  constructor(config) {
    this._config = config
    this._token = undefined
    this._initialize()
  }

  _extractProfile(profile) {
    let imageUrl = '';

    if (profile.photos && profile.photos.length) {
      imageUrl = profile.photos[0].value;
    }

    let result = {
      id: profile.id,
      displayName: profile.displayName,
      image: imageUrl,
    }

    return result;
  }

  _initialize() {
    let config = this._config

    passport.use(new GoogleStrategy(
      {
        clientID: config.clientId,
        clientSecret: config.secret,
        callbackURL: config.callback,
      },
      (token, refreshToken, profile, done) => {
        this._token = token
        done(null, { profile, token })
      }
    ));

    passport.serializeUser((user, cb) => {
      cb(null, user);
    });

    passport.deserializeUser((obj, cb) => {
      cb(null, obj);
    });
  }

  // Return the body as JSON if the request was successful, or thrown a StatusError.
  async _checkStatus(response) {
    // console.log("---->", response)
    if (!response.ok) {
      // Throw a StatusError if a non-OK HTTP status was returned.
      let message = "";
      try {
        // Try to parse the response body as JSON, in case the server returned a useful response.
        message = response.json();
      } catch (err) {
        // Ignore if no JSON payload was retrieved and use the status text instead.
      }
      console.log("===> error!!!")
      logger.error(response.status, response.statusText, message)
      return undefined

      // throw new StatusError(response.status, response.statusText, message);
    }

    return await response.json();
  }

  // Returns a list of all albums owner by the logged in user from the Library
  // API.
  async getAlbums() {
    let authToken = this._token
    let albums = [];
    let nextPageToken = null;
    let error = null;

    let parameters = new URLSearchParams();
    // parameters.append('pageSize', config.albumPageSize);
    parameters.append('pageSize', this._config.albumPageSize);

    try {
      // Loop while there is a nextpageToken property in the response until all
      // albums have been listed.
      do {
        logger.verbose(`Loading albums. Received so far: ${albums.length}`);
        // Make a GET request to load the albums with optional parameters (the
        // pageToken if set).

        const albumResponse = await fetch(this._config.apiEndpoint + '/v1/albums?' + parameters, {
          method: 'get',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + authToken
          },
        });

        let result = await this._checkStatus(albumResponse)

        if (result == undefined) {
          return
        }

        logger.info(`Response: ${result}`);

        if (result && result.albums) {
          logger.info(`Number of albums received: ${result.albums.length}`);
          // Parse albums and add them to the list, skipping empty entries.
          const items = result.albums.filter(x => !!x);

          albums = albums.concat(items);
        }
        if (result.nextPageToken) {
          parameters.set('pageToken', result.nextPageToken);
        } else {
          parameters.delete('pageToken');
        }

        // Loop until all albums have been listed and no new nextPageToken is
        // returned.
      } while (parameters.has('pageToken'));

    } catch (err) {
      // Log the error and prepare to return it.
      error = err;
      logger.error(error);
    }

    logger.info('Albums loaded.');
    return { albums, error };
  }

  // Submits a search request to the Google Photos Library API for the given
  // parameters. The authToken is used to authenticate requests for the API.
  // The minimum number of expected results is configured in config.photosToLoad.
  // This function makes multiple calls to the API to load at least as many photos
  // as requested. This may result in more items being listed in the response than
  // originally requested.
  async albumItems(albumId) {
    logger.info("  Loading photos...")

    let authToken = this._token
    let photos = [];
    let nextPageToken = null;
    let error = null;

    let parameters = {
      pageSize: this._config.itemsPageSize,
      albumId: albumId,
    }

    try {
      // Loop while the number of photos threshold has not been met yet
      // and while there is a nextPageToken to load more items.
      do {
        // logger.info(
        //   `Submitting search with parameters: ${JSON.stringify(parameters)}`);

        // Make a POST request to search the library or album
        const searchResponse =
          await fetch(this._config.apiEndpoint + '/v1/mediaItems:search', {
            method: 'post',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer ' + authToken
            },
            body: JSON.stringify(parameters)
          });

        const result = await this._checkStatus(searchResponse);

        // logger.debug(`Response: ${result}`);

        // The list of media items returned may be sparse and contain missing
        // elements. Remove all invalid elements.
        // Also remove all elements that are not images by checking its mime type.
        // Media type filters can't be applied if an album is loaded, so an extra
        // filter step is required here to ensure that only images are returned.
        const items = result && result.mediaItems ?
          result.mediaItems
            .filter(x => x):  // Filter empty or invalid items.
            // Only keep media items with an image mime type.
            // .filter(x => x.mimeType && x.mimeType.startsWith('image/')) :
          [];

        photos = photos.concat(items);

        // Set the pageToken for the next request.
        parameters.pageToken = result.nextPageToken;

        logger.verbose(
          `Found ${items.length} images in this request. Total images: ${photos.length}`);

        // Loop until the required number of photos has been loaded or until there
        // are no more photos, ie. there is no pageToken.
      // } while (photos.length < config.photosToLoad &&
        // parameters.pageToken != null);
      } while (parameters.pageToken != null);

    } catch (err) {
      // Log the error and prepare to return it.
      error = err;
      logger.error(error);
    }

    logger.info('  photos loaded.');
    return { photos, parameters, error };
  }
}

module.exports = Api
