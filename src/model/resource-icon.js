export function getResourceIcon(resourceType, open=false) {
    const openBook = open ? 'fa-book-open' : 'fa-book'
    switch( resourceType ) {
      case 'text':
        return `fa ${openBook}`
      case 'facs':
        return 'fa fa-images'
      case 'header':
        return 'fa fa-file-alt'
      case 'teidoc':
        return 'fa fa-books'
      case 'standOff':
        return 'fa fa-bullseye-pointer'
      default:
        throw new Error('Unrecognized resource type.')
    }
  }