import React, { Component } from 'react';
import { InputBase, Button } from '@material-ui/core'
import { searchProject } from '../../model/search'

export default class SearchBar extends Component {

    constructor(props) {
        super(props)

        this.initialState = {
            searchQuery: ""
        }
        this.state = this.initialState
        this.searchBarEl = null
    }

    renderSearchResults( projectSearchResults ) {
        const { fairCopyProject } = this.props
        const menuOptions = []

        for( const resourceID of Object.keys(projectSearchResults) ) {
            const searchResults = projectSearchResults[resourceID]
            const hitCount = searchResults.length
            if( hitCount > 0 ) {
                const resourceEntry = fairCopyProject.resources[resourceID]
                const { name } = resourceEntry
                const resultLabel = `${name}: ${hitCount}`
                const resultAction = () => { console.log(`Selected ${name}`)}
                menuOptions.push({
                    id: `result-${resourceID}`,
                    label: resultLabel,
                    action: resultAction,
                    disabled: false
                })    
            }
        }

        return menuOptions
    }

    onSearch = () => {
        const { fairCopyProject, currentResource, onOpenPopupMenu } = this.props
        const { searchIndex } = fairCopyProject
        const { searchQuery } = this.state

        const projectSearchResults = searchProject(searchQuery, searchIndex)
        const popupMenuOptions = this.renderSearchResults( projectSearchResults )
        onOpenPopupMenu(popupMenuOptions, this.searchBarEl, 'top-start' )

        // highlight search results in the currently open resource
        if( currentResource ) {
            const { resourceID, resourceType } = currentResource

            if( resourceType === 'text' || resourceType === 'header' || resourceType === 'standOff' ) {
                const editorView = currentResource.getActiveView()
                const { tr } = editorView.state
                const resourceResults = projectSearchResults[resourceID] ?  projectSearchResults[resourceID] : -1
                tr.setMeta('searchResults', resourceResults)
                editorView.dispatch(tr)       
            }    
        }
    }

    onChange = (e) => {
        const {name, value} = e.target
        const nextState = { ...this.state }
        nextState[name] = value
        this.setState(nextState)
    }

    render() {
        return (
            <div
                ref={(el)=> { this.searchBarEl = el }}
                id="SearchBar"
            >
                <InputBase
                    name="searchQuery"
                    className="search-input"
                    placeholder="Search project..."
                    onChange={this.onChange}
                />
                <Button 
                    onClick={this.onSearch} 
                    className="search-button" 
                    size="small" 
                    color="inherit">
                    <i className="fas fa-search-plus fa-lg"></i>               
                </Button> 
            </div>
        )
    }
}