import React, { Component } from 'react';
import { Tabs, Tab } from '@material-ui/core'

import TEIEditor from './TEIEditor'


export default class TabbedMainView extends Component {

    a11yProps(index) {
        return {
          id: `mainview-tab-${index}`,
          'aria-controls': `mainview-tabpanel-${index}`,
        };
    }

    renderTabLabel(resourceID) {
        const { onCloseResource } = this.props
        const onCloseClick = () => { onCloseResource(resourceID); return false }
        return (
            <div className='tab-label'>
                <div className='name'>{resourceID}</div>
                <div onClick={onCloseClick} className='close-x'><i className='far fa-window-close'></i></div>
            </div>
        )
    }

    renderTabs() {
        const { openResources, selectedResource, onSelectResource } = this.props

        const onChange = (e) => {
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
            const label = this.renderTabLabel(resourceID)
            tabs.push(
                <Tab 
                    key={tabID} 
                    dataresourceid={resourceID} 
                    label={label} 
                    disableRipple={true}
                    disableFocusRipple={true}
                    {...this.a11yProps(i++)} 
                />
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
