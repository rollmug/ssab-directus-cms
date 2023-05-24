'use strict';

var index = (router, { services, exceptions }) => {
  router.get('/', (req, res) => {
    const { ItemsService } = services;
    const { ServiceUnavailableException } = exceptions;

    const settings = new ItemsService('directus_settings', { schema: req.schema, accountability: req.accountability });

    settings.readByQuery({ fields: ['*'] }).then((results) => {
      const urlBase = results[0].project_url;
      let graphURL = new URL("graphql", urlBase);

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
      }).then((themeData) => {
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
          //delete activeTheme.backgroundImage.id;
          //delete activeTheme.backgroundImage.filename_download;
        }

        if (activeTheme.hiddenObject !== null) {
          let bg = activeTheme.hiddenObject;
          delete activeTheme.hiddenObject;
          activeTheme.hiddenObject = `${urlBase}/assets/${bg.filename_disk}`;
          //delete activeTheme.hiddenObject.id;
          //delete activeTheme.hiddenObject.filename_download;
        }

        if (activeTheme.cornerObject !== null) {
          let bg = activeTheme.cornerObject;
          delete activeTheme.cornerObject;
          activeTheme.cornerObject = `${urlBase}/assets/${bg.filename_disk}`;
          //delete activeTheme.cornerObject.id;
          //delete activeTheme.cornerObject.filename_download;
        }

        //light objects
        if (typeof customLightObjects === 'object' && customLightObjects.length > 0) {
          customLightObjects.forEach(el => {
            const obj = el.clientLightObjects_id;
            const id = obj.objectPlacement.id;
            activeTheme.lightObjects[id] = `${urlBase}/assets/${obj.lightObjectImage.id}/${obj.lightObjectImage.filename_download}`;
          });
        }

        // decorative objects
        if (typeof customDecorativeObjects === 'object' && customDecorativeObjects.length > 0) {
          customDecorativeObjects.forEach(el => {
            const obj = el.clientDecorativeObjects1_id;
            const id = obj.objectPosition.id;
            activeTheme.decorativeObjects[id] = `${urlBase}/assets/${obj.decorativeObjectImage.id}/${obj.decorativeObjectImage.filename_download}`;
          });
        }

        // textures
        if (typeof customTextures === 'object' && customTextures.length > 0) {
          customTextures.forEach(el => {
            const obj = el.clientTextures_id;
            const id = obj.texturePlacement.id;
            activeTheme.textures[id] = `${urlBase}/assets/${obj.textureImage.id}/${obj.textureImage.filename_download}`;
          });
        }

        // ui shapes
        if (typeof uiShapes === 'object' && uiShapes.length > 0) {
          uiShapes.forEach(obj => {
            //const id = obj.id;
            const imgs = {
              "id": obj.directus_files_id.id,
              "image": `${urlBase}/assets/${obj.directus_files_id.filename_disk}?key=padding512-20`,
              "hitImage": `${urlBase}/assets/${obj.directus_files_id.id}/${obj.directus_files_id.filename_download}?key=fatten20-512-20`
            };
            activeTheme.uiShapes.push(imgs);
          });
        }

        res.json(activeTheme);
      })
        .catch((err) => {
          res.json(err)
        });
    }).catch((error) => {
      return next(new ServiceUnavailableException(error.message));
    });
  });
};

export default index;
