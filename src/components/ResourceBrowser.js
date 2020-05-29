import React, { Component } from 'react';
import { Button, Typography, TableContainer, Table, TableHead, TableRow, TableCell, TableBody, Paper, Checkbox } from '@material-ui/core';
import SearchBar from './SearchBar'

export default class ResourceBrowser extends Component {

  renderToolbar() {
    const { onEditResource } = this.props

    const buttonProps = {
      className: 'toolbar-button',
      variant: "outlined",
      size: 'small',
      disableRipple: true,
      disableFocusRipple: true
    }

    return (
      <div className="toolbar">
        <Button onClick={onEditResource} {...buttonProps}>Create</Button>    
        <Button disabled {...buttonProps}>Import</Button>    
        <Button disabled {...buttonProps}>Export</Button>    
        <Button disabled {...buttonProps}>Actions</Button> 
      </div>
    )
  }

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
          <TableCell padding="none" component="th" scope="row">
            <Checkbox checked={false} name="checkedA" />
          </TableCell>
          <TableCell padding="none" component="th" scope="row">
            <i className="fas fa-book fa-lg"></i>
          </TableCell>
          <TableCell component="th" scope="row">
            {resource.name}
          </TableCell>
          <TableCell component="th" scope="row">
            {Date.now()}
          </TableCell>
        </TableRow>
      )
    }
  
    return (
      <TableContainer className="table-container" component={Paper}>
        <Table stickyHeader size="small" >
          <TableHead>
            <TableRow>
              <TableCell padding="none"><Checkbox checked={false} name="checkedA" /></TableCell>
              <TableCell padding="none">Type</TableCell>
              <TableCell >Name</TableCell>
              <TableCell>Last Modified</TableCell>
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
              <SearchBar></SearchBar>
              <Typography component="h1" variant="h6">Browse Resources (4 resources)</Typography>
          </div>
          { this.renderToolbar() }
          <div>
              { this.renderResourceTable() }
          </div>
        </div>
      )
  }

}
