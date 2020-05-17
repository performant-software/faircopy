import React, { Component } from 'react';
import { InputBase, Button } from '@material-ui/core'

export default class SearchBar extends Component {

    render() {
        return (
            <div id="SearchBar">
                <Button className="search-button">
                    <i className="fa fa-search fa-lg"></i>
                </Button>
                <InputBase
                    placeholder="Search"
                    className="search-input"
                />
            </div>
        )
    }
}