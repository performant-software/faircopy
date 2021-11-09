import React, { Component } from 'react';
import { InputBase, Button, Typography, Chip } from '@material-ui/core'
import { getResourceIcon } from '../../model/resource-icon'
import { getSearchHighlights, setSelectionIndex } from '../../model/search'
import { scrollToNodePos } from "../../model/scrolling"

const fairCopy = window.fairCopy

export default class SearchBar extends Component {

    constructor(props) {
        super(props)

        this.initialState = {
            searchQuery: "",
        }
        this.state = this.initialState
        this.searchBarEl = null
    }

    componentDidMount() {
        fairCopy.services.ipcRegisterCallback('searchResults', this.onResults ) 
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

    renderResultLabel( name, parentName, resourceType, hitCount ) {
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
        const { fairCopyProject, onResourceAction } = this.props
        const menuOptions = []

        for( const resourceID of Object.keys(projectSearchResults) ) {
            const searchResults = projectSearchResults[resourceID]
            const hitCount = searchResults.length
            if( hitCount > 0 ) {
                const resourceEntry = fairCopyProject.resources[resourceID]
                const parentEntry = fairCopyProject.getParent(resourceEntry)
                const parentName = parentEntry ?  parentEntry.name : null
                const { name, type } = resourceEntry
                const resultLabel = this.renderResultLabel( name, parentName, type )
                const resultAction = () => { onResourceAction('open', [resourceID]) }
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

    renderSearchResultSpinner() {
        const { currentResource, searchSelectionIndex, onUpdateSearchSelection } = this.props

        if( !currentResource ) return null

        const editorView = currentResource.getActiveView()
        if( !editorView ) return null
    
        const highlights = getSearchHighlights( editorView ) 
        const highlightCount = highlights.length
        if( highlightCount === 0 ) return null

        function updateSelection( index ) {
            const nextHighlight = highlights[index]
            setSelectionIndex( index, editorView )
            const {doc} = editorView.state
            const $pos = doc.resolve( nextHighlight.from )
            const parentPos = $pos.pos - $pos.parentOffset - 1
            scrollToNodePos(parentPos, currentResource.resourceID, editorView)
            onUpdateSearchSelection( index )
        }

        const onPrev = () => {
            const nextSelectionIndex = (searchSelectionIndex - 1) < 0 ? highlightCount-1  : searchSelectionIndex - 1
            updateSelection( nextSelectionIndex )
        }

        const onNext = () => {
            const nextSelectionIndex = (searchSelectionIndex + 1) >= highlightCount ? 0 : searchSelectionIndex + 1
            updateSelection( nextSelectionIndex )
        }

        return (
            <div className="search-result-spinner">
                <Typography className="search-button" >Search Result </Typography>
                <Button 
                    onClick={onPrev} 
                    className="search-button" 
                    size="small" 
                    color="inherit">
                    <i className={`fas fa-caret-circle-left fa-lg`}></i>               
                </Button> 
                <Typography className="search-button" >{ `${searchSelectionIndex+1} of ${highlights.length}` }</Typography>
                <Button 
                    onClick={onNext} 
                    className="search-button" 
                    size="small" 
                    color="inherit">
                    <i className={`fas fa-caret-circle-right fa-lg`}></i>               
                </Button> 
            </div>
        )

    }

    onSearch = () => {
        const { searchFilterOptions } = this.props
        const { searchQuery } = this.state
        const { elementName, attrQs } = searchFilterOptions
        const searchQ = { query: searchQuery, elementName, attrQs }
        fairCopy.services.ipcSend('searchProject', searchQ)
    }

    onResults = (event, searchResults) => {
        const { onSearchResults } = this.props
        const { query, results } = searchResults
        const popupMenuOptions = this.renderSearchResults( results )
        onSearchResults( query, results, popupMenuOptions, this.searchBarEl )    
    }

    onChange = (e) => {
        const {name, value} = e.target
        const nextState = { ...this.state }
        nextState[name] = value
        this.setState(nextState)
    }

    onKeyUp = (e) => {
        if( e.keyCode === 13 ) this.onSearch()
    }

    onCloseSearch = () => {
        // TODO
    }

    render() {
        const { searchEnabled, onSearchFilter, searchFilterOptions } = this.props
        const { active } = searchFilterOptions
        
        const placeholder = searchEnabled ? 'Search project...' : 'Loading index...'
        const filterIcon = active ? 'fas fa-filter' : 'far fa-filter'

        return (
            <div
                ref={(el)=> { this.searchBarEl = el }}
                id="SearchBar"
            >
                <Button 
                    onClick={this.onCloseSearch} 
                    disabled={!searchEnabled}
                    className="search-button" 
                    size="small" 
                    color="inherit">
                    <i className={`fas fa-times-circle fa-lg`}></i>               
                </Button> 
                <InputBase
                    name="searchQuery"
                    className="search-input"
                    placeholder={placeholder}
                    disabled={!searchEnabled}
                    onChange={this.onChange}
                    onKeyUp={this.onKeyUp}
                />
                <Button 
                    onClick={onSearchFilter} 
                    disabled={!searchEnabled}
                    className="search-button" 
                    size="small" 
                    color="inherit">
                    <i className={`${filterIcon} fa-lg`}></i>               
                </Button> 
                { this.renderSearchResultSpinner() }
            </div>
        )
    }
}