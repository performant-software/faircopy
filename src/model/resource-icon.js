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
        return 'fa fa-book-open'
      case 'standOff':
        return 'fa fa-bullseye'
      case 'sourceDoc':
        return 'fa fa-scroll'
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
      case 'sourceDoc':
        return 'source document resource'
      default:
        throw new Error('Unrecognized resource type.')
    }
  }

  export function getActionIcon(checkedIn, local, editable, checkedOutRemote) {
    if( checkedIn ) {
      // Done
      return { icon: 'fa fa-check', label: 'Check in successful.' }
    } else {
      if( checkedOutRemote ) {
        return { icon: 'far fa-pen', label: 'Checked out by another user.'}
      }
      if( local ) {
          // Create
          return { icon: 'fa fa-plus-circle', label: 'New resource' }
      } else {
          // Update
          if( editable ) { 
            return { icon: 'fa fa-pen', label: 'Checked out by you.' }
          } else {
            // Not editable
            return { icon: null, label: null }
          }
      }
    }
}