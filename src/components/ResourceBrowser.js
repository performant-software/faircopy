import React, { Component } from 'react';

import { Typography } from '@material-ui/core';

export default class ResourceBrowser extends Component {

  renderResourceList() {
    const { fairCopyProject, onSelectResource } = this.props
    const { resources } = fairCopyProject

    const onClick = (e) => {
      const resourceID = e.currentTarget.getAttribute('dataresourceid')
      onSelectResource(resourceID)
    }

    const resourceList = []
    for( const resource of Object.values(resources) ) {
      resourceList.push(
        <li dataresourceid={resource.id} onClick={onClick} key={`resource-${resource.id}`}>{ resource.id }</li>
      )
    }
  
    return (
      <ul>
        { resourceList }
      </ul>
    )
  }

  render() {
      return (
        <div id="ResourceBrowser">
          <div className="titlebar">
              <Typography variant="h6">Browse Resources</Typography>
          </div>
          <div>
              { this.renderResourceList() }
          </div>
        </div>
      )
  }

}
