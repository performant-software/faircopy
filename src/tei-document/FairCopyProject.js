import TEIDocument from "./TEIDocument"
import TEISchema from "./TEISchema"
import FairCopyConfig from "./FairCopyConfig"

const fairCopy = window.fairCopy

export default class FairCopyProject {

    constructor(projectPath) {
        this.projectPath = projectPath
        this.loadManifest()
        this.fairCopyConfig = new FairCopyConfig(`${this.projectPath}/config-settings.json`)
        this.teiSchema = new TEISchema()
        this.menus = this.parseMenus('menu-groups.json')
    }

    parseMenus(menuGroupsConfigFile) {
        const json = fairCopy.services.loadConfigFile(menuGroupsConfigFile)
        const menuData = JSON.parse(json)

        const menus = {}
        for( const menuID of Object.keys(menuData) ) {
            menus[menuID] = this.parseMenu(menuData[menuID])
        }

        return menus
    }

    parseMenu(menuEntries) {
        const menuGroups = {}
        for( const menuEntry of menuEntries ) {
            // which ones are enabled?
            const members = []
            for( const member of menuEntry.members ) {
                const enabled = ( this.teiSchema.elements[member] !== undefined )
                members.push({ id: member, enabled })
            }
            menuEntry.members = members
            menuGroups[menuEntry.id] = menuEntry
        }

        return menuGroups
    }

    loadManifest() {
        const json = fairCopy.services.readFileSync(`${this.projectPath}/faircopy-manifest.json`)
        const fairCopyManifest = JSON.parse(json)
        this.defaultResource = fairCopyManifest.defaultResource
        this.projectName = fairCopyManifest.projectName
        this.resources = fairCopyManifest.resources
    }

    openResource( resourceID ) {
        const resourceEntry = this.resources[resourceID]
        if( !resourceEntry ) return null

        if( resourceEntry.type === 'text') {
            const filePath = `${this.projectPath}/${resourceEntry.filePath}`
            const teiDocument = new TEIDocument( resourceID, filePath, this.teiSchema, this.fairCopyConfig)
            return teiDocument    
        } else {
            // TODO load facs
            return null
        }        
    }
}