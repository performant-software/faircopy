import React, { Component } from 'react';
import { Tabs, Tab, Typography } from '@material-ui/core'

import TEIEditor from './TEIEditor'


export default class TabbedMainView extends Component {

    a11yProps(index) {
        return {
          id: `mainview-tab-${index}`,
          'aria-controls': `mainview-tabpanel-${index}`,
        };
    }

    renderTabs() {
        const { openResources, selectedResource, onSelectResource } = this.props

        const onChange = (e,nextTab) => {
            let resourceID = e.currentTarget.getAttribute('dataresourceid')
            onSelectResource(resourceID)
        }

        const tabs = []
        let currentTab 
        let i = 0
        for( const openResource of Object.values(openResources) ) {
            const {resourceID} = openResource
            if( selectedResource === resourceID ) currentTab = i
            const tabID = `main-tab-${resourceID}`
            const label = <Typography>{resourceID} <i className='far fa-times-circle'></i></Typography>
            tabs.push(
                <Tab key={tabID} dataresourceid={resourceID} label={label} {...this.a11yProps(i++)} />
            )
        }

        return (
            <Tabs value={currentTab} onChange={onChange} aria-label="mainview tabs">
                { tabs }
            </Tabs>
        )
    }

    renderTabPanels() {
        const { width, onStateChange, onSave } = this.props
        const { openResources, selectedResource } = this.props

        const tabPanels = []
        let i = 0
        for( const openResource of Object.values(openResources) ) {
            const {resourceID} = openResource
            const tabPanelID = `main-tabpanel-${resourceID}`
            const hidden = selectedResource !== resourceID

            tabPanels.push(
                <TabPanel key={tabPanelID} hidden={hidden} index={i++}>
                    <TEIEditor 
                        hidden={hidden}
                        width={width}
                        teiDocument={openResource}
                        onStateChange={onStateChange}
                        onSave={onSave}  
                    ></TEIEditor>
                </TabPanel>
            )
        }

        return tabPanels
    }

    render() {

        return (
            <div id="TabbedMainView">
                { this.renderTabs() }
                { this.renderTabPanels() }
            </div>
        )
    }

}

function TabPanel(props) {
    const { children, hidden, index, ...other } = props;
  
    return (
      <div
        role="tabpanel"
        hidden={hidden}
        id={`simple-tabpanel-${index}`}
        aria-labelledby={`simple-tab-${index}`}
        {...other}
      >
        { children }
      </div>
    );
}
