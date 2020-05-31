import React, { Component } from 'react';
import { Button, Typography, TableContainer, Table, TableHead, TableRow, TableCell, TableBody, Paper, Checkbox } from '@material-ui/core';
import SearchBar from './SearchBar'

export default class ResourceBrowser extends Component {

  constructor() {
    super()
    this.state = {
      allChecked: false,
      checked: {}
    }
  }

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

    const onClick = (e) => {
      const { onSelectResource } = this.props
      const resourceID = e.currentTarget.getAttribute('dataresourceid')
      onSelectResource(resourceID)
    }

    const toggleAll = () => {
      const { fairCopyProject } = this.props
      const { resources } = fairCopyProject
      const { checked, allChecked } = this.state
      const nextAllChecked = !allChecked
      const nextChecked = { ...checked }
      for( const resource of Object.values(resources) ) {
        nextChecked[resource.id] = nextAllChecked
      }
      this.setState({ ...this.state, checked: nextChecked, allChecked: nextAllChecked })
    }

    const onClickCheck = (e) => {
      const { checked } = this.state
      const nextChecked = { ...checked }
      const resourceID = e.currentTarget.getAttribute('dataresourceid')
      nextChecked[resourceID] = checked[resourceID] ? false : true
      this.setState({ ...this.state, checked: nextChecked })
    }

    const cellProps = {
      padding: 'none',
      component: "th",
      scope: "row"
    }

    const { checked, allChecked } = this.state
    const { fairCopyProject } = this.props
    const { resources } = fairCopyProject

    const resourceRows = []
    for( const resource of Object.values(resources) ) {
      const check = checked[resource.id] === true
      resourceRows.push(
        <TableRow hover key={`resource-${resource.id}`}>
          <TableCell {...cellProps} >
            <Checkbox onClick={onClickCheck} dataresourceid={resource.id} checked={check} />
          </TableCell>
          <TableCell onClick={onClick} dataresourceid={resource.id} {...cellProps} >
            {resource.name}
          </TableCell>
          <TableCell {...cellProps} >
            text
          </TableCell>
          <TableCell {...cellProps} >
            ---
          </TableCell>
        </TableRow>
      )
    }
  
    return (
      <TableContainer className="table-container" component={Paper}>
        <Table stickyHeader size="small" >
          <TableHead>
            <TableRow>
              <TableCell padding="none"><Checkbox onClick={toggleAll} checked={allChecked} /></TableCell>
              <TableCell padding="none">Name</TableCell>
              <TableCell padding="none">Type</TableCell>
              <TableCell padding="none">Last Modified</TableCell>
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
      const { width, fairCopyProject } = this.props
      const { resources } = fairCopyProject
      const resourceCount = Object.keys(resources).length
      const s = resourceCount === 1 ? '' : 's'

      return (
        <div id="ResourceBrowser" style={{width: width ? width : '100%'}}>
          <div className="titlebar">
              <SearchBar></SearchBar>
              <Typography component="h1" variant="h6">Browse Resources ({resourceCount} resource{s})</Typography>
          </div>
          { this.renderToolbar() }
          <div>
              { this.renderResourceTable() }
          </div>
        </div>
      )
  }

}
