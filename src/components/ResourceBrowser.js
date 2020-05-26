import React, { Component } from 'react';

import { Button, Typography, TableContainer, Table, TableHead, TableRow, TableCell, TableBody, Paper } from '@material-ui/core';

export default class ResourceBrowser extends Component {

  renderResourceTable() {
    const { fairCopyProject, onSelectResource } = this.props
    const { resources } = fairCopyProject

    const onClick = (e) => {
      const resourceID = e.currentTarget.getAttribute('dataresourceid')
      onSelectResource(resourceID)
    }

    const resourceRows = []
    for( const resource of Object.values(resources) ) {
      resourceRows.push(
        <TableRow hover dataresourceid={resource.id} onClick={onClick} key={`resource-${resource.id}`}>
          <TableCell component="th" scope="row">
            {resource.name}
          </TableCell>
        </TableRow>
      )
    }
  
    return (
      <TableContainer className="table-container" component={Paper}>
        <Table stickyHeader >
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            { resourceRows }
          </TableBody>
        </Table>
      </TableContainer>
    )
  }

  render() {
      const { width } = this.props

      return (
        <div id="ResourceBrowser" style={{width: width ? width : '100%'}}>
          <div className="titlebar">
              <Button disabled className="add-resource-button">
                <i className="fas fa-plus-circle fa-2x"></i>
              </Button>
              <Typography variant="h6">Browse Resources</Typography>
          </div>
          <div>
              { this.renderResourceTable() }
          </div>
        </div>
      )
  }

}
