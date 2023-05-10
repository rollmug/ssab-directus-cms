export default (router, { services, exceptions }) => {
	router.get('/', (req, res) => {
		const { ItemsService } = services;
		const { ServiceUnavailableException } = exceptions;

		const activeTheme = new ItemsService('activeTheme', { schema: req.schema, accountability: req.accountability });

		activeTheme.readByQuery({ fields: ['*'] }).then((results) => {
            const themeID = results[0].activeTheme;

            fetch("/graphql", {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
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
                            }
                            hiddenObject {
                              filename_download
                            }
                            cornerObject {
                              filename_download
                            }
                            customLightObjects {
                              clientLightObjects_id {
                                lightObjectImage {
                                  filename_download
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
                              }
                            }
                          }
                        }
                      }
                    `
                })
            }).then((result) => res.json(result))

            //res.json(results[0].activeTheme)
        }).catch((error) => {
            return next(new ServiceUnavailableException(error.message));
        });
	});
};
