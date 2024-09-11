const getWebpackEntry = function getWebpackEntry(windowName) {
    switch( windowName ) {
        case 'main_window':
          return MAIN_WINDOW_WEBPACK_ENTRY
        case 'project_window':
          return PROJECT_WINDOW_WEBPACK_ENTRY
        case 'preview_window':
          return PREVIEW_WINDOW_WEBPACK_ENTRY
        case 'image_window':
          return IMAGE_WINDOW_WEBPACK_ENTRY
        case 'worker_window':
          return WORKER_WINDOW_WEBPACK_ENTRY   
    } 
    return null
}

const getWebpackPreload = function getWebpackPreload(windowName) {
  switch( windowName ) {
    case 'main_window':
      return MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY
    case 'project_window':
      return PROJECT_WINDOW_PRELOAD_WEBPACK_ENTRY
    case 'preview_window':
      return PREVIEW_WINDOW_PRELOAD_WEBPACK_ENTRY
    case 'image_window':
      return IMAGE_WINDOW_PRELOAD_WEBPACK_ENTRY
    case 'worker_window':
      return WORKER_WINDOW_PRELOAD_WEBPACK_ENTRY   
  } 
  return null
}

exports.getWebpackEntry = getWebpackEntry
exports.getWebpackPreload = getWebpackPreload