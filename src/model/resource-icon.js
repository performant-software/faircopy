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

  export function getResourceIconLabel( resourceType ) {
    switch( resourceType ) {
      case 'text':
        return 'text resource'
      case 'facs':
        return 'facsimile resource'
      case 'header':
        return 'TEI Header'
      case 'teidoc':
        return 'TEI Document'
      case 'standOff':
        return 'standoff resource'
      default:
        throw new Error('Unrecognized resource type.')
    }
  }