import React, { Component } from 'react';
import { InputBase, Button, Typography, Chip, Tooltip } from '@material-ui/core'
import { getResourceIcon } from '../../model/resource-icon'
import { getSearchHighlights, setSelectionIndex, searchResource, scrollToSearchResult } from '../../model/search'
import TEIDocument from '../../model/TEIDocument';

const fairCopy = window.fairCopy

export default class SearchBar extends Component {

    constructor(props) {
        super(props)

        this.initialState = {
            searchQuery: "",
            queryChanged: false
        }
        this.state = this.initialState
        this.searchBarEl = null
    }

    componentDidMount() {
        fairCopy.services.ipcRegisterCallback('searchResults', this.onResults ) 
    }

    componentWillUnmount() {
        fairCopy.services.ipcRemoveListener('searchResults', this.onResults ) 
    }

    renderStatusChip(hitCount) {        
        const hitCountLabel = ( hitCount > 999 ) ? "1k+" : hitCount
        return (
            <Chip
                className="hit-chip"
                label={hitCountLabel}
                size="small"
            />
        )  
    }

    renderResultLabel( name, parentName, resourceType ) {
        const resourceIcon = <i className={getResourceIcon(resourceType)}></i>
        const path = parentName ? 
            <Typography>{resourceIcon} {parentName} <i className='fa fa-chevron-right'></i> {name}</Typography> : 
            <Typography>{resourceIcon} {name}</Typography>
        return (
            <div className='search-result-label'>
                 {path}
            </div>
        )
    }

    renderSearchResults( projectSearchResults ) {
        const { onResourceAction } = this.props
        const menuOptions = []

        for( const resourceID of Object.keys(projectSearchResults) ) {
            const searchResults = projectSearchResults[resourceID]
            const hitCount = searchResults.length
            if( hitCount > 0 ) {
                const { resourceEntry, parentEntry } = searchResults
                const parentName = parentEntry ?  parentEntry.name : null
                const { name, type } = resourceEntry
                const resultLabel = this.renderResultLabel( name, parentName, type )
                const resultAction = () => { onResourceAction('open-search-result', [resourceID]) }
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

    moveSpinner = (direction) => {
        const { searchSelectionIndex, currentResource, onUpdateSearchSelection } = this.props
        if( !currentResource ) return
        const editorView = currentResource.getActiveView()
        if( !editorView ) return
        const highlights = getSearchHighlights( editorView ) 
        const highlightCount = highlights.length
        let nextSelectionIndex
        if( searchSelectionIndex + direction < 0 ) {
            nextSelectionIndex = highlightCount-1
        } else if( searchSelectionIndex + direction >= highlightCount) {
            nextSelectionIndex = 0
        } else {
            nextSelectionIndex = searchSelectionIndex + direction
        }
        
        setSelectionIndex( nextSelectionIndex, editorView )
        scrollToSearchResult( currentResource, nextSelectionIndex ) 
        onUpdateSearchSelection( nextSelectionIndex )
    }

    renderSearchResultSpinner() {
        const { currentResource, searchSelectionIndex } = this.props

        if( !currentResource ) return null
        const editorView = currentResource.getActiveView()
        if( !editorView ) return null
    
        const highlights = getSearchHighlights( editorView ) 
        const highlightCount = highlights.length
        if( highlightCount === 0 ) return null

        const onPrev = () => {
            this.moveSpinner(-1)
        }
    
        const onNext = () => {
            this.moveSpinner(1)
        }
    
        return (
            <div className="search-result-spinner">
                <Typography className="search-button" >Search Result </Typography>
                <Tooltip title="Select previous search result">
                    <Button 
                        onClick={onPrev} 
                        className="search-button" 
                        size="small" 
                        color="inherit">
                        <i className={`fa-solid fa-circle-arrow-left fa-xl`}></i>               
                    </Button> 
                </Tooltip>
                <Typography className="search-button" >{ `${searchSelectionIndex+1} of ${highlightCount}` }</Typography>
                <Tooltip title="Select next search result">
                    <Button 
                        onClick={onNext} 
                        className="search-button" 
                        size="small" 
                        color="inherit">
                        <i className={`fa-solid fa-circle-arrow-right fa-xl`}></i>               
                    </Button> 
                </Tooltip>
            </div>
        )

    }

    onSearch = () => {
        const { searchFilterOptions, currentResource, searchScope, onSearchResults } = this.props
        const { searchQuery } = this.state
        const { elementName, attrQs } = searchFilterOptions
        const searchQ = { query: searchQuery.toLowerCase(), elementName, attrQs }
        if( searchScope === 'project' ) {
            fairCopy.services.ipcSend('searchProject', searchQ)
        } else {
            const searchResults = searchResource( currentResource, searchQ )
            const { query, results } = searchResults
            onSearchResults( query, results, [], this.searchBarEl )        
        }
    }

    onResults = (event, searchResults) => {
        const { onSearchResults, onAlertMessage } = this.props
        const { query, results } = searchResults
        const popupMenuOptions = this.renderSearchResults( results )
        if( popupMenuOptions.length === 0 && query.query.length > 0 ) {
            onAlertMessage("No search results found.")
        }
        onSearchResults( query, results, popupMenuOptions, this.searchBarEl )    
    }

    onChange = (e) => {
        const {name, value} = e.target
        const nextState = { ...this.state }
        nextState[name] = value
        nextState.queryChanged = true
        this.setState(nextState)
    }

    onFocus = () => {
        this.setState({ ...this.state, queryChanged: true })
    }

    onKeyUp = (e) => {
        const { onClose } = this.props
        const { queryChanged } = this.state
        if( e.keyCode === 13 ) {
            if( queryChanged ) {
                // if the query has changed, then search
                this.onSearch()
                this.setState({ ...this.state, queryChanged: false })
            } else {
                // otherwise, move to the next search result
                this.moveSpinner(1)
            }    
        } else if( e.keyCode === 27 ) {
            this.setState({ ...this.initialState })
            onClose()
        }
    }

    renderSearchScopeButton() {
        const { searchEnabled, searchScope, onToggleSearch } = this.props
        const searchInFileIcon = 'fa fa-file-lines fa-xl'
        const searchInProjectIcon = 'fa fa-folder-tree fa-xl'
        const searchInProject = searchScope === 'project'
        const searchIcon = searchInProject ? searchInProjectIcon : searchInFileIcon
        const toolTipText = searchInProject ? 'Search in project' : 'Search in file'

        const onScopeChange = () => {
            this.setState({ ...this.state, queryChanged: true })
            onToggleSearch()
        }

        return (
            <Tooltip title={toolTipText}>
                <span>
                    <Button 
                        aria-label="Search Scope"
                        onClick={onScopeChange} 
                        disabled={!searchEnabled}
                        className="search-button" 
                        size="small" 
                        color="inherit">
                        <i className={searchIcon}></i>               
                    </Button> 
                </span>
            </Tooltip>
        )
    }

    render() {
        const { searchEnabled, searchScope, onSearchFilter, searchFilterOptions, currentResource } = this.props
        const { active } = searchFilterOptions        
        const searchReady = (searchScope === 'file' && currentResource instanceof TEIDocument) || (searchScope === 'project' && searchEnabled )
        const enabledText = searchScope === 'project' ? 'Search project' : 'Search current resource'
        const placeholder = searchReady ? enabledText : 'Loading index...'
        const filterIcon = active ? 'fas fa-filter' : 'fas fa-filter'

        return (
            <div
                id="SearchBar"
                ref={(el)=> { this.searchBarEl = el }}
            >
                <InputBase
                    name="searchQuery"
                    className="search-input"
                    aria-label="Search Project"
                    placeholder={placeholder}
                    disabled={!searchReady}
                    onChange={this.onChange}
                    onKeyUp={this.onKeyUp}
                    onFocus={this.onFocus}
                    autoFocus={true}
                />
                <Tooltip title="Filter project search">
                    <span>
                        <Button 
                            aria-label="Search Filter"
                            onClick={onSearchFilter} 
                            disabled={!searchReady}
                            className="search-button" 
                            size="small" 
                            color="inherit">
                            <i className={`${filterIcon} fa-xl`}></i>               
                        </Button> 
                    </span>
                </Tooltip>
                { this.renderSearchResultSpinner() }
            </div>
        )
    }
}