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
    }

    onSearch = () => {
        const { searchIndex } = this.props
        const { searchQuery } = this.state

        const results = searchProject(searchQuery, searchIndex)
        console.log(results)
    }

    onChange = (e) => {
        const {name, value} = e.target
        const nextState = { ...this.state }
        nextState[name] = value
        this.setState(nextState)
    }

    render() {
        return (
            <div id="SearchBar">
                <InputBase
                    name="searchQuery"
                    className="search-input"
                    placeholder="Search project..."
                    onChange={this.onChange}
                />
                <Button onClick={this.onSearch} className="search-button" size="small" color="inherit">
                    <i className="fas fa-search-plus fa-lg"></i>               
                </Button> 
            </div>
        )
    }
}