'use strict';

import path from "path";

async function asyncForEach(array, callback) {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array);
  }
}

async function getTransformedImage(imgURL, accessToken, env) {
  const apiURL = env.IMG_API_URL;

  let file = path.parse(imgURL);
  const newName = `${file.name}-hit.png`;

  const params = new URLSearchParams({
    "imageurl": imgURL,
    "entry": "convert",
    "options": '["-alpha", "background", "-channel", "A", "-blur", "20x20", "-level", "0,20%", "-strip"]',
    "outputfile": newName
  });

  const data = await fetch(apiURL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: params.toString()
  }).then((response) => {
    return response.json();
  }).then((data) => {
    console.log(data)
    return data;
  }).catch((err) => {
    console.log(err);
  });

  return data;
}

async function updateClientTokenInDB(apiURL, tokenData) {
  const newExpiry = tokenData.expires_in + (Math.floor(Date.now() / 1000));

  const data = await fetch(apiURL, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      token: { "token": tokenData.access_token, "expires": newExpiry }
    })
  }).then((response) => {
    return response.json();
  });
  return data;
}

async function refreshIMAccessToken(env) {
  const url = env.SSAB_CLIENT_URL;
  const client_id = env.SSAB_CLIENT_ID;
  const client_secret = env.SSAB_CLIENT_SECRET;
  const audience = env.SSAB_CLIENT_IDENTIFIER

  const data = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      client_id: client_id,
      client_secret: client_secret,
      audience: audience,
      grant_type: "client_credentials"
    })
  }).then((response) => {
    return response.json();
  }).then((tokenData) => {
    return tokenData;
  });

  return data;
}

async function getIMAccessToken(url, env) {
  const data = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  }).then((response) => {
    return response.json();
  }).then(async (accessData) => {
    const tokenData = accessData.data.token;
    const seconds = Math.floor(Date.now() / 1000);
    var validToken = null;

    if (typeof tokenData === 'object' && tokenData.hasOwnProperty('token') && tokenData.hasOwnProperty('expires')) {
      if (tokenData.token !== null && tokenData.token !== '') {
        if (tokenData.expires >= seconds) {
          validToken = tokenData.token;
        } else {
          const token = await refreshIMAccessToken(env);
          if (token.error) {
            // do nothing
          } else {
            await updateClientTokenInDB(url, token);
            validToken = token.access_token;
          }
        }
      }
    }

    return validToken;
  });

  return data;
}

var index = (router, { env }) => {
  router.get('/', async (req, res) => {
    const urlBase = env.PUBLIC_URL;
    let graphURL = new URL("graphql", urlBase);
    let imgMagick = new URL("items/imgmagick", urlBase);

    fetch(graphURL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: `
                    query activeTheme {
                      activeTheme {
                        id
                        activeTheme {
                          themeID
                          themeName
                          colorPalette {
                            id
                            palette
                          }
                          backgroundImage {
                            filename_download
                            filename_disk
                            id
                          }
                          hiddenObject {
                            filename_download
                            filename_disk
                            id
                          }
                          cornerObject {
                            filename_download
                            filename_disk
                            id
                          }
                          customLightObjects {
                            clientLightObjects_id {
                              lightObjectImage {
                                filename_download
                                filename_disk
                                id
                              }
                              objectPlacement {
                                id
                                name
                              }
                            }
                          }
                          customDecorativeObjects {
                            clientDecorativeObjects1_id {
                              decorativeObjectImage {
                                filename_download
                                filename_disk
                                id
                              }
                              objectPosition {
                                id
                                name
                              }
                            }
                          }
                          customTextures {
                            clientTextures_id {
                              textureImage {
                                filename_download
                                filename_disk
                                id
                              }
                              texturePlacement {
                                id
                                name
                              }
                            }
                          }
                          uiShapes {
                            id
                            directus_files_id {
                              filename_download
                              filename_disk
                              id
                            }
                          }
                        }
                      }
                    }                                            
                  `
      })
    }).then((response) => {
      return response.json();
    }).then(async (themeData) => {
      const myTheme = themeData.data.activeTheme;
      let activeTheme = myTheme.activeTheme;
      let customLightObjects = activeTheme.customLightObjects;
      let customDecorativeObjects = activeTheme.customDecorativeObjects;
      let customTextures = activeTheme.customTextures;
      let uiShapes = activeTheme.uiShapes;

      activeTheme.lightObjects = {};
      activeTheme.decorativeObjects = {};
      activeTheme.textures = {};

      delete activeTheme.customLightObjects;
      delete activeTheme.customDecorativeObjects;
      delete activeTheme.customTextures;
      delete activeTheme.uiShapes;
      activeTheme.uiShapes = [];

      if (activeTheme.colorPalette !== null) {
        let palette = activeTheme.colorPalette.palette;
        for (const [key, value] of Object.entries(palette)) {
          activeTheme.colorPalette.palette[key] = `#${value}`;
        }
      }

      if (activeTheme.backgroundImage !== null) {
        let bg = activeTheme.backgroundImage;
        delete activeTheme.backgroundImage;
        activeTheme.backgroundImage = `${urlBase}/assets/${bg.filename_disk}`;
      }

      if (activeTheme.hiddenObject !== null) {
        let bg = activeTheme.hiddenObject;
        delete activeTheme.hiddenObject;
        activeTheme.hiddenObject = `${urlBase}/assets/${bg.filename_disk}`;
      }

      if (activeTheme.cornerObject !== null) {
        let bg = activeTheme.cornerObject;
        delete activeTheme.cornerObject;
        activeTheme.cornerObject = `${urlBase}/assets/${bg.filename_disk}`;
      }

      //light objects
      if (typeof customLightObjects === 'object' && customLightObjects.length > 0) {
        const newLightObjects = {};
        customLightObjects.forEach(el => {
          const obj = el.clientLightObjects_id;
          const id = obj.objectPlacement.id;
          const newID = id.replace("-", "");   
          newLightObjects[newID] = `${urlBase}/assets/${obj.lightObjectImage.filename_disk}`;
          // activeTheme.lightObjects[id] = `${urlBase}/assets/${obj.lightObjectImage.filename_disk}`;
        });
        activeTheme.lightObjects = newLightObjects;
      }

      // decorative objects
      if (typeof customDecorativeObjects === 'object' && customDecorativeObjects.length > 0) {
        const newDecorativeObjects = {};
        customDecorativeObjects.forEach(el => {
          const obj = el.clientDecorativeObjects1_id;
          // const id = obj.objectPosition.id;
          const id = 'do' + obj.objectPosition.id;
          newDecorativeObjects[id] = `${urlBase}/assets/${obj.decorativeObjectImage.filename_disk}`;
          // activeTheme.decorativeObjects[id] = `${urlBase}/assets/${obj.decorativeObjectImage.filename_disk}`;
        });
        activeTheme.decorativeObjects = newDecorativeObjects;
      }

      // textures
      if (typeof customTextures === 'object' && customTextures.length > 0) {
        const newCustomTextures = {};
        customTextures.forEach(el => {
          const obj = el.clientTextures_id;
          const id = obj.texturePlacement.id;
          const newID = id.replace("-", ""); 
          newCustomTextures[newID] = `${urlBase}/assets/${obj.textureImage.filename_disk}`;
          // activeTheme.textures[id] = `${urlBase}/assets/${obj.textureImage.filename_disk}`;
        });
        activeTheme.textures = newCustomTextures;
      }

      // ui shapes
      if (typeof uiShapes === 'object' && uiShapes.length > 0) {
        uiShapes.forEach(obj => {
          //const id = obj.id;
          const imgs = {
            "id": obj.directus_files_id.id,
            "image": `${urlBase}/assets/${obj.directus_files_id.filename_disk}?key=padding-472-20`,
            "hitImage": `${urlBase}/assets/${obj.directus_files_id.id}/${obj.directus_files_id.filename_download}?key=fatten20-472-20`,
            "fileName": obj.directus_files_id.filename_disk
          };
          activeTheme.uiShapes.push(imgs);
        });
      }

      const accessToken = await getIMAccessToken(imgMagick, env);

      if (accessToken) {
        await asyncForEach(activeTheme.uiShapes, async (shape, index) => {
          let imgURL = `${env.SSAB_IMG_URL_BASE}/${shape.fileName}?key=padding-472-20`;

          let transform = await getTransformedImage(imgURL, accessToken, env);
          if (transform.success) {
            activeTheme.uiShapes[index].hitImage = transform.transformed;
          }
        });
      }

      res.json(activeTheme);
    })
      .catch((err) => {
        res.json(err);
      });

  });
};

export default index;
